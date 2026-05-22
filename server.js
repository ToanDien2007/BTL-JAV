const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const { register, login, logout, forgotPassword, resetPassword } = require('./scripts/auth');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: 'itoshira_secret_123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.get('/', (req, res) => {
    res.redirect('/html/home.html');
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Toandien07',
    database: 'itoshira_shop',
    port: 3307
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL (Kiểm tra lại Port 3307 và Pass): ', err.message);
        return;
    }
    console.log('--- Đã kết nối MySQL thành công trên Port 3307 ---');
});

// ── Lấy tất cả sản phẩm (có filter) ──────────────────────────
app.get('/api/products', (req, res) => {
    const { gender, cat, min, max } = req.query;
    let sql = "SELECT * FROM products WHERE is_active = 1";
    let params = [];

    if (gender) { sql += " AND gender = ?"; params.push(gender); }
    if (cat)    { sql += " AND category_id = ?"; params.push(cat); }
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

// ── Đánh giá sản phẩm ────────────────────────────────────────
app.get('/api/reviews/:productId', (req, res) => {
  const sql = `
    SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
           u.username, u.full_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;
  db.query(sql, [req.params.productId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/reviews', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập để đánh giá.' });
  }
  const { product_id, rating, comment } = req.body;
  if (!product_id || !comment?.trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập nhận xét.' });
  }
  if (rating < 0 || rating > 5) {
    return res.status(400).json({ message: 'Số sao không hợp lệ.' });
  }

  db.query(
    'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
    [product_id, req.session.user.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (rows.length > 0) {
        return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này rồi.' });
      }
      db.query(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [product_id, req.session.user.id, rating, comment.trim()],
        (err2) => {
          if (err2) return res.status(500).json(err2);
          res.status(201).json({ message: 'Đánh giá thành công!' });
        }
      );
    }
  );
});

// ── Xóa đánh giá (chỉ người tạo) ────────────────────────────
app.delete('/api/reviews/:id', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }
  const reviewId = Number(req.params.id);
  // Chỉ cho xóa nếu là chủ sở hữu
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

// ── /api/me – trả thông tin user đang đăng nhập ──────────────
app.get('/api/me', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Chưa đăng nhập.' });
    }
    // Lấy fresh data từ DB (kể cả total_spent)
    db.query(
        'SELECT id, username, email, full_name, COALESCE(total_spent, 0) AS total_spent FROM users WHERE id = ?',
        [req.session.user.id],
        (err, rows) => {
            if (err) {
                // Fallback nếu cột total_spent chưa tồn tại trong DB
                db.query(
                    'SELECT id, username, email, full_name FROM users WHERE id = ?',
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server Node.js đang chạy tại: http://localhost:${PORT}`);
});