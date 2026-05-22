// =============================================================
//  product-detail.js  –  Chi tiết sản phẩm + đánh giá
// =============================================================

const BASE = 'http://localhost:3000';

function formatPrice(p) {
  return Number(p).toLocaleString('vi-VN') + 'đ';
}

function starsHtml(rating, size = 16) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < rating ? '#f5a623' : '#ddd'};font-size:${size}px">★</span>`
  ).join('');
}

const productId = new URLSearchParams(window.location.search).get('id');

// ── Biến lưu thông tin user hiện tại ─────────────────────────
let currentUser = null;

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
      const ori    = Math.round(p.price / (1 - p.discount_percent / 100));
      const oldEl  = document.getElementById('product-old-price');
      oldEl.textContent  = formatPrice(ori);
      oldEl.style.display = 'inline';
      const discEl = document.getElementById('product-discount');
      discEl.textContent  = `-${p.discount_percent}%`;
      discEl.style.display = 'inline';
    }
    document.getElementById('product-price').textContent = formatPrice(p.price);

    renderOptions('color-list', 'selected-color', p.color);
    renderOptions('size-list',  'selected-size',  p.size);
  } catch (err) {
    document.getElementById('product-name').textContent = 'Lỗi tải sản phẩm.';
    console.error(err);
  }
}

function renderOptions(listId, selectedId, rawValue) {
  const list = document.getElementById(listId);
  const sel  = document.getElementById(selectedId);
  if (!rawValue) { list.closest('.detail-section').style.display = 'none'; return; }
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

// ── Số lượng ──────────────────────────────────────────────────
let qty = 1;
document.getElementById('qty-minus').addEventListener('click', () => {
  if (qty > 1) { qty--; document.getElementById('qty-value').textContent = qty; }
});
document.getElementById('qty-plus').addEventListener('click', () => {
  qty++;
  document.getElementById('qty-value').textContent = qty;
});

document.getElementById('btn-buy').addEventListener('click', () => {
  window.location.href = `product-detail.html?id=${productId}`;
});
document.getElementById('btn-cart').addEventListener('click', () => {
  window.location.href = `product-detail.html?id=${productId}`;
});

// ── Load đánh giá ─────────────────────────────────────────────
async function loadReviews() {
  const list    = document.getElementById('reviews-list');
  const summary = document.getElementById('reviews-summary');

  try {
    const res     = await fetch(`${BASE}/api/reviews/${productId}`);
    const reviews = await res.json();

    // Tổng quan sao
    if (reviews.length > 0) {
      const avg    = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      const counts = [5,4,3,2,1].map(s => ({
        star:  s,
        count: reviews.filter(r => r.rating === s).length,
      }));
      summary.innerHTML = `
        <div class="summary-left">
          <div class="summary-avg">${avg.toFixed(1)}</div>
          <div>${starsHtml(Math.round(avg), 22)}</div>
          <div class="summary-total">${reviews.length} đánh giá</div>
        </div>
        <div class="summary-bars">
          ${counts.map(c => `
            <div class="bar-row">
              <span>${c.star}★</span>
              <div class="bar-track">
                <div class="bar-fill" style="width:${reviews.length ? (c.count/reviews.length*100) : 0}%"></div>
              </div>
              <span>${c.count}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      summary.innerHTML = '<p style="color:#888">Chưa có đánh giá nào.</p>';
    }

    // Danh sách bình luận
    if (!reviews.length) { list.innerHTML = ''; return; }

    list.innerHTML = reviews.map(r => {
      const isOwn    = currentUser && (currentUser.id === r.user_id || currentUser.username === r.username);
      const deleteBtn = isOwn
        ? `<button class="btn-delete-review" data-id="${r.id}" title="Xóa bình luận của bạn">
             <i class="fas fa-trash-alt"></i>
           </button>`
        : '';
      return `
        <div class="review-item" data-review-id="${r.id}">
          <div class="review-header">
            <span class="review-author">${r.full_name || r.username}</span>
            <span class="review-stars">${r.rating > 0 ? starsHtml(r.rating) : ''}</span>
            <span class="review-date">${new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
            ${deleteBtn}
          </div>
          <p class="review-comment">${r.comment}</p>
        </div>
      `;
    }).join('');

    // Gắn sự kiện xóa
    list.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa bình luận này?')) return;
        const reviewId = btn.dataset.id;
        const res = await fetch(`${BASE}/api/reviews/${reviewId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          btn.closest('.review-item').remove();
          loadReviews(); // reload để cập nhật tổng quan sao
        } else {
          alert(data.message || 'Xóa thất bại.');
        }
      });
    });

  } catch (err) {
    list.innerHTML = '<p style="color:#f00">Lỗi tải đánh giá.</p>';
  }
}

// ── Kiểm tra đăng nhập ────────────────────────────────────────
async function checkLogin() {
  try {
    const res = await fetch(`${BASE}/api/me`, { credentials: 'include' });
    if (!res.ok) throw new Error();
    currentUser = await res.json();
    // Đã đăng nhập → hiện form
    document.getElementById('review-form').style.display    = 'block';
    document.getElementById('review-login-hint').style.display = 'none';
  } catch {
    // Chưa đăng nhập
    document.getElementById('btn-submit-review').style.display  = 'none';
    document.getElementById('review-comment').style.display     = 'none';
    document.getElementById('star-input').style.display         = 'none';
    document.getElementById('review-login-hint').style.display  = 'block';
  }
}

// ── Chọn sao (tuỳ chọn, không bắt buộc) ─────────────────────
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
    const current = Number(document.getElementById('rating-value').value);
    // Click lại cùng sao → bỏ chọn
    if (current === v) {
      document.getElementById('rating-value').value = '0';
      document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    } else {
      document.getElementById('rating-value').value = v;
      document.querySelectorAll('.star').forEach(s =>
        s.classList.toggle('active', Number(s.dataset.v) <= v)
      );
    }
  });
});

// ── Gửi đánh giá ─────────────────────────────────────────────
document.getElementById('btn-submit-review').addEventListener('click', async () => {
  const rating  = Number(document.getElementById('rating-value').value);
  const comment = document.getElementById('review-comment').value.trim();

  if (!comment) return alert('Vui lòng nhập nhận xét.');

  const res  = await fetch(`${BASE}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ product_id: productId, rating, comment }),
  });
  const data = await res.json();

  if (res.ok) {
    document.getElementById('review-comment').value = '';
    document.getElementById('rating-value').value   = '0';
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    loadReviews();
  } else {
    alert(data.message || 'Gửi thất bại.');
  }
});

// ── Khởi chạy ────────────────────────────────────────────────
if (productId) {
  loadDetail();
  checkLogin().then(() => loadReviews());
}