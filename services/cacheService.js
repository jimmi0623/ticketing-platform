const { getRedisClient, cache } = require('../config/redis');
const logger = require('../config/logger');

// Multi-layer caching system
class CacheService {
  constructor() {
    // In-memory cache for very frequently accessed data
    this.memoryCache = new Map();
    this.memoryCacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };
    
    // Memory cache configuration
    this.maxMemoryCacheSize = parseInt(process.env.MAX_MEMORY_CACHE_SIZE) || 1000;
    this.memoryTtl = parseInt(process.env.MEMORY_CACHE_TTL) || 300; // 5 minutes
    
    // Cleanup interval for memory cache
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000); // Every minute
  }

  // Memory cache methods
  setMemory(key, value, ttl = this.memoryTtl) {
    const expiresAt = Date.now() + (ttl * 1000);
    
    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.memoryCacheStats.size = this.memoryCache.size;
  }

  getMemory(key) {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      this.memoryCacheStats.misses++;
      return null;
    }
    
    if (Date.now() > cached.expiresAt) {
      this.memoryCache.delete(key);
      this.memoryCacheStats.misses++;
      return null;
    }
    
    this.memoryCacheStats.hits++;
    return cached.value;
  }

  deleteMemory(key) {
    const deleted = this.memoryCache.delete(key);
    this.memoryCacheStats.size = this.memoryCache.size;
    return deleted;
  }

  cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now > cached.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    this.memoryCacheStats.size = this.memoryCache.size;
    
    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired entries from memory cache`);
    }
  }

  // Combined cache operations (memory first, then Redis)
  async get(key) {
    try {
      // Try memory cache first
      const memoryResult = this.getMemory(key);
      if (memoryResult !== null) {
        return memoryResult;
      }
      
      // Try Redis cache
      const redisResult = await cache.get(key);
      if (redisResult !== null) {
        // Store in memory cache for faster future access
        this.setMemory(key, redisResult, 60); // 1 minute in memory
        return redisResult;
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      // Set in both caches
      this.setMemory(key, value, Math.min(ttl, this.memoryTtl));
      await cache.set(key, value, ttl);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      this.deleteMemory(key);
      await cache.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Pattern-based operations
  async deletePattern(pattern) {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        
        // Also clear from memory cache
        for (const key of keys) {
          this.deleteMemory(key);
        }
      }
      
      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  // Cache warming functions
  async warmEventCache(eventId) {
    try {
      const { getPool } = require('../config/database');
      const pool = getPool();
      
      // Warm event details
      const [events] = await pool.execute(
        `SELECT e.*, u.first_name as organizer_name, u.last_name as organizer_last_name
         FROM events e
         JOIN users u ON e.organizer_id = u.id
         WHERE e.id = ? AND e.status = 'published'`,
        [eventId]
      );
      
      if (events.length > 0) {
        const [ticketTiers] = await pool.execute(
          `SELECT * FROM ticket_tiers 
           WHERE event_id = ? AND is_active = TRUE 
           ORDER BY price ASC`,
          [eventId]
        );
        
        const eventData = {
          ...events[0],
          ticketTiers
        };
        
        await this.set(`event:${eventId}`, eventData, 600); // 10 minutes
        logger.performance('Event cache warmed', 0, { eventId });
      }
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  async warmUserCache(userId) {
    try {
      const { getPool } = require('../config/database');
      const pool = getPool();
      
      const [users] = await pool.execute(
        'SELECT id, email, first_name, last_name, role, is_verified FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        await this.set(`user:${userId}`, users[0], 1800); // 30 minutes
        logger.performance('User cache warmed', 0, { userId });
      }
    } catch (error) {
      logger.error('User cache warming error:', error);
    }
  }

  // Cache invalidation strategies
  async invalidateEventCaches(eventId) {
    const patterns = [
      `event:${eventId}`,
      `events:*`,
      `event:${eventId}:*`,
      `user:*:events` // User's event lists
    ];
    
    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
    
    logger.audit('Cache invalidated', null, `event:${eventId}`);
  }

  async invalidateUserCaches(userId) {
    const patterns = [
      `user:${userId}`,
      `user:${userId}:*`,
      `orders:user:${userId}:*`
    ];
    
    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Cache statistics and monitoring
  async getStats() {
    const memoryStats = {
      hits: this.memoryCacheStats.hits,
      misses: this.memoryCacheStats.misses,
      size: this.memoryCacheStats.size,
      hitRate: this.memoryCacheStats.hits / (this.memoryCacheStats.hits + this.memoryCacheStats.misses) * 100 || 0
    };

    let redisStats = {};
    try {
      const redis = getRedisClient();
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      
      redisStats = {
        memory: info,
        keyspace: keyspace,
        connected: true
      };
    } catch (error) {
      redisStats = { connected: false };
    }

    return {
      memory: memoryStats,
      redis: redisStats,
      timestamp: new Date().toISOString()
    };
  }

  // Health check
  async healthCheck() {
    const issues = [];
    
    try {
      // Test Redis connection
      const redis = getRedisClient();
      await redis.ping();
    } catch (error) {
      issues.push('Redis connection failed');
    }
    
    // Check memory cache size
    if (this.memoryCache.size > this.maxMemoryCacheSize * 0.9) {
      issues.push('Memory cache near capacity');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Advanced caching patterns
  async getOrSet(key, fetchFunction, ttl = 3600) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      const freshData = await fetchFunction();
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttl);
      }
      return freshData;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      throw error;
    }
  }

  async cacheAside(key, fetchFunction, ttl = 3600) {
    return this.getOrSet(key, fetchFunction, ttl);
  }

  // Distributed locking for cache updates
  async lockAndUpdate(lockKey, updateFunction, lockTtl = 30) {
    const redis = getRedisClient();
    const lockValue = Date.now().toString();
    
    try {
      // Acquire lock
      const acquired = await redis.set(
        `lock:${lockKey}`, 
        lockValue, 
        'PX', 
        lockTtl * 1000, 
        'NX'
      );
      
      if (!acquired) {
        // Lock not acquired, return null or throw error
        return null;
      }
      
      // Execute update function
      const result = await updateFunction();
      
      // Release lock
      await redis.eval(
        `if redis.call("get",KEYS[1]) == ARGV[1] then
           return redis.call("del",KEYS[1])
         else
           return 0
         end`,
        1,
        `lock:${lockKey}`,
        lockValue
      );
      
      return result;
    } catch (error) {
      logger.error('Cache lock and update error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Middleware for response caching
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `http:${req.method}:${req.originalUrl}`,
    condition = () => true,
    varying = []
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        if (cached.headers) {
          res.set(cached.headers);
        }
        
        return res.status(cached.status || 200).json(cached.data);
      }
      
      // Cache miss - intercept response
      const originalJson = res.json;
      const originalStatus = res.status;
      let statusCode = 200;
      
      res.status = function(code) {
        statusCode = code;
        return originalStatus.call(this, code);
      };
      
      res.json = function(data) {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const cacheData = {
            data,
            status: statusCode,
            headers: {
              'Content-Type': 'application/json'
            },
            timestamp: new Date().toISOString()
          };
          
          cacheService.set(cacheKey, cacheData, ttl);
        }
        
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = {
  cacheService,
  cacheMiddleware
};