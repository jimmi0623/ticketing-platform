const { getPool } = require('../config/database');
const { sendEmail } = require('./emailService');
const { publishMessage } = require('../config/rabbitmq');

// Process email notifications
const processEmailNotification = async (message) => {
  try {
    const { type, to, data } = message;
    
    switch (type) {
      case 'verification':
        await sendEmail(to, 'verification', data);
        break;
        
      case 'password_reset':
        await sendEmail(to, 'passwordReset', data);
        break;
        
      case 'order_confirmation':
        await sendEmail(to, 'orderConfirmation', data);
        break;
        
      case 'ticket_reminder':
        await sendEmail(to, 'ticketReminder', data);
        break;
        
      default:
        console.log(`Unknown email type: ${type}`);
    }
  } catch (error) {
    console.error('Email notification processing error:', error);
    throw error;
  }
};

// Process analytics data
const processAnalytics = async (message) => {
  try {
    const { type, data } = message;
    const pool = getPool();
    
    switch (type) {
      case 'event_view':
        // Update event view count
        await pool.execute(
          'UPDATE events SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
          [data.eventId]
        );
        break;
        
      case 'ticket_purchase':
        // Update purchase analytics
        await pool.execute(
          `INSERT INTO analytics_cache (cache_key, data, expires_at) 
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
           ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)`,
          [`purchase:${data.eventId}:${new Date().toISOString().split('T')[0]}`, JSON.stringify(data)]
        );
        break;
        
      case 'user_activity':
        // Track user activity
        await pool.execute(
          `INSERT INTO analytics_cache (cache_key, data, expires_at) 
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))
           ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)`,
          [`activity:${data.userId}:${new Date().toISOString().split('T')[0]}`, JSON.stringify(data)]
        );
        break;
        
      default:
        console.log(`Unknown analytics type: ${type}`);
    }
  } catch (error) {
    console.error('Analytics processing error:', error);
    throw error;
  }
};

// Process ticket generation
const processTicketGeneration = async (message) => {
  try {
    const { orderId, tickets } = message;
    const pool = getPool();
    
    // Generate QR codes for tickets (simplified - in production, use a QR code library)
    for (const ticket of tickets) {
      const qrCodeData = {
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code,
        eventId: ticket.event_id,
        orderId: orderId
      };
      
      // In production, generate actual QR code image
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrCodeData))}`;
      
      await pool.execute(
        'UPDATE tickets SET qr_code = ? WHERE id = ?',
        [qrCodeUrl, ticket.id]
      );
    }
    
    console.log(`🎫 Generated QR codes for ${tickets.length} tickets in order ${orderId}`);
  } catch (error) {
    console.error('Ticket generation processing error:', error);
    throw error;
  }
};

// Process payment webhooks
const processPaymentWebhook = async (message) => {
  try {
    const { type, data } = message;
    const pool = getPool();
    
    switch (type) {
      case 'payment_success':
        // Update order status and send confirmation
        await pool.execute(
          'UPDATE orders SET status = "paid" WHERE id = ?',
          [data.orderId]
        );
        
        // Send confirmation email
        await publishMessage('email_notifications', {
          type: 'order_confirmation',
          to: data.email,
          data: data
        });
        break;
        
      case 'payment_failed':
        // Update order status and release tickets
        await pool.execute(
          'UPDATE orders SET status = "cancelled" WHERE id = ?',
          [data.orderId]
        );
        
        // Release reserved tickets
        await pool.execute(
          `UPDATE ticket_tiers tt 
           JOIN tickets t ON tt.id = t.ticket_tier_id 
           SET tt.sold_quantity = tt.sold_quantity - 1 
           WHERE t.order_id = ?`,
          [data.orderId]
        );
        break;
        
      case 'refund_processed':
        // Update order status
        await pool.execute(
          'UPDATE orders SET status = "refunded" WHERE id = ?',
          [data.orderId]
        );
        break;
        
      default:
        console.log(`Unknown payment webhook type: ${type}`);
    }
  } catch (error) {
    console.error('Payment webhook processing error:', error);
    throw error;
  }
};

// Schedule ticket reminders
const scheduleTicketReminders = async () => {
  try {
    const pool = getPool();
    
    // Find events starting in 24 hours
    const [events] = await pool.execute(
      `SELECT e.*, t.*, o.billing_email, o.billing_name
       FROM events e
       JOIN ticket_tiers tt ON e.id = tt.event_id
       JOIN tickets t ON tt.id = t.ticket_tier_id
       JOIN orders o ON t.order_id = o.id
       WHERE e.start_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
       AND e.status = 'published'
       AND o.status = 'paid'
       AND t.status = 'active'`
    );
    
    for (const event of events) {
      await publishMessage('email_notifications', {
        type: 'ticket_reminder',
        to: event.billing_email,
        data: {
          attendeeName: event.attendee_name,
          event: {
            title: event.title,
            start_date: event.start_date,
            venue: event.venue,
            address: event.address
          },
          ticket: {
            ticket_code: event.ticket_code,
            attendee_name: event.attendee_name
          }
        }
      });
    }
    
    console.log(`📅 Scheduled ${events.length} ticket reminders`);
  } catch (error) {
    console.error('Schedule ticket reminders error:', error);
  }
};

// Clean up expired data
const cleanupExpiredData = async () => {
  try {
    const pool = getPool();
    
    // Clean up expired verification tokens
    await pool.execute(
      'UPDATE users SET verification_token = NULL WHERE verification_token IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    
    // Clean up expired password reset tokens
    await pool.execute(
      'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE reset_password_expires < NOW()'
    );
    
    // Clean up expired analytics cache
    await pool.execute(
      'DELETE FROM analytics_cache WHERE expires_at < NOW()'
    );
    
    // Clean up old cancelled orders (older than 30 days)
    await pool.execute(
      'DELETE FROM orders WHERE status = "cancelled" AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    
    console.log('🧹 Cleaned up expired data');
  } catch (error) {
    console.error('Cleanup expired data error:', error);
  }
};

module.exports = {
  processEmailNotification,
  processAnalytics,
  processTicketGeneration,
  processPaymentWebhook,
  scheduleTicketReminders,
  cleanupExpiredData
};
