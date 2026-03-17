const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const db = require('../helpers/mysqlHelper');

const makeSlug = async (title, existingId = null) => {
  let base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let i = 1;
  while (true) {
    const rows = await db.query(
      'SELECT id FROM blog_posts WHERE slug = ?' + (existingId ? ' AND id != ?' : ''),
      existingId ? [slug, existingId] : [slug]
    );
    if (!rows.length) break;
    slug = `${base}-${i++}`;
  }
  return slug;
};

const getAll = async ({ page = 1, limit = 9, category, published = true, search } = {}) => {
  let where = 'WHERE 1=1';
  const params = [];
  if (published !== undefined && published !== null) {
    where += ' AND b.is_published = ?'; params.push(published ? 1 : 0);
  }
  if (category) { where += ' AND b.category = ?'; params.push(category); }
  if (search) { where += ' AND (b.title LIKE ? OR b.excerpt LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const countRows = await db.query(`SELECT COUNT(*) as total FROM blog_posts b ${where}`, params);
  const total = countRows[0].total;
  const offset = (page - 1) * limit;

  const rows = await db.query(
    `SELECT b.*, u.name as author_name, u.avatar_url as author_avatar
     FROM blog_posts b
     JOIN users u ON u.id = b.author_id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );
  return { rows, total };
};

const getBySlug = async (slug) => {
  const rows = await db.query(
    `SELECT b.*, u.name as author_name, u.avatar_url as author_avatar
     FROM blog_posts b JOIN users u ON u.id = b.author_id
     WHERE b.slug = ?`,
    [slug]
  );
  if (!rows.length) throw Object.assign(new Error('Post not found.'), { statusCode: 404 });
  // bump views
  await db.execute('UPDATE blog_posts SET views = views + 1 WHERE slug = ?', [slug]);
  return rows[0];
};

const getById = async (id) => {
  const rows = await db.query(
    `SELECT b.*, u.name as author_name FROM blog_posts b
     JOIN users u ON u.id = b.author_id WHERE b.id = ?`,
    [id]
  );
  if (!rows.length) throw Object.assign(new Error('Post not found.'), { statusCode: 404 });
  return rows[0];
};

const create = async (authorId, { title, excerpt, content, cover_image, category, tags, is_published }) => {
  const id   = uuidv4();
  const slug = await makeSlug(title);
  await db.execute(
    `INSERT INTO blog_posts (id, author_id, title, slug, excerpt, content, cover_image, category, tags, is_published)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, authorId, title, slug, excerpt || null, content,
     cover_image || null, category || 'General', tags || null, is_published ? 1 : 0]
  );
  return getById(id);
};

const update = async (id, authorId, data) => {
  const fields = ['title','excerpt','content','cover_image','category','tags','is_published'];
  const updates = []; const params = [];
  for (const f of fields) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); params.push(f === 'is_published' ? (data[f] ? 1 : 0) : data[f]); }
  }
  if (data.title) {
    const slug = await makeSlug(data.title, id);
    updates.push('slug = ?'); params.push(slug);
  }
  if (!updates.length) return getById(id);
  params.push(id, authorId);
  await db.execute(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ? AND author_id = ?`, params);
  return getById(id);
};

const remove = async (id, authorId) => {
  await db.execute('DELETE FROM blog_posts WHERE id = ? AND author_id = ?', [id, authorId]);
};

const getCategories = async () => {
  return db.query(
    'SELECT category, COUNT(*) as count FROM blog_posts WHERE is_published = 1 GROUP BY category ORDER BY count DESC'
  );
};

module.exports = { getAll, getBySlug, getById, create, update, remove, getCategories };
