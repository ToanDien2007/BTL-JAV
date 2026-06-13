(function () {
  // ── Toast container ───────────────────────────────────────
  function getWrap() {
    let w = document.getElementById('itoshira-toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'itoshira-toast-wrap';
      document.body.appendChild(w);
    }
    return w;
  }

  // ── showToast ─────────────────────────────────────────────
  const DURATIONS = { success: 3200, error: 5000, info: 3500, warn: 4000 };
  const CONFIGS = {
    success: { icon: '✅', bg: 'linear-gradient(135deg,#11998e,#38ef7d)' },
    error:   { icon: '❌', bg: 'linear-gradient(135deg,#e53935,#ff6b6b)' },
    info:    { icon: 'ℹ️',  bg: 'linear-gradient(135deg,#2196f3,#64b5f6)' },
    warn:    { icon: '⚠️', bg: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  };

  function removeToast(el) {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 310);
  }

  window.showToast = function (msg, type = 'success') {
    const { icon, bg } = CONFIGS[type] || CONFIGS.info;
    const wrap = getWrap();

    const t = document.createElement('div');
    t.className = 'itoshira-toast';
    t.style.setProperty('--toast-bg', bg);
    t.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" aria-label="Đóng">✕</button>
    `;
    t.querySelector('.toast-close').addEventListener('click', () => removeToast(t));
    wrap.appendChild(t);

    setTimeout(() => { if (t.parentNode) removeToast(t); }, DURATIONS[type] || 3500);
  };

  // ── showConfirm (thay thế confirm()) ─────────────────────
  window.showConfirm = function (msg, onOk, { okText = 'Xác nhận', cancelText = 'Hủy', icon = '🗑️' } = {}) {
    document.getElementById('itoshira-confirm-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'itoshira-confirm-overlay';
    overlay.innerHTML = `
      <div id="itoshira-confirm-box">
        <div class="confirm-icon">${icon}</div>
        <div class="confirm-msg">${msg}</div>
        <div class="confirm-btns">
          <button class="btn-cancel">${cancelText}</button>
          <button class="btn-ok">${okText}</button>
        </div>
      </div>
    `;

    const close = () => overlay.remove();
    overlay.querySelector('.btn-cancel').addEventListener('click', close);
    overlay.querySelector('.btn-ok').addEventListener('click', () => { close(); onOk(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
  };
})();

(function () {
  const TIER_ORDER = ['Vô hạng', 'Đồng', 'Bạc', 'Vàng'];

  function formatMoney(n, suffix = '₫') {
    return Number(n || 0).toLocaleString('vi-VN') + suffix;
  }

  function getTierFromSpent(totalSpent) {
    const s = Number(totalSpent) || 0;
    if (s >= 10_000_000) return { name: 'Vàng',    icon: '🥇', discount: 15, next: null,   needed: 0 };
    if (s >= 5_000_000)  return { name: 'Bạc',     icon: '🥈', discount: 10, next: 'Vàng', needed: 10_000_000 - s };
    if (s >= 1_000_000)  return { name: 'Đồng',    icon: '🥉', discount: 5,  next: 'Bạc',  needed: 5_000_000  - s };
    return                      { name: 'Vô hạng', icon: '⭐', discount: 0,  next: 'Đồng', needed: 1_000_000  - s };
  }

  function getTierName(totalSpent) {
    return getTierFromSpent(totalSpent).name;
  }

  function getDiscountPct(totalSpent) {
    return getTierFromSpent(totalSpent).discount;
  }

  function compareTier(a, b) {
    return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
  }

  window.itoshira = Object.assign(window.itoshira || {}, {
    TIER_ORDER,
    formatMoney,
    getTierFromSpent,
    getTierName,
    getDiscountPct,
    compareTier,
  });
})();