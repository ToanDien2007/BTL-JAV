// =============================================================
//  toast.js – Hệ thống thông báo dùng chung (top-center, rơi xuống)
//  CSS đã được tách ra components.css — không inject inline nữa
//  Dùng: window.showToast(msg, type)   type: 'success'|'error'|'info'|'warn'
//        window.showConfirm(msg, onOk) – thay thế confirm()
// =============================================================

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