/**
 * Integration Example: Adding API Documentation to Express Server
 * 
 * This file demonstrates how to integrate the comprehensive API documentation
 * system into your existing Express.js ticketing platform server.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import documentation middleware
const { 
  documentationRouter, 
  generateDocumentationFiles 
} = require('../middleware/documentation');

// Import other middleware (examples)
const { securityMiddleware } = require('../middleware/security');
const { monitoringMiddleware } = require('../middleware/monitoring');
const logger = require('../config/logger');

class DocumentedTicketingServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeDocumentation();
    this.initializeErrorHandling();
  }

  /**
   * Initialize core middleware
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "https://unpkg.com",
            "https://cdn.jsdelivr.net"
          ],
          styleSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "https://unpkg.com",
            "https://fonts.googleapis.com"
          ],
          fontSrc: [
            "'self'", 
            "https://fonts.gstatic.com"
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : true,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true 
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request monitoring
    if (monitoringMiddleware) {
      this.app.use(monitoringMiddleware);
    }

    // Basic rate limiting for documentation
    const docRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many documentation requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/api/docs', docRateLimit);
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'healthy', // Replace with actual health checks
          redis: 'healthy',
          rabbitmq: 'healthy'
        }
      });
    });

    // API routes (examples - replace with your actual routes)
    this.app.use('/api/auth', this.createAuthRoutes());
    this.app.use('/api/events', this.createEventRoutes());
    this.app.use('/api/orders', this.createOrderRoutes());
    this.app.use('/api/users', this.createUserRoutes());
    
    // Admin routes with additional security
    this.app.use('/api/admin', this.createAdminRoutes());
  }

  /**
   * Initialize API documentation
   */
  initializeDocumentation() {
    // Mount documentation router
    this.app.use('/api/docs', documentationRouter);

    // Alternative documentation endpoints
    this.app.get('/docs', (req, res) => {
      res.redirect('/api/docs');
    });

    this.app.get('/api-docs', (req, res) => {
      res.redirect('/api/docs');
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Ticketing Platform API',
        version: '1.0.0',
        description: 'RESTful API for comprehensive ticketing and event management',
        documentation: {
          swagger: `${req.protocol}://${req.get('host')}/api/docs`,
          openapi: `${req.protocol}://${req.get('host')}/api/docs/openapi.json`,
          markdown: `${req.protocol}://${req.get('host')}/api/docs/README.md`,
          postman: `${req.protocol}://${req.get('host')}/api/docs/postman`,
          examples: `${req.protocol}://${req.get('host')}/api/docs/examples`
        },
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          events: '/api/events',
          orders: '/api/orders',
          users: '/api/users',
          admin: '/api/admin'
        }
      });
    });

    // Generate static documentation files on startup
    this.generateStaticDocs();
  }

  /**
   * Generate static documentation files
   */
  async generateStaticDocs() {
    try {
      await generateDocumentationFiles();
      logger.info('📚 Static API documentation generated successfully');
    } catch (error) {
      logger.error('Failed to generate static documentation', error);
    }
  }

  /**
   * Create example auth routes (replace with your actual implementation)
   */
  createAuthRoutes() {
    const router = express.Router();

    router.post('/register', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'User registration endpoint (not implemented in example)' 
      });
    });

    router.post('/login', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'User login endpoint (not implemented in example)' 
      });
    });

    router.get('/me', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Get current user endpoint (not implemented in example)' 
      });
    });

    return router;
  }

  /**
   * Create example event routes (replace with your actual implementation)
   */
  createEventRoutes() {
    const router = express.Router();

    router.get('/', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'List events endpoint (not implemented in example)',
        data: {
          events: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          }
        }
      });
    });

    router.post('/', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Create event endpoint (not implemented in example)' 
      });
    });

    router.get('/:id', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Get event by ID endpoint (not implemented in example)' 
      });
    });

    return router;
  }

  /**
   * Create example order routes (replace with your actual implementation)
   */
  createOrderRoutes() {
    const router = express.Router();

    router.post('/', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Create order endpoint (not implemented in example)' 
      });
    });

    router.get('/my', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Get user orders endpoint (not implemented in example)' 
      });
    });

    return router;
  }

  /**
   * Create example user routes (replace with your actual implementation)
   */
  createUserRoutes() {
    const router = express.Router();

    router.get('/profile', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Get user profile endpoint (not implemented in example)' 
      });
    });

    router.put('/profile', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Update user profile endpoint (not implemented in example)' 
      });
    });

    return router;
  }

  /**
   * Create example admin routes (replace with your actual implementation)
   */
  createAdminRoutes() {
    const router = express.Router();

    // Admin middleware placeholder
    router.use((req, res, next) => {
      // Add your admin authentication/authorization logic here
      next();
    });

    router.get('/stats', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Admin statistics endpoint (not implemented in example)' 
      });
    });

    router.get('/events', (req, res) => {
      // Implementation placeholder
      res.json({ 
        success: true, 
        message: 'Admin events management endpoint (not implemented in example)' 
      });
    });

    return router;
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        documentation: `${req.protocol}://${req.get('host')}/api/docs`
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      this.app.listen(this.port, () => {
        logger.info(`🚀 Ticketing Platform API server started on port ${this.port}`);
        logger.info(`📚 API Documentation available at: http://localhost:${this.port}/api/docs`);
        logger.info(`🔍 OpenAPI Specification at: http://localhost:${this.port}/api/docs/openapi.json`);
        logger.info(`📄 Postman Collection at: http://localhost:${this.port}/api/docs/postman`);
        logger.info(`💡 API Examples at: http://localhost:${this.port}/api/docs/examples`);
        logger.info(`❤️  Health Check at: http://localhost:${this.port}/health`);
        
        console.log('\n🎫 Ticketing Platform API');
        console.log('=========================');
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Port: ${this.port}`);
        console.log(`Documentation: http://localhost:${this.port}/api/docs`);
        console.log('=========================\n');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('🛑 Shutting down server gracefully...');
    
    // Perform cleanup operations here
    // - Close database connections
    // - Clear caches
    // - Cancel running processes
    
    process.exit(0);
  }
}

// Handle process signals for graceful shutdown
if (require.main === module) {
  const server = new DocumentedTicketingServer();

  // Graceful shutdown handlers
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    server.shutdown();
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    server.shutdown();
  });

  // Start the server
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = DocumentedTicketingServer;