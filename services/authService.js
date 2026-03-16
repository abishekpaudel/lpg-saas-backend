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

const register = async ({ name, email, password, phone, role = 'CUSTOMER' }) => {
  const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw Object.assign(new Error('Email already registered.'), { statusCode: 409 });

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = uuidv4();

  await db.execute(
    'INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, password_hash, phone || null, role]
  );

  const user = { id, name, email, role };

  // If registering as supplier, create supplier profile stub
  if (role === 'SUPPLIER') {
    const supplierId = uuidv4();
    await db.execute(
      'INSERT INTO suppliers (id, user_id, business_name, is_approved) VALUES (?, ?, ?, 0)',
      [supplierId, id, name]
    );
  }

  return { user, token: generateToken(user) };
};

const login = async ({ email, password }) => {
  const users = await db.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
    [email]
  );
  if (!users.length) throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });

  const user = users[0];
  if (!user.is_active) throw Object.assign(new Error('Account deactivated.'), { statusCode: 403 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });

  delete user.password_hash;

  // Attach supplier profile if SUPPLIER
  let supplierProfile = null;
  if (user.role === 'SUPPLIER') {
    const rows = await db.query('SELECT * FROM suppliers WHERE user_id = ?', [user.id]);
    supplierProfile = rows[0] || null;
  }

  return { user, token: generateToken(user), supplierProfile };
};

const getMe = async (userId) => {
  const users = await db.query(
    'SELECT id, name, email, phone, role, is_active, avatar_url, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!users.length) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  const user = users[0];

  if (user.role === 'SUPPLIER') {
    const rows = await db.query('SELECT * FROM suppliers WHERE user_id = ?', [userId]);
    user.supplierProfile = rows[0] || null;
  }
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const users = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!users.length) throw Object.assign(new Error('User not found.'), { statusCode: 404 });

  const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!valid) throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
};

module.exports = { register, login, getMe, changePassword };
