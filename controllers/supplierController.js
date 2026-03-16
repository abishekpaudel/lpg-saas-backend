const supplierService = require('../services/supplierService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, approved, city, search, lat, lng } = req.query;
    const result = await supplierService.getAll({ page, limit, approved, city, search, lat, lng });
    return paginatedResponse(res, result.data, result.total, page, limit);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getById(req.params.id);
    return successResponse(res, { supplier });
  } catch (err) { next(err); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    return successResponse(res, { supplier });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateProfile(req.user.id, req.body);
    return successResponse(res, { supplier }, 'Profile updated.');
  } catch (err) { next(err); }
};

const approveSupplier = async (req, res, next) => {
  try {
    await supplierService.approve(req.params.id, req.body.is_approved);
    return successResponse(res, {}, 'Supplier status updated.');
  } catch (err) { next(err); }
};

const toggleOpen = async (req, res, next) => {
  try {
    const result = await supplierService.toggleOpen(req.user.id);
    return successResponse(res, result, 'Availability updated.');
  } catch (err) { next(err); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const data = await supplierService.getAnalytics(req.params.id || null, req.user);
    return successResponse(res, data);
  } catch (err) { next(err); }
};

const getAdminAnalytics = async (req, res, next) => {
  try {
    const data = await supplierService.getAdminAnalytics();
    return successResponse(res, data);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getMyProfile, updateProfile, approveSupplier, toggleOpen, getAnalytics, getAdminAnalytics };
