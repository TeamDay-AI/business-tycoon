// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Equipment Panel (clickable furniture config)
// ═══════════════════════════════════════════════════════════════

import { EQUIPMENT_CONFIGS } from '../config.js';
import { G } from '../game.js';
import { toScreen, getZoom } from '../engine.js';

const panel = document.getElementById('equipment-panel');
const titleEl = document.getElementById('eq-title');
const optionsEl = document.getElementById('eq-options');
const effectEl = document.getElementById('eq-effect');
const closeBtn = document.getElementById('eq-close');

let currentConfigKey = null;
let currentFurniture = null;

if (closeBtn) {
  closeBtn.addEventListener('click', hideEquipmentPanel);
}

// Close on click outside
document.addEventListener('mousedown', (e) => {
  if (panel && panel.style.display !== 'none' && !panel.contains(e.target)) {
    // Small delay to avoid conflict with furniture click
    setTimeout(() => hideEquipmentPanel(), 50);
  }
});

export function showEquipmentPanel(furniture, room) {
  if (!panel || !furniture.configKey) return;

  const config = EQUIPMENT_CONFIGS[furniture.configKey];
  if (!config) return;

  // For data lab items, show analytics info if we have it
  if (furniture.configKey === 'data_server' || furniture.configKey === 'data_monitor') {
    // Just show a message about analytics level
    currentConfigKey = null;
    titleEl.innerHTML = `${config.icon || '📊'} ${config.label}`;

    const level = G.analyticsLevel;
    const levelNames = ['No Data', 'Basic', 'Standard', 'Full Insight'];
    optionsEl.innerHTML = `
      <div style="padding: 8px 0; font-size: 12px; color: var(--text-dim)">
        Analytics Level: <strong style="color: var(--accent)">${levelNames[level]}</strong>
      </div>
      <div style="font-size: 11px; color: var(--text-faint); line-height: 1.6">
        ${level === 0 ? 'Build a Data Lab and hire a Data Analyst.' :
          level === 1 ? 'Hire a Data Analyst for better insights.' :
          level === 2 ? 'Your analyst is gaining experience...' :
          'Full analytics powered by your experienced analyst.'}
      </div>
    `;
    effectEl.textContent = '';
    positionPanel(furniture);
    panel.style.display = 'block';
    return;
  }

  currentConfigKey = furniture.configKey;
  currentFurniture = furniture;

  titleEl.innerHTML = `${config.icon || '⚙'} ${config.label}`;

  const currentValue = G.equipmentConfig[furniture.configKey] || config.default;

  optionsEl.innerHTML = config.options.map(opt => `
    <label class="eq-option ${opt.key === currentValue ? 'active' : ''}">
      <input type="radio" name="eq-${furniture.configKey}" value="${opt.key}"
        ${opt.key === currentValue ? 'checked' : ''}>
      <div>
        <div class="eq-option-label">${opt.label}</div>
        <div class="eq-option-desc">${opt.desc}</div>
      </div>
    </label>
  `).join('');

  // Effect description
  const selectedOpt = config.options.find(o => o.key === currentValue);
  effectEl.textContent = selectedOpt ? `Currently: ${selectedOpt.desc}` : '';

  // Event listeners
  optionsEl.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      G.equipmentConfig[furniture.configKey] = e.target.value;
      // Update active states
      optionsEl.querySelectorAll('.eq-option').forEach(opt => {
        opt.classList.toggle('active', opt.querySelector('input').value === e.target.value);
      });
      // Update effect text
      const newOpt = config.options.find(o => o.key === e.target.value);
      effectEl.textContent = newOpt ? `Currently: ${newOpt.desc}` : '';
      G.uiDirty = true;
    });
  });

  positionPanel(furniture);
  panel.style.display = 'block';
}

function positionPanel(furniture) {
  const s = toScreen(furniture.x, furniture.y);
  const zoom = getZoom();

  // Position panel near the furniture, offset to the right
  let left = s.x + 30 * zoom;
  let top = s.y - 80 * zoom;

  // Keep panel on screen
  const panelW = 260, panelH = 300;
  if (left + panelW > window.innerWidth) left = s.x - panelW - 10 * zoom;
  if (top < 60) top = 60;
  if (top + panelH > window.innerHeight) top = window.innerHeight - panelH - 20;

  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}

export function hideEquipmentPanel() {
  if (panel) panel.style.display = 'none';
  currentConfigKey = null;
  currentFurniture = null;
}
