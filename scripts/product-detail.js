// =============================================================
//  product-detail.js  –  Chi tiết sản phẩm + variants + stock
// =============================================================

const BASE = '';

function formatPrice(p) {
  return Number(p).toLocaleString('vi-VN') + 'đ';
}

function starsHtml(rating, size = 16) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star-display ${i < rating ? 'star-on' : 'star-off'}">★</span>`
  ).join('');
}

const productId = new URLSearchParams(window.location.search).get('id');
let currentUser = null;
let variants    = [];   // [{ id, color, size, stock }]
let qty         = 1;

// ── Load chi tiết sản phẩm ────────────────────────────────────
async function loadDetail() {
  if (!productId) {
    document.getElementById('product-name').textContent = 'Không tìm thấy sản phẩm.';
    return;
  }
  try {
    const res = await fetch(`${BASE}/api/products/${productId}`);
    const p   = await res.json();
    if (!p || p.message) {
      document.getElementById('product-name').textContent = 'Sản phẩm không tồn tại.';
      return;
    }

    document.title = `${p.name} – Itoshira`;
    document.getElementById('product-name').textContent = p.name;
    window._currentProduct = p;

    const img = document.getElementById('product-img');
    img.src = p.image_url;
    img.alt = p.name;
    img.onerror = () => img.src = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600';

    const badge = document.getElementById('product-badge');
    if (p.discount_percent > 0) badge.textContent = 'GIẢM GIÁ';
    else if (p.is_trending)     badge.textContent = 'XU HƯỚNG';
    else                        badge.textContent = 'MỚI';

    document.getElementById('product-sku').textContent      = p.sku         || '–';
    document.getElementById('product-desc').textContent     = p.description || '';
    document.getElementById('product-material').textContent = p.material    || '–';
    document.getElementById('product-gender').textContent   = p.gender      || '–';

    if (p.discount_percent > 0) {
      const ori   = Math.round(p.price / (1 - p.discount_percent / 100));
      const oldEl = document.getElementById('product-old-price');
      oldEl.textContent = formatPrice(ori);
      oldEl.classList.remove('hidden');
      const discEl = document.getElementById('product-discount');
      discEl.textContent = `-${p.discount_percent}%`;
      discEl.classList.remove('hidden');
    }
    document.getElementById('product-price').textContent = formatPrice(p.price);

    // Load variants (màu + size + stock)
    await loadVariants(p);

  } catch (err) {
    document.getElementById('product-name').textContent = 'Lỗi tải sản phẩm.';
    console.error(err);
  }
}

// ── Load variants từ API, render options + stock ──────────────
async function loadVariants(p) {
  try {
    const res = await fetch(`${BASE}/api/products/${productId}/variants`);
    variants  = await res.json();
  } catch {
    variants = [];
  }

  // Nếu không có variants → fallback dùng cột color/size của product
  if (!variants.length) {
    renderOptionsStatic('color-list', 'selected-color', p.color);
    renderOptionsStatic('size-list',  'selected-size',  p.size);
    updateStockDisplay(null); // không có thông tin stock
    return;
  }

  // Lấy danh sách màu và size duy nhất từ variants
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const sizes  = [...new Set(variants.map(v => v.size).filter(Boolean))];

  renderOptionsDynamic('color-list', 'selected-color', colors);
  renderOptionsDynamic('size-list',  'selected-size',  sizes);

  // Ẩn section nếu chỉ có 1 giá trị "Mặc định" / "One size"
  if (colors.length === 1 && (colors[0] === 'Mặc định' || !colors[0])) {
    document.getElementById('color-list')?.closest('.detail-section')?.classList.add('hidden');
  }
  if (sizes.length === 1 && (sizes[0] === 'One size' || !sizes[0])) {
    document.getElementById('size-list')?.closest('.detail-section')?.classList.add('hidden');
  }

  updateStockDisplay(getSelectedVariant());
}

// Render options từ variants API (có thể update stock khi chọn)
function renderOptionsDynamic(listId, selectedId, items) {
  const list = document.getElementById(listId);
  const sel  = document.getElementById(selectedId);
  if (!list) return;

  list.innerHTML = '';
  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = item;
    if (idx === 0) {
      btn.classList.add('active');
      if (sel) sel.textContent = item;
    }
    btn.addEventListener('click', () => {
      list.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (sel) sel.textContent = item;
      updateStockDisplay(getSelectedVariant());
      resetQty();
    });
    list.appendChild(btn);
  });
}

// Fallback: render từ chuỗi "S,M,L,XL" (khi không có variants)
function renderOptionsStatic(listId, selectedId, rawValue) {
  const list = document.getElementById(listId);
  const sel  = document.getElementById(selectedId);
  if (!list) return;
  if (!rawValue) { list.closest('.detail-section')?.classList.add('hidden'); return; }

  rawValue.split(',').map(s => s.trim()).filter(Boolean).forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = item;
    if (idx === 0) { btn.classList.add('active'); if (sel) sel.textContent = item; }
    btn.addEventListener('click', () => {
      list.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (sel) sel.textContent = item;
    });
    list.appendChild(btn);
  });
}

// Lấy variant đang được chọn
function getSelectedVariant() {
  const color = document.getElementById('selected-color')?.textContent?.trim() || '';
  const size  = document.getElementById('selected-size')?.textContent?.trim()  || '';
  return variants.find(v => v.color === color && v.size === size) || null;
}

// Hiển thị stock dưới phần chọn size
function updateStockDisplay(variant) {
  let el = document.getElementById('stock-display');
  if (!el) {
    el = document.createElement('p');
    el.id = 'stock-display';
    el.className = 'stock-display';
    // Chèn sau size-list section
    const sizeSection = document.getElementById('size-list')?.closest('.detail-section');
    const colorSection = document.getElementById('color-list')?.closest('.detail-section');
    const anchor = sizeSection || colorSection;
    if (anchor) anchor.after(el);
  }

  if (!variant) {
    el.textContent = '';
    return;
  }

  if (variant.stock === 0) {
    el.innerHTML = '<span class="stock-empty">⚠ Hết hàng</span>';
  } else if (variant.stock <= 5) {
    el.innerHTML = `<span class="stock-low">🔥 Chỉ còn ${variant.stock} cái</span>`;
  } else {
    el.innerHTML = `<span class="stock-ok">✓ Còn hàng (${variant.stock} cái)</span>`;
  }

  // Cập nhật max qty
  const maxQty = variant.stock;
  if (qty > maxQty) { qty = Math.max(1, maxQty); }
  document.getElementById('qty-value').textContent = qty;

  // Disable nút thêm nếu hết hàng
  const btnCart = document.getElementById('btn-cart');
  const btnBuy  = document.getElementById('btn-buy');
  if (variant.stock === 0) {
    btnCart?.setAttribute('disabled', true);
    btnBuy?.setAttribute('disabled', true);
  } else {
    btnCart?.removeAttribute('disabled');
    btnBuy?.removeAttribute('disabled');
  }
}

// ── Số lượng ──────────────────────────────────────────────────
function resetQty() {
  qty = 1;
  document.getElementById('qty-value').textContent = 1;
}

document.getElementById('qty-minus').addEventListener('click', () => {
  if (qty > 1) { qty--; document.getElementById('qty-value').textContent = qty; }
});

document.getElementById('qty-plus').addEventListener('click', () => {
  const variant = getSelectedVariant();
  const maxQty  = variant ? variant.stock : 99;
  if (qty < maxQty) {
    qty++;
    document.getElementById('qty-value').textContent = qty;
  } else if (maxQty > 0) {
    // Đã đạt max
    const el = document.getElementById('qty-value');
    el.classList.add('qty-shake');
    setTimeout(() => el.classList.remove('qty-shake'), 400);
  }
});

// ── Nút Mua ngay ─────────────────────────────────────────────
document.getElementById('btn-buy').addEventListener('click', () => {
  const color   = document.getElementById('selected-color')?.textContent?.trim() || '';
  const size    = document.getElementById('selected-size')?.textContent?.trim()  || '';
  const variant = getSelectedVariant();
  if (variant && variant.stock === 0) return;
  if (window.cartUtils && window._currentProduct) {
    window.cartUtils.addToCart(window._currentProduct, qty, color, size);
  }
  window.location.href = 'cart.html';
});

// ── Nút Thêm vào giỏ ─────────────────────────────────────────
document.getElementById('btn-cart').addEventListener('click', () => {
  const color   = document.getElementById('selected-color')?.textContent?.trim() || '';
  const size    = document.getElementById('selected-size')?.textContent?.trim()  || '';
  const variant = getSelectedVariant();
  if (variant && variant.stock === 0) return;

  if (window.cartUtils && window._currentProduct) {
    window.cartUtils.addToCart(window._currentProduct, qty, color, size);
    const btn = document.getElementById('btn-cart');
    btn.textContent = '✓ Đã thêm vào giỏ';
    btn.classList.add('btn-added');
    setTimeout(() => {
      btn.textContent = 'Thêm vào giỏ';
      btn.classList.remove('btn-added');
    }, 1500);
  }
});

// ── Load đánh giá ─────────────────────────────────────────────
async function loadReviews() {
  const list    = document.getElementById('reviews-list');
  const summary = document.getElementById('reviews-summary');
  try {
    const res  = await fetch(`${BASE}/api/reviews/${productId}`);
    const data = await res.json();
    const { comments, rating } = data;

    if (rating.count > 0) {
      const counts = [5,4,3,2,1].map(s => ({ star: s, count: rating.dist[s] || 0 }));
      summary.innerHTML = `
        <div class="summary-left">
          <div class="summary-avg">${rating.avg.toFixed(1)}</div>
          <div>${starsHtml(Math.round(rating.avg), 22)}</div>
          <div class="summary-total">${rating.count} lượt đánh giá</div>
        </div>
        <div class="summary-bars">
          ${counts.map(c => `
            <div class="bar-row">
              <span>${c.star}★</span>
              <div class="bar-track">
                <div class="bar-fill" style="width:${rating.count ? (c.count/rating.count*100) : 0}%"></div>
              </div>
              <span>${c.count}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      summary.innerHTML = '<p class="text-gray-sm">Chưa có đánh giá sao nào.</p>';
    }

    if (!comments.length) {
      list.innerHTML = '<p class="text-gray-sm">Chưa có bình luận nào.</p>';
      return;
    }

    list.innerHTML = comments.map(r => {
      const isOwn = currentUser && (currentUser.id === r.user_id || currentUser.username === r.username);
      const deleteBtn = isOwn
        ? `<button class="btn-delete-review" data-id="${r.id}" title="Xóa"><i class="fas fa-trash-alt"></i></button>`
        : '';
      return `
        <div class="review-item" data-review-id="${r.id}">
          <div class="review-header">
            <span class="review-author">${r.full_name || r.username}</span>
            <span class="review-date">${new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
            ${deleteBtn}
          </div>
          <p class="review-comment">${r.comment}</p>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', () => {
        window.showConfirm?.('Bạn có chắc muốn xóa bình luận này?', async () => {
          const delRes  = await fetch(`${BASE}/api/reviews/${btn.dataset.id}`, {
            method: 'DELETE', credentials: 'include',
          });
          const delData = await delRes.json();
          if (delRes.ok) {
            btn.closest('.review-item').remove();
            window.showToast?.('Đã xóa bình luận.', 'success');
          } else {
            window.showToast?.(delData.message || 'Xóa thất bại.', 'error');
          }
        }, { okText: 'Xóa', icon: '🗑️' });
      });
    });
  } catch {
    list.innerHTML = '<p class="text-error">Lỗi tải đánh giá.</p>';
  }
}

// ── Kiểm tra đăng nhập ────────────────────────────────────────
async function checkLogin() {
  try {
    const res = await fetch(`${BASE}/api/me`, { credentials: 'include' });
    if (!res.ok) throw new Error();
    currentUser = await res.json();
    document.getElementById('review-form').classList.remove('hidden');
    document.getElementById('review-login-hint').classList.add('hidden');
  } catch {
    // Ẩn form, hiện banner đăng nhập đẹp
    const form = document.getElementById('review-form');
    form.innerHTML = `
      <div class="login-required-banner">
        <div class="login-req-icon">🔒</div>
        <div class="login-req-content">
          <p class="login-req-title">Đăng nhập để viết đánh giá</p>
          <p class="login-req-sub">Chia sẻ trải nghiệm của bạn về sản phẩm này với cộng đồng Itoshira.</p>
          <div class="login-req-btns">
            <a href="login.html" class="login-req-btn-primary">Đăng nhập</a>
            <a href="register.html" class="login-req-btn-secondary">Tạo tài khoản</a>
          </div>
        </div>
      </div>
    `;
  }
}

// ── Vote sao ─────────────────────────────────────────────────
// ── Vote sao ─────────────────────────────────────────────────
async function loadMyRating() {
  try {
    const res  = await fetch(`${BASE}/api/ratings/${productId}`, { credentials: 'include' });
    const data = await res.json();
    const cur  = data.rating || 0;
    
    document.getElementById('rating-value').value = cur;
    updateStarsUI(cur);
  } catch (_) {}
}

// Hàm bổ trợ cập nhật trạng thái bật/tắt của sao và ẩn/hiện nút Hủy
function updateStarsUI(ratingValue) {
  // Bật tắt class active cho sao
  document.querySelectorAll('.star').forEach(s =>
    s.classList.toggle('active', Number(s.dataset.v) <= ratingValue)
  );

  // Xử lý nút Hủy bên cạnh
  let btnCancel = document.getElementById('btn-cancel-rating');
  if (!btnCancel) {
    // Nếu chưa có nút hủy trong HTML, ta tự tạo động bằng JS và chèn sau ngôi sao cuối cùng
    const starContainer = document.querySelector('.star').parentElement;
    btnCancel = document.createElement('button');
    btnCancel.id = 'btn-cancel-rating';
    btnCancel.className = 'btn-cancel-rating';
    btnCancel.innerHTML = '✕ Hủy';
    btnCancel.title = 'Xóa đánh giá sao này';
    
    // Sự kiện click vào nút Hủy
    btnCancel.addEventListener('click', () => sendRating(0));
    starContainer.appendChild(btnCancel);
  }

  // Nếu rating > 0 thì hiện nút hủy, nếu = 0 (chưa vote hoặc đã hủy) thì ẩn đi
  if (ratingValue > 0) {
    btnCancel.classList.remove('hidden');
  } else {
    btnCancel.classList.add('hidden');
  }
}

// Hàm gửi dữ liệu lên Server
async function sendRating(value) {
  // Cập nhật giao diện tạm thời trước để tạo cảm giác mượt mà
  document.getElementById('rating-value').value = value;
  updateStarsUI(value);

  try {
    const res = await fetch(`${BASE}/api/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ product_id: productId, rating: value }),
    });

    if (res.ok) {
      if (value === 0) {
        window.showToast?.('Đã xóa đánh giá sao.', 'success');
      } else {
        window.showToast?.('Đánh giá sao thành công!', 'success');
      }
      loadReviews(); // Tải lại block tổng quan số sao trung bình
    } else {
      window.showToast?.('Thao tác thất bại.', 'error');
    }
  } catch (err) {
    console.error(err);
    window.showToast?.('Lỗi kết nối hệ thống.', 'error');
  }
}

// Gán các sự kiện hover cho sao
document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('mouseover', () => {
    const v = Number(star.dataset.v);
    document.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('active', Number(s.dataset.v) <= v)
    );
  });

  star.addEventListener('mouseout', () => {
    const cur = Number(document.getElementById('rating-value').value);
    document.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('active', Number(s.dataset.v) <= cur)
    );
  });

  star.addEventListener('click', () => {
    const v = Number(star.dataset.v);
    sendRating(v);
  });
});

document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('mouseover', () => {
    const v = Number(star.dataset.v);
    document.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('active', Number(s.dataset.v) <= v)
    );
  });
  star.addEventListener('mouseout', () => {
    const cur = Number(document.getElementById('rating-value').value);
    document.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('active', Number(s.dataset.v) <= cur)
    );
  });
  star.addEventListener('click', async () => {
    const v = Number(star.dataset.v);
    document.getElementById('rating-value').value = v;
    document.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('active', Number(s.dataset.v) <= v)
    );
    const res = await fetch(`${BASE}/api/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ product_id: productId, rating: v }),
    });
    if (res.ok) loadReviews();
  });
});

// ── Gửi bình luận ────────────────────────────────────────────
document.getElementById('btn-submit-review').addEventListener('click', async () => {
  const comment = document.getElementById('review-comment').value.trim();
  if (!comment) return window.showToast?.('Vui lòng nhập bình luận.', 'warn');
  const res  = await fetch(`${BASE}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ product_id: productId, comment }),
  });
  const data = await res.json();
  if (res.ok) { document.getElementById('review-comment').value = ''; window.showToast?.('Gửi đánh giá thành công!', 'success'); loadReviews(); }
  else window.showToast?.(data.message || 'Gửi thất bại.', 'error');
});

// ── Khởi chạy ────────────────────────────────────────────────
if (productId) {
  loadDetail();
  checkLogin().then(() => { loadReviews(); loadMyRating(); });
}