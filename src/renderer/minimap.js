// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Minimap Renderer
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H, MAP_W, MAP_H } from '../config.js';
import { toTile, toScreen, getSize, getZoom, getCam, setCam } from '../engine.js';
import { getRoomInstances } from '../map.js';
import { getFloorMask } from '../floorplan.js';
import { G } from '../game.js';

let mmCanvas, mmCtx;
const SCALE = 4.5, OX = 30, OY = 5;

function minimapToTile(mx, my) {
  // Reverse the minimap projection: fx = (tx - ty) * SCALE/2 + OX, fy = (tx + ty) * SCALE/4 + OY
  const rx = (mx - OX) / (SCALE / 2); // tx - ty
  const ry = (my - OY) / (SCALE / 4); // tx + ty
  return { tx: (rx + ry) / 2, ty: (ry - rx) / 2 };
}

function panToTile(tx, ty) {
  const { W, H } = getSize();
  const s = toScreen(tx, ty);
  const cx = getCam().x, cy = getCam().y;
  // Center viewport on this tile (account for right panel ~300px)
  const viewW = W - 300, viewH = H;
  setCam(cx + (viewW / 2 - s.x), cy + (viewH / 2 - s.y));
}

export function initMinimap() {
  mmCanvas = document.getElementById('minimap-canvas');
  mmCtx = mmCanvas.getContext('2d');
  mmCanvas.width = 160;
  mmCanvas.height = 110;

  // Interactive minimap — click/drag to pan camera
  let mmDragging = false;
  const handleMinimapNav = (e) => {
    const rect = mmCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { tx, ty } = minimapToTile(mx, my);
    panToTile(tx, ty);
  };

  mmCanvas.addEventListener('mousedown', e => {
    e.stopPropagation();
    mmDragging = true;
    handleMinimapNav(e);
  });
  window.addEventListener('mousemove', e => {
    if (mmDragging) handleMinimapNav(e);
  });
  window.addEventListener('mouseup', () => { mmDragging = false; });
  mmCanvas.style.cursor = 'pointer';
}

export function drawMinimap() {
  if (!mmCtx) return;

  mmCtx.clearRect(0, 0, 160, 110);
  mmCtx.fillStyle = '#0d0b0e';
  mmCtx.fillRect(0, 0, 160, 110);

  const scale = SCALE;
  const ox = OX, oy = OY;

  // Draw floor plan outline
  const floorMask = getFloorMask();
  if (floorMask) {
    mmCtx.fillStyle = 'rgba(60,50,45,0.4)';
    for (let y = 0; y < MAP_H; y += 2) {
      for (let x = 0; x < MAP_W; x += 2) {
        if (floorMask[y][x]) {
          const fx = (x - y) * scale / 2 + ox;
          const fy = (x + y) * scale / 4 + oy;
          mmCtx.fillRect(fx, fy, scale, scale / 2);
        }
      }
    }
  }

  for (const room of getRoomInstances()) {
    mmCtx.fillStyle = room.type.accent + '40';
    const rx = (room.x - room.y) * scale / 2 + ox;
    const ry = (room.x + room.y) * scale / 4 + oy;
    mmCtx.fillRect(rx, ry, room.w * scale / 2, room.h * scale / 4);
  }

  // Agents as dots
  for (const agent of G.agents) {
    mmCtx.fillStyle = agent.role.color;
    const ax = (agent.x - agent.y) * scale / 2 + ox;
    const ay = (agent.x + agent.y) * scale / 4 + oy;
    mmCtx.fillRect(ax - 1, ay - 1, 3, 3);
  }

  // Visitors as small grey dots
  for (const v of G.visitors) {
    if (v.state === 'gone') continue;
    mmCtx.fillStyle = 'rgba(200,200,200,0.6)';
    const vx = (v.x - v.y) * scale / 2 + ox;
    const vy = (v.x + v.y) * scale / 4 + oy;
    mmCtx.fillRect(vx - 0.5, vy - 0.5, 2, 2);
  }

  // Viewport rectangle
  const { W, H } = getSize();
  const topLeft = toTile(0, 48);
  const botRight = toTile(W - 300, H);
  mmCtx.strokeStyle = '#e0703060';
  mmCtx.lineWidth = 1;
  const vx1 = (topLeft.tx - topLeft.ty) * scale / 2 + ox;
  const vy1 = (topLeft.tx + topLeft.ty) * scale / 4 + oy;
  const vx2 = (botRight.tx - botRight.ty) * scale / 2 + ox;
  const vy2 = (botRight.tx + botRight.ty) * scale / 4 + oy;
  mmCtx.strokeRect(vx1, vy1, vx2 - vx1, vy2 - vy1);
}
