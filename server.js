require('dotenv').config();
const path    = require('path');
const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const session = require('express-session');
const { register, login, logout, forgotPassword, resetPassword } = require('./scripts/auth');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// ── STATIC: chỉ serve đúng thư mục cần thiết ─────────────────
// KHÔNG dùng express.static(__dirname) vì lộ toàn bộ source code
app.use('/html',    express.static(path.join(__dirname, 'html')));
app.use('/css',     express.static(path.join(__dirname, 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/images',  express.static(path.join(__dirname, 'assets/images/products')));

// ── SESSION ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
}));

app.get('/', (req, res) => res.redirect('/html/home.html'));

// ── DATABASE ──────────────────────────────────────────────────
const db = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'itoshira_shop',
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

db.getConnection((err, conn) => {
  if (err) { console.error('Lỗi kết nối MySQL:', err.message); return; }
  console.log(`--- Đã kết nối MySQL (${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}) ---`);
  conn.release();
});

// ── Middleware kiểm tra đăng nhập ────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  next();
}

// =============================================================
//  PRODUCTS
// =============================================================
function formatProductImage(p) {
  if (!p) return p;
  if (p.image_url && !p.image_url.startsWith('http') && !p.image_url.startsWith('/')) {
    p.image_url = `/images/${p.image_url}`;
  }
  return p;
}
function formatProducts(list) {
  if (!Array.isArray(list)) return [];
  return list.map(formatProductImage);
}

app.get('/api/products', (req, res) => {
  const { gender, cat, min, max } = req.query;
  let sql    = 'SELECT * FROM products WHERE is_active = 1';
  let params = [];

  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  if (cat) {
    const cats = Array.isArray(cat) ? cat : [cat];
    sql += ` AND category_id IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }
  if (min && max) { sql += ' AND price BETWEEN ? AND ?'; params.push(min, max); }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(formatProducts(results));
  });
});

app.get('/api/products/trending', (req, res) => {
  db.query(
    'SELECT * FROM products WHERE is_active = 1 AND is_trending = 1',
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(formatProducts(results));
    }
  );
});

app.get('/api/products/sale', (req, res) => {
  db.query(
    'SELECT * FROM products WHERE is_active = 1 AND discount_percent > 0 ORDER BY discount_percent DESC',
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(formatProducts(results));
    }
  );
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid product id' });

  db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!results.length) return res.status(404).json({ message: 'Product not found' });
    res.json(formatProductImage(results[0]));
  });
});

// =============================================================
//  VARIANTS & STOCK
// =============================================================
app.get('/api/products/:id/variants', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });

  db.query(
    'SELECT id, color, size, stock FROM product_variants WHERE product_id = ? ORDER BY color, size',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
});

// =============================================================
//  SEARCH
// =============================================================
function searchByLike(query, res) {
  const tokens      = query.split(/\s+/).filter(Boolean);
  const likeClauses = tokens.map(() => '(name LIKE ? OR description LIKE ?)').join(' AND ');
  const likeParams  = tokens.flatMap(t => [`%${t}%`, `%${t}%`]);
  const sql = `
    SELECT * FROM products
    WHERE is_active = 1 AND (${likeClauses})
    ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name ASC
    LIMIT 20
  `;
  db.query(sql, [...likeParams, `%${query}%`], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(formatProducts(results || []));
  });
}

app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json([]);

  const ftTerms = query.split(/\s+/).filter(Boolean).map(t => `+${t}*`).join(' ');
  const ftSql   = `
    SELECT *, MATCH(name, description) AGAINST(? IN BOOLEAN MODE) AS _score
    FROM products
    WHERE is_active = 1 AND MATCH(name, description) AGAINST(? IN BOOLEAN MODE)
    ORDER BY _score DESC LIMIT 20
  `;

  db.query(ftSql, [ftTerms, ftTerms], (err, results) => {
    if (err || !results.length) return searchByLike(query, res);
    res.json(formatProducts(results));
  });
});

// =============================================================
//  REVIEWS & RATINGS
// =============================================================
app.get('/api/reviews/:productId', (req, res) => {
  const pid = req.params.productId;

  db.query(
    `SELECT r.id, r.comment, r.created_at, r.user_id, u.username, u.full_name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.comment IS NOT NULL AND r.comment != ''
     ORDER BY r.created_at DESC`,
    [pid],
    (err, comments) => {
      if (err) return res.status(500).json({ message: err.message });

      db.query(
        'SELECT COUNT(*) AS count, IFNULL(AVG(rating),0) AS avg FROM ratings WHERE product_id = ?',
        [pid],
        (err2, ratingRows) => {
          if (err2) return res.status(500).json({ message: err2.message });

          db.query(
            'SELECT rating, COUNT(*) AS cnt FROM ratings WHERE product_id = ? GROUP BY rating',
            [pid],
            (err3, dist) => {
              if (err3) return res.status(500).json({ message: err3.message });
              res.json({
                comments,
                rating: {
                  avg:   parseFloat(ratingRows[0].avg) || 0,
                  count: ratingRows[0].count,
                  dist:  Object.fromEntries(dist.map(r => [r.rating, r.cnt])),
                },
              });
            }
          );
        }
      );
    }
  );
});

app.post('/api/reviews', requireAuth, (req, res) => {
  const { product_id, comment } = req.body;
  if (!product_id || !comment?.trim()) return res.status(400).json({ message: 'Vui lòng nhập bình luận.' });

  db.query(
    'INSERT INTO reviews (product_id, user_id, comment) VALUES (?, ?, ?)',
    [product_id, req.session.user.id, comment.trim()],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Bình luận thành công!' });
    }
  );
});

app.post('/api/ratings', requireAuth, (req, res) => {
  const { product_id, rating } = req.body;
  if (!product_id || rating < 1 || rating > 5) return res.status(400).json({ message: 'Số sao không hợp lệ.' });

  db.query(
    'INSERT INTO ratings (product_id, user_id, rating) VALUES (?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating)',
    [product_id, req.session.user.id, rating],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Đã cập nhật đánh giá!' });
    }
  );
});

app.get('/api/ratings/:productId', (req, res) => {
  if (!req.session?.user) return res.json({ rating: 0 });
  db.query(
    'SELECT rating FROM ratings WHERE product_id = ? AND user_id = ?',
    [req.params.productId, req.session.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ rating: rows[0]?.rating || 0 });
    }
  );
});

app.delete('/api/reviews/:id', requireAuth, (req, res) => {
  const reviewId = Number(req.params.id);
  db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: 'Không tìm thấy bình luận.' });
    if (rows[0].user_id !== req.session.user.id) return res.status(403).json({ message: 'Không có quyền xóa.' });

    db.query('DELETE FROM reviews WHERE id = ?', [reviewId], (err2) => {
      if (err2) return res.status(500).json({ message: err2.message });
      res.json({ message: 'Đã xóa bình luận.' });
    });
  });
});

// =============================================================
//  USER / PROFILE
// =============================================================
app.get('/api/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ message: 'Chưa đăng nhập.' });

  db.query(
    'SELECT id, username, email, full_name, phone, address, COALESCE(total_spent,0) AS total_spent FROM users WHERE id = ?',
    [req.session.user.id],
    (err, rows) => {
      if (err || !rows.length) return res.status(500).json({ message: 'Lỗi server.' });
      res.json(rows[0]);
    }
  );
});

app.put('/api/me/profile', requireAuth, (req, res) => {
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

// =============================================================
//  ORDERS (có kiểm tra + trừ stock, dùng transaction)
// =============================================================
app.post('/api/orders', requireAuth, (req, res) => {
  const { items, subtotal, total, shipping_fee = 0, note = '' } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'Giỏ hàng trống.' });

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json({ message: 'Lỗi kết nối DB.' });

    conn.beginTransaction((txErr) => {
      if (txErr) { conn.release(); return res.status(500).json({ message: 'Lỗi transaction.' }); }

      // Kiểm tra stock từng item tuần tự
      let idx = 0;

      function checkNext() {
        if (idx >= items.length) return insertOrder();

        const item  = items[idx++];
        const color = item.color || '';
        const size  = item.size  || '';

        conn.query(
          'SELECT id, stock FROM product_variants WHERE product_id = ? AND color = ? AND size = ? FOR UPDATE',
          [item.product_id, color, size],
          (err2, rows) => {
            if (err2) return rollback('Lỗi kiểm tra tồn kho.');

            const variant = rows[0];
            if (!variant) return rollback(`Sản phẩm #${item.product_id} (${color}/${size}) không tồn tại trong kho.`);
            if (variant.stock < item.quantity) {
              return conn.rollback(() => {
                conn.release();
                res.status(400).json({
                  message:    `Sản phẩm #${item.product_id} (${color}/${size}) chỉ còn ${variant.stock} cái.`,
                  product_id: item.product_id,
                  color, size,
                  stock:      variant.stock,
                });
              });
            }

            conn.query(
              'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
              [item.quantity, variant.id],
              (err3) => {
                if (err3) return rollback('Lỗi cập nhật tồn kho.');
                checkNext();
              }
            );
          }
        );
      }

      function insertOrder() {
        conn.query(
          'INSERT INTO orders (user_id, status, subtotal, shipping_fee, total, note) VALUES (?,?,?,?,?,?)',
          [req.session.user.id, 'pending', subtotal, shipping_fee, total, note],
          (err4, result) => {
            if (err4) return rollback('Lỗi tạo đơn hàng.');
            const orderId = result.insertId;
            const vals    = items.map(i => [orderId, i.product_id, i.color || '', i.size || '', i.quantity, i.unit_price, i.line_total]);

            conn.query(
              'INSERT INTO order_items (order_id, product_id, color, size, quantity, unit_price, line_total) VALUES ?',
              [vals],
              (err5) => {
                if (err5) return rollback('Lỗi lưu sản phẩm đơn hàng.');

                conn.query(
                  'UPDATE users SET total_spent = COALESCE(total_spent,0) + ? WHERE id = ?',
                  [total, req.session.user.id],
                  (err6) => {
                    if (err6) return rollback('Lỗi cập nhật chi tiêu.');

                    conn.commit((err7) => {
                      conn.release();
                      if (err7) return res.status(500).json({ message: 'Lỗi commit.' });
                      res.json({ order_id: orderId, message: 'Đặt hàng thành công!' });
                    });
                  }
                );
              }
            );
          }
        );
      }

      function rollback(msg) {
        conn.rollback(() => { conn.release(); res.status(500).json({ message: msg }); });
      }

      checkNext();
    });
  });
});


// =============================================================
//  ORDER HISTORY
// =============================================================
app.get('/api/orders', requireAuth, (req, res) => {
  const uid = req.session.user.id;
  db.query(
    `SELECT o.id, o.status, o.subtotal, o.shipping_fee, o.total, o.note, o.created_at
     FROM orders o
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [uid],
    (err, orders) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!orders.length) return res.json([]);
      const ids = orders.map(o => o.id);
      db.query(
        `SELECT oi.order_id, oi.product_id, oi.color, oi.size, oi.quantity, oi.unit_price, oi.line_total,
                p.name, p.image_url
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${ids.map(() => '?').join(',')})`,
        ids,
        (err2, items) => {
          if (err2) return res.status(500).json({ message: err2.message });
          const itemMap = {};
          items.forEach(i => {
            if (!itemMap[i.order_id]) itemMap[i.order_id] = [];
            const formatted = {
              ...i,
              image_url: i.image_url && !i.image_url.startsWith('http') && !i.image_url.startsWith('/') ? `/images/${i.image_url}` : i.image_url
            };
            itemMap[i.order_id].push(formatted);
          });
          res.json(orders.map(o => ({ ...o, items: itemMap[o.id] || [] })));
        }
      );
    }
  );
});

app.patch('/api/orders/:id/cancel', requireAuth, (req, res) => {
  const orderId = Number(req.params.id);
  const uid     = req.session.user.id;
  db.getConnection((err, conn) => {
    if (err) return res.status(500).json({ message: 'Loi ket noi DB.' });
    conn.query('SELECT status, total FROM orders WHERE id = ? AND user_id = ?', [orderId, uid], (err2, rows) => {
      if (err2 || !rows.length) { conn.release(); return res.status(404).json({ message: 'Khong tim thay don hang.' }); }
      if (rows[0].status !== 'pending') { conn.release(); return res.status(400).json({ message: 'Chi co the huy don hang dang cho xu ly.' }); }
      conn.beginTransaction((txErr) => {
        if (txErr) { conn.release(); return res.status(500).json({ message: 'Loi transaction.' }); }
        conn.query('SELECT product_id, color, size, quantity FROM order_items WHERE order_id = ?', [orderId], (err3, items) => {
          if (err3) return rollback('Loi lay items.');
          let i = 0;
          function restoreNext() {
            if (i >= items.length) return updateOrder();
            const item = items[i++];
            conn.query('UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND color = ? AND size = ?',
              [item.quantity, item.product_id, item.color, item.size],
              (e) => { if (e) return rollback('Loi hoan kho.'); restoreNext(); });
          }
          function updateOrder() {
            conn.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId], (e) => {
              if (e) return rollback('Loi cap nhat don.');
              conn.query('UPDATE users SET total_spent = GREATEST(0, COALESCE(total_spent,0) - ?) WHERE id = ?',
                [rows[0].total, uid],
                (e2) => {
                  if (e2) return rollback('Loi cap nhat chi tieu.');
                  conn.commit((ce) => { conn.release(); if (ce) return res.status(500).json({ message: 'Loi commit.' }); res.json({ message: 'Da huy don hang thanh cong.' }); });
                });
            });
          }
          function rollback(msg) { conn.rollback(() => { conn.release(); res.status(500).json({ message: msg }); }); }
          restoreNext();
        });
      });
    });
  });
});

// =============================================================
//  AUTH ROUTES
// =============================================================
app.post('/api/register',        (req, res) => register(req, res, db));
app.post('/api/login',           (req, res) => login(req, res, db));
app.post('/api/logout',          (req, res) => logout(req, res));
app.post('/api/forgot-password', (req, res) => forgotPassword(req, res, db));
app.post('/api/reset-password',  (req, res) => resetPassword(req, res, db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại: http://localhost:${PORT}`));