const db = require('../helpers/mysqlHelper');
const { successResponse, paginatedResponse } = require('../utils/response');

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (role) { where += ' AND role = ?'; params.push(role); }
    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countRows = await db.query(`SELECT COUNT(*) as total FROM users ${where}`, params);
    const total = countRows[0].total;
    const offset = (page - 1) * limit;

    const rows = await db.query(
      `SELECT id, name, email, phone, role, is_active, created_at FROM users
       ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const rows = await db.query(
      'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    return successResponse(res, { user: rows[0] });
  } catch (err) { next(err); }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await db.query('SELECT is_active FROM users WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);
    return successResponse(res, { is_active: newStatus }, `User ${newStatus ? 'activated' : 'deactivated'}.`);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    await db.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, req.user.id]);
    const rows = await db.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [req.user.id]
    );
    return successResponse(res, { user: rows[0] }, 'Profile updated.');
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, getUserById, toggleUserActive, updateProfile };
