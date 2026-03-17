const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../helpers/mysqlHelper');
const config = require('../config');

const SALT_ROUNDS = 10;

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Public customer self-registration - always CUSTOMER role
const register = async ({ name, email, password, phone }) => {
  const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw Object.assign(new Error('Email already registered.'), { statusCode: 409 });
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = uuidv4();
  await db.execute(
    'INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?,?,?,?,?,?)',
    [id, name, email, password_hash, phone || null, 'CUSTOMER']
  );
  const user = { id, name, email, phone, role: 'CUSTOMER' };
  const token = generateToken(user);
  return { user, token };
};

// Admin creates supplier - auto-approved
const createSupplierAccount = async ({ name, email, password, phone, business_name, city, address, latitude, longitude }) => {
  const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw Object.assign(new Error('Email already registered.'), { statusCode: 409 });
  const password_hash = await bcrypt.hash(password || 'Supplier@1234', SALT_ROUNDS);
  const userId = uuidv4();
  const supplierId = uuidv4();
  await db.transaction(async (conn) => {
    await conn.execute(
      'INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?,?,?,?,?,?)',
      [userId, name, email, password_hash, phone || null, 'SUPPLIER']
    );
    await conn.execute(
      'INSERT INTO suppliers (id, user_id, business_name, address, city, latitude, longitude, is_approved) VALUES (?,?,?,?,?,?,?,1)',
      [supplierId, userId, business_name || name, address || null, city || null, latitude || null, longitude || null]
    );
  });
  return { userId, supplierId, email, name };
};

const login = async ({ email, password }) => {
  const rows = await db.query(
    'SELECT id, name, email, password_hash, phone, role, is_active FROM users WHERE email = ?',
    [email]
  );
  if (!rows.length) throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  const user = rows[0];
  if (!user.is_active) throw Object.assign(new Error('Account is deactivated.'), { statusCode: 403 });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  delete user.password_hash;
  let supplierInfo = null;
  if (user.role === 'SUPPLIER') {
    const sup = await db.query('SELECT id, business_name, is_approved, is_open FROM suppliers WHERE user_id = ?', [user.id]);
    if (sup.length) supplierInfo = sup[0];
  }
  const token = generateToken(user);
  return { user, token, supplierInfo };
};

const getMe = async (userId) => {
  const rows = await db.query(
    'SELECT id, name, email, phone, role, is_active, avatar_url, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!rows.length) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  const user = rows[0];
  if (user.role === 'SUPPLIER') {
    const sup = await db.query('SELECT id, business_name, is_approved, is_open, avg_rating FROM suppliers WHERE user_id = ?', [userId]);
    if (sup.length) user.supplier = sup[0];
  }
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const rows = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!rows.length) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
};

module.exports = { register, login, getMe, changePassword, createSupplierAccount };
