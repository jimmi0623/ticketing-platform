const express = require('express');
const { getPool } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validatePagination, validateId } = require('../middleware/validation');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken, requireRole(['admin']));

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'admin:stats';
    let stats = await cache.get(cacheKey);
    
    if (!stats) {
      const pool = getPool();
      
      // Get user counts
      const [userStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as customers,
          SUM(CASE WHEN role = 'organizer' THEN 1 ELSE 0 END) as organizers,
          SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verified_users
         FROM users`
      );
      
      // Get event counts
      const [eventStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_events,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_events,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_events,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_events
         FROM events`
      );
      
      // Get order stats
      const [orderStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue
         FROM orders`
      );
      
      // Get ticket stats
      const [ticketStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_tickets,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tickets,
          SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used_tickets
         FROM tickets`
      );
      
      stats = {
        users: userStats[0],
        events: eventStats[0],
        orders: orderStats[0],
        tickets: ticketStats[0]
      };
      
      // Cache for 5 minutes
      await cache.set(cacheKey, stats, 300);
    }
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const cacheKey = `admin:revenue:${period}`;
    let analytics = await cache.get(cacheKey);
    
    if (!analytics) {
      const pool = getPool();
      let dateFilter = '';
      
      switch (period) {
        case '7d':
          dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case '30d':
          dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        case '90d':
          dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
          break;
        case '1y':
          dateFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
          break;
      }
      
      // Daily revenue
      const [dailyRevenue] = await pool.execute(
        `SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as orders_count,
          SUM(o.total_amount) as revenue
         FROM orders o
         WHERE o.status = 'paid' ${dateFilter}
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`
      );
      
      // Revenue by event
      const [eventRevenue] = await pool.execute(
        `SELECT 
          e.title as event_title,
          COUNT(o.id) as orders_count,
          SUM(o.total_amount) as revenue
         FROM orders o
         JOIN events e ON o.event_id = e.id
         WHERE o.status = 'paid' ${dateFilter}
         GROUP BY e.id, e.title
         ORDER BY revenue DESC
         LIMIT 10`
      );
      
      // Revenue by organizer
      const [organizerRevenue] = await pool.execute(
        `SELECT 
          CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
          COUNT(DISTINCT e.id) as events_count,
          COUNT(o.id) as orders_count,
          SUM(o.total_amount) as revenue
         FROM orders o
         JOIN events e ON o.event_id = e.id
         JOIN users u ON e.organizer_id = u.id
         WHERE o.status = 'paid' ${dateFilter}
         GROUP BY u.id, u.first_name, u.last_name
         ORDER BY revenue DESC
         LIMIT 10`
      );
      
      analytics = {
        dailyRevenue,
        eventRevenue,
        organizerRevenue
      };
      
      // Cache for 10 minutes
      await cache.set(cacheKey, analytics, 600);
    }
    
    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
});

// Get all users
router.get('/users', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      queryParams.push(role);
    }
    
    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, role, phone, is_verified, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Update user role
router.put('/users/:id/role', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const pool = getPool();
    
    if (!['admin', 'organizer', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

// Get all events (admin view)
router.get('/events', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    
    if (status) {
      whereClause += ' AND e.status = ?';
      queryParams.push(status);
    }
    
    if (search) {
      whereClause += ' AND (e.title LIKE ? OR e.venue LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const [events] = await pool.execute(
      `SELECT e.*, 
              CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
              COUNT(tt.id) as ticket_tiers_count,
              SUM(tt.quantity) as total_tickets,
              SUM(tt.sold_quantity) as sold_tickets,
              SUM(tt.sold_quantity * tt.price) as revenue
       FROM events e
       JOIN users u ON e.organizer_id = u.id
       LEFT JOIN ticket_tiers tt ON e.id = tt.event_id AND tt.is_active = TRUE
       ${whereClause}
       GROUP BY e.id
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM events e ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// Update event status
router.put('/events/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const pool = getPool();
    
    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    await pool.execute(
      'UPDATE events SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // Clear caches
    await cache.del(`event:${id}`);
    await cache.del('events:*');
    await cache.del('admin:*');
    
    res.json({
      success: true,
      message: 'Event status updated successfully'
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status'
    });
  }
});

// Get all orders (admin view)
router.get('/orders', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      queryParams.push(status);
    }
    
    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR e.title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const [orders] = await pool.execute(
      `SELECT o.*, 
              e.title as event_title,
              CONCAT(u.first_name, ' ', u.last_name) as customer_name,
              u.email as customer_email,
              COUNT(t.id) as ticket_count
       FROM orders o
       JOIN events e ON o.event_id = e.id
       JOIN users u ON o.user_id = u.id
       LEFT JOIN tickets t ON o.id = t.order_id
       ${whereClause}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      queryParams
    );
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern = '*' } = req.body;
    
    // This would need to be implemented based on your Redis client
    // For now, we'll clear specific patterns
    const patterns = [
      'events:*',
      'event:*',
      'admin:*',
      'analytics:*'
    ];
    
    for (const p of patterns) {
      await cache.del(p);
    }
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

module.exports = router;
