const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

// Define format for console (development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [];

// Console transport (always active in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'debug',
      format: consoleFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: logFormat,
    })
  );
}

// File transport for errors
transports.push(
  new DailyRotateFile({
    level: 'error',
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true,
  })
);

// File transport for all logs
transports.push(
  new DailyRotateFile({
    level: process.env.LOG_LEVEL || 'info',
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
  })
);

// File transport for HTTP requests
transports.push(
  new DailyRotateFile({
    level: 'http',
    filename: path.join(logDir, 'requests-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: logFormat,
  })
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Custom logging methods
logger.security = (message, metadata = {}) => {
  logger.warn(`SECURITY: ${message}`, {
    type: 'security',
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

logger.performance = (message, duration, metadata = {}) => {
  logger.info(`PERFORMANCE: ${message}`, {
    type: 'performance',
    duration,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

logger.business = (message, metadata = {}) => {
  logger.info(`BUSINESS: ${message}`, {
    type: 'business',
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

logger.audit = (action, userId, resource, metadata = {}) => {
  logger.info(`AUDIT: ${action}`, {
    type: 'audit',
    action,
    userId,
    resource,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// Database query logging
logger.query = (query, duration, metadata = {}) => {
  if (process.env.LOG_DATABASE_QUERIES === 'true') {
    logger.debug(`DB QUERY: ${query}`, {
      type: 'database',
      duration,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }
};

// Payment logging (never log sensitive data)
logger.payment = (message, orderId, amount, metadata = {}) => {
  logger.info(`PAYMENT: ${message}`, {
    type: 'payment',
    orderId,
    amount: typeof amount === 'number' ? amount : '[REDACTED]',
    ...metadata,
    // Remove any potentially sensitive fields
    cardNumber: '[REDACTED]',
    cvv: '[REDACTED]',
    timestamp: new Date().toISOString(),
  });
};

// Email logging
logger.email = (message, to, subject, metadata = {}) => {
  logger.info(`EMAIL: ${message}`, {
    type: 'email',
    to: to ? to.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'unknown', // Partially mask email
    subject,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// Error handling for logger itself
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Application shutting down...');
  logger.end(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Application terminating...');
  logger.end(() => {
    process.exit(0);
  });
});

module.exports = logger;