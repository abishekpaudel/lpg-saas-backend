const router = require('express').Router();
const blogController = require('../controllers/blogController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public
router.get('/',                 blogController.getPublished);
router.get('/categories',       blogController.getCategories);
router.get('/:slug',            blogController.getBySlug);

// Admin only
router.get('/admin/all',        authenticate, authorize('SUPER_ADMIN'), blogController.adminGetAll);
router.post('/',                authenticate, authorize('SUPER_ADMIN'), blogController.createPost);
router.put('/:id',              authenticate, authorize('SUPER_ADMIN'), blogController.updatePost);
router.delete('/:id',           authenticate, authorize('SUPER_ADMIN'), blogController.deletePost);
router.patch('/:id/toggle-publish', authenticate, authorize('SUPER_ADMIN'), blogController.togglePublish);

module.exports = router;
