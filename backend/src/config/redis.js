const redis = require('redis');
const Redis = require('ioredis');

let redisClient = null;
let ioRedis = null;

const initializeRedis = () => {
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
    
    // Standard redis client
    redisClient = redis.createClient(redisConfig);
    redisClient.on('error', (err) => console.error('Redis error:', err));
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    
    // IORedis client (better for ioredis operations)
    ioRedis = new Redis(redisConfig);
    ioRedis.on('error', (err) => console.error('IORedis error:', err));
    ioRedis.on('connect', () => console.log('✅ IORedis initialized'));
    
    // Connect
    redisClient.connect();
  } catch (error) {
    console.error('❌ Redis initialization error:', error);
    // Don't exit - Redis is optional
  }
};

const getRedisClient = () => redisClient;
const getIORedis = () => ioRedis;

// Cache utilities
const cacheGet = async (key) => {
  try {
    const cached = await ioRedis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  try {
    await ioRedis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error('Cache set error:', err);
  }
};

const cacheDel = async (key) => {
  try {
    await ioRedis.del(key);
  } catch (err) {
    console.error('Cache delete error:', err);
  }
};

const cacheFlush = async () => {
  try {
    await ioRedis.flushdb();
  } catch (err) {
    console.error('Cache flush error:', err);
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  getIORedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheFlush
};
