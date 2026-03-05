// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Toast Notifications
// ═══════════════════════════════════════════════════════════════

export function showToast(msg, { html = false } = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (html) el.innerHTML = msg;
  else el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
