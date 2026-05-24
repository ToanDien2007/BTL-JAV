// =============================================================
//  products.js  –  Load sản phẩm từ DB cho tất cả các trang
// =============================================================

const BASE = 'http://localhost:3000';

function formatPrice(p) {
  return Number(p).toLocaleString('vi-VN') + 'đ';
}

function createCard(p, badgeText = 'MỚI') {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cursor = 'pointer';

  let priceHtml = '';
  if (p.discount_percent > 0) {
    const ori = Math.round(p.price / (1 - p.discount_percent / 100));
    priceHtml = `
      <p>
        <span class="old-price">${formatPrice(ori)}</span>
        ${formatPrice(p.price)}
        <span class="discount-badge">-${p.discount_percent}%</span>
      </p>`;
  } else {
    priceHtml = `<p>${formatPrice(p.price)}</p>`;
  }

  card.innerHTML = `
    <span class="badge">${badgeText}</span>
    <img src="${p.image_url}" alt="${p.name}"
         onerror="this.src='https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'"/>
    <h3>${p.name}</h3>
    ${priceHtml}
    <div class="actions">
      <button class="buy"  data-id="${p.id}">Mua ngay</button>
      <button class="cart" data-id="${p.id}">Thêm vào giỏ</button>
    </div>
  `;

  // Click vào card → trang chi tiết
  card.addEventListener('click', (e) => {
    // Không navigate nếu bấm vào button
    if (e.target.closest('button')) return;
    window.location.href = `product-detail.html?id=${p.id}`;
  });

  // Nút Mua ngay
  card.querySelector('.buy').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `product-detail.html?id=${p.id}`;
  });

  // Nút Thêm vào giỏ
  card.querySelector('.cart').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.cartUtils) {
      window.cartUtils.addToCart(p, 1);
      const btn = e.currentTarget;
      btn.textContent = '✓ Đã thêm';
      btn.classList.add('btn-added');
      setTimeout(() => {
        btn.textContent = 'Thêm vào giỏ';
        btn.classList.remove('btn-added');
      }, 1200);
    }
  });

  return card;
}

async function apiFetch(url) {
  try {
    const res = await fetch(url);
    return await res.json() || [];
  } catch { return []; }
}

function render(grid, products, badgeText) {
  grid.innerHTML = '';
  if (!products.length) {
    grid.innerHTML = '<p class="grid-empty">Không có sản phẩm.</p>';
    return;
  }
  products.forEach(p => grid.appendChild(createCard(p, badgeText)));
}

async function loadHome() {
  const grid = document.querySelector('main .products');
  if (!grid) return;
  grid.innerHTML = '<p class="grid-loading">Đang tải...</p>';
  const data = await apiFetch(`${BASE}/api/products`);
  render(grid, data.slice(0, 5), 'MỚI');
}

async function loadTrend() {
  const grid = document.querySelector('main .products');
  if (!grid) return;
  grid.innerHTML = '<p class="grid-loading">Đang tải...</p>';
  const data = await apiFetch(`${BASE}/api/products/trending`);
  render(grid, data, 'XU HƯỚNG');
}

async function loadSale() {
  const grid = document.querySelector('main .products');
  if (!grid) return;
  grid.innerHTML = '<p class="grid-loading">Đang tải...</p>';
  const data = await apiFetch(`${BASE}/api/products/sale`);
  render(grid, data, 'GIẢM GIÁ');
}

async function doRender(grid, q, filters) {
  grid.innerHTML = '<p class="grid-empty">Đang tải...</p>';
  let data;
  if (q) {
    data = await apiFetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
  } else {
    // URLSearchParams không xử lý array → build thủ công
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(val => params.append(k, val));
      else params.append(k, v);
    });
    data = await apiFetch(`${BASE}/api/products?${params.toString()}`);
  }
  render(grid, data, 'MỚI');
}

async function loadProducts() {
  const grid = document.querySelector('.products-wrapper .product');
  if (!grid) return;
  const urlQ = new URLSearchParams(window.location.search).get('q') || '';
  const inp  = document.querySelector('form.search input');
  if (inp && urlQ) inp.value = urlQ;
  await doRender(grid, urlQ, {});
  setupFilters(grid);
}

const pg = window.location.pathname;
if      (pg.includes('trend.html'))    loadTrend();
else if (pg.includes('sale.html'))     loadSale();
else if (pg.includes('products.html')) loadProducts();
else                                   loadHome();