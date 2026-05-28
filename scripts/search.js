// =============================================================
//  search.js  –  Dropdown search: lịch sử + sản phẩm phổ biến từ DB
//  Thêm vào cuối home.html: <script src="../scripts/search.js"></script>
// =============================================================

const HISTORY_KEY = 'itoshira_search_history';
const MAX_HISTORY = 5;

// ── Tạo dropdown DOM ───────────────────────────────────────────
const searchForm  = document.querySelector('form.search');
const searchInput = searchForm.querySelector('input');

const dropdown = document.createElement('div');
dropdown.className = 'search-dropdown';
searchForm.style.position = 'relative';
searchForm.appendChild(dropdown);

// ── Lịch sử tìm kiếm (localStorage) ───────────────────────────
function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}

function saveHistory(keyword) {
  let history = getHistory().filter(k => k !== keyword);
  history.unshift(keyword);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function deleteHistoryItem(keyword) {
  const history = getHistory().filter(k => k !== keyword);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ── Lấy sản phẩm phổ biến từ DB (LIKE + limit 8) ──────────────
async function fetchPopular(q = '') {
  try {
    const url = q
      ? `/api/search?q=${encodeURIComponent(q)}`
      : `/api/products?limit=8`;
    const res  = await fetch(url);
    const data = await res.json();
    return (data || []).slice(0, 8);
  } catch {
    return [];
  }
}

// ── Render dropdown ────────────────────────────────────────────
async function renderDropdown(q = '') {
  const history  = getHistory();
  const products = await fetchPopular(q);

  let html = '';

  // Lịch sử tìm kiếm
  if (history.length > 0) {
    html += `
      <div class="sd-section-header">
        <span class="sd-label"><i class="fas fa-clock"></i> TÌM KIẾM GẦN ĐÂY</span>
        <span class="sd-clear-all" id="sd-clear-all">Xóa tất cả</span>
      </div>`;
    history.forEach(kw => {
      html += `
        <div class="sd-item sd-history-item" data-kw="${kw}">
          <i class="fas fa-clock sd-icon-gray"></i>
          <span class="sd-item-text">${kw}</span>
          <i class="fas fa-times sd-delete" data-kw="${kw}"></i>
        </div>`;
    });
  }

  // Sản phẩm phổ biến / kết quả gợi ý
  if (products.length > 0) {
    const label = q ? 'GỢI Ý TÌM KIẾM' : 'TỪ KHÓA PHỔ BIẾN';
    html += `
      <div class="sd-section-header">
        <span class="sd-label"><i class="fas fa-tag"></i> ${label}</span>
      </div>`;
    products.forEach(p => {
      html += `
        <div class="sd-item sd-product-item" data-kw="${p.name}">
          <i class="fas fa-tag sd-icon-gray"></i>
          <span class="sd-item-text">${p.name}</span>
        </div>`;
    });
  }

  if (!html) {
    dropdown.style.display = 'none';
    return;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  // Xóa tất cả lịch sử
  document.getElementById('sd-clear-all')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearHistory();
    renderDropdown(searchInput.value.trim());
  });

  // Xóa từng lịch sử
  dropdown.querySelectorAll('.sd-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(btn.dataset.kw);
      renderDropdown(searchInput.value.trim());
    });
  });

  // Click vào item → điền vào ô search và tìm
  dropdown.querySelectorAll('.sd-item').forEach(item => {
    item.addEventListener('click', () => {
      const kw = item.dataset.kw;
      searchInput.value = kw;
      saveHistory(kw);
      dropdown.style.display = 'none';
      window.location.href = `products.html?q=${encodeURIComponent(kw)}`;
    });
  });
}

// ── Event listeners ────────────────────────────────────────────
searchInput.addEventListener('focus', () => {
  renderDropdown(searchInput.value.trim());
});

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    renderDropdown(searchInput.value.trim());
  }, 250);
});

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', (e) => {
  if (!searchForm.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// Submit form → lưu lịch sử + chuyển trang
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const kw = searchInput.value.trim();
  if (!kw) return;
  saveHistory(kw);
  dropdown.style.display = 'none';
  window.location.href = `products.html?q=${encodeURIComponent(kw)}`;
});