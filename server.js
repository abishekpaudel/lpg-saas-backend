require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const db = require('./helpers/mysqlHelper');
const redis = require('./redis/redisClient');

// ── Ensure logs directory exists ──────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const supplierRoutes = require('./routes/suppliers');
const stockRoutes    = require('./routes/stock');
const bookingRoutes  = require('./routes/bookings');
const queueRoutes    = require('./routes/queue');
const reviewRoutes   = require('./routes/reviews');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    config.server.frontendUrl,
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    'exp://localhost:8081',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
app.use(morgan('combined', {
  stream: {
    write: (msg) => logger.http(msg.trim()),
  },
}));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbOk    = await db.testConnection();
  const redisOk = await redis.testConnection();
  const status  = dbOk && redisOk ? 200 : 503;
  res.status(status).json({
    status: status === 200 ? 'OK' : 'DEGRADED',
    services: { mysql: dbOk ? 'UP' : 'DOWN', redis: redisOk ? 'UP' : 'DOWN' },
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,      authRoutes);
app.use(`${API}/users`,     userRoutes);
app.use(`${API}/suppliers`, supplierRoutes);
app.use(`${API}/stock`,     stockRoutes);
app.use(`${API}/bookings`,  bookingRoutes);
app.use(`${API}/queue`,     queueRoutes);
app.use(`${API}/reviews`,   reviewRoutes);

// ── 404 & Error Handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Test DB connection
    db.initPool();
    const dbOk = await db.testConnection();
    if (!dbOk) throw new Error('MySQL connection failed. Is MySQL running?');

    // Test Redis connection
    const redisOk = await redis.testConnection();
    if (!redisOk) {
      logger.warn('Redis not available — queue features may not work correctly.');
    }

    app.listen(config.server.port, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║   LPG Gas Queue Management API               ║
║   Port    : ${config.server.port}                           ║
║   Env     : ${config.server.env.padEnd(12)}                  ║
║   API     : http://localhost:${config.server.port}/api/v1     ║
║   Health  : http://localhost:${config.server.port}/health     ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

start();

module.exports = app;
