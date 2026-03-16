const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { registerRules, loginRules, validate } = require('../validators');

// POST /auth/register
router.post('/register', registerRules, validate, authController.register);

// POST /auth/login
router.post('/login', loginRules, validate, authController.login);

// GET /auth/me
router.get('/me', authenticate, authController.getMe);

// PATCH /auth/change-password
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;
