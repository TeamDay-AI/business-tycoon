// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Level Intro Overlay
// ═══════════════════════════════════════════════════════════════

let introEl = null;
let hideTimer = null;

export function initIntro() {
  introEl = document.getElementById('level-intro');
}

export function showLevelIntro({ week, day, subtitle } = {}) {
  if (!introEl) return;

  const level = Math.max(1, week || 1);
  const dayText = day ? `Day ${day}` : '';
  const sub = subtitle || 'Build smart. Scale fast.';

  introEl.innerHTML = `
    <div class="intro-eyebrow">New Level</div>
    <div class="intro-title">Level ${level}</div>
    <div class="intro-subtitle">${sub}</div>
    <div class="intro-meta">${dayText}</div>
    <div class="intro-skip">Click to skip</div>
  `;

  introEl.classList.add('visible');

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(hideIntro, 2400);
}

export function hideIntro() {
  if (!introEl) return;
  introEl.classList.remove('visible');
}

