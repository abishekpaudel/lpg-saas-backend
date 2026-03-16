const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

/**
 * Run validation and return 422 if errors found
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed.', 422, errors.array());
  }
  next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('role').optional().isIn(['CUSTOMER', 'SUPPLIER']).withMessage('Invalid role'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Suppliers ─────────────────────────────────────────────────────────────────
const supplierProfileRules = [
  body('business_name').trim().notEmpty().withMessage('Business name is required'),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('state').optional().isString(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('phone').optional().isMobilePhone(),
  body('opening_hours').optional().isString(),
];

// ── Stock ─────────────────────────────────────────────────────────────────────
const stockRules = [
  body('product_id').notEmpty().withMessage('Product ID is required'),
  body('quantity_available')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('price_per_unit')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
];

// ── Bookings ──────────────────────────────────────────────────────────────────
const bookingRules = [
  body('supplier_id').notEmpty().withMessage('Supplier ID is required'),
  body('stock_id').notEmpty().withMessage('Stock ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('delivery_address').optional().isString(),
  body('delivery_lat').optional().isFloat({ min: -90, max: 90 }),
  body('delivery_lng').optional().isFloat({ min: -180, max: 180 }),
];

// ── Reviews ───────────────────────────────────────────────────────────────────
const reviewRules = [
  body('booking_id').notEmpty().withMessage('Booking ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().isLength({ max: 1000 }),
];

// ── Pagination ────────────────────────────────────────────────────────────────
const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  supplierProfileRules,
  stockRules,
  bookingRules,
  reviewRules,
  paginationRules,
};
