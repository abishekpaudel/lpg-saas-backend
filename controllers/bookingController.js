const bookingService = require('../services/bookingService');
const supplierService = require('../services/supplierService');
const { successResponse, paginatedResponse } = require('../utils/response');

const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.create(req.user.id, req.body);
    return successResponse(res, { booking }, 'Booking created. You have joined the queue.', 201);
  } catch (err) { next(err); }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getById(req.params.id);
    return successResponse(res, { booking });
  } catch (err) { next(err); }
};

const getMyBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { rows, total } = await bookingService.getByCustomer(req.user.id, { page, limit, status });
    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const getSupplierBookings = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    const { page = 1, limit = 20, status } = req.query;
    const { rows, total } = await bookingService.getBySupplier(supplier.id, { page, limit, status });
    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const deliverBooking = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    await bookingService.deliver(req.params.id, supplier.id);
    return successResponse(res, {}, 'Booking marked as delivered. Queue advanced.');
  } catch (err) { next(err); }
};

const cancelBooking = async (req, res, next) => {
  try {
    await bookingService.cancel(req.params.id, req.user.id, req.body.reason);
    return successResponse(res, {}, 'Booking cancelled.');
  } catch (err) { next(err); }
};

const processBooking = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    await bookingService.markProcessing(req.params.id, supplier.id);
    return successResponse(res, {}, 'Booking marked as processing.');
  } catch (err) { next(err); }
};

// Admin: all bookings
const getAllBookings = async (req, res, next) => {
  try {
    const db = require('../helpers/mysqlHelper');
    const { page = 1, limit = 20, status, supplier_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    if (supplier_id) { where += ' AND b.supplier_id = ?'; params.push(supplier_id); }

    const countRows = await db.query(`SELECT COUNT(*) as total FROM bookings b ${where}`, params);
    const total = countRows[0].total;
    const offset = (page - 1) * limit;

    const rows = await db.query(
      `SELECT b.*, u.name as customer_name, s.business_name as supplier_name,
         p.name as product_name
       FROM bookings b
       JOIN users u ON u.id = b.customer_id
       JOIN suppliers s ON s.id = b.supplier_id
       JOIN stock st ON st.id = b.stock_id
       JOIN products p ON p.id = st.product_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

module.exports = {
  createBooking, getBookingById, getMyBookings, getSupplierBookings,
  deliverBooking, cancelBooking, processBooking, getAllBookings,
};
