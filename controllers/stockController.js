const stockService = require('../services/stockService');
const supplierService = require('../services/supplierService');
const { successResponse } = require('../utils/response');

const getMyStock = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    const stock = await stockService.getBySupplier(supplier.id);
    return successResponse(res, { stock });
  } catch (err) { next(err); }
};

const getSupplierStock = async (req, res, next) => {
  try {
    const stock = await stockService.getBySupplier(req.params.supplierId);
    return successResponse(res, { stock });
  } catch (err) { next(err); }
};

const upsertStock = async (req, res, next) => {
  try {
    const supplier = await supplierService.getByUserId(req.user.id);
    const [result] = await stockService.upsert(supplier.id, req.body);
    return successResponse(res, { stock: result }, 'Stock updated.', 200);
  } catch (err) { next(err); }
};

const addQuantity = async (req, res, next) => {
  try {
    const { stockId } = req.params;
    const { quantity } = req.body;
    await stockService.addQuantity(stockId, parseInt(quantity));
    return successResponse(res, {}, 'Quantity added.');
  } catch (err) { next(err); }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await stockService.getProducts();
    return successResponse(res, { products });
  } catch (err) { next(err); }
};

module.exports = { getMyStock, getSupplierStock, upsertStock, addQuantity, getProducts };
