// =============================================================
//  cart.js  –  Quản lý giỏ hàng (localStorage) + áp dụng giảm giá hạng thành viên
// =============================================================

const CART_KEY = 'itoshira_cart';

// ── Lấy / lưu giỏ ────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// ── Thêm sản phẩm vào giỏ ────────────────────────────────────
function addToCart(product, qty = 1, color = '', size = '') {
  const cart = getCart();
  const key  = `${product.id}_${color}_${size}`;
  const idx  = cart.findIndex(i => i.key === key);
  if (idx >= 0) {
    cart[idx].qty += qty;
  } else {
    cart.push({
      key,
      id:       product.id,
      name:     product.name,
      image:    product.image_url,
      price:    product.price,           // giá gốc DB (đã áp discount_percent)
      color,
      size,
      qty,
    });
  }
  saveCart(cart);
}

// ── Badge số lượng trên icon giỏ hàng ───────────────────────
function updateCartBadge() {
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'inline-flex' : 'none';
  });
}

// ── Helpers dùng chung (fallback nếu thiếu shared.js) ─────────
function getDiscount(totalSpent) {
  return window.itoshira?.getDiscountPct ? window.itoshira.getDiscountPct(totalSpent) : 0;
}
function formatMoney(n) {
  return window.itoshira?.formatMoney ? window.itoshira.formatMoney(n, 'đ') : (Number(n).toLocaleString('vi-VN') + 'đ');
}
function getTierName(totalSpent) {
  return window.itoshira?.getTierName ? window.itoshira.getTierName(totalSpent) : 'Vô hạng';
}

// ── Toast thông báo lên hạng ──────────────────────────────────
function showRankUpToast(newTier) {
  document.getElementById('rankup-toast')?.remove();
  const icons  = { 'Đồng': '🥉', 'Bạc': '🥈', 'Vàng': '🥇' };
  const colors = {
    'Đồng': 'linear-gradient(135deg,#cd7f32,#e8a96e)',
    'Bạc':  'linear-gradient(135deg,#8e9eab,#c8d6df)',
    'Vàng': 'linear-gradient(135deg,#f7971e,#ffd200)',
  };
  const toast = document.createElement('div');
  toast.id = 'rankup-toast';
  toast.innerHTML = `
    <div style="font-size:38px;line-height:1">${icons[newTier] || '🎉'}</div>
    <div style="flex:1">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">🎊 Chúc mừng! Bạn vừa lên hạng!</div>
      <div style="font-size:13px;opacity:.92">Bạn đã đạt hạng <strong>${newTier}</strong> — nhận ưu đãi giảm giá ngay!</div>
    </div>
    <button onclick="document.getElementById('rankup-toast').remove()"
      style="background:rgba(255,255,255,.25);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>
  `;
  toast.style.cssText = `
    position:fixed;top:80px;right:20px;z-index:99999;
    display:flex;align-items:center;gap:14px;
    background:${colors[newTier]||'linear-gradient(135deg,#ff6b6b,#ff3d7f)'};
    color:#fff;padding:16px 20px;border-radius:16px;
    box-shadow:0 8px 32px rgba(0,0,0,.25);min-width:300px;max-width:380px;
    font-family:inherit;
    animation:rankupSlide .5s cubic-bezier(.175,.885,.32,1.275) forwards;
  `;
  if (!document.getElementById('rankup-style')) {
    const s = document.createElement('style');
    s.id = 'rankup-style';
    s.textContent = `
      @keyframes rankupSlide{from{opacity:0;transform:translateX(120px) scale(.8)}to{opacity:1;transform:translateX(0) scale(1)}}
      @keyframes rankupOut{from{opacity:1}to{opacity:0;transform:translateX(120px)}}
    `;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast?.parentNode) {
      toast.style.animation = 'rankupOut .4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }
  }, 6000);
}

async function refreshUserAndCheckRank(oldTier) {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return;
    const u = await res.json();
    const newTier = getTierName(u.total_spent);
    const order = ['Vô hạng','Đồng','Bạc','Vàng'];
    if (order.indexOf(newTier) > order.indexOf(oldTier)) showRankUpToast(newTier);
    if (typeof initNavbarAuth === 'function') initNavbarAuth();
  } catch(_) {}
}

// ── Toast: dùng window.showToast từ toast.js ──────────────────
// (xem scripts/toast.js)


// ── Render trang giỏ hàng ────────────────────────────────────
async function renderCartPage() {
  const main = document.querySelector('main.container');
  if (!main) return;

  const cart = getCart();

  // Lấy thông tin user (nếu đăng nhập) để áp dụng giảm giá hạng
  let discountPct = 0;
  let tierName    = '';
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      discountPct = getDiscount(user.total_spent);
      const tiers = { 0: 'Vô hạng', 5: 'Đồng', 10: 'Bạc', 15: 'Vàng' };
      tierName = tiers[discountPct] || 'Vô hạng';
    }
  } catch (_) {}

  if (!cart.length) {
    main.innerHTML = `
      <h1>Giỏ hàng của bạn 🛒</h1>
      <div class="cart-empty-wrap">
        <i class="fas fa-shopping-cart cart-empty-icon"></i>
        <p class="cart-empty-text">Giỏ hàng hiện đang trống, cùng mua sắm ngay nhé!</p>
        <a href="products.html" class="btn-hero">Mua sắm ngay</a>
      </div>`;
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * discountPct / 100);
  const total    = subtotal - discount;

  main.innerHTML = `
    <h1>Giỏ hàng của bạn 🛒</h1>
    <div class="cart-layout">
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-summary">
        <h3>Tóm tắt đơn hàng</h3>
        ${discountPct > 0 ? `
        <div class="summary-tier">
          <span>Hạng thành viên:</span>
          <strong class="text-pink">${tierName} (−${discountPct}%)</strong>
        </div>` : ''}
        <div class="summary-row">
          <span>Tạm tính:</span>
          <strong>${formatMoney(subtotal)}</strong>
        </div>
        ${discount > 0 ? `
        <div class="summary-row summary-discount">
          <span>Giảm giá hạng ${tierName}:</span>
          <strong>−${formatMoney(discount)}</strong>
        </div>` : ''}
        <div class="summary-row summary-total">
          <span>Tổng cộng:</span>
          <strong>${formatMoney(total)}</strong>
        </div>
        <button class="btn-checkout" id="btn-checkout">Tiến hành thanh toán</button>
        <a href="products.html" class="btn-continue">← Tiếp tục mua sắm</a>
      </div>
    </div>
  `;

  // Render từng item
  const itemsEl = document.getElementById('cart-items');
  cart.forEach((item, idx) => {
    const lineTotal = item.price * item.qty;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img src="${item.image}" alt="${item.name}"
           onerror="this.src='https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200'"/>
      <div class="item-info">
        <a class="item-name" href="product-detail.html?id=${item.id}">${item.name}</a>
        ${item.color ? `<div class="item-meta">Màu: ${item.color}</div>` : ''}
        ${item.size  ? `<div class="item-meta">Size: ${item.size}</div>`  : ''}
        <div class="item-price">${formatMoney(item.price)} / cái</div>
      </div>
      <div class="item-qty">
        <button class="qty-btn" data-idx="${idx}" data-d="-1">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-d="1">+</button>
      </div>
      <div class="item-total">${formatMoney(lineTotal)}</div>
      <button class="item-remove" data-idx="${idx}" title="Xóa"><i class="fas fa-trash"></i></button>
    `;
    itemsEl.appendChild(el);
  });

  // Sự kiện tăng/giảm số lượng
  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const d   = Number(btn.dataset.d);
      const c   = getCart();
      c[idx].qty = Math.max(1, c[idx].qty + d);
      saveCart(c);
      renderCartPage();
    });
  });

  // Sự kiện xóa item
  itemsEl.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getCart();
      c.splice(Number(btn.dataset.idx), 1);
      saveCart(c);
      renderCartPage();
    });
  });

  // Checkout – mở modal
  document.getElementById('btn-checkout').addEventListener('click', async () => {
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (!meRes.ok) {
      window.showToast('Bạn cần đăng nhập để thanh toán!', 'warn');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
      return;
    }
    const user = await meRes.json();
    openCheckoutModal(user, cart, getTierName(user.total_spent));
  });
}

// =============================================================
//  CHECKOUT MODAL
// =============================================================
function openCheckoutModal(user, cart, oldTier = 'Vô hạng') {
  document.getElementById('checkout-modal')?.remove();

  const disc     = getDiscount(user.total_spent);
  const sub      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(sub * disc / 100);
  const total    = sub - discount;
  const tiers    = { 0: 'Vô hạng', 5: 'Đồng', 10: 'Bạc', 15: 'Vàng' };

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="modal-close"><i class="fas fa-times"></i></button>
      <div class="modal-inner">
      <h2 class="modal-title">Xác nhận đặt hàng</h2>

      <div class="modal-section">
        <label class="modal-label">Họ và tên</label>
        <input class="modal-input" id="co-name" value="${user.full_name}" readonly/>
      </div>
      <div class="modal-section">
        <label class="modal-label">Số điện thoại</label>
        <input class="modal-input" id="co-phone" type="tel" placeholder="Nhập số điện thoại" value="${user.phone || ''}"/>
      </div>
      <div class="modal-section">
        <label class="modal-label">Địa chỉ giao hàng</label>
        <input class="modal-input" id="co-address" placeholder="Nhập địa chỉ đầy đủ" value="${user.address || ''}"/>
      </div>

      <div class="modal-divider"></div>

      <div class="modal-summary">
        <div class="modal-sum-row"><span>Tạm tính</span><strong>${formatMoney(sub)}</strong></div>
        ${disc > 0 ? `<div class="modal-sum-row summary-discount"><span>Giảm giá hạng ${tiers[disc]}</span><strong>−${formatMoney(discount)}</strong></div>` : ''}
        <div class="modal-sum-row modal-sum-total"><span>Tổng thanh toán</span><strong>${formatMoney(total)}</strong></div>
      </div>

      <div class="modal-divider"></div>

      <div class="modal-payment">
        <p class="modal-label">Chuyển khoản qua VietQR</p>
        <div class="modal-qr-wrap">
          <img src="https://img.vietqr.io/image/MB-0865623279-compact2.jpg?amount=${total}&addInfo=Thanh toan don hang Itoshira&accountName=NGUYEN TOAN DIEN"
               alt="QR chuyển khoản" class="modal-qr modal-qr-zoom" title="Nhấn để phóng to"/>
          <div class="modal-bank-info">
            <div><i class="fas fa-university"></i> <strong>MB Bank</strong></div>
            <div><i class="fas fa-user"></i> NGUYEN TOAN DIEN</div>
            <div><i class="fas fa-credit-card"></i> 0865623279</div>
            <div><i class="fas fa-money-bill"></i> <strong class="text-pink">${formatMoney(total)}</strong></div>
          </div>
        </div>
        <p class="modal-note">Sau khi chuyển khoản, bấm <strong>Xác nhận đặt hàng</strong> bên dưới.</p>
      </div>

      <button class="btn-checkout modal-confirm-btn" id="modal-confirm">
        <i class="fas fa-check-circle"></i> Xác nhận đặt hàng
      </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Phóng to QR khi click
  modal.querySelector('.modal-qr-zoom').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:ddFade 0.2s ease';
    overlay.innerHTML = `<img src="https://img.vietqr.io/image/MB-0865623279-compact2.jpg?amount=${total}&addInfo=Thanh toan don hang Itoshira&accountName=NGUYEN TOAN DIEN" style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,0.5)"/>`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    const phone   = document.getElementById('co-phone').value.trim();
    const address = document.getElementById('co-address').value.trim();
    if (!phone)   return window.showToast('Vui lòng nhập số điện thoại.', 'warn');
    if (!address) return window.showToast('Vui lòng nhập địa chỉ giao hàng.', 'warn');

    await fetch('/api/me/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, address }),
    });

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        items: cart.map(i => ({
          product_id: i.id,
          color:      i.color || '',
          size:       i.size  || '',
          quantity:   i.qty,
          unit_price: Math.round(i.price * (1 - disc / 100)),
          line_total: Math.round(i.price * i.qty * (1 - disc / 100)),
        })),
        subtotal: sub, total, shipping_fee: 0,
        note: `SĐT: ${phone} | Địa chỉ: ${address}`,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      modal.remove();
      saveCart([]);
      window.showToast(`Đặt hàng thành công! Mã đơn: #${data.order_id}`, 'success');
      renderCartPage();
      refreshUserAndCheckRank(oldTier);
    } else {
      // Nếu lỗi do hết hàng, cập nhật lại giỏ
      if (data.stock !== undefined) {
        const c = getCart();
        const key = `${data.product_id}_${data.color}_${data.size}`;
        const idx = c.findIndex(i => i.key === key);
        if (idx >= 0) {
          if (data.stock === 0) { c.splice(idx, 1); }
          else { c[idx].qty = data.stock; }
          saveCart(c);
          renderCartPage();
        }
      }
      window.showToast(data.message || 'Đặt hàng thất bại.', 'error');
    }
  });
}

// ── Export để dùng ở các trang khác ──────────────────────────
window.cartUtils = { addToCart, getCart, updateCartBadge };

// ── Khởi chạy ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  if (window.location.pathname.includes('cart.html')) renderCartPage();
});