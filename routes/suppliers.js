const router = require('express').Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middlewares/auth');
const { supplierProfileRules, paginationRules, validate } = require('../validators');

// Public
router.get('/', paginationRules, validate, supplierController.getAll);
router.get('/:id', supplierController.getById);

// Supplier
router.get('/me/profile', authenticate, authorize('SUPPLIER'), supplierController.getMyProfile);
router.put('/me/profile', authenticate, authorize('SUPPLIER'), supplierProfileRules, validate, supplierController.updateProfile);
router.patch('/me/toggle-open', authenticate, authorize('SUPPLIER'), supplierController.toggleOpen);
router.get('/me/analytics', authenticate, authorize('SUPPLIER'), supplierController.getAnalytics);

// Super Admin
router.patch('/:id/approve', authenticate, authorize('SUPER_ADMIN'), supplierController.approveSupplier);
router.get('/admin/analytics', authenticate, authorize('SUPER_ADMIN'), supplierController.getAdminAnalytics);

module.exports = router;
