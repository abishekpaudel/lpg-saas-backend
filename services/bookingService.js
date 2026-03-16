const { v4: uuidv4 } = require('uuid');
const db = require('../helpers/mysqlHelper');
const redis = require('../redis/redisClient');

/** Generate a booking number like GQ-20240115-0042 */
const generateBookingNumber = async () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const countRows = await db.query(
    "SELECT COUNT(*) as c FROM bookings WHERE DATE(created_at) = CURDATE()"
  );
  const seq = String((countRows[0].c || 0) + 1).padStart(4, '0');
  return `GQ-${date}-${seq}`;
};

const create = async (customerId, { supplier_id, stock_id, quantity, delivery_address, delivery_lat, delivery_lng, notes }) => {
  // Validate stock availability
  const stocks = await db.query(
    'SELECT * FROM stock WHERE id = ? AND supplier_id = ?',
    [stock_id, supplier_id]
  );
  if (!stocks.length) throw Object.assign(new Error('Stock item not found.'), { statusCode: 404 });

  const stock = stocks[0];
  const available = stock.quantity_available - stock.quantity_reserved;
  if (available < quantity) {
    throw Object.assign(new Error(`Only ${available} units available.`), { statusCode: 400 });
  }

  // Validate supplier is approved and open
  const suppliers = await db.query(
    'SELECT id, is_approved, is_open FROM suppliers WHERE id = ?',
    [supplier_id]
  );
  if (!suppliers.length) throw Object.assign(new Error('Supplier not found.'), { statusCode: 404 });
  if (!suppliers[0].is_approved) throw Object.assign(new Error('Supplier is not approved.'), { statusCode: 400 });
  if (!suppliers[0].is_open) throw Object.assign(new Error('Supplier is currently closed.'), { statusCode: 400 });

  const total_amount = parseFloat(stock.price_per_unit) * quantity;
  const booking_number = await generateBookingNumber();
  const bookingId = uuidv4();

  await db.transaction(async (conn) => {
    // Insert booking
    await conn.execute(
      `INSERT INTO bookings
        (id, booking_number, customer_id, supplier_id, stock_id, quantity, unit_price, total_amount,
         status, delivery_address, delivery_lat, delivery_lng, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?)`,
      [bookingId, booking_number, customerId, supplier_id, stock_id, quantity,
       stock.price_per_unit, total_amount, delivery_address || null,
       delivery_lat || null, delivery_lng || null, notes || null]
    );

    // Reserve stock
    await conn.execute(
      'UPDATE stock SET quantity_reserved = quantity_reserved + ? WHERE id = ?',
      [quantity, stock_id]
    );

    // Add to queue table
    const position = await redis.enqueue(supplier_id, bookingId);
    const queueId = uuidv4();
    await conn.execute(
      'INSERT INTO queue (id, booking_id, supplier_id, customer_id, position, status) VALUES (?, ?, ?, ?, ?, ?)',
      [queueId, bookingId, supplier_id, customerId, position, 'WAITING']
    );

    // Update booking with queue position
    await conn.execute(
      'UPDATE bookings SET queue_position = ? WHERE id = ?',
      [position, bookingId]
    );

    // Create pending payment record
    const paymentId = uuidv4();
    await conn.execute(
      'INSERT INTO payments (id, booking_id, customer_id, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, bookingId, customerId, total_amount, 'CASH', 'PENDING']
    );
  });

  return getById(bookingId);
};

const getById = async (bookingId) => {
  const rows = await db.query(
    `SELECT b.*,
       u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
       s.business_name as supplier_name, s.address as supplier_address,
       p.name as product_name, p.weight_kg,
       pay.method as payment_method, pay.status as payment_status
     FROM bookings b
     JOIN users u ON u.id = b.customer_id
     JOIN suppliers s ON s.id = b.supplier_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     LEFT JOIN payments pay ON pay.booking_id = b.id
     WHERE b.id = ?`,
    [bookingId]
  );
  if (!rows.length) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
  return rows[0];
};

const getByCustomer = async (customerId, { page = 1, limit = 10, status }) => {
  let where = 'WHERE b.customer_id = ?';
  const params = [customerId];
  if (status) { where += ' AND b.status = ?'; params.push(status); }

  const countRows = await db.query(`SELECT COUNT(*) as total FROM bookings b ${where}`, params);
  const total = countRows[0].total;
  const offset = (page - 1) * limit;

  const rows = await db.query(
    `SELECT b.*, s.business_name as supplier_name, p.name as product_name, p.weight_kg
     FROM bookings b
     JOIN suppliers s ON s.id = b.supplier_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  return { rows, total };
};

const getBySupplier = async (supplierId, { page = 1, limit = 10, status }) => {
  let where = 'WHERE b.supplier_id = ?';
  const params = [supplierId];
  if (status) { where += ' AND b.status = ?'; params.push(status); }

  const countRows = await db.query(`SELECT COUNT(*) as total FROM bookings b ${where}`, params);
  const total = countRows[0].total;
  const offset = (page - 1) * limit;

  const rows = await db.query(
    `SELECT b.*, u.name as customer_name, u.phone as customer_phone,
       p.name as product_name, p.weight_kg
     FROM bookings b
     JOIN users u ON u.id = b.customer_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     ${where}
     ORDER BY b.queue_position ASC, b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  return { rows, total };
};

const deliver = async (bookingId, supplierId) => {
  const bookings = await db.query(
    'SELECT * FROM bookings WHERE id = ? AND supplier_id = ?',
    [bookingId, supplierId]
  );
  if (!bookings.length) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });

  const booking = bookings[0];
  if (booking.status === 'DELIVERED') throw Object.assign(new Error('Already delivered.'), { statusCode: 400 });
  if (!['QUEUED', 'PROCESSING'].includes(booking.status)) {
    throw Object.assign(new Error('Cannot deliver booking in current status.'), { statusCode: 400 });
  }

  await db.transaction(async (conn) => {
    // Mark booking delivered
    await conn.execute(
      "UPDATE bookings SET status = 'DELIVERED', delivered_at = NOW() WHERE id = ?",
      [bookingId]
    );

    // Deduct stock
    await conn.execute(
      `UPDATE stock SET
         quantity_available = quantity_available - ?,
         quantity_reserved  = GREATEST(quantity_reserved - ?, 0)
       WHERE id = ?`,
      [booking.quantity, booking.quantity, booking.stock_id]
    );

    // Mark payment completed
    await conn.execute(
      "UPDATE payments SET status = 'COMPLETED', paid_at = NOW() WHERE booking_id = ?",
      [bookingId]
    );

    // Mark queue entry done
    await conn.execute(
      "UPDATE queue SET status = 'DONE', processed_at = NOW() WHERE booking_id = ?",
      [bookingId]
    );

    // Update supplier stats
    await conn.execute(
      'UPDATE suppliers SET total_deliveries = total_deliveries + 1 WHERE id = ?',
      [supplierId]
    );
  });

  // Remove from Redis queue
  await redis.removeFromQueue(supplierId, bookingId);
};

const cancel = async (bookingId, userId, reason) => {
  const bookings = await db.query(
    'SELECT * FROM bookings WHERE id = ? AND (customer_id = ? OR supplier_id IN (SELECT id FROM suppliers WHERE user_id = ?))',
    [bookingId, userId, userId]
  );
  if (!bookings.length) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });

  const booking = bookings[0];
  if (['DELIVERED', 'CANCELLED'].includes(booking.status)) {
    throw Object.assign(new Error('Booking cannot be cancelled.'), { statusCode: 400 });
  }

  await db.transaction(async (conn) => {
    await conn.execute(
      "UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?",
      [reason || null, bookingId]
    );

    // Release reserved stock
    await conn.execute(
      'UPDATE stock SET quantity_reserved = GREATEST(quantity_reserved - ?, 0) WHERE id = ?',
      [booking.quantity, booking.stock_id]
    );

    // Mark queue entry cancelled
    await conn.execute(
      "UPDATE queue SET status = 'CANCELLED' WHERE booking_id = ?",
      [bookingId]
    );
  });

  await redis.removeFromQueue(booking.supplier_id, bookingId);
};

const markProcessing = async (bookingId, supplierId) => {
  await db.execute(
    "UPDATE bookings SET status = 'PROCESSING' WHERE id = ? AND supplier_id = ? AND status = 'QUEUED'",
    [bookingId, supplierId]
  );
  await db.execute(
    "UPDATE queue SET status = 'PROCESSING' WHERE booking_id = ?",
    [bookingId]
  );
};

module.exports = { create, getById, getByCustomer, getBySupplier, deliver, cancel, markProcessing };
