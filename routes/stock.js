const router = require('express').Router();
const stockController = require('../controllers/stockController');
const { authenticate, authorize } = require('../middlewares/auth');
const { stockRules, validate } = require('../validators');

// Public
router.get('/products', stockController.getProducts);
router.get('/supplier/:supplierId', stockController.getSupplierStock);

// Supplier only
router.get('/me', authenticate, authorize('SUPPLIER'), stockController.getMyStock);
router.post('/me', authenticate, authorize('SUPPLIER'), stockRules, validate, stockController.upsertStock);
router.patch('/me/:stockId/add-quantity', authenticate, authorize('SUPPLIER'), stockController.addQuantity);

module.exports = router;
