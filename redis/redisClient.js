const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let client;

const getClient = () => {
  if (!client) {
    const options = {
      host: config.redis.host,
      port: config.redis.port,
      retryDelayOnFailover: config.redis.retryDelayOnFailover,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      lazyConnect: false,
    };
    if (config.redis.password) {
      options.password = config.redis.password;
    }

    client = new Redis(options);

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    client.on('close', () => logger.warn('Redis connection closed'));
  }
  return client;
};

// ─── Queue operations ─────────────────────────────────────────────────────────

/**
 * Add customer to supplier queue. Returns new queue position (1-based)
 */
const enqueue = async (supplierId, bookingId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  await redis.rpush(key, bookingId);
  const pos = await redis.lpos(key, bookingId);
  return pos + 1; // 1-based
};

/**
 * Remove first item from queue (dequeue when processed)
 */
const dequeue = async (supplierId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  return redis.lpop(key);
};

/**
 * Get all items in queue
 */
const getQueue = async (supplierId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  return redis.lrange(key, 0, -1);
};

/**
 * Get queue position of a booking (1-based), -1 if not found
 */
const getPosition = async (supplierId, bookingId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  const pos = await redis.lpos(key, bookingId);
  return pos === null ? -1 : pos + 1;
};

/**
 * Remove specific booking from queue
 */
const removeFromQueue = async (supplierId, bookingId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  return redis.lrem(key, 0, bookingId);
};

/**
 * Get queue length
 */
const getQueueLength = async (supplierId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  return redis.llen(key);
};

/**
 * Peek at front of queue without removing
 */
const peekQueue = async (supplierId) => {
  const redis = getClient();
  const key = `queue:${supplierId}`;
  const items = await redis.lrange(key, 0, 0);
  return items[0] || null;
};

// ─── Cache operations ─────────────────────────────────────────────────────────

const set = async (key, value, ttlSeconds = 300) => {
  const redis = getClient();
  return redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

const get = async (key) => {
  const redis = getClient();
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
};

const del = async (key) => {
  const redis = getClient();
  return redis.del(key);
};

const testConnection = async () => {
  try {
    const redis = getClient();
    await redis.ping();
    logger.info('Redis connection test passed');
    return true;
  } catch (err) {
    logger.error(`Redis connection test failed: ${err.message}`);
    return false;
  }
};

module.exports = {
  getClient,
  enqueue,
  dequeue,
  getQueue,
  getPosition,
  removeFromQueue,
  getQueueLength,
  peekQueue,
  set,
  get,
  del,
  testConnection,
};
