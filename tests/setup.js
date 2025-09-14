const { connectDB } = require('../config/database');
const { connectRedis } = require('../config/redis');
const { connectRabbitMQ } = require('../config/rabbitmq');

// Test database configuration
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'ticketing_platform_test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
process.env.REDIS_DB = '1'; // Use different Redis database for tests

let pool, redis, rabbitmq;

// Setup before all tests
beforeAll(async () => {
  try {
    pool = await connectDB();
    redis = await connectRedis();
    rabbitmq = await connectRabbitMQ();
    
    // Clean test database
    await cleanDatabase();
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
}, 30000);

// Cleanup after each test
afterEach(async () => {
  await cleanDatabase();
});

// Cleanup after all tests
afterAll(async () => {
  try {
    if (pool) {
      await pool.end();
    }
    if (redis) {
      await redis.quit();
    }
    if (rabbitmq) {
      await rabbitmq.close();
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

async function cleanDatabase() {
  if (!pool) return;
  
  try {
    // Clean tables in correct order (respecting foreign keys)
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('TRUNCATE TABLE tickets');
    await pool.execute('TRUNCATE TABLE orders');
    await pool.execute('TRUNCATE TABLE ticket_tiers');
    await pool.execute('TRUNCATE TABLE events');
    await pool.execute('TRUNCATE TABLE users');
    await pool.execute('TRUNCATE TABLE analytics_cache');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Clean Redis test database
    if (redis) {
      await redis.flushDb();
    }
  } catch (error) {
    console.error('Database cleanup failed:', error);
  }
}

// Test data factories
const createTestUser = async (overrides = {}) => {
  const bcrypt = require('bcryptjs');
  const defaultUser = {
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 12),
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
    is_verified: true
  };
  
  const user = { ...defaultUser, ...overrides };
  const [result] = await pool.execute(
    `INSERT INTO users (email, password, first_name, last_name, role, is_verified) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.email, user.password, user.first_name, user.last_name, user.role, user.is_verified]
  );
  
  return { ...user, id: result.insertId };
};

const createTestEvent = async (organizerId, overrides = {}) => {
  const defaultEvent = {
    organizer_id: organizerId,
    title: 'Test Event',
    description: 'A test event',
    venue: 'Test Venue',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    start_date: new Date(Date.now() + 86400000), // Tomorrow
    end_date: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
    category: 'Technology',
    status: 'published',
    max_attendees: 100
  };
  
  const event = { ...defaultEvent, ...overrides };
  const [result] = await pool.execute(
    `INSERT INTO events (organizer_id, title, description, venue, address, city, state, country, 
                        start_date, end_date, category, status, max_attendees)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(event)
  );
  
  return { ...event, id: result.insertId };
};

const createTestTicketTier = async (eventId, overrides = {}) => {
  const defaultTier = {
    event_id: eventId,
    name: 'General Admission',
    description: 'General admission ticket',
    price: 50.00,
    quantity: 100,
    sold_quantity: 0,
    is_active: true
  };
  
  const tier = { ...defaultTier, ...overrides };
  const [result] = await pool.execute(
    `INSERT INTO ticket_tiers (event_id, name, description, price, quantity, sold_quantity, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    Object.values(tier)
  );
  
  return { ...tier, id: result.insertId };
};

// JWT helper for tests
const generateTestToken = (userId, role = 'customer') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  cleanDatabase,
  createTestUser,
  createTestEvent,
  createTestTicketTier,
  generateTestToken
};