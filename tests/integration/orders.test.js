const request = require('supertest');
const app = require('../../server-enhanced');
const { 
  createTestUser, 
  createTestEvent, 
  createTestTicketTier, 
  generateTestToken 
} = require('../setup');

describe('Order Management Integration Tests', () => {
  let customer, organizer, event, ticketTier;

  beforeEach(async () => {
    // Create test users
    customer = await createTestUser({
      email: 'customer@example.com',
      role: 'customer',
      is_verified: true
    });

    organizer = await createTestUser({
      email: 'organizer@example.com',
      role: 'organizer',
      is_verified: true
    });

    // Create test event
    event = await createTestEvent(organizer.id, {
      title: 'Integration Test Event',
      start_date: new Date(Date.now() + 86400000), // Tomorrow
      end_date: new Date(Date.now() + 90000000)    // Tomorrow + 1 hour
    });

    // Create test ticket tier
    ticketTier = await createTestTicketTier(event.id, {
      name: 'Standard',
      price: 100.00,
      quantity: 50,
      sold_quantity: 0
    });
  });

  describe('POST /api/orders', () => {
    it('should create order with valid data', async () => {
      const customerToken = generateTestToken(customer.id, customer.role);
      
      const orderData = {
        eventId: event.id,
        tickets: [
          {
            tierId: ticketTier.id,
            quantity: 2,
            attendeeName: 'John Doe',
            attendeeEmail: 'john@example.com'
          }
        ],
        billingEmail: customer.email,
        billingName: `${customer.first_name} ${customer.last_name}`,
        billingAddress: '123 Main St',
        billingCity: 'Test City',
        billingState: 'Test State',
        billingCountry: 'Test Country',
        billingPostalCode: '12345'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
      expect(response.body.data.orderNumber).toBeDefined();
      expect(response.body.data.checkoutUrl).toBeDefined();
      expect(response.body.data.totalAmount).toBe(200.00); // 2 tickets × $100
    });

    it('should reject order for non-verified user', async () => {
      const unverifiedUser = await createTestUser({
        email: 'unverified@example.com',
        is_verified: false
      });
      const token = generateTestToken(unverifiedUser.id);

      const orderData = {
        eventId: event.id,
        tickets: [
          {
            tierId: ticketTier.id,
            quantity: 1,
            attendeeName: 'Jane Doe',
            attendeeEmail: 'jane@example.com'
          }
        ],
        billingEmail: 'unverified@example.com',
        billingName: 'Unverified User'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verification required');
    });

    it('should handle ticket availability correctly', async () => {
      const customerToken = generateTestToken(customer.id, customer.role);
      
      // Try to order more tickets than available
      const orderData = {
        eventId: event.id,
        tickets: [
          {
            tierId: ticketTier.id,
            quantity: 60, // More than the 50 available
            attendeeName: 'John Doe',
            attendeeEmail: 'john@example.com'
          }
        ],
        billingEmail: customer.email,
        billingName: 'Customer Name'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not enough tickets available');
    });

    it('should enforce order rate limiting', async () => {
      const customerToken = generateTestToken(customer.id, customer.role);
      
      const orderData = {
        eventId: event.id,
        tickets: [
          {
            tierId: ticketTier.id,
            quantity: 1,
            attendeeName: 'Rate Limit Test',
            attendeeEmail: 'ratetest@example.com'
          }
        ],
        billingEmail: customer.email,
        billingName: 'Customer'
      };

      // Make multiple order attempts quickly
      const promises = Array(12).fill().map(() =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(orderData)
      );

      const responses = await Promise.allSettled(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(result => 
        result.value && result.value.status === 429
      );
      
      expect(rateLimited).toBe(true);
    }, 15000);

    it('should validate ticket tier belongs to event', async () => {
      const customerToken = generateTestToken(customer.id, customer.role);
      
      // Create another event and ticket tier
      const anotherEvent = await createTestEvent(organizer.id, {
        title: 'Another Event'
      });
      const anotherTier = await createTestTicketTier(anotherEvent.id);

      const orderData = {
        eventId: event.id, // Different event
        tickets: [
          {
            tierId: anotherTier.id, // Tier from different event
            quantity: 1,
            attendeeName: 'John Doe',
            attendeeEmail: 'john@example.com'
          }
        ],
        billingEmail: customer.email,
        billingName: 'Customer'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent order attempts correctly', async () => {
      // Create a ticket tier with limited availability
      const limitedTier = await createTestTicketTier(event.id, {
        name: 'Limited',
        quantity: 2, // Only 2 tickets available
        price: 150.00
      });

      // Create multiple customers
      const customer1 = await createTestUser({
        email: 'customer1@example.com',
        is_verified: true
      });
      const customer2 = await createTestUser({
        email: 'customer2@example.com',
        is_verified: true
      });

      const token1 = generateTestToken(customer1.id);
      const token2 = generateTestToken(customer2.id);

      const orderData1 = {
        eventId: event.id,
        tickets: [
          {
            tierId: limitedTier.id,
            quantity: 2,
            attendeeName: 'Customer One',
            attendeeEmail: customer1.email
          }
        ],
        billingEmail: customer1.email,
        billingName: 'Customer One'
      };

      const orderData2 = {
        eventId: event.id,
        tickets: [
          {
            tierId: limitedTier.id,
            quantity: 1,
            attendeeName: 'Customer Two',
            attendeeEmail: customer2.email
          }
        ],
        billingEmail: customer2.email,
        billingName: 'Customer Two'
      };

      // Make concurrent requests
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${token1}`)
          .send(orderData1),
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${token2}`)
          .send(orderData2)
      ]);

      // One should succeed, one should fail due to insufficient tickets
      const successCount = [response1, response2].filter(r => r.status === 201).length;
      const failCount = [response1, response2].filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    }, 10000);
  });

  describe('GET /api/orders/my', () => {
    let customerOrder;

    beforeEach(async () => {
      // Create a test order first
      const customerToken = generateTestToken(customer.id);
      
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId: event.id,
          tickets: [{
            tierId: ticketTier.id,
            quantity: 1,
            attendeeName: 'Test User',
            attendeeEmail: customer.email
          }],
          billingEmail: customer.email,
          billingName: 'Test User'
        });

      customerOrder = orderResponse.body.data;
    });

    it('should return user orders', async () => {
      const customerToken = generateTestToken(customer.id);

      const response = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].order_number).toBe(customerOrder.orderNumber);
    });

    it('should support pagination', async () => {
      const customerToken = generateTestToken(customer.id);

      const response = await request(app)
        .get('/api/orders/my?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const customerToken = generateTestToken(customer.id);

      const response = await request(app)
        .get('/api/orders/my?status=pending')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.orders.forEach(order => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('Order Security', () => {
    it('should prevent unauthorized access to other users orders', async () => {
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        is_verified: true
      });
      const anotherToken = generateTestToken(anotherUser.id);

      const response = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(200);

      expect(response.body.data.orders).toHaveLength(0);
    });

    it('should require authentication for order creation', async () => {
      const orderData = {
        eventId: event.id,
        tickets: [{
          tierId: ticketTier.id,
          quantity: 1,
          attendeeName: 'Unauthorized',
          attendeeEmail: 'unauth@example.com'
        }],
        billingEmail: 'unauth@example.com',
        billingName: 'Unauthorized'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(401);

      expect(response.body.message).toContain('Access token required');
    });
  });
});