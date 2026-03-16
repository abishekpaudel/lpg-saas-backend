const { v4: uuidv4 } = require('uuid');
const db = require('../helpers/mysqlHelper');
const { sortByDistance } = require('../utils/distance');

const getAll = async ({ page = 1, limit = 20, approved, city, search, lat, lng }) => {
  let where = 'WHERE 1=1';
  const params = [];

  if (approved !== undefined) { where += ' AND s.is_approved = ?'; params.push(approved ? 1 : 0); }
  if (city) { where += ' AND s.city LIKE ?'; params.push(`%${city}%`); }
  if (search) {
    where += ' AND (s.business_name LIKE ? OR s.address LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countRows = await db.query(
    `SELECT COUNT(*) as total FROM suppliers s ${where}`, params
  );
  const total = countRows[0].total;

  const offset = (page - 1) * limit;
  const rows = await db.query(
    `SELECT s.*, u.name as owner_name, u.email as owner_email
     FROM suppliers s
     JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  let data = rows;
  if (lat && lng) {
    data = sortByDistance(rows, parseFloat(lat), parseFloat(lng));
  }

  return { data, total };
};

const getNearby = async ({ lat, lng, radius = 50, limit = 20 }) => {
  const rows = await db.query(
    `SELECT s.*, u.name as owner_name,
       (SELECT SUM(st.quantity_available) FROM stock st WHERE st.supplier_id = s.id) as total_stock
     FROM suppliers s
     JOIN users u ON u.id = s.user_id
     WHERE s.is_approved = 1 AND s.is_open = 1
       AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL`
  );

  const sorted = sortByDistance(rows, parseFloat(lat), parseFloat(lng))
    .filter((s) => s.distance <= radius)
    .slice(0, limit);

  return sorted;
};

const getById = async (id) => {
  const rows = await db.query(
    `SELECT s.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
     FROM suppliers s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id]
  );
  if (!rows.length) throw Object.assign(new Error('Supplier not found.'), { statusCode: 404 });

  const supplier = rows[0];
  supplier.stock = await db.query(
    `SELECT st.*, p.name as product_name, p.weight_kg, p.description as product_description
     FROM stock st JOIN products p ON p.id = st.product_id
     WHERE st.supplier_id = ?`,
    [id]
  );
  supplier.recent_reviews = await db.query(
    `SELECT r.*, u.name as customer_name
     FROM reviews r JOIN users u ON u.id = r.customer_id
     WHERE r.supplier_id = ? AND r.is_visible = 1
     ORDER BY r.created_at DESC LIMIT 5`,
    [id]
  );
  return supplier;
};

const getByUserId = async (userId) => {
  const rows = await db.query('SELECT * FROM suppliers WHERE user_id = ?', [userId]);
  if (!rows.length) throw Object.assign(new Error('Supplier profile not found.'), { statusCode: 404 });
  return rows[0];
};

const updateProfile = async (supplierId, data) => {
  const fields = [
    'business_name','description','address','city','state',
    'latitude','longitude','phone','email','logo_url','opening_hours','is_open'
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); params.push(data[f]); }
  }
  if (!updates.length) return;
  params.push(supplierId);
  await db.execute(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`, params);
};

const approve = async (supplierId, approved) => {
  await db.execute('UPDATE suppliers SET is_approved = ? WHERE id = ?', [approved ? 1 : 0, supplierId]);
};

const getDashboard = async (supplierId) => {
  const [stockRows] = await Promise.all([
    db.query(
      `SELECT st.*, p.name as product_name, p.weight_kg
       FROM stock st JOIN products p ON p.id = st.product_id
       WHERE st.supplier_id = ?`, [supplierId]
    ),
  ]);

  const bookingStats = await db.query(
    `SELECT status, COUNT(*) as count FROM bookings WHERE supplier_id = ? GROUP BY status`,
    [supplierId]
  );

  const todayBookings = await db.query(
    `SELECT COUNT(*) as count FROM bookings
     WHERE supplier_id = ? AND DATE(created_at) = CURDATE()`,
    [supplierId]
  );

  const recentBookings = await db.query(
    `SELECT b.*, u.name as customer_name, u.phone as customer_phone,
       p.name as product_name
     FROM bookings b
     JOIN users u ON u.id = b.customer_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     WHERE b.supplier_id = ?
     ORDER BY b.created_at DESC LIMIT 10`,
    [supplierId]
  );

  const revenue = await db.query(
    `SELECT SUM(total_amount) as total FROM bookings
     WHERE supplier_id = ? AND status = 'DELIVERED'`,
    [supplierId]
  );

  return {
    stock: stockRows,
    booking_stats: bookingStats,
    today_bookings: todayBookings[0].count,
    recent_bookings: recentBookings,
    total_revenue: revenue[0].total || 0,
  };
};

const toggleOpen = async (userId) => {
  const rows = await db.query('SELECT id, is_open FROM suppliers WHERE user_id = ?', [userId]);
  if (!rows.length) throw Object.assign(new Error('Supplier not found.'), { statusCode: 404 });
  const newVal = rows[0].is_open ? 0 : 1;
  await db.execute('UPDATE suppliers SET is_open = ? WHERE id = ?', [newVal, rows[0].id]);
  return { is_open: newVal };
};

const getAnalytics = async (supplierId, user) => {
  // If called as supplier, look up by userId
  let sId = supplierId;
  if (!sId) {
    const sup = await db.query('SELECT id FROM suppliers WHERE user_id = ?', [user.id]);
    if (!sup.length) throw Object.assign(new Error('Supplier not found.'), { statusCode: 404 });
    sId = sup[0].id;
  }
  return getDashboard(sId);
};

const getAdminAnalytics = async () => {
  const [totalUsers] = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'CUSTOMER'");
  const [totalSuppliers] = await db.query('SELECT COUNT(*) as c FROM suppliers WHERE is_approved = 1');
  const [pendingSuppliers] = await db.query('SELECT COUNT(*) as c FROM suppliers WHERE is_approved = 0');
  const [totalBookings] = await db.query('SELECT COUNT(*) as c FROM bookings');
  const [deliveredBookings] = await db.query("SELECT COUNT(*) as c FROM bookings WHERE status = 'DELIVERED'");
  const [totalRevenue] = await db.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = 'DELIVERED'");
  const [todayBookings] = await db.query("SELECT COUNT(*) as c FROM bookings WHERE DATE(created_at) = CURDATE()");
  const recentBookings = await db.query(
    `SELECT b.*, u.name as customer_name, s.business_name as supplier_name, p.name as product_name
     FROM bookings b
     JOIN users u ON u.id = b.customer_id
     JOIN suppliers s ON s.id = b.supplier_id
     JOIN stock st ON st.id = b.stock_id
     JOIN products p ON p.id = st.product_id
     ORDER BY b.created_at DESC LIMIT 10`
  );
  const topSuppliers = await db.query(
    `SELECT s.id, s.business_name, s.avg_rating, s.total_deliveries, s.total_reviews,
       COUNT(b.id) as total_bookings
     FROM suppliers s
     LEFT JOIN bookings b ON b.supplier_id = s.id AND b.status = 'DELIVERED'
     WHERE s.is_approved = 1
     GROUP BY s.id
     ORDER BY total_bookings DESC LIMIT 5`
  );
  const bookingsByStatus = await db.query(
    'SELECT status, COUNT(*) as count FROM bookings GROUP BY status'
  );

  return {
    summary: {
      total_customers: totalUsers.c,
      total_suppliers: totalSuppliers.c,
      pending_suppliers: pendingSuppliers.c,
      total_bookings: totalBookings.c,
      delivered_bookings: deliveredBookings.c,
      total_revenue: parseFloat(totalRevenue.total),
      today_bookings: todayBookings.c,
    },
    recent_bookings: recentBookings,
    top_suppliers: topSuppliers,
    bookings_by_status: bookingsByStatus,
  };
};

module.exports = {
  getAll, getNearby, getById, getByUserId, updateProfile, approve,
  getDashboard, toggleOpen, getAnalytics, getAdminAnalytics,
};
