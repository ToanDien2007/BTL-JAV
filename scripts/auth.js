const bcrypt    = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Toandien.ptit@gmail.com',   
    pass: '',     
  },
});

// ── Lưu OTP tạm thời trong RAM ─────────────────────────────────
// { email: { otp, expiry } }
const otpStore = {};

// ==============================================================
//  ĐĂNG KÝ
//  POST /api/register
//  Body: { full_name, email, username, password, confirm_password }
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
    // Kiểm tra email hoặc username đã tồn tại chưa
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
//  ĐĂNG NHẬP – hỗ trợ cả email lẫn username
//  POST /api/login
//  Body: { identifier, password }
//  (identifier = email hoặc username)
// ==============================================================
async function login(req, res, db) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  try {
    // Tìm theo email hoặc username
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

    // Lưu session
    req.session.user = {
      id:       user.id,
      username: user.username,
      email:    user.email,
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
//  POST /api/logout
// ==============================================================
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Không thể đăng xuất.' });
    res.clearCookie('connect.sid');
    return res.json({ message: 'Đăng xuất thành công.' });
  });
}

// ==============================================================
//  QUÊN MẬT KHẨU – BƯỚC 1: Gửi OTP về email
//  POST /api/forgot-password
//  Body: { email }
// ==============================================================
async function forgotPassword(req, res, db) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });

  try {
    const [rows] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      // Luôn trả thông báo giống nhau để bảo mật
      return res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
    }

    // Tạo OTP 6 số, hết hạn sau 10 phút
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000, // 10 phút
    };

    // Gửi email chứa OTP
    await transporter.sendMail({
      from:    '"Itoshira Support" <Toandien.ptit@gmail.com>',
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
//  QUÊN MẬT KHẨU – BƯỚC 2: Xác nhận OTP + đặt mật khẩu mới
//  POST /api/reset-password
//  Body: { email, otp, newPassword, confirmPassword }
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

  // Kiểm tra OTP
  const record = otpStore[email];
  if (!record || Date.now() > record.expiry) {
    delete otpStore[email];
    return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng thử lại.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Mã OTP không đúng.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    delete otpStore[email]; // Xóa OTP sau khi dùng
    return res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    console.error('Chi tiết:', err);             // ← thêm dòng này
    return res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ==============================================================
//  MIDDLEWARE: bảo vệ route cần đăng nhập
// ==============================================================
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
}

module.exports = { register, login, logout, forgotPassword, resetPassword, requireLogin };