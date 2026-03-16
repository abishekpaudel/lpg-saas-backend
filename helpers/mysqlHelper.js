const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

let pool;

/**
 * Initialize MySQL connection pool
 */
const initPool = () => {
  if (!pool) {
    pool = mysql.createPool(config.mysql);
    logger.info('MySQL connection pool initialized');
  }
  return pool;
};

/**
 * Get the pool (initialize if needed)
 */
const getPool = () => {
  if (!pool) return initPool();
  return pool;
};

/**
 * Execute a SELECT query (returns rows)
 */
const query = async (sql, params = []) => {
  const p = getPool();
  try {
    const [rows] = await p.query(sql, params);
    return rows;
  } catch (err) {
    logger.error(`MySQL query error: ${err.message}`, { sql, params });
    throw err;
  }
};

/**
 * Execute an INSERT/UPDATE/DELETE query (returns result)
 */
const execute = async (sql, params = []) => {
  const p = getPool();
  try {
    const [result] = await p.execute(sql, params);
    return result;
  } catch (err) {
    logger.error(`MySQL execute error: ${err.message}`, { sql, params });
    throw err;
  }
};

/**
 * Format values using mysql2 escape
 */
const format = (sql, params = []) => {
  return mysql.format(sql, params);
};

/**
 * Run multiple queries in a transaction
 * @param {Function} callback - async fn(connection) => { ... }
 */
const transaction = async (callback) => {
  const p = getPool();
  const conn = await p.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    logger.error(`MySQL transaction rolled back: ${err.message}`);
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Query using a specific connection (for transactions)
 */
const connQuery = async (conn, sql, params = []) => {
  const [rows] = await conn.query(sql, params);
  return rows;
};

/**
 * Execute using a specific connection (for transactions)
 */
const connExecute = async (conn, sql, params = []) => {
  const [result] = await conn.execute(sql, params);
  return result;
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await query('SELECT 1');
    logger.info('MySQL connection test passed');
    return true;
  } catch (err) {
    logger.error(`MySQL connection test failed: ${err.message}`);
    return false;
  }
};

module.exports = {
  initPool,
  getPool,
  query,
  execute,
  format,
  transaction,
  connQuery,
  connExecute,
  testConnection,
};
