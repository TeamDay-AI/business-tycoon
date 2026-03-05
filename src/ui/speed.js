// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Speed Controls + Keyboard
// ═══════════════════════════════════════════════════════════════

import { G } from '../game.js';

export function setSpeed(s) {
  G.gameSpeed = s;
  document.querySelectorAll('.speed-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.speed) === s)
  );
}

export function initSpeedControls() {
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed)));
  });
}

export function initKeyboard(callbacks = {}) {
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setSpeed(G.gameSpeed === 0 ? 1 : 0); }
    if (e.code === 'Escape') {
      if (G.buildMode) {
        G.buildMode = false;
        if (callbacks.onBuildModeExit) callbacks.onBuildModeExit();
      } else if (callbacks.onDeselect) {
        callbacks.onDeselect();
      }
    }
    if (e.key === '1') setSpeed(1);
    if (e.key === '2') setSpeed(2);
    if (e.key === '3') setSpeed(4);
    if (e.key === 'b' || e.key === 'B') {
      G.buildMode = !G.buildMode;
      if (callbacks.onBuildModeToggle) callbacks.onBuildModeToggle();
    }
    if (e.key === 'h' || e.key === 'H') {
      if (callbacks.onHireModeToggle) callbacks.onHireModeToggle();
    }
    if (e.key === 'Tab' && G.buildMode) {
      e.preventDefault();
      if (callbacks.onRotate) callbacks.onRotate();
    }
  });
}
