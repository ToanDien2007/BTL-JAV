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

// ── Lấy discount % từ total_spent ────────────────────────────
function getDiscount(totalSpent) {
  const s = Number(totalSpent) || 0;
  if (s >= 10_000_000) return 15;
  if (s >= 5_000_000)  return 10;
  if (s >= 1_000_000)  return 5;
  return 0;
}

function formatMoney(n) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

// ── Render trang giỏ hàng ────────────────────────────────────
async function renderCartPage() {
  const main = document.querySelector('main.container');
  if (!main) return;

  const cart = getCart();

  // Lấy thông tin user (nếu đăng nhập) để áp dụng giảm giá hạng
  let discountPct = 0;
  let tierName    = '';
  try {
    const res = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
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
    const meRes = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
    if (!meRes.ok) {
      alert('Bạn cần đăng nhập để thanh toán!');
      window.location.href = 'login.html';
      return;
    }
    const user = await meRes.json();
    openCheckoutModal(user, cart);
  });
}

// =============================================================
//  CHECKOUT MODAL
// =============================================================
function openCheckoutModal(user, cart) {
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
    if (!phone)   return alert('Vui lòng nhập số điện thoại.');
    if (!address) return alert('Vui lòng nhập địa chỉ giao hàng.');

    await fetch('http://localhost:3000/api/me/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, address }),
    });

    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        items: cart.map(i => ({
          product_id: i.id,
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
      alert(`✅ Đặt hàng thành công! Mã đơn: #${data.order_id}`);
      renderCartPage();
    } else {
      alert(data.message || 'Đặt hàng thất bại.');
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