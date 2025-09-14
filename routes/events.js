const express = require('express');
const { getPool } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validateEventCreation, validatePagination, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all events (public)
router.get('/', optionalAuth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, city, status = 'published' } = req.query;
    const offset = (page - 1) * limit;
    
    // Create cache key
    const cacheKey = `events:${page}:${limit}:${search || ''}:${category || ''}:${city || ''}:${status}`;
    
    // Try to get from cache first
    let events = await cache.get(cacheKey);
    
    if (!events) {
      const pool = getPool();
      let whereClause = 'WHERE e.status = ?';
      let queryParams = [status];
      
      if (search) {
        whereClause += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)';
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (category) {
        whereClause += ' AND e.category = ?';
        queryParams.push(category);
      }
      
      if (city) {
        whereClause += ' AND e.city = ?';
        queryParams.push(city);
      }
      
      const [eventsData] = await pool.execute(
        `SELECT e.*, u.first_name as organizer_name, u.last_name as organizer_last_name,
                COUNT(tt.id) as ticket_tiers_count,
                SUM(tt.quantity) as total_tickets,
                SUM(tt.sold_quantity) as sold_tickets
         FROM events e
         JOIN users u ON e.organizer_id = u.id
         LEFT JOIN ticket_tiers tt ON e.id = tt.event_id AND tt.is_active = TRUE
         ${whereClause}
         GROUP BY e.id
         ORDER BY e.start_date ASC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset]
      );
      
      // Get total count for pagination
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM events e ${whereClause}`,
        queryParams
      );
      
      events = {
        events: eventsData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      };
      
      // Cache for 5 minutes
      await cache.set(cacheKey, events, 300);
    }
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// Get single event (public)
router.get('/:id', optionalAuth, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `event:${id}`;
    
    // Try to get from cache first
    let event = await cache.get(cacheKey);
    
    if (!event) {
      const pool = getPool();
      const [events] = await pool.execute(
        `SELECT e.*, u.first_name as organizer_name, u.last_name as organizer_last_name
         FROM events e
         JOIN users u ON e.organizer_id = u.id
         WHERE e.id = ? AND e.status = 'published'`,
        [id]
      );
      
      if (events.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Get ticket tiers
      const [ticketTiers] = await pool.execute(
        `SELECT * FROM ticket_tiers 
         WHERE event_id = ? AND is_active = TRUE 
         ORDER BY price ASC`,
        [id]
      );
      
      event = {
        ...events[0],
        ticketTiers
      };
      
      // Cache for 10 minutes
      await cache.set(cacheKey, event, 600);
    }
    
    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
});

// Create event (organizer/admin only)
router.post('/', authenticateToken, requireRole(['organizer', 'admin']), validateEventCreation, async (req, res) => {
  try {
    const {
      title, description, venue, address, city, state, country,
      startDate, endDate, imageUrl, category, maxAttendees
    } = req.body;
    
    const pool = getPool();
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    if (start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO events (organizer_id, title, description, venue, address, city, state, country, 
                          start_date, end_date, image_url, category, max_attendees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, venue, address, city, state, country,
       startDate, endDate, imageUrl, category, maxAttendees]
    );
    
    // Clear events cache
    await cache.del('events:*');
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        eventId: result.insertId
      }
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
});

// Update event (organizer/admin only)
router.put('/:id', authenticateToken, requireRole(['organizer', 'admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check if event exists and user has permission
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE id = ? AND organizer_id = ?',
      [id, req.user.id]
    );
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }
    
    const {
      title, description, venue, address, city, state, country,
      startDate, endDate, imageUrl, category, maxAttendees, status
    } = req.body;
    
    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }
    
    await pool.execute(
      `UPDATE events SET 
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       venue = COALESCE(?, venue),
       address = COALESCE(?, address),
       city = COALESCE(?, city),
       state = COALESCE(?, state),
       country = COALESCE(?, country),
       start_date = COALESCE(?, start_date),
       end_date = COALESCE(?, end_date),
       image_url = COALESCE(?, image_url),
       category = COALESCE(?, category),
       max_attendees = COALESCE(?, max_attendees),
       status = COALESCE(?, status)
       WHERE id = ?`,
      [title, description, venue, address, city, state, country,
       startDate, endDate, imageUrl, category, maxAttendees, status, id]
    );
    
    // Clear caches
    await cache.del(`event:${id}`);
    await cache.del('events:*');
    
    res.json({
      success: true,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
});

// Delete event (organizer/admin only)
router.delete('/:id', authenticateToken, requireRole(['organizer', 'admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check if event exists and user has permission
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE id = ? AND organizer_id = ?',
      [id, req.user.id]
    );
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }
    
    // Check if event has any orders
    const [orders] = await pool.execute(
      'SELECT COUNT(*) as count FROM orders WHERE event_id = ?',
      [id]
    );
    
    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete event with existing orders. Cancel the event instead.'
      });
    }
    
    await pool.execute('DELETE FROM events WHERE id = ?', [id]);
    
    // Clear caches
    await cache.del(`event:${id}`);
    await cache.del('events:*');
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
});

// Get user's events (organizer/admin only)
router.get('/my/events', authenticateToken, requireRole(['organizer', 'admin']), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    const pool = getPool();
    let whereClause = 'WHERE e.organizer_id = ?';
    let queryParams = [req.user.id];
    
    if (status) {
      whereClause += ' AND e.status = ?';
      queryParams.push(status);
    }
    
    const [events] = await pool.execute(
      `SELECT e.*, 
              COUNT(tt.id) as ticket_tiers_count,
              SUM(tt.quantity) as total_tickets,
              SUM(tt.sold_quantity) as sold_tickets,
              SUM(tt.sold_quantity * tt.price) as total_revenue
       FROM events e
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
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your events'
    });
  }
});

module.exports = router;
