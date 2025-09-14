const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getPool } = require('./database');
const { publishMessage } = require('./rabbitmq');

// Create payment intent
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    throw error;
  }
};

// Create checkout session
const createCheckoutSession = async (orderData) => {
  try {
    const { orderId, eventTitle, totalAmount, tickets, successUrl, cancelUrl } = orderData;

    // Create line items for Stripe
    const lineItems = tickets.map(ticket => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${eventTitle} - ${ticket.tierName}`,
          description: `${ticket.quantity} ticket(s) for ${ticket.attendeeName}`,
        },
        unit_amount: Math.round(ticket.price * 100), // Convert to cents
      },
      quantity: ticket.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: orderId.toString(),
        eventId: orderData.eventId.toString(),
      },
      customer_email: orderData.billingEmail,
    });

    return session;
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    throw error;
  }
};

// Handle webhook events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const pool = getPool();
    const { orderId } = paymentIntent.metadata;

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = "paid", stripe_payment_intent_id = ? WHERE id = ?',
      [paymentIntent.id, orderId]
    );

    // Get order details for email
    const [orders] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name, u.email, e.title as event_title 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       JOIN events e ON o.event_id = e.id 
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length > 0) {
      const order = orders[0];

      // Get ticket details
      const [tickets] = await pool.execute(
        `SELECT t.*, tt.name as tier_name, tt.price 
         FROM tickets t 
         JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id 
         WHERE t.order_id = ?`,
        [orderId]
      );

      // Send confirmation email
      await publishMessage('email_notifications', {
        type: 'order_confirmation',
        to: order.email,
        data: {
          order,
          tickets,
          paymentIntent
        }
      });

      // Generate tickets
      await publishMessage('ticket_generation', {
        orderId,
        tickets
      });
    }

    console.log(`Payment succeeded for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle payment failure
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const pool = getPool();
    const { orderId } = paymentIntent.metadata;

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = "cancelled" WHERE id = ?',
      [orderId]
    );

    // Release reserved tickets
    await pool.execute(
      `UPDATE ticket_tiers tt 
       JOIN tickets t ON tt.id = t.ticket_tier_id 
       SET tt.sold_quantity = tt.sold_quantity - 1 
       WHERE t.order_id = ?`,
      [orderId]
    );

    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Handle checkout completion
const handleCheckoutCompleted = async (session) => {
  try {
    const pool = getPool();
    const { orderId } = session.metadata;

    // Update order with session ID
    await pool.execute(
      'UPDATE orders SET stripe_session_id = ? WHERE id = ?',
      [session.id, orderId]
    );

    console.log(`Checkout completed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
};

// Handle payment cancellation
const handlePaymentCanceled = async (paymentIntent) => {
  try {
    const pool = getPool();
    const { orderId } = paymentIntent.metadata;

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = "cancelled" WHERE id = ?',
      [orderId]
    );

    // Release reserved tickets
    await pool.execute(
      `UPDATE ticket_tiers tt 
       JOIN tickets t ON tt.id = t.ticket_tier_id 
       SET tt.sold_quantity = tt.sold_quantity - 1 
       WHERE t.order_id = ?`,
      [orderId]
    );

    console.log(`Payment canceled for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
};

// Refund payment
const refundPayment = async (paymentIntentId, amount = null) => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  handleWebhook,
  refundPayment
};
