function collectFilters() {
  const filters = {};

  // Giới tính: đọc value trực tiếp từ radio
  const genderRadio = document.querySelector('input[name="gender"]:checked');
  if (genderRadio) filters.gender = genderRadio.value;

  // Giá: đọc data-min / data-max từ checkbox được chọn đầu tiên
  const priceChecked = document.querySelector('input[data-min]:checked');
  if (priceChecked) {
    filters.min = priceChecked.dataset.min;
    filters.max = priceChecked.dataset.max;
  }

  // Danh mục: cho chọn nhiều, trả về mảng
  const catChecked = [...document.querySelectorAll('input[data-cat]:checked')];
  if (catChecked.length) filters.cat = catChecked.map(cb => cb.dataset.cat);

  return filters;
}

// ── Reset toàn bộ bộ lọc ─────────────────────────────────────
function resetFilters() {
  document.querySelectorAll('.filter-sidebar input[type=checkbox]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.filter-sidebar input[type=radio]').forEach(rb => rb.checked = false);
  const inp = document.querySelector('form.search input');
  if (inp) inp.value = '';
}

// ── Gắn sự kiện cho bộ lọc ───────────────────────────────────
function setupFilters(grid) {
  // Nút "Áp dụng bộ lọc"
  document.querySelector('.btn-apply-filter')?.addEventListener('click', () => {
    const q = document.querySelector('form.search input')?.value.trim() || '';
    doRender(grid, q, collectFilters());
  });

  // Nút "Mặc định" - reset tất cả
  document.querySelector('.filter-reset')?.addEventListener('click', (e) => {
    e.preventDefault();
    resetFilters();
    doRender(grid, '', {});
  });

  // Search form
  document.querySelector('form.search')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.querySelector('input').value.trim();
    doRender(grid, q, collectFilters());
  });

  // Chỉ cho chọn 1 checkbox giá tại 1 thời điểm
  document.querySelectorAll('input[data-min]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        document.querySelectorAll('input[data-min]').forEach(other => {
          if (other !== cb) other.checked = false;
        });
      }
    });
  });

  // Danh mục: cho phép chọn nhiều (không giới hạn)
}
// ── Gắn sự kiện Đóng/Mở (Accordion) cho giao diện bộ lọc ────────
document.addEventListener('DOMContentLoaded', () => {
  const groupHeaders = document.querySelectorAll('.group-header');

  groupHeaders.forEach(header => {
    header.addEventListener('click', function() {
      // Tìm thẻ cha bao ngoài cùng (<div class="filter-group">)
      const filterGroup = this.parentElement;
      
      // Bật/tắt class 'collapsed' để CSS tự động ẩn/hiện danh sách và xoay mũi tên
      filterGroup.classList.toggle('collapsed');
    });
  });
});