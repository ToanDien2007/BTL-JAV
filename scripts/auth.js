const bcrypt     = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ── OTP helpers ───────────────────────────────────────────────
async function saveOtp(db, email, otp, expiry) {
  await db.query(
    'INSERT INTO otp_tokens (email,otp,expiry) VALUES (?,?,?) ON DUPLICATE KEY UPDATE otp=VALUES(otp),expiry=VALUES(expiry)',
    [email, otp, expiry]
  );
}
async function getOtp(db, email) {
  const [[row]] = await db.query('SELECT otp,expiry FROM otp_tokens WHERE email=?', [email]);
  return row || null;
}
async function deleteOtp(db, email) {
  await db.query('DELETE FROM otp_tokens WHERE email=?', [email]);
}

// ── Đăng ký ───────────────────────────────────────────────────
async function register(req, res, db) {
  const { full_name, email, username, password, confirm_password } = req.body;
  if (!full_name || !email || !username || !password || !confirm_password)
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  if (password !== confirm_password)
    return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

  try {
    const [[existing]] = await db.query(
      'SELECT id FROM users WHERE email=? OR username=?', [email, username]
    );
    if (existing) return res.status(409).json({ message: 'Email hoặc username đã được sử dụng.' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (full_name,email,username,password,auth_provider) VALUES (?,?,?,?,?)',
      [full_name, email, username, hashed, 'local']
    );
    res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ── Đăng nhập ─────────────────────────────────────────────────
async function login(req, res, db) {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });

  try {
    const [[user]] = await db.query(
      'SELECT * FROM users WHERE email=? OR username=?', [identifier, identifier]
    );
    if (!user) return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });

    req.session.user = { id: user.id, username: user.username, email: user.email, full_name: user.full_name };
    res.json({ message: 'Đăng nhập thành công!', user: req.session.user });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ── Đăng xuất ─────────────────────────────────────────────────
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Không thể đăng xuất.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Đăng xuất thành công.' });
  });
}

// ── Quên mật khẩu ────────────────────────────────────────────
async function forgotPassword(req, res, db) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });

  try {
    const [[user]] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    // Luôn trả thông báo giống nhau để bảo mật
    if (!user) return res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });

    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    await saveOtp(db, email, otp, expiry);

    await transporter.sendMail({
      from:    `"Itoshira Support" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: 'Mã xác nhận đặt lại mật khẩu',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto">
          <h2 style="color:#ff3d7f">Itoshira</h2>
          <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ff3d7f;text-align:center;padding:20px 0">
            ${otp}
          </div>
          <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
          <p style="color:#888">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `,
    });
    res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
  } catch (err) {
    console.error('Lỗi gửi OTP:', err);
    res.status(500).json({ message: 'Lỗi server khi gửi email.' });
  }
}

// ── Đặt lại mật khẩu ─────────────────────────────────────────
async function resetPassword(req, res, db) {
  const { email, otp, newPassword, confirmPassword } = req.body;
  if (!email || !otp || !newPassword || !confirmPassword)
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

  try {
    const record = await getOtp(db, email);
    if (!record || Date.now() > record.expiry) {
      await deleteOtp(db, email);
      return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng thử lại.' });
    }
    if (record.otp !== otp)
      return res.status(400).json({ message: 'Mã OTP không đúng.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=? WHERE email=?', [hashed, email]);
    await deleteOtp(db, email);
    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    console.error('Lỗi reset password:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

module.exports = { register, login, logout, forgotPassword, resetPassword };