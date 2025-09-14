const logger = require('../config/logger');
const os = require('os');

// Performance metrics storage (in production, use Redis or external service)
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    averageResponseTime: 0,
    responseTimeSum: 0
  },
  endpoints: {},
  errors: {},
  slowQueries: [],
  systemHealth: {
    cpuUsage: [],
    memoryUsage: [],
    uptime: process.uptime()
  }
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime.bigint();

  // Store original end method
  const originalEnd = res.end;

  res.end = function(chunk, encoding) {
    // Calculate response time
    const endTime = Date.now();
    const duration = endTime - startTime;
    const hrDuration = Number(process.hrtime.bigint() - startHrTime) / 1000000; // Convert to milliseconds

    // Update metrics
    updateRequestMetrics(req, res, duration);
    updateEndpointMetrics(req, res, duration);

    // Log performance data
    logPerformanceData(req, res, duration, hrDuration);

    // Check for slow requests
    if (duration > 5000) { // 5 seconds threshold
      logger.performance(`Slow request detected: ${req.method} ${req.url}`, duration, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Update general request metrics
const updateRequestMetrics = (req, res, duration) => {
  metrics.requests.total++;
  
  if (res.statusCode >= 200 && res.statusCode < 400) {
    metrics.requests.success++;
  } else {
    metrics.requests.errors++;
  }
  
  // Update average response time
  metrics.requests.responseTimeSum += duration;
  metrics.requests.averageResponseTime = Math.round(
    metrics.requests.responseTimeSum / metrics.requests.total
  );
};

// Update endpoint-specific metrics
const updateEndpointMetrics = (req, res, duration) => {
  const endpoint = `${req.method} ${req.route?.path || req.url}`;
  
  if (!metrics.endpoints[endpoint]) {
    metrics.endpoints[endpoint] = {
      count: 0,
      averageResponseTime: 0,
      responseTimeSum: 0,
      successCount: 0,
      errorCount: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0
    };
  }
  
  const endpointMetric = metrics.endpoints[endpoint];
  endpointMetric.count++;
  endpointMetric.responseTimeSum += duration;
  endpointMetric.averageResponseTime = Math.round(
    endpointMetric.responseTimeSum / endpointMetric.count
  );
  
  // Update min/max response times
  endpointMetric.minResponseTime = Math.min(endpointMetric.minResponseTime, duration);
  endpointMetric.maxResponseTime = Math.max(endpointMetric.maxResponseTime, duration);
  
  // Update success/error counts
  if (res.statusCode >= 200 && res.statusCode < 400) {
    endpointMetric.successCount++;
  } else {
    endpointMetric.errorCount++;
  }
};

// Log performance data
const logPerformanceData = (req, res, duration, hrDuration) => {
  const performanceData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: duration,
    hrResponseTime: hrDuration,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    contentLength: res.get('Content-Length'),
    timestamp: new Date().toISOString()
  };

  // Log to performance logger
  logger.http(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, performanceData);
};

// Error tracking middleware
const errorTracker = (err, req, res, next) => {
  const errorKey = `${err.name || 'UnknownError'}_${err.message?.substring(0, 50) || 'No message'}`;
  
  if (!metrics.errors[errorKey]) {
    metrics.errors[errorKey] = {
      count: 0,
      lastOccurrence: null,
      firstOccurrence: new Date().toISOString(),
      message: err.message,
      stack: err.stack
    };
  }
  
  metrics.errors[errorKey].count++;
  metrics.errors[errorKey].lastOccurrence = new Date().toISOString();
  
  // Log error with context
  logger.error('Application error occurred', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    },
    errorKey,
    count: metrics.errors[errorKey].count
  });
  
  next(err);
};

// System health monitoring
const collectSystemMetrics = () => {
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  
  // Convert to percentages and MB
  const systemMetrics = {
    cpu: {
      user: Math.round((cpuUsage.user / 1000000) * 100) / 100, // Convert from microseconds
      system: Math.round((cpuUsage.system / 1000000) * 100) / 100
    },
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
    },
    system: {
      loadAverage: os.loadavg(),
      freeMemory: Math.round(os.freemem() / 1024 / 1024 * 100) / 100, // MB
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 * 100) / 100, // MB
      uptime: Math.round(process.uptime())
    }
  };
  
  // Store in metrics (keep last 60 entries = 1 hour if collected every minute)
  metrics.systemHealth.cpuUsage.push({
    timestamp: new Date().toISOString(),
    ...systemMetrics.cpu
  });
  
  metrics.systemHealth.memoryUsage.push({
    timestamp: new Date().toISOString(),
    ...systemMetrics.memory,
    ...systemMetrics.system
  });
  
  // Keep only last 60 entries
  if (metrics.systemHealth.cpuUsage.length > 60) {
    metrics.systemHealth.cpuUsage.shift();
  }
  if (metrics.systemHealth.memoryUsage.length > 60) {
    metrics.systemHealth.memoryUsage.shift();
  }
  
  // Log critical system issues
  const memoryUsagePercent = (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100;
  if (memoryUsagePercent > 90) {
    logger.warn(`High memory usage detected: ${memoryUsagePercent.toFixed(2)}%`, systemMetrics);
  }
  
  const systemMemoryUsagePercent = ((systemMetrics.system.totalMemory - systemMetrics.system.freeMemory) / systemMetrics.system.totalMemory) * 100;
  if (systemMemoryUsagePercent > 95) {
    logger.warn(`Critical system memory usage: ${systemMemoryUsagePercent.toFixed(2)}%`, systemMetrics);
  }
  
  return systemMetrics;
};

// Database query performance tracking
const trackDatabaseQuery = (query, duration, metadata = {}) => {
  logger.query(query, duration, metadata);
  
  // Track slow queries
  if (duration > 1000) { // 1 second threshold
    const slowQuery = {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    metrics.slowQueries.push(slowQuery);
    
    // Keep only last 100 slow queries
    if (metrics.slowQueries.length > 100) {
      metrics.slowQueries.shift();
    }
    
    logger.performance(`Slow database query detected`, duration, {
      query: slowQuery.query,
      ...metadata
    });
  }
};

// Business metrics tracking
const trackBusinessMetric = (event, value, metadata = {}) => {
  logger.business(`${event}: ${value}`, {
    event,
    value,
    ...metadata
  });
};

// Get current metrics
const getMetrics = () => {
  return {
    ...metrics,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
};

// Reset metrics (for testing or periodic cleanup)
const resetMetrics = () => {
  metrics.requests = {
    total: 0,
    success: 0,
    errors: 0,
    averageResponseTime: 0,
    responseTimeSum: 0
  };
  metrics.endpoints = {};
  metrics.errors = {};
  metrics.slowQueries = [];
};

// Health check function
const getHealthStatus = () => {
  const currentMetrics = getMetrics();
  const errorRate = currentMetrics.requests.total > 0 ? 
    (currentMetrics.requests.errors / currentMetrics.requests.total) * 100 : 0;
  
  let status = 'healthy';
  const issues = [];
  
  // Check error rate
  if (errorRate > 10) {
    status = 'degraded';
    issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
  }
  
  // Check response time
  if (currentMetrics.requests.averageResponseTime > 5000) {
    status = 'degraded';
    issues.push(`High response time: ${currentMetrics.requests.averageResponseTime}ms`);
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    status = 'degraded';
    issues.push(`High memory usage: ${heapUsagePercent.toFixed(2)}%`);
  }
  
  return {
    status,
    issues,
    metrics: currentMetrics,
    timestamp: new Date().toISOString()
  };
};

// Start system metrics collection (every minute)
setInterval(collectSystemMetrics, 60000);

// Initial system metrics collection
collectSystemMetrics();

module.exports = {
  performanceMonitor,
  errorTracker,
  collectSystemMetrics,
  trackDatabaseQuery,
  trackBusinessMetric,
  getMetrics,
  resetMetrics,
  getHealthStatus
};