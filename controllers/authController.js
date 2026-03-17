const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.register({ name, email, password, phone });
    return successResponse(res, result, 'Registration successful.', 201);
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, result, 'Login successful.');
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, { user });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    return successResponse(res, {}, 'Password changed.');
  } catch (err) { next(err); }
};

// Admin creates supplier
const createSupplier = async (req, res, next) => {
  try {
    const result = await authService.createSupplierAccount(req.body);
    return successResponse(res, result, 'Supplier account created.', 201);
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, changePassword, createSupplier };
