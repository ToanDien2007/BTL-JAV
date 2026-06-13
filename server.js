require('dotenv').config();
const path    = require('path');
const express = require('express');
const mysql   = require('mysql2/promise');  
const cors    = require('cors');
const session = require('express-session');
const { register, login, logout, forgotPassword, resetPassword } = require('./scripts/auth');

const app = express();

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
  credentials: true,
}));
app.use(express.json());

app.use('/html',    express.static(path.join(__dirname, 'html')));
app.use('/css',     express.static(path.join(__dirname, 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/images',  express.static(path.join(__dirname, 'assets/images/products')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_prod',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
}));

app.get('/', (req, res) => res.redirect('/html/home.html'));

// ── Database ──────────────────────────────────────────────────
const db = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'itoshira_shop',
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
});

(async () => {
  try {
    const conn = await db.getConnection();
    console.log(`--- Đã kết nối MySQL (${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}) ---`);
    conn.release();
  } catch (err) {
    console.error('Lỗi kết nối MySQL:', err.message);
  }
})();

// ── Helpers ───────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  next();
}

function fixImage(p) {
  if (p?.image_url && !p.image_url.startsWith('http') && !p.image_url.startsWith('/'))
    p.image_url = `/images/${p.image_url}`;
  return p;
}

// Bọc async route để lỗi tự động trả 500 thay vì crash server
const wrap = fn => (req, res, next) => fn(req, res, next).catch(err => {
  console.error(err);
  res.status(500).json({ message: err.message });
});

// =============================================================
//  PRODUCTS
// =============================================================
app.get('/api/products', wrap(async (req, res) => {
  const { gender, cat, min, max } = req.query;
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  if (cat) {
    const cats = [].concat(cat);
    sql += ` AND category_id IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }
  if (min && max) { sql += ' AND price BETWEEN ? AND ?'; params.push(min, max); }

  const [rows] = await db.query(sql, params);
  res.json(rows.map(fixImage));
}));

app.get('/api/products/trending', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM products WHERE is_active = 1 AND is_trending = 1');
  res.json(rows.map(fixImage));
}));

app.get('/api/products/sale', wrap(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM products WHERE is_active = 1 AND discount_percent > 0 ORDER BY discount_percent DESC'
  );
  res.json(rows.map(fixImage));
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid product id' });
  const [rows] = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) return res.status(404).json({ message: 'Product not found' });
  res.json(fixImage(rows[0]));
}));

// =============================================================
//  VARIANTS
// =============================================================
app.get('/api/products/:id/variants', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
  const [rows] = await db.query(
    'SELECT id, color, size, stock FROM product_variants WHERE product_id = ? ORDER BY color, size',
    [id]
  );
  res.json(rows);
}));

// =============================================================
//  SEARCH
// =============================================================
app.get('/api/search', wrap(async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json([]);

  // Thử full-text search trước, fallback sang LIKE
  const ftTerms = query.split(/\s+/).filter(Boolean).map(t => `+${t}*`).join(' ');
  const [ftRows] = await db.query(
    `SELECT *, MATCH(name,description) AGAINST(? IN BOOLEAN MODE) AS _score
     FROM products WHERE is_active=1 AND MATCH(name,description) AGAINST(? IN BOOLEAN MODE)
     ORDER BY _score DESC LIMIT 20`,
    [ftTerms, ftTerms]
  );

  if (ftRows.length) return res.json(ftRows.map(fixImage));

  // LIKE fallback
  const tokens = query.split(/\s+/).filter(Boolean);
  const where  = tokens.map(() => '(name LIKE ? OR description LIKE ?)').join(' AND ');
  const params = tokens.flatMap(t => [`%${t}%`, `%${t}%`]);
  const [likeRows] = await db.query(
    `SELECT * FROM products WHERE is_active=1 AND (${where})
     ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name LIMIT 20`,
    [...params, `%${query}%`]
  );
  res.json(likeRows.map(fixImage));
}));

// =============================================================
//  REVIEWS & RATINGS
// =============================================================
app.get('/api/reviews/:productId', wrap(async (req, res) => {
  const pid = req.params.productId;

  const [comments, [statsRow], dist] = await Promise.all([
    db.query(
      `SELECT r.id, r.comment, r.created_at, r.user_id, u.username, u.full_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.comment IS NOT NULL AND r.comment != ''
       ORDER BY r.created_at DESC`,
      [pid]
    ).then(([rows]) => rows),

    db.query(
      'SELECT COUNT(*) AS count, IFNULL(AVG(rating),0) AS avg FROM ratings WHERE product_id = ?',
      [pid]
    ).then(([rows]) => rows),

    db.query(
      'SELECT rating, COUNT(*) AS cnt FROM ratings WHERE product_id = ? GROUP BY rating',
      [pid]
    ).then(([rows]) => rows),
  ]);

  res.json({
    comments,
    rating: {
      avg:   parseFloat(statsRow.avg) || 0,
      count: statsRow.count,
      dist:  Object.fromEntries(dist.map(r => [r.rating, r.cnt])),
    },
  });
}));

app.post('/api/reviews', requireAuth, wrap(async (req, res) => {
  const { product_id, comment } = req.body;
  if (!product_id || !comment?.trim())
    return res.status(400).json({ message: 'Vui lòng nhập bình luận.' });
  await db.query(
    'INSERT INTO reviews (product_id, user_id, comment) VALUES (?,?,?)',
    [product_id, req.session.user.id, comment.trim()]
  );
  res.status(201).json({ message: 'Bình luận thành công!' });
}));

app.post('/api/ratings', requireAuth, wrap(async (req, res) => {
  const { product_id, rating } = req.body;
  if (!product_id || rating < 0 || rating > 5)
    return res.status(400).json({ message: 'Số sao không hợp lệ.' });

  if (rating === 0) {
    await db.query('DELETE FROM ratings WHERE product_id=? AND user_id=?',
      [product_id, req.session.user.id]);
    return res.json({ message: 'Đã hủy đánh giá sao!' });
  }
  await db.query(
    'INSERT INTO ratings (product_id,user_id,rating) VALUES (?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating)',
    [product_id, req.session.user.id, rating]
  );
  res.json({ message: 'Đã cập nhật đánh giá!' });
}));

app.get('/api/ratings/:productId', wrap(async (req, res) => {
  if (!req.session?.user) return res.json({ rating: 0 });
  const [rows] = await db.query(
    'SELECT rating FROM ratings WHERE product_id=? AND user_id=?',
    [req.params.productId, req.session.user.id]
  );
  res.json({ rating: rows[0]?.rating || 0 });
}));

app.delete('/api/reviews/:id', requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.query('SELECT user_id FROM reviews WHERE id=?', [id]);
  if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bình luận.' });
  if (rows[0].user_id !== req.session.user.id)
    return res.status(403).json({ message: 'Không có quyền xóa.' });
  await db.query('DELETE FROM reviews WHERE id=?', [id]);
  res.json({ message: 'Đã xóa bình luận.' });
}));

// =============================================================
//  USER / PROFILE
// =============================================================
app.get('/api/me', wrap(async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ message: 'Chưa đăng nhập.' });
  const [rows] = await db.query(
    'SELECT id,username,email,full_name,phone,address,COALESCE(total_spent,0) AS total_spent FROM users WHERE id=?',
    [req.session.user.id]
  );
  if (!rows.length) return res.status(500).json({ message: 'Lỗi server.' });
  res.json(rows[0]);
}));

app.put('/api/me/profile', requireAuth, wrap(async (req, res) => {
  const { phone, address } = req.body;
  await db.query('UPDATE users SET phone=?,address=? WHERE id=?',
    [phone || null, address || null, req.session.user.id]);
  res.json({ message: 'Cập nhật thành công.' });
}));

// =============================================================
//  ORDERS – đặt hàng (transaction)
// =============================================================
app.post('/api/orders', requireAuth, wrap(async (req, res) => {
  const { items, subtotal, total, shipping_fee = 0, note = '' } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'Giỏ hàng trống.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Kiểm tra & trừ stock từng item
    for (const item of items) {
      const color = item.color || '';
      const size  = item.size  || '';
      const [[variant]] = await conn.query(
        'SELECT id, stock FROM product_variants WHERE product_id=? AND color=? AND size=? FOR UPDATE',
        [item.product_id, color, size]
      );
      if (!variant)
        throw Object.assign(new Error(`Sản phẩm #${item.product_id} (${color}/${size}) không tồn tại trong kho.`), { status: 400 });
      if (variant.stock < item.quantity) {
        await conn.rollback();
        return res.status(400).json({
          message:    `Sản phẩm #${item.product_id} (${color}/${size}) chỉ còn ${variant.stock} cái.`,
          product_id: item.product_id, color, size, stock: variant.stock,
        });
      }
      await conn.query('UPDATE product_variants SET stock=stock-? WHERE id=?', [item.quantity, variant.id]);
    }

    // Tạo đơn hàng
    const [{ insertId: orderId }] = await conn.query(
      'INSERT INTO orders (user_id,status,subtotal,shipping_fee,total,note) VALUES (?,?,?,?,?,?)',
      [req.session.user.id, 'pending', subtotal, shipping_fee, total, note]
    );

    await conn.query(
      'INSERT INTO order_items (order_id,product_id,color,size,quantity,unit_price,line_total) VALUES ?',
      [items.map(i => [orderId, i.product_id, i.color||'', i.size||'', i.quantity, i.unit_price, i.line_total])]
    );

    await conn.query(
      'UPDATE users SET total_spent=COALESCE(total_spent,0)+? WHERE id=?',
      [total, req.session.user.id]
    );

    await conn.commit();
    res.json({ order_id: orderId, message: 'Đặt hàng thành công!' });
  } catch (err) {
    await conn.rollback();
    res.status(err.status || 500).json({ message: err.message });
  } finally {
    conn.release();
  }
}));

// =============================================================
//  ORDER HISTORY
// =============================================================
app.get('/api/orders', requireAuth, wrap(async (req, res) => {
  const uid = req.session.user.id;
  const [orders] = await db.query(
    `SELECT id,status,subtotal,shipping_fee,total,note,created_at
     FROM orders WHERE user_id=? ORDER BY created_at DESC`,
    [uid]
  );
  if (!orders.length) return res.json([]);

  const ids = orders.map(o => o.id);
  const [items] = await db.query(
    `SELECT oi.order_id, oi.product_id, oi.color, oi.size, oi.quantity,
            oi.unit_price, oi.line_total, p.name, p.image_url
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );

  const itemMap = {};
  items.forEach(i => {
    (itemMap[i.order_id] ??= []).push(fixImage(i));
  });
  res.json(orders.map(o => ({ ...o, items: itemMap[o.id] || [] })));
}));

app.patch('/api/orders/:id/cancel', requireAuth, wrap(async (req, res) => {
  const orderId = Number(req.params.id);
  const uid     = req.session.user.id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      'SELECT status,total FROM orders WHERE id=? AND user_id=?', [orderId, uid]
    );
    if (!order)               return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (order.status !== 'pending')
      return res.status(400).json({ message: 'Chỉ có thể hủy đơn hàng đang chờ xử lý.' });

    const [items] = await conn.query(
      'SELECT product_id,color,size,quantity FROM order_items WHERE order_id=?', [orderId]
    );
    for (const item of items) {
      await conn.query(
        'UPDATE product_variants SET stock=stock+? WHERE product_id=? AND color=? AND size=?',
        [item.quantity, item.product_id, item.color, item.size]
      );
    }

    await conn.query('UPDATE orders SET status=? WHERE id=?', ['cancelled', orderId]);
    await conn.query(
      'UPDATE users SET total_spent=GREATEST(0,COALESCE(total_spent,0)-?) WHERE id=?',
      [order.total, uid]
    );

    await conn.commit();
    res.json({ message: 'Đã hủy đơn hàng thành công.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
}));

// =============================================================
//  AUTH
// =============================================================
app.post('/api/register',        (req, res) => register(req, res, db));
app.post('/api/login',           (req, res) => login(req, res, db));
app.post('/api/logout',          (req, res) => logout(req, res));
app.post('/api/forgot-password', (req, res) => forgotPassword(req, res, db));
app.post('/api/reset-password',  (req, res) => resetPassword(req, res, db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại: http://localhost:${PORT}`));