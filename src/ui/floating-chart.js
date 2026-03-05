// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Draggable Floating Revenue Chart Panel
// ═══════════════════════════════════════════════════════════════

let panelEl = null;
let dragHandleEl = null;
let toggleBtnEl = null;
let closeBtnEl = null;

let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const STORAGE_KEY = 'studio_tycoon_chart_pos_v1';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function loadPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePosition(x, y) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
  } catch {
    // ignore persistence errors
  }
}

function placeWithinViewport(x, y) {
  if (!panelEl) return;
  const maxX = window.innerWidth - panelEl.offsetWidth - 8;
  const maxY = window.innerHeight - panelEl.offsetHeight - 8;
  panelEl.style.left = `${clamp(x, 8, maxX)}px`;
  panelEl.style.top = `${clamp(y, 56, maxY)}px`;
}

function onMouseMove(e) {
  if (!dragging || !panelEl) return;
  placeWithinViewport(e.clientX - dragOffsetX, e.clientY - dragOffsetY);
}

function onMouseUp() {
  if (!dragging || !panelEl) return;
  dragging = false;
  const left = parseInt(panelEl.style.left || '0', 10) || 0;
  const top = parseInt(panelEl.style.top || '0', 10) || 0;
  savePosition(left, top);
}

function applyToggleState() {
  if (!panelEl || !toggleBtnEl) return;
  const visible = panelEl.classList.contains('visible');
  toggleBtnEl.classList.toggle('active', visible);
}

export function initFloatingChartPanel() {
  panelEl = document.getElementById('floating-chart-panel');
  dragHandleEl = document.getElementById('floating-chart-drag');
  toggleBtnEl = document.getElementById('chart-btn');
  closeBtnEl = document.getElementById('floating-chart-close');
  if (!panelEl || !toggleBtnEl || !dragHandleEl) return;

  const saved = loadPosition();
  if (saved) {
    placeWithinViewport(saved.x, saved.y);
  } else {
    placeWithinViewport(window.innerWidth - 420, 80);
  }

  toggleBtnEl.addEventListener('click', () => {
    panelEl.classList.toggle('visible');
    applyToggleState();
  });

  if (closeBtnEl) {
    closeBtnEl.addEventListener('click', () => {
      panelEl.classList.remove('visible');
      applyToggleState();
    });
  }

  dragHandleEl.addEventListener('mousedown', e => {
    if (!panelEl.classList.contains('visible')) return;
    dragging = true;
    const rect = panelEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', () => {
    const left = parseInt(panelEl.style.left || '0', 10) || 0;
    const top = parseInt(panelEl.style.top || '0', 10) || 0;
    placeWithinViewport(left, top);
  });

  applyToggleState();
}

