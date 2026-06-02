// =============================================================
//  auth-ui.js  – Navbar auth + Lịch sử mua hàng
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
  const tierClass = { 'Vô hạng': 'tier-vohan', 'Đồng': 'tier-dong', 'Bạc': 'tier-bac', 'Vàng': 'tier-vang' }[tier.name] || 'tier-vohan';
  const needText = tier.next
    ? `<span>Cần tiêu thêm <strong>${formatMoney(tier.needed)}</strong></span><span>để lên hạng <strong>${tier.next}</strong></span>`
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

        <button class="dd-row dd-orders" id="orderHistoryBtn">
          <i class="fas fa-receipt dd-icon"></i> Lịch sử mua hàng
        </button>

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

  document.getElementById('orderHistoryBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', false);
    openOrderHistory();
  });
}

// ──────────────────────────────────────────────────────────────
//  MODAL LỊCH SỬ MUA HÀNG
// ──────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  pending:   { text: 'Chờ xử lý',   cls: 'status-pending'   },
  confirmed: { text: 'Đã xác nhận', cls: 'status-confirmed' },
  shipping:  { text: 'Đang giao',   cls: 'status-shipping'  },
  delivered: { text: 'Đã giao',     cls: 'status-delivered' },
  cancelled: { text: 'Đã hủy',      cls: 'status-cancelled' },
};

function injectOrderStyles() {
  if (document.getElementById('order-history-style')) return;
  const s = document.createElement('style');
  s.id = 'order-history-style';
  s.textContent = `
    /* ── Overlay ── */
    #oh-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 2147483640;
      display: flex; align-items: flex-start; justify-content: center;
      padding: 60px 16px 24px;
      backdrop-filter: blur(3px);
      animation: ohFadeIn .25s ease;
    }
    @keyframes ohFadeIn { from { opacity:0 } to { opacity:1 } }

    /* ── Modal ── */
    #oh-modal {
      background: #fff;
      border-radius: 20px;
      width: 100%; max-width: 700px;
      max-height: calc(100vh - 84px);
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      animation: ohSlideIn .3s cubic-bezier(.22,.68,0,1.2);
      overflow: hidden;
    }
    @keyframes ohSlideIn {
      from { opacity:0; transform: translateY(-24px) scale(.96); }
      to   { opacity:1; transform: translateY(0)     scale(1);   }
    }

    /* ── Header ── */
    #oh-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    #oh-header h2 { margin: 0; font-size: 18px; color: #0d0c22; }
    #oh-close {
      background: #f5f5f5; border: none; width: 34px; height: 34px;
      border-radius: 50%; font-size: 16px; cursor: pointer; color: #555;
      transition: background .2s;
    }
    #oh-close:hover { background: #ff3d7f; color: white; }

    /* ── Body ── */
    #oh-body {
      overflow-y: auto; padding: 20px 24px;
      display: flex; flex-direction: column; gap: 16px;
    }

    /* ── Loading / empty ── */
    .oh-loading, .oh-empty {
      text-align: center; padding: 40px 0;
      color: #aaa; font-size: 15px;
    }
    .oh-empty-icon { font-size: 48px; margin-bottom: 12px; }

    /* ── Order card ── */
    .oh-card {
      border: 1.5px solid #f0f0f0;
      border-radius: 14px; overflow: hidden;
    }
    .oh-card-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      background: #fafafa;
      flex-wrap: wrap; gap: 8px;
    }
    .oh-order-id  { font-weight: 700; font-size: 14px; color: #0d0c22; }
    .oh-order-date { font-size: 12px; color: #999; }
    .oh-card-head-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    /* Status badge */
    .oh-status {
      font-size: 11px; font-weight: 700;
      padding: 4px 10px; border-radius: 20px;
      white-space: nowrap;
    }
    .status-pending   { background: #fff3cd; color: #856404; }
    .status-confirmed { background: #d1ecf1; color: #0c5460; }
    .status-shipping  { background: #cce5ff; color: #004085; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }

    /* Cancel button */
    .oh-btn-cancel {
      font-size: 12px; padding: 4px 12px;
      border: 1.5px solid #e53935; border-radius: 20px;
      background: none; color: #e53935;
      cursor: pointer; font-weight: 600;
      transition: all .2s;
      white-space: nowrap;
    }
    .oh-btn-cancel:hover { background: #e53935; color: white; }

    /* Items */
    .oh-items { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
    .oh-item  { display: flex; gap: 12px; align-items: center; }
    .oh-item-img {
      width: 52px; height: 52px; border-radius: 8px;
      object-fit: cover; flex-shrink: 0;
      background: #f5f5f5;
    }
    .oh-item-info { flex: 1; min-width: 0; }
    .oh-item-name { font-size: 13px; font-weight: 600; color: #222;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .oh-item-meta { font-size: 12px; color: #888; margin-top: 2px; }
    .oh-item-price { font-size: 13px; font-weight: 700; color: #ff3d7f; white-space: nowrap; }

    /* Footer tổng */
    .oh-card-foot {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 16px 14px;
      border-top: 1px dashed #f0f0f0;
      flex-wrap: wrap; gap: 6px;
    }
    .oh-note  { font-size: 12px; color: #aaa; font-style: italic; }
    .oh-total { font-size: 15px; font-weight: 700; color: #0d0c22; }
    .oh-total span { color: #ff3d7f; }

    @media (max-width: 480px) {
      #oh-overlay { padding: 40px 8px 16px; }
      #oh-modal   { border-radius: 16px; }
      #oh-body    { padding: 14px 14px; }
    }
  `;
  document.head.appendChild(s);
}

async function openOrderHistory() {
  injectOrderStyles();
  document.getElementById('oh-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'oh-overlay';
  overlay.innerHTML = `
    <div id="oh-modal">
      <div id="oh-header">
        <h2>🧾 Lịch sử mua hàng</h2>
        <button id="oh-close" title="Đóng">✕</button>
      </div>
      <div id="oh-body">
        <div class="oh-loading">⏳ Đang tải đơn hàng...</div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#oh-close').addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  try {
    const res    = await fetch('/api/orders', { credentials: 'include' });
    const orders = await res.json();
    renderOrders(orders);
  } catch {
    document.getElementById('oh-body').innerHTML = '<div class="oh-loading" style="color:#e53935">Lỗi tải dữ liệu.</div>';
  }
}

function renderOrders(orders) {
  const body = document.getElementById('oh-body');
  if (!body) return;

  if (!orders.length) {
    body.innerHTML = `
      <div class="oh-empty">
        <div class="oh-empty-icon">🛍️</div>
        <div>Bạn chưa có đơn hàng nào.</div>
      </div>`;
    return;
  }

  body.innerHTML = orders.map(o => {
    const st       = STATUS_LABEL[o.status] || { text: o.status, cls: 'status-pending' };
    const date     = new Date(o.created_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const cancelBtn = o.status === 'pending'
      ? `<button class="oh-btn-cancel" data-id="${o.id}">Hủy đơn</button>` : '';

    const itemsHtml = (o.items || []).map(i => `
      <div class="oh-item">
        <img class="oh-item-img" src="${i.image_url || ''}" alt="${i.name || ''}"
          onerror="this.src='https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100'">
        <div class="oh-item-info">
          <div class="oh-item-name">${i.name || 'Sản phẩm'}</div>
          <div class="oh-item-meta">${[i.color, i.size].filter(Boolean).join(' / ')} &nbsp;×&nbsp; ${i.quantity}</div>
        </div>
        <div class="oh-item-price">${formatMoney(i.line_total)}</div>
      </div>
    `).join('');

    return `
      <div class="oh-card" data-order-id="${o.id}">
        <div class="oh-card-head">
          <div>
            <div class="oh-order-id">Đơn #${o.id}</div>
            <div class="oh-order-date">${date}</div>
          </div>
          <div class="oh-card-head-right">
            <span class="oh-status ${st.cls}">${st.text}</span>
            ${cancelBtn}
          </div>
        </div>
        <div class="oh-items">${itemsHtml || '<div style="color:#aaa;font-size:13px">Không có sản phẩm.</div>'}</div>
        <div class="oh-card-foot">
          <div class="oh-note">${o.note ? `Ghi chú: ${o.note}` : ''}</div>
          <div class="oh-total">Tổng: <span>${formatMoney(o.total)}</span></div>
        </div>
      </div>
    `;
  }).join('');

  // Gắn sự kiện hủy đơn
  body.querySelectorAll('.oh-btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      window.showConfirm?.(
        'Bạn có chắc muốn hủy đơn hàng này?<br><small style="color:#888">Kho hàng sẽ được hoàn trả tự động.</small>',
        async () => {
          btn.disabled = true;
          btn.textContent = 'Đang hủy...';
          try {
            const r    = await fetch(`/api/orders/${id}/cancel`, { method: 'PATCH', credentials: 'include' });
            const data = await r.json();
            if (r.ok) {
              window.showToast?.('Đã hủy đơn hàng thành công.', 'success');
              // Cập nhật lại card trong modal
              const card = body.querySelector(`[data-order-id="${id}"]`);
              if (card) {
                card.querySelector('.oh-status').className = 'oh-status status-cancelled';
                card.querySelector('.oh-status').textContent = 'Đã hủy';
                btn.remove();
              }
            } else {
              window.showToast?.(data.message || 'Hủy thất bại.', 'error');
              btn.disabled = false;
              btn.textContent = 'Hủy đơn';
            }
          } catch {
            window.showToast?.('Lỗi kết nối server.', 'error');
            btn.disabled = false;
            btn.textContent = 'Hủy đơn';
          }
        },
        { okText: 'Xác nhận hủy', icon: '⚠️' }
      );
    });
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ identifier: inputs[0].value.trim(), password: inputs[1].value }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = 'home.html';
      } else {
        errMsg.textContent = data.message || 'Đăng nhập thất bại.';
        btn.disabled = false; btn.textContent = 'Đăng nhập';
      }
    } catch (_) {
      errMsg.textContent = 'Không thể kết nối server.';
      btn.disabled = false; btn.textContent = 'Đăng nhập';
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
    btn.disabled = true; btn.textContent = 'Đang đăng ký...';
    try {
      const res  = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          full_name: inputs[0].value.trim(), email: inputs[1].value.trim(),
          username: inputs[2].value.trim(), password: inputs[3].value, confirm_password: inputs[4].value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        window.showToast?.('Đăng ký thành công! Đang chuyển sang đăng nhập...', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1400);
      } else {
        errMsg.textContent = data.message || 'Đăng ký thất bại.';
        btn.disabled = false; btn.textContent = 'Đăng ký';
      }
    } catch (_) {
      errMsg.textContent = 'Không thể kết nối server.';
      btn.disabled = false; btn.textContent = 'Đăng ký';
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
      if (!email) return window.showToast?.('Vui lòng nhập email trước.', 'warn');
      btnSendOtp.textContent = 'Đang gửi...';
      const res  = await fetch('/api/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      window.showToast?.(data.message, res.ok ? 'success' : 'error');
      btnSendOtp.textContent = 'Gửi lại mã';
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const res  = await fetch('/api/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inputs[0].value.trim(), otp: inputs[1].value.trim(),
          newPassword: inputs[2].value, confirmPassword: inputs[3].value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        window.showToast?.('Đặt lại mật khẩu thành công!', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1400);
      } else {
        window.showToast?.(data.message || 'Có lỗi xảy ra.', 'error');
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────
//  KHỞI CHẠY
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initNavbarAuth);