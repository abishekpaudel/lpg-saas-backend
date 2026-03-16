const router = require('express').Router();
const queueController = require('../controllers/queueController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public – view supplier queue
router.get('/:supplierId', queueController.getSupplierQueue);
router.get('/:supplierId/booking/:bookingId/position', queueController.getBookingPosition);

// Customer – see own active queues
router.get('/my/active', authenticate, authorize('CUSTOMER'), queueController.getMyActiveQueues);

// Supplier
router.get('/me/live', authenticate, authorize('SUPPLIER'), queueController.getMyQueue);
router.delete('/me/clear', authenticate, authorize('SUPPLIER'), queueController.clearQueue);

module.exports = router;
