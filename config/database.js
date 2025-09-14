const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ticketing_platform',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      idleTimeout: 60000
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();

    // Initialize database schema
    await initializeSchema();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

const initializeSchema = async () => {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'organizer', 'customer') DEFAULT 'customer',
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        reset_password_token VARCHAR(255),
        reset_password_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      )
    `);

    // Create events table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        organizer_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        venue VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        image_url VARCHAR(500),
        category VARCHAR(100),
        status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft',
        max_attendees INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_organizer (organizer_id),
        INDEX idx_status (status),
        INDEX idx_start_date (start_date),
        INDEX idx_category (category),
        INDEX idx_city (city)
      )
    `);

    // Create ticket_tiers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        event_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        sold_quantity INT DEFAULT 0,
        sales_start_date DATETIME,
        sales_end_date DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_event (event_id),
        INDEX idx_active (is_active)
      )
    `);

    // Create orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        event_id INT NOT NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
        stripe_payment_intent_id VARCHAR(255),
        stripe_session_id VARCHAR(255),
        payment_method VARCHAR(50),
        billing_email VARCHAR(255) NOT NULL,
        billing_name VARCHAR(255) NOT NULL,
        billing_address TEXT,
        billing_city VARCHAR(100),
        billing_state VARCHAR(100),
        billing_country VARCHAR(100),
        billing_postal_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_event (event_id),
        INDEX idx_status (status),
        INDEX idx_order_number (order_number)
      )
    `);

    // Create tickets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        ticket_tier_id INT NOT NULL,
        ticket_code VARCHAR(50) UNIQUE NOT NULL,
        attendee_name VARCHAR(255) NOT NULL,
        attendee_email VARCHAR(255) NOT NULL,
        status ENUM('active', 'used', 'cancelled', 'refunded') DEFAULT 'active',
        used_at DATETIME,
        qr_code VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_tier_id) REFERENCES ticket_tiers(id) ON DELETE CASCADE,
        INDEX idx_order (order_id),
        INDEX idx_ticket_tier (ticket_tier_id),
        INDEX idx_ticket_code (ticket_code),
        INDEX idx_status (status)
      )
    `);

    // Create analytics table for caching
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analytics_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        data JSON NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cache_key (cache_key),
        INDEX idx_expires (expires_at)
      )
    `);

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getPool
};
