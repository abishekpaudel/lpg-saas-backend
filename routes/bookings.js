const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middlewares/auth');
const { bookingRules, paginationRules, validate } = require('../validators');

// Customer
router.post('/', authenticate, authorize('CUSTOMER'), bookingRules, validate, bookingController.createBooking);
router.get('/my', authenticate, authorize('CUSTOMER'), paginationRules, validate, bookingController.getMyBookings);
router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);

// Supplier
router.get('/supplier', authenticate, authorize('SUPPLIER'), paginationRules, validate, bookingController.getSupplierBookings);
router.patch('/:id/deliver', authenticate, authorize('SUPPLIER'), bookingController.deliverBooking);
router.patch('/:id/process', authenticate, authorize('SUPPLIER'), bookingController.processBooking);

// Admin
router.get('/admin/all', authenticate, authorize('SUPER_ADMIN'), paginationRules, validate, bookingController.getAllBookings);

// Shared (by booking id)
router.get('/:id', authenticate, bookingController.getBookingById);

module.exports = router;
