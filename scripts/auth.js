const bcrypt     = require('bcrypt');
const nodemailer = require('nodemailer');

// ── Nodemailer dùng biến môi trường ──────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,   // App Password từ .env, KHÔNG hardcode
  },
});

// ── OTP lưu vào DB (bảng otp_tokens) thay vì RAM ─────────────
// Schema cần tạo:
//   CREATE TABLE IF NOT EXISTS otp_tokens (
//     email   VARCHAR(255) PRIMARY KEY,
//     otp     VARCHAR(6)   NOT NULL,
//     expiry  BIGINT       NOT NULL
//   );
async function saveOtp(db, email, otp, expiry) {
  await db.promise().query(
    'INSERT INTO otp_tokens (email, otp, expiry) VALUES (?,?,?) ON DUPLICATE KEY UPDATE otp=VALUES(otp), expiry=VALUES(expiry)',
    [email, otp, expiry]
  );
}
async function getOtp(db, email) {
  const [rows] = await db.promise().query(
    'SELECT otp, expiry FROM otp_tokens WHERE email = ?', [email]
  );
  return rows[0] || null;
}
async function deleteOtp(db, email) {
  await db.promise().query('DELETE FROM otp_tokens WHERE email = ?', [email]);
}

// ==============================================================
//  ĐĂNG KÝ
// ==============================================================
async function register(req, res, db) {
  const { full_name, email, username, password, confirm_password } = req.body;

  if (!full_name || !email || !username || !password || !confirm_password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (rows.length > 0) {
      return res.status(409).json({ message: 'Email hoặc username đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.promise().query(
      'INSERT INTO users (full_name, email, username, password, auth_provider) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, username, hashedPassword, 'local']
    );

    return res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ==============================================================
//  ĐĂNG NHẬP
// ==============================================================
async function login(req, res, db) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
    }

    req.session.user = {
      id:        user.id,
      username:  user.username,
      email:     user.email,
      full_name: user.full_name,
    };

    return res.json({ message: 'Đăng nhập thành công!', user: req.session.user });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ==============================================================
//  ĐĂNG XUẤT
// ==============================================================
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Không thể đăng xuất.' });
    res.clearCookie('connect.sid');
    return res.json({ message: 'Đăng xuất thành công.' });
  });
}

// ==============================================================
//  QUÊN MẬT KHẨU – Gửi OTP
// ==============================================================
async function forgotPassword(req, res, db) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });

  try {
    const [rows] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    // Luôn trả thông báo giống nhau để bảo mật (không lộ email có tồn tại không)
    if (rows.length === 0) {
      return res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
    }

    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 phút

    // Lưu OTP vào DB (không mất khi server restart)
    await saveOtp(db, email, otp, expiry);

    await transporter.sendMail({
      from:    `"Itoshira Support" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: 'Mã xác nhận đặt lại mật khẩu',
      html: `
        <div style="font-family:sans-serif; max-width:400px; margin:auto;">
          <h2 style="color:#ff3d7f;">Itoshira</h2>
          <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
          <div style="font-size:36px; font-weight:bold; letter-spacing:8px;
                      color:#ff3d7f; text-align:center; padding:20px 0;">
            ${otp}
          </div>
          <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
          <p style="color:#888;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `,
    });

    return res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
  } catch (err) {
    console.error('Lỗi gửi OTP:', err);
    return res.status(500).json({ message: 'Lỗi server khi gửi email.' });
  }
}

// ==============================================================
//  ĐẶT LẠI MẬT KHẨU – Xác nhận OTP
// ==============================================================
async function resetPassword(req, res, db) {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });
  }

  try {
    const record = await getOtp(db, email);
    if (!record || Date.now() > record.expiry) {
      await deleteOtp(db, email);
      return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng thử lại.' });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    await deleteOtp(db, email);
    return res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    console.error('Lỗi reset password:', err);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ==============================================================
//  MIDDLEWARE
// ==============================================================
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
}

module.exports = { register, login, logout, forgotPassword, resetPassword, requireLogin };