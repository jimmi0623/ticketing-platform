const express = require('express');
const { getPool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateTicketTier, validateId } = require('../middleware/validation');

const router = express.Router();

// Create ticket tier (organizer/admin only)
router.post('/tiers', authenticateToken, requireRole(['organizer', 'admin']), validateTicketTier, async (req, res) => {
  try {
    const { eventId, name, description, price, quantity, salesStartDate, salesEndDate } = req.body;
    const pool = getPool();
    
    // Check if event exists and user has permission
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE id = ? AND organizer_id = ?',
      [eventId, req.user.id]
    );
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }
    
    // Validate sales dates
    if (salesStartDate && salesEndDate) {
      const start = new Date(salesStartDate);
      const end = new Date(salesEndDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Sales end date must be after start date'
        });
      }
    }
    
    const [result] = await pool.execute(
      `INSERT INTO ticket_tiers (event_id, name, description, price, quantity, sales_start_date, sales_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, name, description, price, quantity, salesStartDate, salesEndDate]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ticket tier created successfully',
      data: {
        tierId: result.insertId
      }
    });
  } catch (error) {
    console.error('Create ticket tier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket tier'
    });
  }
});

// Get ticket tiers for event
router.get('/tiers/event/:eventId', validateId, async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = getPool();
    
    const [tiers] = await pool.execute(
      `SELECT * FROM ticket_tiers 
       WHERE event_id = ? AND is_active = TRUE 
       ORDER BY price ASC`,
      [eventId]
    );
    
    res.json({
      success: true,
      data: { tiers }
    });
  } catch (error) {
    console.error('Get ticket tiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket tiers'
    });
  }
});

// Update ticket tier (organizer/admin only)
router.put('/tiers/:id', authenticateToken, requireRole(['organizer', 'admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, salesStartDate, salesEndDate, isActive } = req.body;
    const pool = getPool();
    
    // Check if tier exists and user has permission
    const [tiers] = await pool.execute(
      `SELECT tt.*, e.organizer_id 
       FROM ticket_tiers tt 
       JOIN events e ON tt.event_id = e.id 
       WHERE tt.id = ?`,
      [id]
    );
    
    if (tiers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket tier not found'
      });
    }
    
    if (tiers[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if tier has sold tickets
    if (tiers[0].sold_quantity > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify tier with sold tickets'
      });
    }
    
    await pool.execute(
      `UPDATE ticket_tiers SET 
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       price = COALESCE(?, price),
       quantity = COALESCE(?, quantity),
       sales_start_date = COALESCE(?, sales_start_date),
       sales_end_date = COALESCE(?, sales_end_date),
       is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, description, price, quantity, salesStartDate, salesEndDate, isActive, id]
    );
    
    res.json({
      success: true,
      message: 'Ticket tier updated successfully'
    });
  } catch (error) {
    console.error('Update ticket tier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket tier'
    });
  }
});

// Delete ticket tier (organizer/admin only)
router.delete('/tiers/:id', authenticateToken, requireRole(['organizer', 'admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check if tier exists and user has permission
    const [tiers] = await pool.execute(
      `SELECT tt.*, e.organizer_id 
       FROM ticket_tiers tt 
       JOIN events e ON tt.event_id = e.id 
       WHERE tt.id = ?`,
      [id]
    );
    
    if (tiers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket tier not found'
      });
    }
    
    if (tiers[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if tier has sold tickets
    if (tiers[0].sold_quantity > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tier with sold tickets'
      });
    }
    
    await pool.execute('DELETE FROM ticket_tiers WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Ticket tier deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket tier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ticket tier'
    });
  }
});

// Get user's tickets
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const pool = getPool();
    
    let whereClause = 'WHERE o.user_id = ?';
    let queryParams = [req.user.id];
    
    if (status) {
      whereClause += ' AND t.status = ?';
      queryParams.push(status);
    }
    
    const [tickets] = await pool.execute(
      `SELECT t.*, tt.name as tier_name, tt.price, e.title as event_title, 
              e.start_date, e.venue, e.city, o.order_number, o.status as order_status
       FROM tickets t
       JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
       JOIN events e ON tt.event_id = e.id
       JOIN orders o ON t.order_id = o.id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      queryParams
    );
    
    res.json({
      success: true,
      data: { tickets }
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets'
    });
  }
});

// Get single ticket
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const [tickets] = await pool.execute(
      `SELECT t.*, tt.name as tier_name, tt.price, e.title as event_title, 
              e.start_date, e.venue, e.city, o.order_number, o.status as order_status
       FROM tickets t
       JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
       JOIN events e ON tt.event_id = e.id
       JOIN orders o ON t.order_id = o.id
       WHERE t.id = ? AND o.user_id = ?`,
      [id, req.user.id]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    res.json({
      success: true,
      data: { ticket: tickets[0] }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket'
    });
  }
});

// Validate ticket (for event check-in)
router.post('/:id/validate', authenticateToken, requireRole(['organizer', 'admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Get ticket details
    const [tickets] = await pool.execute(
      `SELECT t.*, tt.event_id, e.title as event_title, e.organizer_id
       FROM tickets t
       JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
       JOIN events e ON tt.event_id = e.id
       WHERE t.id = ?`,
      [id]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    const ticket = tickets[0];
    
    // Check if user has permission to validate this ticket
    if (ticket.organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if ticket is already used
    if (ticket.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used',
        data: { usedAt: ticket.used_at }
      });
    }
    
    // Mark ticket as used
    await pool.execute(
      'UPDATE tickets SET status = "used", used_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Ticket validated successfully',
      data: {
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          attendeeName: ticket.attendee_name,
          eventTitle: ticket.event_title,
          usedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Validate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate ticket'
    });
  }
});

module.exports = router;
