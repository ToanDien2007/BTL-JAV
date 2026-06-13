const HISTORY_KEY = 'itoshira_search_history';
const MAX_HISTORY = 5;
const POPULAR_LIMIT = 8;

const searchForm  = document.querySelector('form.search');
const searchInput = searchForm?.querySelector('input');
if (!searchForm || !searchInput) throw new Error('search.js: không tìm thấy form.search');

const dropdown = document.createElement('div');
dropdown.className = 'search-dropdown';
searchForm.style.position = 'relative';
searchForm.appendChild(dropdown);

// ── Lịch sử (localStorage) ────────────────────────────────────
const getHistory    = ()       => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
const clearHistory  = ()       => localStorage.removeItem(HISTORY_KEY);
const deleteHistory = (kw)     => localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(k => k !== kw)));
function saveHistory(kw) {
  const h = [kw, ...getHistory().filter(k => k !== kw)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

// ── Fetch sản phẩm từ server (limit xử lý ở server) ──────────
async function fetchSuggestions(q = '') {
  try {
    const url = q
      ? `/api/search?q=${encodeURIComponent(q)}`
      : `/api/products`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return q ? data : data.slice(0, POPULAR_LIMIT); 
  } catch {
    return [];
  }
}

// ── Render dropdown ───────────────────────────────────────────
async function renderDropdown(q = '') {
  const [history, products] = await Promise.all([
    Promise.resolve(getHistory()),
    fetchSuggestions(q),
  ]);

  if (!history.length && !products.length) {
    dropdown.style.display = 'none';
    return;
  }

  let html = '';

  if (history.length) {
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

  if (products.length) {
    html += `
      <div class="sd-section-header">
        <span class="sd-label"><i class="fas fa-tag"></i> ${q ? 'GỢI Ý TÌM KIẾM' : 'TỪ KHÓA PHỔ BIẾN'}</span>
      </div>`;
    products.forEach(p => {
      html += `
        <div class="sd-item sd-product-item" data-kw="${p.name}">
          <i class="fas fa-tag sd-icon-gray"></i>
          <span class="sd-item-text">${p.name}</span>
        </div>`;
    });
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  document.getElementById('sd-clear-all')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearHistory();
    renderDropdown(searchInput.value.trim());
  });

  dropdown.querySelectorAll('.sd-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistory(btn.dataset.kw);
      renderDropdown(searchInput.value.trim());
    });
  });

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

// ── Events ────────────────────────────────────────────────────
searchInput.addEventListener('focus', () => renderDropdown(searchInput.value.trim()));

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => renderDropdown(searchInput.value.trim()), 250);
});

document.addEventListener('click', (e) => {
  if (!searchForm.contains(e.target)) dropdown.style.display = 'none';
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const kw = searchInput.value.trim();
  if (!kw) return;
  saveHistory(kw);
  dropdown.style.display = 'none';
  window.location.href = `products.html?q=${encodeURIComponent(kw)}`;
});