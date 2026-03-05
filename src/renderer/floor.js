// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Floor Renderer (patterned tiles per room type)
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H, MAP_W, MAP_H } from '../config.js';
import { getCtx, toScreen, getZoom, getSize } from '../engine.js';
import { getTileMap, getTileRoomId, getRoomInstances } from '../map.js';
import { isOnFloor, getFloorMask, getAllExpansions, isExpansionAvailable, isExpansionPurchased } from '../floorplan.js';
import { G } from '../game.js';

// ─── Pattern-specific tile drawers ────────────────────────────

function drawCarpetTile(ctx, s, tw, th, fb, x, y) {
  const m = (x + y) % 2 === 0 ? 0 : 4;
  ctx.fillStyle = `rgb(${fb[0]+m},${fb[1]+m},${fb[2]+m})`;
  fillDiamond(ctx, s, tw, th);

  // Subtle fiber noise — small inner diamond offset
  const noise = ((x * 7 + y * 13) % 5) - 2;
  ctx.fillStyle = `rgba(${fb[0]+20+noise},${fb[1]+20+noise},${fb[2]+20+noise},0.15)`;
  const inset = tw * 0.15;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - th / 2 + inset / 2);
  ctx.lineTo(s.x + tw / 2 - inset, s.y);
  ctx.lineTo(s.x, s.y + th / 2 - inset / 2);
  ctx.lineTo(s.x - tw / 2 + inset, s.y);
  ctx.closePath();
  ctx.fill();
}

function drawTileFloor(ctx, s, tw, th, fb, x, y) {
  const m = (x + y) % 2 === 0 ? 0 : 5;
  ctx.fillStyle = `rgb(${fb[0]+m},${fb[1]+m},${fb[2]+m})`;
  fillDiamond(ctx, s, tw, th);

  // Grout lines — inner cross
  ctx.strokeStyle = `rgba(0,0,0,0.12)`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(s.x - tw * 0.15, s.y - th * 0.15);
  ctx.lineTo(s.x + tw * 0.15, s.y + th * 0.15);
  ctx.moveTo(s.x + tw * 0.15, s.y - th * 0.15);
  ctx.lineTo(s.x - tw * 0.15, s.y + th * 0.15);
  ctx.stroke();
}

function drawWoodTile(ctx, s, tw, th, fb, x, y) {
  const m = (x + y) % 2 === 0 ? 0 : 6;
  ctx.fillStyle = `rgb(${fb[0]+m},${fb[1]+m},${fb[2]+m})`;
  fillDiamond(ctx, s, tw, th);

  // Plank line strokes — horizontal grain
  ctx.strokeStyle = `rgba(0,0,0,0.08)`;
  ctx.lineWidth = 0.5;
  const planks = 3;
  for (let i = 1; i < planks; i++) {
    const ratio = i / planks;
    const py = s.y - th / 2 + th * ratio;
    const halfW = tw / 2 * (1 - Math.abs(ratio - 0.5) * 2);
    ctx.beginPath();
    ctx.moveTo(s.x - halfW, py);
    ctx.lineTo(s.x + halfW, py);
    ctx.stroke();
  }
}

function drawLabTile(ctx, s, tw, th, fb, x, y) {
  const m = (x + y) % 2 === 0 ? 0 : 3;
  ctx.fillStyle = `rgb(${Math.min(255,fb[0]+8+m)},${Math.min(255,fb[1]+8+m)},${Math.min(255,fb[2]+8+m)})`;
  fillDiamond(ctx, s, tw, th);

  // Cross grid pattern
  ctx.strokeStyle = `rgba(255,255,255,0.06)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  // Vertical-ish line
  ctx.moveTo(s.x, s.y - th * 0.35);
  ctx.lineTo(s.x, s.y + th * 0.35);
  // Horizontal-ish line
  ctx.moveTo(s.x - tw * 0.25, s.y);
  ctx.lineTo(s.x + tw * 0.25, s.y);
  ctx.stroke();
}

function drawConcreteTile(ctx, s, tw, th, fb, x, y) {
  const noise = ((x * 17 + y * 31) % 7) - 3;
  ctx.fillStyle = `rgb(${fb[0]+noise},${fb[1]+noise},${fb[2]+noise})`;
  fillDiamond(ctx, s, tw, th);

  // Random speckles
  const seed = (x * 37 + y * 59) % 100;
  if (seed < 30) {
    ctx.fillStyle = `rgba(0,0,0,0.08)`;
    const ox = ((seed % 7) - 3) * tw * 0.04;
    const oy = ((seed % 5) - 2) * th * 0.06;
    ctx.beginPath();
    ctx.arc(s.x + ox, s.y + oy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCorridorTile(ctx, s, tw, th, x, y) {
  // Distinct grey linoleum checkerboard
  const check = (x + y) % 2 === 0;
  ctx.fillStyle = check ? '#3a3432' : '#302c28';
  fillDiamond(ctx, s, tw, th);

  // Checkerboard overlay — inner diamond
  ctx.fillStyle = check ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const inset = tw * 0.12;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - th / 2 + inset / 2);
  ctx.lineTo(s.x + tw / 2 - inset, s.y);
  ctx.lineTo(s.x, s.y + th / 2 - inset / 2);
  ctx.lineTo(s.x - tw / 2 + inset, s.y);
  ctx.closePath();
  ctx.fill();

  // Center dot
  ctx.fillStyle = 'rgba(200,180,160,0.06)';
  ctx.beginPath();
  ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Pattern dispatcher ────────────────────────────────────

const patternDrawers = {
  carpet: drawCarpetTile,
  tile: drawTileFloor,
  wood: drawWoodTile,
  lab: drawLabTile,
  concrete: drawConcreteTile,
};

// ─── Helper ───────────────────────────────────────────────

function fillDiamond(ctx, s, tw, th) {
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - th / 2);
  ctx.lineTo(s.x + tw / 2, s.y);
  ctx.lineTo(s.x, s.y + th / 2);
  ctx.lineTo(s.x - tw / 2, s.y);
  ctx.closePath();
  ctx.fill();
}

// ─── Main Floor Draw ──────────────────────────────────────

export function drawFloor() {
  const ctx = getCtx();
  const zoom = getZoom();
  const { W, H } = getSize();
  const tileMap = getTileMap();
  const tileRoomId = getTileRoomId();
  const roomInstances = getRoomInstances();
  const floorMask = getFloorMask();
  const tw = TILE_W * zoom, th = TILE_H * zoom;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const onFloor = floorMask ? floorMask[y][x] : true;
      const tileType = tileMap[y][x];

      // Skip tiles that aren't floor plan and have nothing built
      if (!onFloor && tileType === 0) continue;

      const s = toScreen(x, y);
      // Culling
      if (s.x < -tw || s.x > W + tw || s.y < -th * 3 || s.y > H + th) continue;

      if (tileType === 0 && onFloor) {
        // Empty floor plan tile — slightly darker to make corridors pop
        const m = (x + y) % 2 === 0 ? 0 : 2;
        ctx.fillStyle = `rgb(${26 + m},${23 + m},${21 + m})`;
        fillDiamond(ctx, s, tw, th);
      } else if (tileType === 1) {
        // Corridor — distinct linoleum
        drawCorridorTile(ctx, s, tw, th, x, y);
      } else {
        // Room tile — use pattern from room type
        const room = roomInstances[tileRoomId[y][x]];
        if (room) {
          const pattern = room.type.floorPattern || 'carpet';
          const drawer = patternDrawers[pattern];
          if (drawer) {
            drawer(ctx, s, tw, th, room.type.floorBase, x, y);
          } else {
            const fb = room.type.floorBase;
            const m = (x + y) % 2 === 0 ? 0 : 6;
            ctx.fillStyle = `rgb(${fb[0]+m},${fb[1]+m},${fb[2]+m})`;
            fillDiamond(ctx, s, tw, th);
          }
        } else {
          ctx.fillStyle = '#302a28';
          fillDiamond(ctx, s, tw, th);
        }
      }

      // Draw edge highlight on floor plan boundary
      if (onFloor && tileType === 0 && floorMask) {
        const edgeRight = x + 1 >= MAP_W || !floorMask[y][x + 1];
        const edgeDown  = y + 1 >= MAP_H || !floorMask[y + 1][x];
        const edgeLeft  = x - 1 < 0 || !floorMask[y][x - 1];
        const edgeUp    = y - 1 < 0 || !floorMask[y - 1][x];

        if (edgeRight || edgeDown || edgeLeft || edgeUp) {
          ctx.strokeStyle = 'rgba(100,80,60,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (edgeUp)    { ctx.moveTo(s.x - tw / 2, s.y); ctx.lineTo(s.x, s.y - th / 2); }
          if (edgeRight) { ctx.moveTo(s.x, s.y - th / 2); ctx.lineTo(s.x + tw / 2, s.y); }
          if (edgeDown)  { ctx.moveTo(s.x + tw / 2, s.y); ctx.lineTo(s.x, s.y + th / 2); }
          if (edgeLeft)  { ctx.moveTo(s.x, s.y + th / 2); ctx.lineTo(s.x - tw / 2, s.y); }
          ctx.stroke();
        }
      }
    }
  }
}

export function drawExpansionZones() {
  const ctx = getCtx();
  const zoom = getZoom();
  const { W, H } = getSize();
  const tw = TILE_W * zoom, th = TILE_H * zoom;

  const expansions = getAllExpansions();
  const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 800);

  for (const exp of expansions) {
    if (isExpansionPurchased(exp.id)) continue;
    const available = isExpansionAvailable(exp);
    const alpha = available ? pulse * 0.15 : 0.04;
    const borderAlpha = available ? pulse * 0.4 : 0.1;

    // Fill expansion zone tiles
    for (let dy = 0; dy < exp.h; dy++) {
      for (let dx = 0; dx < exp.w; dx++) {
        const x = exp.x + dx, y = exp.y + dy;
        const s = toScreen(x, y);
        if (s.x < -tw || s.x > W + tw || s.y < -th * 3 || s.y > H + th) continue;

        ctx.fillStyle = available
          ? `rgba(240,180,80,${alpha})`
          : `rgba(120,100,80,${alpha})`;
        fillDiamond(ctx, s, tw, th);

        // Edge border for zone outline
        const isTop    = dy === 0;
        const isBottom = dy === exp.h - 1;
        const isLeft   = dx === 0;
        const isRight  = dx === exp.w - 1;

        if (isTop || isBottom || isLeft || isRight) {
          ctx.strokeStyle = available
            ? `rgba(240,180,80,${borderAlpha})`
            : `rgba(120,100,80,${borderAlpha})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          if (isTop)    { ctx.moveTo(s.x - tw / 2, s.y); ctx.lineTo(s.x, s.y - th / 2); }
          if (isRight)  { ctx.moveTo(s.x, s.y - th / 2); ctx.lineTo(s.x + tw / 2, s.y); }
          if (isBottom) { ctx.moveTo(s.x + tw / 2, s.y); ctx.lineTo(s.x, s.y + th / 2); }
          if (isLeft)   { ctx.moveTo(s.x, s.y + th / 2); ctx.lineTo(s.x - tw / 2, s.y); }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Label in center
    if (available) {
      const cx = exp.x + exp.w / 2;
      const cy = exp.y + exp.h / 2;
      const center = toScreen(cx, cy);
      if (center.x > -100 && center.x < W + 100 && center.y > -100 && center.y < H + 100) {
        ctx.fillStyle = `rgba(240,180,80,${pulse * 0.7})`;
        ctx.font = `bold ${Math.max(9, 10 * zoom)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(`🗺️ ${exp.name}`, center.x, center.y - 6 * zoom);
        ctx.font = `bold ${Math.max(9, 10 * zoom)}px system-ui`;
        ctx.fillStyle = `rgba(80,200,120,${pulse * 0.8})`;
        ctx.fillText(`$${exp.cost.toLocaleString()}`, center.x, center.y + 7 * zoom);
        ctx.font = `${Math.max(7, 8 * zoom)}px system-ui`;
        ctx.fillStyle = `rgba(240,180,80,${pulse * 0.5})`;
        ctx.fillText('click to expand', center.x, center.y + 18 * zoom);
      }
    }
  }
}

export function drawBuildGrid() {
  if (!G.buildMode) return;
  const ctx = getCtx();
  const zoom = getZoom();
  const { W, H } = getSize();
  const tileMap = getTileMap();
  const floorMask = getFloorMask();
  const tw = TILE_W * zoom, th = TILE_H * zoom;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const s = toScreen(x, y);
      if (s.x < -tw || s.x > W + tw || s.y < -th * 3 || s.y > H + th) continue;

      const onFloor = floorMask ? floorMask[y][x] : true;

      if (tileMap[y][x] === 0 && onFloor) {
        // Empty buildable tile - show build grid
        ctx.strokeStyle = 'rgba(240,160,80,0.12)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - th / 2);
        ctx.lineTo(s.x + tw / 2, s.y);
        ctx.lineTo(s.x, s.y + th / 2);
        ctx.lineTo(s.x - tw / 2, s.y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}
