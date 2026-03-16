const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('../utils/response');
const db = require('../helpers/mysqlHelper');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Fetch fresh user data
    const users = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users.length) {
      return errorResponse(res, 'User not found.', 401);
    }

    const user = users[0];
    if (!user.is_active) {
      return errorResponse(res, 'Account is deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token.', 401);
    }
    next(err);
  }
};

/**
 * Role-based access control middleware factory
 * Usage: authorize('SUPER_ADMIN', 'SUPPLIER')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `Access denied. Required roles: ${roles.join(', ')}`, 403);
    }
    next();
  };
};

/**
 * Optional auth - attaches user if token present, but doesn't fail
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const users = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    req.user = users.length ? users[0] : null;
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
