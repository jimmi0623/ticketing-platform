const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');

// Environment variable validation
const validateEnvVars = () => {
  const required = [
    'JWT_SECRET',
    'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
    'REDIS_HOST',
    'STRIPE_SECRET_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate email configuration
  if (process.env.EMAIL_USER && !validator.isEmail(process.env.EMAIL_USER)) {
    throw new Error('EMAIL_USER must be a valid email address');
  }

  console.log('✅ Environment variables validated successfully');
};

// Enhanced rate limiting middleware factory
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = null) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: false,
    // Custom key generator for user-based limiting
    keyGenerator: (req) => {
      return req.user ? `user_${req.user.id}` : req.ip;
    }
  });
};

// Specific rate limiters for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
    type: 'AUTH_LIMIT_EXCEEDED'
  }
);

const orderRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  parseInt(process.env.RATE_LIMIT_ORDER_MAX) || 10,
  {
    success: false,
    message: 'Too many order attempts, please try again in 1 minute.',
    type: 'ORDER_LIMIT_EXCEEDED'
  }
);

const searchRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  parseInt(process.env.RATE_LIMIT_SEARCH_MAX) || 50,
  {
    success: false,
    message: 'Too many search requests, please try again in 1 minute.',
    type: 'SEARCH_LIMIT_EXCEEDED'
  }
);

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  try {
    // Remove any keys that start with '$' or contain '.'
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`Sanitized potentially dangerous key: ${key} from ${req.ip}`);
      }
    })(req, res, () => {});

    // Sanitize string inputs against XSS
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return xss(obj, {
          whiteList: {}, // No HTML tags allowed
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        });
      } else if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    // Sanitize body, query, and params
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input data format'
    });
  }
};

// CORS configuration based on environment
const getCorsOptions = () => {
  const origins = process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
    ['http://localhost:3000'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (origins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// API key validation middleware (for admin endpoints)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers[process.env.API_KEY_HEADER || 'x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;
  
  if (!validApiKey) {
    return next(); // Skip if no API key is configured
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }
  
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    
    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`Security alert: ${req.method} ${req.url} - ${res.statusCode} from ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Validate content type for POST/PUT requests
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

module.exports = {
  validateEnvVars,
  createRateLimit,
  authRateLimit,
  orderRateLimit,
  searchRateLimit,
  sanitizeInput,
  getCorsOptions,
  securityHeaders,
  validateApiKey,
  requestLogger,
  validateContentType
};