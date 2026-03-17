const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.patch('/change-password', authenticate, authController.changePassword);
// Admin creates supplier accounts
router.post('/create-supplier', authenticate, authorize('SUPER_ADMIN'), authController.createSupplier);

module.exports = router;
