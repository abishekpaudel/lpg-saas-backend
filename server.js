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

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const supplierRoutes = require('./routes/suppliers');
const stockRoutes    = require('./routes/stock');
const bookingRoutes  = require('./routes/bookings');
const queueRoutes    = require('./routes/queue');
const reviewRoutes   = require('./routes/reviews');
const blogRoutes     = require('./routes/blogs');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', config.server.frontendUrl],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

app.get('/health', async (req, res) => {
  const dbOk = await db.testConnection();
  const redisOk = await redis.testConnection();
  const status = dbOk && redisOk ? 200 : 503;
  res.status(status).json({ status: status === 200 ? 'OK' : 'DEGRADED', services: { mysql: dbOk ? 'UP' : 'DOWN', redis: redisOk ? 'UP' : 'DOWN' } });
});

const API = '/api/v1';
app.use(`${API}/auth`,      authRoutes);
app.use(`${API}/users`,     userRoutes);
app.use(`${API}/suppliers`, supplierRoutes);
app.use(`${API}/stock`,     stockRoutes);
app.use(`${API}/bookings`,  bookingRoutes);
app.use(`${API}/queue`,     queueRoutes);
app.use(`${API}/reviews`,   reviewRoutes);
app.use(`${API}/blogs`,     blogRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    db.initPool();
    const dbOk = await db.testConnection();
    if (!dbOk) throw new Error('MySQL connection failed.');
    await redis.testConnection();
    app.listen(config.server.port, () => {
      logger.info(`GasQueue API v2 running on http://localhost:${config.server.port}`);
    });
  } catch (err) {
    logger.error(`Failed to start: ${err.message}`);
    process.exit(1);
  }
};

start();
module.exports = app;
