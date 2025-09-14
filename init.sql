-- Initialize ticketing platform database
-- This file is used by Docker to initialize the MySQL database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ticketing_platform;
USE ticketing_platform;

-- Create admin user for initial setup
-- Note: This is for development only. In production, create admin through proper registration flow
INSERT IGNORE INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_verified
) VALUES (
    'admin@ticketing.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', -- password: admin123
    'Admin',
    'User',
    'admin',
    TRUE
);

-- Create sample organizer user
INSERT IGNORE INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_verified
) VALUES (
    'organizer@ticketing.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', -- password: admin123
    'Event',
    'Organizer',
    'organizer',
    TRUE
);

-- Create sample customer user
INSERT IGNORE INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_verified
) VALUES (
    'customer@ticketing.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', -- password: admin123
    'John',
    'Doe',
    'customer',
    TRUE
);

-- Create sample event
INSERT IGNORE INTO events (
    organizer_id,
    title,
    description,
    venue,
    address,
    city,
    state,
    country,
    start_date,
    end_date,
    category,
    status,
    max_attendees
) VALUES (
    2, -- organizer user
    'Tech Conference 2024',
    'Annual technology conference featuring the latest innovations in software development, AI, and cloud computing.',
    'Convention Center',
    '123 Tech Street',
    'San Francisco',
    'California',
    'USA',
    '2024-06-15 09:00:00',
    '2024-06-15 18:00:00',
    'Technology',
    'published',
    500
);

-- Create sample ticket tiers for the event
INSERT IGNORE INTO ticket_tiers (
    event_id,
    name,
    description,
    price,
    quantity,
    sales_start_date,
    sales_end_date
) VALUES 
(1, 'Early Bird', 'Early bird pricing - limited time offer', 99.00, 100, '2024-01-01 00:00:00', '2024-03-31 23:59:59'),
(1, 'Regular', 'Standard conference ticket', 149.00, 300, '2024-04-01 00:00:00', '2024-06-14 23:59:59'),
(1, 'VIP', 'VIP ticket with premium seating and lunch', 299.00, 50, '2024-01-01 00:00:00', '2024-06-14 23:59:59'),
(1, 'Student', 'Discounted ticket for students with valid ID', 79.00, 50, '2024-01-01 00:00:00', '2024-06-14 23:59:59');

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ticketing_platform.* TO 'ticketing_user'@'%';
FLUSH PRIVILEGES;




