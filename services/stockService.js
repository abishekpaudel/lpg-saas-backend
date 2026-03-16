const { v4: uuidv4 } = require('uuid');
const db = require('../helpers/mysqlHelper');

const getBySupplier = async (supplierId) => {
  return db.query(
    `SELECT st.*, p.name as product_name, p.weight_kg, p.category, p.description as product_desc
     FROM stock st
     JOIN products p ON p.id = st.product_id
     WHERE st.supplier_id = ?
     ORDER BY p.weight_kg`,
    [supplierId]
  );
};

const upsert = async (supplierId, { product_id, quantity_available, price_per_unit }) => {
  const existing = await db.query(
    'SELECT id FROM stock WHERE supplier_id = ? AND product_id = ?',
    [supplierId, product_id]
  );

  if (existing.length) {
    await db.execute(
      `UPDATE stock SET quantity_available = ?, price_per_unit = ?, last_restocked_at = NOW()
       WHERE supplier_id = ? AND product_id = ?`,
      [quantity_available, price_per_unit, supplierId, product_id]
    );
    return db.query('SELECT * FROM stock WHERE supplier_id = ? AND product_id = ?', [supplierId, product_id]);
  } else {
    const id = uuidv4();
    await db.execute(
      `INSERT INTO stock (id, supplier_id, product_id, quantity_available, price_per_unit, last_restocked_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, supplierId, product_id, quantity_available, price_per_unit]
    );
    return db.query('SELECT * FROM stock WHERE id = ?', [id]);
  }
};

const addQuantity = async (stockId, qty) => {
  await db.execute(
    'UPDATE stock SET quantity_available = quantity_available + ?, last_restocked_at = NOW() WHERE id = ?',
    [qty, stockId]
  );
};

const getProducts = async () => {
  return db.query('SELECT * FROM products WHERE is_active = 1 ORDER BY weight_kg');
};

module.exports = { getBySupplier, upsert, addQuantity, getProducts };
