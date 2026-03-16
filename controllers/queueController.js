const queueService = require('../services/queueService');
const supplierService = require('../services/supplierService');
const { successResponse } = require('../utils/response');

const getSupplierQueue = async (req, res, next) => {
  try {
    const result = await queueService.getSupplierQueue(req.params.supplierId);
    return successResponse(res, result);
  } catch (err) { next(err); }
};

const getMyQueue = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    const result = await queueService.getSupplierQueue(supplier.id);
    return successResponse(res, result);
  } catch (err) { next(err); }
};

const getBookingPosition = async (req, res, next) => {
  try {
    const { supplierId, bookingId } = req.params;
    const result = await queueService.getCustomerPosition(supplierId, bookingId);
    return successResponse(res, result);
  } catch (err) { next(err); }
};

const getMyActiveQueues = async (req, res, next) => {
  try {
    const queues = await queueService.getCustomerQueues(req.user.id);
    return successResponse(res, { queues });
  } catch (err) { next(err); }
};

const clearQueue = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    await queueService.clearQueue(supplier.id);
    return successResponse(res, {}, 'Queue cleared.');
  } catch (err) { next(err); }
};

module.exports = { getSupplierQueue, getMyQueue, getBookingPosition, getMyActiveQueues, clearQueue };
