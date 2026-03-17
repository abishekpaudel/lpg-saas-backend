const blogService = require('../services/blogService');
const { successResponse, paginatedResponse } = require('../utils/response');

// Public
const getPublished = async (req, res, next) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const { rows, total } = await blogService.getAll({ page, limit, category, published: true, search });
    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const getBySlug = async (req, res, next) => {
  try {
    const post = await blogService.getBySlug(req.params.slug);
    if (!post.is_published) return res.status(404).json({ success: false, message: 'Post not found.' });
    return successResponse(res, { post });
  } catch (err) { next(err); }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await blogService.getCategories();
    return successResponse(res, { categories });
  } catch (err) { next(err); }
};

// Admin only
const adminGetAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, published } = req.query;
    const pub = published === undefined ? null : published === 'true';
    const { rows, total } = await blogService.getAll({ page, limit, category, published: pub, search });
    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const createPost = async (req, res, next) => {
  try {
    const post = await blogService.create(req.user.id, req.body);
    return successResponse(res, { post }, 'Blog post created.', 201);
  } catch (err) { next(err); }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await blogService.update(req.params.id, req.user.id, req.body);
    return successResponse(res, { post }, 'Post updated.');
  } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
  try {
    await blogService.remove(req.params.id, req.user.id);
    return successResponse(res, {}, 'Post deleted.');
  } catch (err) { next(err); }
};

const togglePublish = async (req, res, next) => {
  try {
    const post = await blogService.getById(req.params.id);
    const updated = await blogService.update(req.params.id, req.user.id, { is_published: !post.is_published });
    return successResponse(res, { post: updated }, updated.is_published ? 'Post published.' : 'Post unpublished.');
  } catch (err) { next(err); }
};

module.exports = { getPublished, getBySlug, getCategories, adminGetAll, createPost, updatePost, deletePost, togglePublish };
