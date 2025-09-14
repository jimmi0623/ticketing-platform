const redis = require('redis');
require('dotenv').config();

let client;

const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    
    client = redis.createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis max retry attempts reached');
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    client.on('end', () => {
      console.log('❌ Redis client disconnected');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return client;
};

// Cache helper functions
const cache = {
  async set(key, value, ttl = 3600) {
    try {
      const client = getRedisClient();
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  async get(key) {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  async exists(key) {
    try {
      const client = getRedisClient();
      return await client.exists(key);
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cache
};
