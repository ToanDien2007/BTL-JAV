// =============================================================
//  shared.js – Các hàm dùng chung cho toàn site
// =============================================================
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

