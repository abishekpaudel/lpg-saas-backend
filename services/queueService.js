const redis = require('../redis/redisClient');
const db = require('../helpers/mysqlHelper');

/** Get live queue for a supplier (from Redis + DB enrichment) */
const getSupplierQueue = async (supplierId) => {
  const bookingIds = await redis.getQueue(supplierId);
  const queueLength = bookingIds.length;

  if (!bookingIds.length) {
    return { queue: [], length: 0 };
  }

  // Enrich with DB data
  const placeholders = bookingIds.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT b.id, b.booking_number, b.status, b.quantity, b.total_amount, b.queue_position,
       u.name as customer_name, u.phone as customer_phone,
       p.name as product_name, p.weight_kg
     FROM bookings b
     JOIN users u ON u.id = b.customer_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     WHERE b.id IN (${placeholders})`,
    bookingIds
  );

  // Sort by Redis order
  const rowMap = {};
  rows.forEach((r) => (rowMap[r.id] = r));
  const sorted = bookingIds
    .map((id, idx) => ({ ...rowMap[id], live_position: idx + 1 }))
    .filter((r) => r.id);

  return { queue: sorted, length: queueLength };
};

/** Get a specific customer's position in a supplier's queue */
const getCustomerPosition = async (supplierId, bookingId) => {
  const position = await redis.getPosition(supplierId, bookingId);
  const total = await redis.getQueueLength(supplierId);

  const booking = await db.query(
    `SELECT b.*, s.business_name, s.address, s.phone as supplier_phone
     FROM bookings b
     JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.id = ?`,
    [bookingId]
  );

  return {
    booking_id: bookingId,
    supplier_id: supplierId,
    position,
    total_in_queue: total,
    ahead_of_you: position > 0 ? position - 1 : 0,
    booking_details: booking[0] || null,
    is_next: position === 1,
  };
};

/** Get all active queue entries for a customer across all suppliers */
const getCustomerQueues = async (customerId) => {
  const bookings = await db.query(
    `SELECT b.id, b.supplier_id, b.booking_number, b.status, b.queue_position,
       s.business_name, s.address
     FROM bookings b
     JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.customer_id = ? AND b.status IN ('QUEUED','PROCESSING')`,
    [customerId]
  );

  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const livePos = await redis.getPosition(b.supplier_id, b.id);
      const total = await redis.getQueueLength(b.supplier_id);
      return { ...b, live_position: livePos, total_in_queue: total };
    })
  );

  return enriched;
};

/** Admin/supplier: clear entire queue (emergency) */
const clearQueue = async (supplierId) => {
  const redisClient = redis.getClient();
  await redisClient.del(`queue:${supplierId}`);
  await db.execute(
    "UPDATE queue SET status = 'CANCELLED' WHERE supplier_id = ? AND status = 'WAITING'",
    [supplierId]
  );
};

module.exports = { getSupplierQueue, getCustomerPosition, getCustomerQueues, clearQueue };
