// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Rendering Primitives
// ═══════════════════════════════════════════════════════════════

import { getCtx } from '../engine.js';

export function drawDiamond(x, y, w, h, color) {
  const ctx = getCtx();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
  ctx.fill();
}

export function drawBox(x, y, bw, bh, depth, top, left, right) {
  const ctx = getCtx();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y - depth); ctx.lineTo(x + bw / 2, y + bh / 2 - depth);
  ctx.lineTo(x, y + bh - depth); ctx.lineTo(x - bw / 2, y + bh / 2 - depth);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y + bh / 2 - depth); ctx.lineTo(x, y + bh - depth);
  ctx.lineTo(x, y + bh); ctx.lineTo(x - bw / 2, y + bh / 2);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(x + bw / 2, y + bh / 2 - depth); ctx.lineTo(x, y + bh - depth);
  ctx.lineTo(x, y + bh); ctx.lineTo(x + bw / 2, y + bh / 2);
  ctx.closePath(); ctx.fill();
}

export function shadeColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16) + amount;
  let g = parseInt(hex.slice(3, 5), 16) + amount;
  let b = parseInt(hex.slice(5, 7), 16) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}
