// =============================================================
//  toast.js – Hệ thống thông báo dùng chung (top-center, rơi xuống)
//  Dùng: window.showToast(msg, type)   type: 'success'|'error'|'info'|'warn'
//        window.showConfirm(msg, onOk) – thay thế confirm()
// =============================================================

(function () {
  // ── Inject CSS một lần ────────────────────────────────────
  if (!document.getElementById('itoshira-toast-style')) {
    const s = document.createElement('style');
    s.id = 'itoshira-toast-style';
    s.textContent = `
      /* ── Toast container ── */
      #itoshira-toast-wrap {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        pointer-events: none;
      }

      /* ── Toast item ── */
      @keyframes toastDrop {
        from { opacity: 0; transform: translateY(-28px) scale(.92); }
        to   { opacity: 1; transform: translateY(0)     scale(1);   }
      }
      @keyframes toastFadeUp {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(-14px); }
      }

      .itoshira-toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 11px;
        background: var(--toast-bg);
        color: white;
        padding: 13px 18px;
        border-radius: 14px;
        box-shadow: 0 6px 28px rgba(0,0,0,.22);
        max-width: min(380px, calc(100vw - 32px));
        min-width: 240px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.45;
        animation: toastDrop .38s cubic-bezier(.22,.68,0,1.2) forwards;
      }
      .itoshira-toast.removing {
        animation: toastFadeUp .3s ease forwards;
      }

      .toast-icon  { font-size: 19px; flex-shrink: 0; }
      .toast-msg   { flex: 1; font-weight: 500; }
      .toast-close {
        background: rgba(255,255,255,.22);
        border: none; color: white;
        width: 22px; height: 22px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 11px;
        flex-shrink: 0;
        transition: background .2s;
        line-height: 22px;
        text-align: center;
        padding: 0;
      }
      .toast-close:hover { background: rgba(255,255,255,.42); }

      /* ── Confirm dialog ── */
      @keyframes confirmIn {
        from { opacity: 0; transform: translateY(-20px) scale(.93); }
        to   { opacity: 1; transform: translateY(0)      scale(1);   }
      }
      #itoshira-confirm-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.35);
        z-index: 2147483646;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 120px;
        backdrop-filter: blur(2px);
      }
      #itoshira-confirm-box {
        background: #fff;
        border-radius: 16px;
        padding: 28px 30px 22px;
        max-width: 360px;
        width: calc(100vw - 40px);
        box-shadow: 0 12px 40px rgba(0,0,0,.2);
        animation: confirmIn .3s cubic-bezier(.22,.68,0,1.2) forwards;
        text-align: center;
      }
      #itoshira-confirm-box .confirm-icon { font-size: 36px; margin-bottom: 10px; }
      #itoshira-confirm-box .confirm-msg  {
        font-size: 15px; color: #222; margin-bottom: 22px; line-height: 1.55;
      }
      #itoshira-confirm-box .confirm-btns {
        display: flex; gap: 12px; justify-content: center;
      }
      #itoshira-confirm-box .confirm-btns button {
        flex: 1; padding: 11px 0; border: none; border-radius: 10px;
        font-size: 14px; font-weight: bold; cursor: pointer; transition: opacity .2s;
      }
      #itoshira-confirm-box .confirm-btns button:hover { opacity: .82; }
      #itoshira-confirm-box .btn-ok     { background: #0d0c22; color: white; }
      #itoshira-confirm-box .btn-cancel { background: #f0f0f0; color: #555; }
    `;
    document.head.appendChild(s);
  }

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