const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// All authenticated users
router.patch('/me/profile', authenticate, userController.updateProfile);

// Admin only
router.get('/', authenticate, authorize('SUPER_ADMIN'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('SUPER_ADMIN'), userController.getUserById);
router.patch('/:id/toggle-active', authenticate, authorize('SUPER_ADMIN'), userController.toggleUserActive);

module.exports = router;
