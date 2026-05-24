// =============================================================
//  auth-ui.js  – Đăng ký / Đăng nhập / Navbar auth (Session)
// =============================================================

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

function getMemberTier(totalSpent) {
  const s = Number(totalSpent) || 0;
  if (s >= 10_000_000) return { name: 'Vàng',    icon: '🥇', discount: 15, next: null,   needed: 0 };
  if (s >= 5_000_000)  return { name: 'Bạc',     icon: '🥈', discount: 10, next: 'Vàng', needed: 10_000_000 - s };
  if (s >= 1_000_000)  return { name: 'Đồng',    icon: '🥉', discount: 5,  next: 'Bạc',  needed: 5_000_000  - s };
  return                      { name: 'Vô hạng', icon: '⭐', discount: 0,  next: 'Đồng', needed: 1_000_000  - s };
}

// ──────────────────────────────────────────────────────────────
//  NAVBAR AUTH
// ──────────────────────────────────────────────────────────────
async function initNavbarAuth() {
  const authDiv = document.querySelector('.auth');
  if (!authDiv) return;

  let user = null;
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) user = await res.json();
  } catch (_) {}

  if (!user) {
    authDiv.innerHTML = `
      <a href="login.html">Đăng ký</a>
      <a href="login.html" class="btn-login">Đăng nhập</a>
    `;
    return;
  }

  const tier = getMemberTier(user.total_spent);
  const tierClass = {
    'Vô hạng': 'tier-vohan',
    'Đồng':    'tier-dong',
    'Bạc':     'tier-bac',
    'Vàng':    'tier-vang',
  }[tier.name] || 'tier-vohan';

  const needText = tier.next
    ? `<span>Cần tiêu thêm <strong>${formatMoney(tier.needed)}</strong></span>
       <span>để lên hạng <strong>${tier.next}</strong></span>`
    : `<span>Bạn đang ở hạng cao nhất! 🎉</span>`;

  authDiv.innerHTML = `
    <div class="user-menu-wrap">
      <button class="user-greeting" id="userGreetBtn" aria-expanded="false">
        ${tier.icon} Xin chào, <strong>${user.username}</strong>!
        <i class="fas fa-chevron-down caret"></i>
      </button>
      <div class="user-dropdown" id="userDropdown" role="menu">

        <div class="dd-tier">
          <span class="tier-badge ${tierClass}">${tier.icon} Hạng ${tier.name}</span>
          <span class="tier-discount">${tier.discount > 0 ? `Giảm ${tier.discount}% mọi đơn hàng` : 'Mua sắm để tích điểm hạng'}</span>
        </div>

        <div class="dd-row">
          <i class="fas fa-shopping-bag dd-icon"></i>
          <span class="dd-label">Tổng đã mua:</span>
          <strong class="dd-val">${formatMoney(user.total_spent)}</strong>
        </div>

        <div class="dd-row dd-need">
          <i class="fas fa-arrow-up dd-icon"></i>
          <div class="dd-need-text">${needText}</div>
        </div>

        <hr class="dd-divider"/>

        <div class="dd-row dd-info">
          <i class="fas fa-user dd-icon"></i>
          <div>
            <div class="dd-name">${user.full_name}</div>
            <div class="dd-email">${user.email}</div>
            ${user.phone   ? `<div class="dd-email"><i class="fas fa-phone dd-contact-icon"></i>${user.phone}</div>` : ''}
            ${user.address ? `<div class="dd-email"><i class="fas fa-map-marker-alt dd-contact-icon"></i>${user.address}</div>` : ''}
          </div>
        </div>

        <hr class="dd-divider"/>

        <button class="dd-row dd-logout" id="logoutBtn">
          <i class="fas fa-sign-out-alt dd-icon"></i> Đăng xuất
        </button>

      </div>
    </div>
  `;

  const btn      = document.getElementById('userGreetBtn');
  const dropdown = document.getElementById('userDropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', false);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
  });
}

// ──────────────────────────────────────────────────────────────
//  TRANG ĐĂNG NHẬP
// ──────────────────────────────────────────────────────────────
if (window.location.pathname.includes('login.html')) {
  const form   = document.querySelector('form');
  const inputs = document.querySelectorAll('input');

  const errMsg = document.createElement('p');
  errMsg.style.cssText = 'color:#e53935;text-align:center;margin:8px 0 0;font-size:14px;';
  form.appendChild(errMsg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    try {
      const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: inputs[0].value.trim(), password: inputs[1].value }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = 'home.html';
      } else {
        errMsg.textContent = data.message || 'Đăng nhập thất bại.';
        btn.disabled = false;
        btn.textContent = 'Đăng nhập';
      }
    } catch (_) {
      errMsg.textContent = 'Không thể kết nối server.';
      btn.disabled = false;
      btn.textContent = 'Đăng nhập';
    }
  });
}

// ──────────────────────────────────────────────────────────────
//  TRANG ĐĂNG KÝ
// ──────────────────────────────────────────────────────────────
if (window.location.pathname.includes('register.html')) {
  const form   = document.querySelector('form');
  const inputs = document.querySelectorAll('input');

  const errMsg = document.createElement('p');
  errMsg.style.cssText = 'color:#e53935;text-align:center;margin:8px 0 0;font-size:14px;';
  form.appendChild(errMsg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Đang đăng ký...';
    try {
      const res  = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name:        inputs[0].value.trim(),
          email:            inputs[1].value.trim(),
          username:         inputs[2].value.trim(),
          password:         inputs[3].value,
          confirm_password: inputs[4].value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đăng ký thành công! Chuyển sang trang đăng nhập.');
        window.location.href = 'login.html';
      } else {
        errMsg.textContent = data.message || 'Đăng ký thất bại.';
        btn.disabled = false;
        btn.textContent = 'Đăng ký';
      }
    } catch (_) {
      errMsg.textContent = 'Không thể kết nối server.';
      btn.disabled = false;
      btn.textContent = 'Đăng ký';
    }
  });
}

// ──────────────────────────────────────────────────────────────
//  TRANG QUÊN MẬT KHẨU
// ──────────────────────────────────────────────────────────────
if (window.location.pathname.includes('forgot-password.html')) {
  const inputs     = document.querySelectorAll('input');
  const btnSendOtp = document.querySelector('.resend-otp');
  const btnSubmit  = document.querySelector('.btn-login');

  if (btnSendOtp) {
    btnSendOtp.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = inputs[0].value.trim();
      if (!email) return alert('Vui lòng nhập email trước.');
      btnSendOtp.textContent = 'Đang gửi...';
      const res  = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      alert(data.message);
      btnSendOtp.textContent = 'Gửi lại mã';
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const res  = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:           inputs[0].value.trim(),
          otp:             inputs[1].value.trim(),
          newPassword:     inputs[2].value,
          confirmPassword: inputs[3].value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đặt lại mật khẩu thành công!');
        window.location.href = 'login.html';
      } else {
        alert(data.message || 'Có lỗi xảy ra.');
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────
//  KHỞI CHẠY NAVBAR TRÊN MỌI TRANG
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initNavbarAuth);