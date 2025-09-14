const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import security middleware
const {
  validateEnvVars,
  authRateLimit,
  orderRateLimit,
  searchRateLimit,
  sanitizeInput,
  getCorsOptions,
  securityHeaders,
  validateApiKey,
  requestLogger,
  validateContentType
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

// Import configurations
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate environment variables on startup
try {
  validateEnvVars();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

// Trust proxy if behind reverse proxy
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security middleware (order matters!)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(securityHeaders);
app.use(cors(getCorsOptions()));
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}
app.use(requestLogger);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and validation
app.use(sanitizeInput);
app.use(validateContentType);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      database: 'connected', // You could add actual health checks here
      redis: 'connected',
      rabbitmq: 'connected'
    }
  });
});

// Enhanced health check with detailed status
app.get('/health/detailed', validateApiKey, async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    services: {}
  };

  try {
    // Check database connection
    const { getPool } = require('./config/database');
    const pool = getPool();
    const [rows] = await pool.execute('SELECT 1 as test');
    health.services.database = rows[0].test === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'DEGRADED';
  }

  try {
    // Check Redis connection
    const { getRedisClient } = require('./config/redis');
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'DEGRADED';
  }

  res.status(health.status === 'OK' ? 200 : 503).json(health);
});

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/events', searchRateLimit, eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/orders', orderRateLimit, orderRoutes);
app.use('/api/admin', validateApiKey, adminRoutes);
app.use('/api/users', userRoutes);

// Webhook endpoint for Stripe (no rate limiting, raw body needed)
app.post('/webhook/stripe', 
  express.raw({ type: 'application/json' }), 
  require('./config/stripe').handleWebhook
);

// API documentation endpoint (if in development)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/docs', (req, res) => {
    res.json({
      title: 'Ticketing Platform API',
      version: '1.0.0',
      description: 'RESTful API for ticketing and event management',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Register a new user',
          'POST /api/auth/login': 'Login user',
          'POST /api/auth/verify-email': 'Verify email address',
          'GET /api/auth/me': 'Get current user profile'
        },
        events: {
          'GET /api/events': 'List all events (public)',
          'GET /api/events/:id': 'Get event details',
          'POST /api/events': 'Create new event (organizer/admin)',
          'PUT /api/events/:id': 'Update event (organizer/admin)'
        },
        orders: {
          'POST /api/orders': 'Create new order',
          'GET /api/orders/my': 'Get user orders',
          'GET /api/orders/:id': 'Get order details'
        },
        admin: {
          'GET /api/admin/stats': 'Platform statistics',
          'GET /api/admin/analytics/revenue': 'Revenue analytics',
          'GET /api/admin/users': 'List users'
        }
      },
      rateLimit: {
        auth: '5 requests per 15 minutes',
        orders: '10 requests per minute', 
        search: '50 requests per minute',
        general: '100 requests per 15 minutes'
      }
    });
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  logger.info(`${signal} received, shutting down gracefully`);
  
  const server = app.listen(PORT);
  server.close(() => {
    console.log('HTTP server closed');
    logger.info('HTTP server closed');
    
    // Close database connections, Redis, RabbitMQ, etc.
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    await connectRabbitMQ();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
      
      logger.info(`Server started on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        nodeVersion: process.version
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        logger.error('Server error:', error);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;