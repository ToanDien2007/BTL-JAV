require('dotenv').config();
const path    = require('path');
const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const session = require('express-session');
const { register, login, logout, forgotPassword, resetPassword } = require('./scripts/auth');

const app = express();

// ── CORS ─────────────────────────────────────────────────────
// Cho phép cả localhost (dev) lẫn domain thật (prod)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // Cho phép requests không có origin (Postman, mobile app)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── SESSION ───────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,                                      // chặn JS đọc cookie
        secure: process.env.NODE_ENV === 'production',       // bật HTTPS khi prod
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    }
}));

app.get('/', (req, res) => {
    res.redirect('/html/home.html');
});

// ── DATABASE (dùng Pool thay vì Connection để tự reconnect) ──
const db = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'itoshira_shop',
    port:     Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Kiểm tra kết nối lúc khởi động
db.getConnection((err, conn) => {
    if (err) {
        console.error('Lỗi kết nối MySQL:', err.message);
        return;
    }
    console.log(`--- Đã kết nối MySQL thành công (${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}) ---`);
    conn.release();
});

// ── Lấy tất cả sản phẩm (có filter) ──────────────────────────
app.get('/api/products', (req, res) => {
    const { gender, cat, min, max } = req.query;
    let sql = "SELECT * FROM products WHERE is_active = 1";
    let params = [];

    if (gender) { sql += " AND gender = ?"; params.push(gender); }
    if (cat) {
        const cats = Array.isArray(cat) ? cat : [cat];
        sql += ` AND category_id IN (${cats.map(() => '?').join(',')})`;
        params.push(...cats);
    }
    if (min && max) { sql += " AND price BETWEEN ? AND ?"; params.push(min, max); }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ── Sản phẩm xu hướng ────────────────────────────────────────
app.get('/api/products/trending', (req, res) => {
    const sql = "SELECT * FROM products WHERE is_active = 1 AND is_trending = 1";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ── Sản phẩm giảm giá ────────────────────────────────────────
app.get('/api/products/sale', (req, res) => {
    const sql = "SELECT * FROM products WHERE is_active = 1 AND discount_percent > 0 ORDER BY discount_percent DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ── Lấy 1 sản phẩm theo id ───────────────────────────────────
app.get('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid product id' });

    db.query("SELECT * FROM products WHERE id = ? LIMIT 1", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results || results.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(results[0]);
    });
});

// ── Tìm kiếm ─────────────────────────────────────────────────
function searchByLike(q, res) {
    const tokens = q.split(/\s+/).filter(Boolean);
    const likeClauses = tokens.map(() => "(name LIKE ? OR description LIKE ?)").join(' AND ');
    const likeParams = tokens.flatMap(t => [`%${t}%`, `%${t}%`]);

    const sql = `
        SELECT * FROM products
        WHERE is_active = 1 AND (${likeClauses})
        ORDER BY
            CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
            name ASC
        LIMIT 20
    `;
    db.query(sql, [...likeParams, `%${q}%`], (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(results || []);
    });
}

app.get('/api/search', (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const ftTerms = q.split(/\s+/).filter(Boolean).map(t => `+${t}*`).join(' ');
    const ftSql = `
        SELECT *, MATCH(name, description) AGAINST(? IN BOOLEAN MODE) AS _score
        FROM products
        WHERE is_active = 1
          AND MATCH(name, description) AGAINST(? IN BOOLEAN MODE)
        ORDER BY _score DESC
        LIMIT 20
    `;

    db.query(ftSql, [ftTerms, ftTerms], (ftErr, ftResults) => {
        if (ftErr) {
            console.warn('[Search] FULLTEXT lỗi, dùng LIKE fallback:', ftErr.code, ftErr.message);
            return searchByLike(q, res);
        }
        if (ftResults.length === 0) return searchByLike(q, res);
        res.json(ftResults);
    });
});

// ── Lấy bình luận + rating của sản phẩm ─────────────────────
app.get('/api/reviews/:productId', (req, res) => {
  const pid = req.params.productId;

  const sqlComments = `
    SELECT r.id, r.comment, r.created_at, r.user_id,
           u.username, u.full_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? AND r.comment IS NOT NULL AND r.comment != ''
    ORDER BY r.created_at DESC
  `;

  db.query(sqlComments, [pid], (err, comments) => {
    if (err) return res.status(500).json(err);
    db.query(
      'SELECT COUNT(*) AS count, IFNULL(AVG(rating),0) AS avg FROM ratings WHERE product_id = ?',
      [pid],
      (err2, ratingRows) => {
        if (err2) return res.status(500).json(err2);
        db.query(
          'SELECT rating, COUNT(*) AS cnt FROM ratings WHERE product_id = ? GROUP BY rating',
          [pid],
          (err3, dist) => {
            if (err3) return res.status(500).json(err3);
            res.json({
              comments,
              rating: {
                avg:   parseFloat(ratingRows[0].avg) || 0,
                count: ratingRows[0].count,
                dist:  Object.fromEntries(dist.map(r => [r.rating, r.cnt])),
              }
            });
          }
        );
      }
    );
  });
});

// ── Gửi bình luận ─────────────────────────────────────────────
app.post('/api/reviews', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  const { product_id, comment } = req.body;
  if (!product_id || !comment?.trim()) return res.status(400).json({ message: 'Vui lòng nhập bình luận.' });

  db.query(
    'INSERT INTO reviews (product_id, user_id, comment) VALUES (?, ?, ?)',
    [product_id, req.session.user.id, comment.trim()],
    (err) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: 'Bình luận thành công!' });
    }
  );
});

// ── Vote sao ──────────────────────────────────────────────────
app.post('/api/ratings', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  const { product_id, rating } = req.body;
  if (!product_id || rating < 1 || rating > 5) return res.status(400).json({ message: 'Số sao không hợp lệ.' });

  db.query(
    'INSERT INTO ratings (product_id, user_id, rating) VALUES (?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating)',
    [product_id, req.session.user.id, rating],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Đã cập nhật đánh giá!' });
    }
  );
});

// ── Lấy vote sao của user hiện tại ───────────────────────────
app.get('/api/ratings/:productId', (req, res) => {
  if (!req.session?.user) return res.json({ rating: 0 });
  db.query(
    'SELECT rating FROM ratings WHERE product_id = ? AND user_id = ?',
    [req.params.productId, req.session.user.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json({ rating: rows[0]?.rating || 0 });
    }
  );
});

// ── Xóa đánh giá ─────────────────────────────────────────────
app.delete('/api/reviews/:id', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }
  const reviewId = Number(req.params.id);
  db.query(
    'SELECT user_id FROM reviews WHERE id = ?',
    [reviewId],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ message: 'Không tìm thấy bình luận.' });
      if (rows[0].user_id !== req.session.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
      }
      db.query('DELETE FROM reviews WHERE id = ?', [reviewId], (err2) => {
        if (err2) return res.status(500).json({ message: 'Lỗi server.' });
        res.json({ message: 'Đã xóa bình luận.' });
      });
    }
  );
});

// ── Cập nhật thông tin cá nhân ────────────────────────────────
app.put('/api/me/profile', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ message: 'Chưa đăng nhập.' });
  const { phone, address } = req.body;
  db.query(
    'UPDATE users SET phone = ?, address = ? WHERE id = ?',
    [phone || null, address || null, req.session.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Lỗi cập nhật.' });
      res.json({ message: 'Cập nhật thành công.' });
    }
  );
});

// ── Tạo đơn hàng ─────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập để đặt hàng.' });
  }
  const { items, subtotal, total, shipping_fee = 0, note = '' } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'Giỏ hàng trống.' });

  db.query(
    'INSERT INTO orders (user_id, status, subtotal, shipping_fee, total, note) VALUES (?,?,?,?,?,?)',
    [req.session.user.id, 'pending', subtotal, shipping_fee, total, note],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Lỗi tạo đơn hàng.' });
      const orderId = result.insertId;
      const vals    = items.map(i => [orderId, i.product_id, i.quantity, i.unit_price, i.line_total]);
      db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES ?',
        [vals],
        (err2) => {
          if (err2) return res.status(500).json({ message: 'Lỗi lưu sản phẩm đơn hàng.' });
          db.query(
            'UPDATE users SET total_spent = COALESCE(total_spent,0) + ? WHERE id = ?',
            [total, req.session.user.id],
            () => {}
          );
          res.json({ order_id: orderId, message: 'Đặt hàng thành công!' });
        }
      );
    }
  );
});

// ── /api/me ───────────────────────────────────────────────────
app.get('/api/me', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Chưa đăng nhập.' });
    }
    db.query(
        'SELECT id, username, email, full_name, phone, address, COALESCE(total_spent, 0) AS total_spent FROM users WHERE id = ?',
        [req.session.user.id],
        (err, rows) => {
            if (err) {
                db.query(
                    'SELECT id, username, email, full_name, phone, address FROM users WHERE id = ?',
                    [req.session.user.id],
                    (err2, rows2) => {
                        if (err2 || !rows2.length) return res.status(500).json({ message: 'Lỗi server.' });
                        res.json({ ...rows2[0], total_spent: 0 });
                    }
                );
                return;
            }
            if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy user.' });
            res.json(rows[0]);
        }
    );
});

// ── Auth routes ───────────────────────────────────────────────
app.post('/api/register',        (req, res) => register(req, res, db));
app.post('/api/login',           (req, res) => login(req, res, db));
app.post('/api/logout',          (req, res) => logout(req, res));
app.post('/api/forgot-password', (req, res) => forgotPassword(req, res, db));
app.post('/api/reset-password',  (req, res) => resetPassword(req, res, db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});