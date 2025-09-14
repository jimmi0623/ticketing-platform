const { body, query, param, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Custom validation error formatter
const formatValidationErrors = (errors) => {
  return {
    success: false,
    message: 'Validation failed',
    errors: errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
      location: err.location
    })),
    timestamp: new Date().toISOString()
  };
};

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors);
    logger.warn('Validation failed', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      errors: formattedErrors.errors,
      userAgent: req.get('User-Agent')
    });
    return res.status(400).json(formattedErrors);
  }
  next();
};

// Enhanced User Validation Rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .custom(async (value) => {
      // Check for disposable email domains
      const disposableDomains = [
        'tempmail.org', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email'
      ];
      const domain = value.split('@')[1];
      if (disposableDomains.includes(domain)) {
        throw new Error('Disposable email addresses are not allowed');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  
  body('role')
    .optional()
    .isIn(['customer', 'organizer'])
    .withMessage('Role must be either customer or organizer'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
  
  handleValidationErrors
];

// Enhanced Event Validation Rules
const validateEventCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Event title must be between 3 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
    .withMessage('Event title contains invalid characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Event description must be between 10 and 5000 characters'),
  
  body('venue')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue name must be between 2 and 200 characters'),
  
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('City name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Country name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom((value) => {
      const startDate = new Date(value);
      const now = new Date();
      if (startDate <= now) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),
  
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      // Check if event is not longer than 30 days
      const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (endDate - startDate > maxDuration) {
        throw new Error('Event duration cannot exceed 30 days');
      }
      
      return true;
    }),
  
  body('category')
    .trim()
    .isIn([
      'Technology', 'Business', 'Arts', 'Music', 'Sports', 'Education',
      'Food', 'Health', 'Science', 'Entertainment', 'Other'
    ])
    .withMessage('Invalid event category'),
  
  body('maxAttendees')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Maximum attendees must be between 1 and 100,000'),
  
  body('imageUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Image URL must be a valid HTTP/HTTPS URL')
    .custom((value) => {
      // Check if URL ends with image extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasImageExtension = imageExtensions.some(ext => 
        value.toLowerCase().includes(ext)
      );
      if (!hasImageExtension) {
        throw new Error('Image URL must point to a valid image file');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Enhanced Order Validation Rules
const validateOrderCreation = [
  body('eventId')
    .isInt({ min: 1 })
    .withMessage('Valid event ID is required'),
  
  body('tickets')
    .isArray({ min: 1, max: 20 })
    .withMessage('At least one ticket is required, maximum 20 tickets per order'),
  
  body('tickets.*.tierId')
    .isInt({ min: 1 })
    .withMessage('Valid ticket tier ID is required'),
  
  body('tickets.*.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Ticket quantity must be between 1 and 10'),
  
  body('tickets.*.attendeeName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Attendee name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Attendee name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('tickets.*.attendeeEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid attendee email is required'),
  
  body('billingEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid billing email is required'),
  
  body('billingName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Billing name must be between 2 and 100 characters'),
  
  body('billingAddress')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Billing address cannot exceed 500 characters'),
  
  body('billingCity')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Billing city cannot exceed 100 characters'),
  
  body('billingPostalCode')
    .optional()
    .trim()
    .matches(/^[A-Z0-9\s-]{3,10}$/i)
    .withMessage('Invalid postal code format'),
  
  // Custom validation for total order value
  body('tickets')
    .custom(async (tickets, { req }) => {
      const { getPool } = require('../config/database');
      const pool = getPool();
      
      let totalAmount = 0;
      const tierIds = tickets.map(t => t.tierId);
      
      if (tierIds.length > 0) {
        const placeholders = tierIds.map(() => '?').join(',');
        const [tiers] = await pool.execute(
          `SELECT id, price FROM ticket_tiers WHERE id IN (${placeholders})`,
          tierIds
        );
        
        for (const ticket of tickets) {
          const tier = tiers.find(t => t.id === ticket.tierId);
          if (tier) {
            totalAmount += tier.price * ticket.quantity;
          }
        }
      }
      
      // Validate order total (max $10,000)
      if (totalAmount > 10000) {
        throw new Error('Order total cannot exceed $10,000');
      }
      
      return true;
    }),
  
  handleValidationErrors
];

// Query Parameter Validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer between 1 and 10,000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query cannot exceed 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
    .withMessage('Search query contains invalid characters'),
  
  handleValidationErrors
];

const validateEventQuery = [
  query('category')
    .optional()
    .trim()
    .isIn([
      'Technology', 'Business', 'Arts', 'Music', 'Sports', 'Education',
      'Food', 'Health', 'Science', 'Entertainment', 'Other'
    ])
    .withMessage('Invalid category filter'),
  
  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City filter cannot exceed 100 characters'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Invalid status filter'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date filter must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date filter must be a valid ISO 8601 date'),
  
  handleValidationErrors
];

// Parameter Validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

// File Upload Validation
const validateFileUpload = (fieldName, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    required = false
  } = options;
  
  return (req, res, next) => {
    if (!req.file) {
      if (required) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} file is required`
        });
      }
      return next();
    }
    
    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size cannot exceed ${maxSize / (1024 * 1024)}MB`
      });
    }
    
    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    // Validate file name
    if (!/^[a-zA-Z0-9\-_. ]+$/.test(req.file.originalname)) {
      return res.status(400).json({
        success: false,
        message: 'File name contains invalid characters'
      });
    }
    
    next();
  };
};

// Business Logic Validation Middleware
const validateBusinessRules = {
  // Ensure event capacity is not exceeded
  checkEventCapacity: async (req, res, next) => {
    try {
      if (req.body.tickets) {
        const { getPool } = require('../config/database');
        const pool = getPool();
        
        const eventId = req.body.eventId;
        const [events] = await pool.execute(
          'SELECT max_attendees FROM events WHERE id = ?',
          [eventId]
        );
        
        if (events.length > 0 && events[0].max_attendees) {
          const [currentAttendees] = await pool.execute(
            `SELECT SUM(tt.sold_quantity) as total_sold 
             FROM ticket_tiers tt 
             WHERE tt.event_id = ? AND tt.is_active = TRUE`,
            [eventId]
          );
          
          const totalRequested = req.body.tickets.reduce(
            (sum, ticket) => sum + ticket.quantity, 0
          );
          
          const currentSold = currentAttendees[0]?.total_sold || 0;
          const maxAttendees = events[0].max_attendees;
          
          if (currentSold + totalRequested > maxAttendees) {
            return res.status(400).json({
              success: false,
              message: `Event capacity exceeded. Available spots: ${maxAttendees - currentSold}`
            });
          }
        }
      }
      next();
    } catch (error) {
      logger.error('Business rule validation error:', error);
      next(error);
    }
  },
  
  // Validate event timing
  checkEventTiming: (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      const now = new Date();
      
      // Check minimum advance booking (24 hours)
      const minAdvanceBooking = 24 * 60 * 60 * 1000;
      if (startDate - now < minAdvanceBooking) {
        return res.status(400).json({
          success: false,
          message: 'Events must be created at least 24 hours in advance'
        });
      }
    }
    next();
  }
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Recursive function to sanitize objects
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, ''); // Remove angle brackets
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip potentially dangerous keys
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          continue;
        }
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

module.exports = {
  // User validation
  validateUserRegistration,
  validateUserLogin,
  
  // Event validation
  validateEventCreation,
  
  // Order validation
  validateOrderCreation,
  
  // Query validation
  validatePagination,
  validateEventQuery,
  
  // Parameter validation
  validateId,
  
  // File validation
  validateFileUpload,
  
  // Business rules
  validateBusinessRules,
  
  // Utilities
  handleValidationErrors,
  formatValidationErrors,
  sanitizeRequest
};