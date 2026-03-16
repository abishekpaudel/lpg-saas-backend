const router = require('express').Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middlewares/auth');
const { reviewRules, paginationRules, validate } = require('../validators');

// Public
router.get('/supplier/:supplierId', paginationRules, validate, reviewController.getSupplierReviews);

// Customer
router.post('/', authenticate, authorize('CUSTOMER'), reviewRules, validate, reviewController.createReview);

// Supplier
router.get('/my', authenticate, authorize('SUPPLIER'), reviewController.getMyReviews);

module.exports = router;
