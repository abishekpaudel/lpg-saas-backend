const { v4: uuidv4 } = require('uuid');
const db = require('../helpers/mysqlHelper');
const supplierService = require('../services/supplierService');
const { successResponse, paginatedResponse } = require('../utils/response');

const createReview = async (req, res, next) => {
  try {
    const { booking_id, rating, comment } = req.body;
    const customerId = req.user.id;

    // Validate booking exists and belongs to customer
    const bookings = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ? AND status = ?',
      [booking_id, customerId, 'DELIVERED']
    );
    if (!bookings.length) {
      return res.status(400).json({ success: false, message: 'Can only review delivered bookings.' });
    }

    // Check no existing review
    const existing = await db.query('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Review already submitted for this booking.' });
    }

    const booking = bookings[0];
    const reviewId = uuidv4();

    await db.transaction(async (conn) => {
      await conn.execute(
        'INSERT INTO reviews (id, booking_id, customer_id, supplier_id, rating, comment) VALUES (?,?,?,?,?,?)',
        [reviewId, booking_id, customerId, booking.supplier_id, rating, comment || null]
      );

      // Recalculate avg rating
      const [avgRow] = await conn.query(
        'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE supplier_id = ? AND is_visible = 1',
        [booking.supplier_id]
      );
      await conn.execute(
        'UPDATE suppliers SET avg_rating = ?, total_reviews = ? WHERE id = ?',
        [parseFloat(avgRow.avg).toFixed(2), avgRow.cnt, booking.supplier_id]
      );
    });

    const review = await db.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    return successResponse(res, { review: review[0] }, 'Review submitted.', 201);
  } catch (err) { next(err); }
};

const getSupplierReviews = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const countRows = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE supplier_id = ? AND is_visible = 1',
      [supplierId]
    );
    const total = countRows[0].total;

    const rows = await db.query(
      `SELECT r.*, u.name as customer_name, u.avatar_url as customer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.customer_id
       WHERE r.supplier_id = ? AND r.is_visible = 1
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [supplierId, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const getMyReviews = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    const rows = await db.query(
      `SELECT r.*, u.name as customer_name, b.booking_number
       FROM reviews r
       JOIN users u ON u.id = r.customer_id
       JOIN bookings b ON b.id = r.booking_id
       WHERE r.supplier_id = ?
       ORDER BY r.created_at DESC`,
      [supplier.id]
    );
    return successResponse(res, { reviews: rows });
  } catch (err) { next(err); }
};

module.exports = { createReview, getSupplierReviews, getMyReviews };
