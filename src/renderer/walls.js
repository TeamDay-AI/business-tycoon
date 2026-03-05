// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Wall Renderer (4-wall rooms, peek-inside front)
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H, WALL_H } from '../config.js';
import { getCtx, toScreen, getZoom } from '../engine.js';
import { getRoomInstances } from '../map.js';
import { allWallEdges } from '../rotation.js';

function getRoomCorner(room, cornerName) {
  switch (cornerName) {
    case 'nw': return toScreen(room.x - 0.5, room.y - 0.5);
    case 'ne': return toScreen(room.x + room.w - 0.5, room.y - 0.5);
    case 'se': return toScreen(room.x + room.w - 0.5, room.y + room.h - 0.5);
    case 'sw': return toScreen(room.x - 0.5, room.y + room.h - 0.5);
    default: return toScreen(room.x - 0.5, room.y - 0.5);
  }
}

function getEdgeEndpoints(room, edgeName) {
  if (edgeName === 'top') return { a: getRoomCorner(room, 'nw'), b: getRoomCorner(room, 'ne') };
  if (edgeName === 'right') return { a: getRoomCorner(room, 'ne'), b: getRoomCorner(room, 'se') };
  if (edgeName === 'bottom') return { a: getRoomCorner(room, 'sw'), b: getRoomCorner(room, 'se') };
  return { a: getRoomCorner(room, 'nw'), b: getRoomCorner(room, 'sw') }; // left
}

function edgeColor(edgeName, dark, light) {
  return (edgeName === 'top' || edgeName === 'right') ? light : dark;
}

function getDoorRectsOnEdge(room, edgeName, wh, zoom) {
  const rects = [];
  const doors = (room.doors || []).filter(d => d.edge === edgeName);
  for (const d of doors) {
    const s = toScreen(d.x, d.y);
    const hw = TILE_W * zoom / 2, hh = TILE_H * zoom / 2;
    const dir = getEdgeDir(edgeName);
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len, uy = dir.y / len;
    const doorW = Math.max(14 * zoom, hw * 0.66);
    const doorH = Math.max(12 * zoom, wh * 0.78);
    const c = getDoorAnchor(edgeName, s, hw, hh);
    rects.push({
      ax: c.x - ux * doorW * 0.5, ay: c.y - uy * doorW * 0.5,
      bx: c.x + ux * doorW * 0.5, by: c.y + uy * doorW * 0.5,
      doorH,
    });
  }
  return rects;
}

function drawEdgeStrip(ctx, room, edgeName, wh, dark, light, zoom) {
  const { a, b } = getEdgeEndpoints(room, edgeName);
  const doorRects = getDoorRectsOnEdge(room, edgeName, wh, zoom);
  const c = edgeColor(edgeName, dark, light);

  if (doorRects.length > 0) {
    // Use clipping to exclude door openings from the wall strip
    ctx.save();
    // Build a clip region: full canvas minus door rects (using evenodd)
    ctx.beginPath();
    // Outer rect (entire canvas area around this wall)
    const margin = 2000;
    ctx.rect(a.x - margin, Math.min(a.y, b.y) - wh - margin, margin * 2 + Math.abs(b.x - a.x), margin * 2 + wh + Math.abs(b.y - a.y));
    // Subtract door openings (wound opposite direction for evenodd)
    for (const dr of doorRects) {
      ctx.moveTo(dr.ax, dr.ay);
      ctx.lineTo(dr.ax, dr.ay - dr.doorH);
      ctx.lineTo(dr.bx, dr.by - dr.doorH);
      ctx.lineTo(dr.bx, dr.by);
      ctx.closePath();
    }
    ctx.clip('evenodd');
  }

  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b.x, b.y - wh);
  ctx.lineTo(a.x, a.y - wh);
  ctx.closePath();
  ctx.fill();

  // Top trim line for cleaner silhouette
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - wh);
  ctx.lineTo(b.x, b.y - wh);
  ctx.stroke();

  if (doorRects.length > 0) {
    ctx.restore();
  }
}

// ─── Door frame + posters ────────────────────────────────────

function getEdgeDir(edgeName) {
  if (edgeName === 'top' || edgeName === 'bottom') return { x: 1, y: 0.5 };
  return { x: -1, y: 0.5 };
}

function getDoorAnchor(edgeName, s, hw, hh) {
  switch (edgeName) {
    case 'top': return { x: s.x, y: s.y - hh };
    case 'bottom': return { x: s.x, y: s.y + hh };
    case 'left': return { x: s.x - hw, y: s.y };
    case 'right': return { x: s.x + hw, y: s.y };
    default: return { x: s.x, y: s.y - hh };
  }
}

function drawDoorFrame(ctx, edgeName, s, hw, hh, wh, zoom, accent) {
  const dir = getEdgeDir(edgeName);
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len, uy = dir.y / len;
  const doorW = Math.max(14 * zoom, hw * 0.66);
  const doorH = Math.max(12 * zoom, wh * 0.78);
  const c = getDoorAnchor(edgeName, s, hw, hh);
  const ax = c.x - ux * doorW * 0.5, ay = c.y - uy * doorW * 0.5;
  const bx = c.x + ux * doorW * 0.5, by = c.y + uy * doorW * 0.5;

  // Threshold mat
  ctx.fillStyle = accent + '20';
  ctx.beginPath();
  ctx.moveTo(s.x - hw * 0.45, s.y);
  ctx.lineTo(s.x, s.y - hh * 0.45);
  ctx.lineTo(s.x + hw * 0.45, s.y);
  ctx.lineTo(s.x, s.y + hh * 0.45);
  ctx.closePath();
  ctx.fill();

  // Recess tint
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx, by - doorH);
  ctx.lineTo(ax, ay - doorH);
  ctx.closePath();
  ctx.fill();

  // Frame posts + lintel
  ctx.strokeStyle = accent + '90';
  ctx.lineWidth = Math.max(1, 1.4 * zoom);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay - doorH);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by - doorH);
  ctx.moveTo(ax, ay - doorH);
  ctx.lineTo(bx, by - doorH);
  ctx.stroke();
}

function drawPostersOnEdge(ctx, room, edgeName, wh, zoom, accent) {
  const { a, b } = getEdgeEndpoints(room, edgeName);
  const vx = b.x - a.x, vy = b.y - a.y;
  const len = Math.hypot(vx, vy);
  if (len < 70 * zoom) return;
  const ux = vx / len, uy = vy / len;
  const posterW = Math.max(14 * zoom, Math.min(26 * zoom, len * 0.16));
  const posterH = Math.max(18 * zoom, wh * 0.24);
  const anchors = room.w + room.h > 10 ? [0.32, 0.7] : [0.5];
  const palette = ['#d8c28f', '#8fb8d8', '#d88faa', '#9ad8a5'];
  const doorTs = (room.doors || [])
    .filter(d => d.edge === edgeName)
    .map(d => {
      const ds = toScreen(d.x, d.y);
      const px = ds.x - a.x, py = ds.y - a.y;
      return Math.max(0, Math.min(1, (px * vx + py * vy) / (len * len)));
    });
  const clearance = 0.18; // normalized edge distance around door to keep clear

  anchors.forEach((t, i) => {
    if (doorTs.some(dt => Math.abs(dt - t) < clearance)) return;
    const cx = a.x + vx * t, cy = a.y + vy * t;
    const lift = wh * 0.62;
    const x1 = cx - ux * posterW * 0.5, y1 = cy - uy * posterW * 0.5 - lift;
    const x2 = cx + ux * posterW * 0.5, y2 = cy + uy * posterW * 0.5 - lift;
    ctx.fillStyle = palette[(room.id + i) % palette.length] + 'cc';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, y2 + posterH);
    ctx.lineTo(x1, y1 + posterH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,20,0.55)';
    ctx.lineWidth = Math.max(0.7, 0.9 * zoom);
    ctx.stroke();
    ctx.strokeStyle = accent + '66';
    ctx.lineWidth = Math.max(0.8, 1.0 * zoom);
    ctx.beginPath();
    ctx.moveTo(x1 + ux * 2 * zoom, y1 + posterH * 0.34);
    ctx.lineTo(x2 - ux * 2 * zoom, y2 + posterH * 0.34);
    ctx.stroke();
  });
}

function drawCornerPosts(ctx, room, wh, zoom, accent) {
  const corners = [
    getRoomCorner(room, 'nw'),
    getRoomCorner(room, 'ne'),
    getRoomCorner(room, 'se'),
    getRoomCorner(room, 'sw'),
  ];
  const postW = Math.max(1.4, 2.0 * zoom);
  for (const c of corners) {
    ctx.fillStyle = accent + '55';
    ctx.fillRect(c.x - postW / 2, c.y - wh, postW, wh);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(c.x - postW / 2, c.y - wh, Math.max(0.8, postW * 0.4), wh);
  }
}

// ─── Edge tile iterator ──────────────────────────────────────

function forEdgeTiles(room, edgeName, visitor) {
  switch (edgeName) {
    case 'top':
      for (let dx = 0; dx < room.w; dx++) visitor(room.x + dx, room.y);
      break;
    case 'bottom':
      for (let dx = 0; dx < room.w; dx++) visitor(room.x + dx, room.y + room.h - 1);
      break;
    case 'left':
      for (let dy = 0; dy < room.h; dy++) visitor(room.x, room.y + dy);
      break;
    case 'right':
      for (let dy = 0; dy < room.h; dy++) visitor(room.x + room.w - 1, room.y + dy);
      break;
  }
}

// ─── Label position on back wall ─────────────────────────────

function getLabelPos(room, edgeName) {
  switch (edgeName) {
    case 'top':    return { x: room.x + room.w / 2, y: room.y };
    case 'bottom': return { x: room.x + room.w / 2, y: room.y + room.h - 1 };
    case 'left':   return { x: room.x, y: room.y + room.h / 2 };
    case 'right':  return { x: room.x + room.w - 1, y: room.y + room.h / 2 };
    default:       return { x: room.x + room.w / 2, y: room.y };
  }
}

// ─── Wall shadows (subtle, cast by back walls onto interior) ──

export function drawWallShadows() {
  const ctx = getCtx();
  const zoom = getZoom();
  const tw = TILE_W * zoom, th = TILE_H * zoom;

  // Track which tiles already have shadow to avoid double-darkening
  const shadowed = new Set();

  for (const room of getRoomInstances()) {
    if ((room.constructionProgress ?? 1) < 0.3) continue;

    const rot = room.rotation || 0;
    const edges = allWallEdges(rot);

    for (const edgeName of edges.back) {
      forEdgeTiles(room, edgeName, (tileX, tileY) => {
        // Only shadow 1 tile deep, subtle
        let sx = tileX, sy = tileY;
        switch (edgeName) {
          case 'top':    sy = tileY + 1; break;
          case 'bottom': sy = tileY - 1; break;
          case 'left':   sx = tileX + 1; break;
          case 'right':  sx = tileX - 1; break;
        }

        if (sx < room.x || sx >= room.x + room.w || sy < room.y || sy >= room.y + room.h) return;

        const key = `${sx},${sy}`;
        if (shadowed.has(key)) return;
        shadowed.add(key);

        const s = toScreen(sx, sy);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - th / 2);
        ctx.lineTo(s.x + tw / 2, s.y);
        ctx.lineTo(s.x, s.y + th / 2);
        ctx.lineTo(s.x - tw / 2, s.y);
        ctx.closePath();
        ctx.fill();
      });
    }
  }
}

// ─── Back walls (drawn BEFORE furniture — they're behind everything) ──

export function drawBackWalls() {
  const ctx = getCtx();
  const zoom = getZoom();
  const fullWH = WALL_H * zoom;

  for (const room of getRoomInstances()) {
    // Construction fade-in: walls appear as construction progresses
    const cp = room.constructionProgress ?? 1;
    if (cp < 0.3) continue; // No walls until 30% built
    const wallAlpha = Math.min(1, (cp - 0.3) / 0.5); // Fade 0.3→0.8

    const wb = room.type.wallBase;
    const light = `rgb(${wb[0]+30},${wb[1]+30},${wb[2]+30})`;
    const dark = `rgb(${wb[0]+15},${wb[1]+15},${wb[2]+15})`;
    const accent = room.type.accent;
    const rot = room.rotation || 0;
    const edges = allWallEdges(rot);

    ctx.save();
    ctx.globalAlpha = 0.85 * wallAlpha;

    for (const edgeName of edges.back) {
      drawEdgeStrip(ctx, room, edgeName, fullWH, dark, light, zoom);

      // Accent stripe across the whole strip
      const { a, b } = getEdgeEndpoints(room, edgeName);
      const stripeTopY = Math.min(a.y, b.y) - fullWH + 6 * zoom;
      ctx.strokeStyle = accent + '35';
      ctx.lineWidth = 3 * zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, stripeTopY);
      ctx.lineTo(b.x, stripeTopY + (b.y - a.y));
      ctx.stroke();

      // Door frames (wall already has holes via clipping)
      forEdgeTiles(room, edgeName, (tileX, tileY) => {
        const isDoor = room.doors?.some(d => d.x === tileX && d.y === tileY && d.edge === edgeName);
        if (!isDoor) return;
        const s = toScreen(tileX, tileY);
        const hw = TILE_W * zoom / 2, hh = TILE_H * zoom / 2;
        drawDoorFrame(ctx, edgeName, s, hw, hh, fullWH, zoom, accent);
      });

      drawPostersOnEdge(ctx, room, edgeName, fullWH, zoom, accent);
    }
    drawCornerPosts(ctx, room, fullWH, zoom, accent);

    ctx.restore();

    // Room label on back wall
    const lbl = getEdgeEndpoints(room, edges.back[0]);
    const ls = { x: (lbl.a.x + lbl.b.x) / 2, y: (lbl.a.y + lbl.b.y) / 2 };
    ctx.fillStyle = `rgba(255,255,255,${0.5 * wallAlpha})`;
    ctx.font = `${Math.max(9, 10 * zoom)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`${room.type.icon} ${room.type.name}`, ls.x, ls.y - fullWH + 18 * zoom);

    // Ambient glow
    const gs = toScreen(room.x + room.w / 2, room.y + room.h / 2);
    const glow = ctx.createRadialGradient(gs.x, gs.y, 0, gs.x, gs.y, 80 * zoom);
    glow.addColorStop(0, accent + '08');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(gs.x - 100 * zoom, gs.y - 60 * zoom, 200 * zoom, 120 * zoom);
  }
}

// ─── Front walls (drawn AFTER furniture — transparent peek-inside) ──

export function drawFrontWalls() {
  const ctx = getCtx();
  const zoom = getZoom();
  const frontWH = WALL_H * zoom;

  for (const room of getRoomInstances()) {
    const cp = room.constructionProgress ?? 1;
    if (cp < 0.3) continue;
    const wallAlpha = Math.min(1, (cp - 0.3) / 0.5);

    const wb = room.type.wallBase;
    const light = `rgb(${wb[0]+30},${wb[1]+30},${wb[2]+30})`;
    const dark = `rgb(${wb[0]+15},${wb[1]+15},${wb[2]+15})`;
    const accent = room.type.accent;
    const rot = room.rotation || 0;
    const edges = allWallEdges(rot);

    ctx.save();
    ctx.globalAlpha = 0.85 * wallAlpha;

    for (const edgeName of edges.front) {
      drawEdgeStrip(ctx, room, edgeName, frontWH, dark, light, zoom);

      // Door frames on front walls
      forEdgeTiles(room, edgeName, (tileX, tileY) => {
        const isDoor = room.doors?.some(d => d.x === tileX && d.y === tileY && d.edge === edgeName);
        if (!isDoor) return;
        const s = toScreen(tileX, tileY);
        const hw = TILE_W * zoom / 2, hh = TILE_H * zoom / 2;
        drawDoorFrame(ctx, edgeName, s, hw, hh, frontWH, zoom, accent);
      });
    }
    drawCornerPosts(ctx, room, frontWH, zoom, accent);

    ctx.restore();
  }
}
