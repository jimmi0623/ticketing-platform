const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { createCheckoutSession } = require('../config/stripe');
const { publishMessage } = require('../config/rabbitmq');
const { authenticateToken, requireVerified } = require('../middleware/auth');
const { validateOrderCreation, validateId } = require('../middleware/validation');

const router = express.Router();

// Create order and initiate payment
router.post('/', authenticateToken, requireVerified, validateOrderCreation, async (req, res) => {
  const connection = await getPool().getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { eventId, tickets, billingEmail, billingName, billingAddress, billingCity, 
            billingState, billingCountry, billingPostalCode } = req.body;
    
    // Check if event exists and is published
    const [events] = await connection.execute(
      'SELECT * FROM events WHERE id = ? AND status = "published"',
      [eventId]
    );
    
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Event not found or not available'
      });
    }
    
    const event = events[0];
    
    // Validate and check ticket availability with row-level locking
    let totalAmount = 0;
    const ticketTierUpdates = [];
    
    for (const ticket of tickets) {
      const [tiers] = await connection.execute(
        'SELECT * FROM ticket_tiers WHERE id = ? AND event_id = ? AND is_active = TRUE FOR UPDATE',
        [ticket.tierId, eventId]
      );
      
      if (tiers.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Ticket tier ${ticket.tierId} not found or inactive`
        });
      }
      
      const tier = tiers[0];
      
      // Check availability
      if (tier.sold_quantity + ticket.quantity > tier.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Not enough tickets available for ${tier.name}. Available: ${tier.quantity - tier.sold_quantity}`
        });
      }
      
      // Check sales dates
      const now = new Date();
      if (tier.sales_start_date && new Date(tier.sales_start_date) > now) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sales for ${tier.name} haven't started yet`
        });
      }
      
      if (tier.sales_end_date && new Date(tier.sales_end_date) < now) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sales for ${tier.name} have ended`
        });
      }
      
      totalAmount += tier.price * ticket.quantity;
      ticketTierUpdates.push({
        tierId: tier.id,
        quantity: ticket.quantity,
        price: tier.price,
        name: tier.name
      });
    }
    
    // Create order
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, event_id, order_number, total_amount, billing_email, billing_name, 
                          billing_address, billing_city, billing_state, billing_country, billing_postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, eventId, orderNumber, totalAmount, billingEmail, billingName,
       billingAddress, billingCity, billingState, billingCountry, billingPostalCode]
    );
    
    const orderId = orderResult.insertId;
    
    // Update sold quantities
    for (const update of ticketTierUpdates) {
      await connection.execute(
        'UPDATE ticket_tiers SET sold_quantity = sold_quantity + ? WHERE id = ?',
        [update.quantity, update.tierId]
      );
    }
    
    // Create ticket records
    const ticketRecords = [];
    for (const ticket of tickets) {
      const tier = ticketTierUpdates.find(t => t.tierId === ticket.tierId);
      
      for (let i = 0; i < ticket.quantity; i++) {
        const ticketCode = `TKT-${uuidv4().toUpperCase()}`;
        const [ticketResult] = await connection.execute(
          `INSERT INTO tickets (order_id, ticket_tier_id, ticket_code, attendee_name, attendee_email)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, ticket.tierId, ticketCode, ticket.attendeeName, ticket.attendeeEmail]
        );
        
        ticketRecords.push({
          id: ticketResult.insertId,
          ticketCode,
          tierName: tier.name,
          price: tier.price,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail
        });
      }
    }
    
    await connection.commit();
    
    // Create Stripe checkout session
    const successUrl = `${process.env.FRONTEND_URL}/orders/success?order_id=${orderId}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/events/${eventId}`;
    
    const checkoutSession = await createCheckoutSession({
      orderId,
      eventId,
      eventTitle: event.title,
      totalAmount,
      tickets: ticketTierUpdates.map((tier, index) => ({
        tierId: tier.tierId,
        tierName: tier.name,
        price: tier.price,
        quantity: tickets[index].quantity,
        attendeeName: tickets[index].attendeeName,
        attendeeEmail: tickets[index].attendeeEmail
      })),
      billingEmail,
      successUrl,
      cancelUrl
    });
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId,
        orderNumber,
        checkoutUrl: checkoutSession.url,
        totalAmount
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  } finally {
    connection.release();
  }
});

// Get user's orders
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();
    
    let whereClause = 'WHERE o.user_id = ?';
    let queryParams = [req.user.id];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      queryParams.push(status);
    }
    
    const [orders] = await pool.execute(
      `SELECT o.*, e.title as event_title, e.start_date, e.venue, e.city,
              COUNT(t.id) as ticket_count
       FROM orders o
       JOIN events e ON o.event_id = e.id
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
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get single order
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const [orders] = await pool.execute(
      `SELECT o.*, e.title as event_title, e.start_date, e.venue, e.city, e.address
       FROM orders o
       JOIN events e ON o.event_id = e.id
       WHERE o.id = ? AND o.user_id = ?`,
      [id, req.user.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Get tickets for this order
    const [tickets] = await pool.execute(
      `SELECT t.*, tt.name as tier_name, tt.price
       FROM tickets t
       JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
       WHERE t.order_id = ?
       ORDER BY t.created_at ASC`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        order: {
          ...order,
          tickets
        }
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Cancel order (if not paid)
router.post('/:id/cancel', authenticateToken, validateId, async (req, res) => {
  const connection = await getPool().getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if order exists and belongs to user
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Check if order can be cancelled
    if (order.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }
    
    // Update order status
    await connection.execute(
      'UPDATE orders SET status = "cancelled" WHERE id = ?',
      [id]
    );
    
    // Release reserved tickets
    await connection.execute(
      `UPDATE ticket_tiers tt 
       JOIN tickets t ON tt.id = t.ticket_tier_id 
       SET tt.sold_quantity = tt.sold_quantity - 1 
       WHERE t.order_id = ?`,
      [id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  } finally {
    connection.release();
  }
});

// Stripe webhook endpoint
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { handleWebhook } = require('../config/stripe');
    await handleWebhook(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
