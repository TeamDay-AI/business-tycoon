// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Canvas Engine (camera, zoom, pan, coords)
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
let camX, camY;
let zoom = 1, targetZoom = 1;
let mouseX = 0, mouseY = 0;
let dragging = false, dragSX, dragSY, camSX, camSY;
let onClickCallback = null;
let buildDragCallbacks = null; // { shouldCapture, onDown, onMove, onUp }

export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }
export function getSize() { return { W, H }; }
export function getZoom() { return zoom; }
export function getCam() { return { x: camX, y: camY }; }
export function getMouse() { return { x: mouseX, y: mouseY }; }

export function setCam(x, y) { camX = x; camY = y; }
export function setClickHandler(fn) { onClickCallback = fn; }
export function setBuildDragCallbacks(cbs) { buildDragCallbacks = cbs; }

export function toScreen(tx, ty) {
  return {
    x: ((tx - ty) * (TILE_W / 2)) * zoom + camX,
    y: ((tx + ty) * (TILE_H / 2)) * zoom + camY,
  };
}

export function toTile(sx, sy) {
  const rx = (sx - camX) / zoom;
  const ry = (sy - camY) / zoom;
  return {
    tx: Math.floor((rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2),
    ty: Math.floor((ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2),
  };
}

export function smoothZoom() {
  zoom += (targetZoom - zoom) * 0.12;
}

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  if (!camX) { camX = W / 2 - 100; camY = 80; }
}

function initControls() {
  window.addEventListener('resize', resize);
  resize();

  let buildDragging = false;

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
      // Check if build drag should capture instead of camera pan
      if (buildDragCallbacks?.shouldCapture?.()) {
        buildDragging = true;
        buildDragCallbacks.onDown?.(e.clientX, e.clientY);
        return;
      }
      dragging = true;
      dragSX = e.clientX; dragSY = e.clientY;
      camSX = camX; camSY = camY;
    }
  });

  canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (buildDragging) {
      buildDragCallbacks?.onMove?.(e.clientX, e.clientY);
      return;
    }
    if (dragging) {
      camX = camSX + (e.clientX - dragSX);
      camY = camSY + (e.clientY - dragSY);
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (buildDragging) {
      buildDragCallbacks?.onUp?.();
      buildDragging = false;
      return;
    }
    if (dragging && Math.abs(e.clientX - dragSX) < 8 && Math.abs(e.clientY - dragSY) < 8) {
      if (onClickCallback) onClickCallback(e.clientX, e.clientY);
    }
    dragging = false;
  });

  canvas.addEventListener('mouseleave', () => { dragging = false; buildDragging = false; });

  // Arrow key panning
  const keysDown = new Set();
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      keysDown.add(e.key);
    }
  });
  window.addEventListener('keyup', e => { keysDown.delete(e.key); });

  const PAN_SPEED = 6;
  function tickKeys() {
    if (keysDown.size > 0) {
      if (keysDown.has('ArrowUp'))    camY += PAN_SPEED;
      if (keysDown.has('ArrowDown'))  camY -= PAN_SPEED;
      if (keysDown.has('ArrowLeft'))  camX += PAN_SPEED;
      if (keysDown.has('ArrowRight')) camX -= PAN_SPEED;
    }
    requestAnimationFrame(tickKeys);
  }
  requestAnimationFrame(tickKeys);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    targetZoom = Math.max(0.4, Math.min(2.5, targetZoom - e.deltaY * 0.001));
    const t = toTile(e.clientX, e.clientY);
    requestAnimationFrame(() => {
      const s = toScreen(t.tx, t.ty);
      camX += e.clientX - s.x;
      camY += e.clientY - s.y;
    });
  }, { passive: false });
}

export function initEngine() {
  initControls();
  return { canvas, ctx };
}
