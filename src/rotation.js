// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Room Rotation Utilities
// ═══════════════════════════════════════════════════════════════

// Transform local offset (lx, ly) for a given rotation in a room of (w, h)
export function rotateOffset(lx, ly, w, h, rot) {
  switch (rot) {
    case 1: return { lx: h - 1 - ly, ly: lx };          // 90° CW
    case 2: return { lx: w - 1 - lx, ly: h - 1 - ly };  // 180°
    case 3: return { lx: ly, ly: w - 1 - lx };           // 270° CW
    default: return { lx, ly };                           // 0°
  }
}

// Get effective (w, h) for a rotation — swap for 90°/270°
export function rotatedSize(w, h, rot) {
  return (rot === 1 || rot === 3) ? { w: h, h: w } : { w, h };
}

// Get which two edges have walls for a given rotation
// Returns { back: 'top'|'right'|'bottom'|'left', side: ... }
export function wallEdges(rot) {
  switch (rot) {
    case 1: return { back: 'right', side: 'top' };
    case 2: return { back: 'bottom', side: 'right' };
    case 3: return { back: 'left', side: 'bottom' };
    default: return { back: 'top', side: 'left' };
  }
}

// Get door positions (absolute) for a rotated room at (tx, ty) with effective (ew, eh)
export function getDoorPositions(tx, ty, ew, eh, rot) {
  const doors = [];
  switch (rot) {
    case 1: // back=right, side=top
      doors.push({ x: tx + ew - 1, y: ty + Math.floor(eh / 2), side: 'back' });
      doors.push({ x: tx + Math.floor(ew / 2), y: ty, side: 'side' });
      break;
    case 2: // back=bottom, side=right
      doors.push({ x: tx + Math.floor(ew / 2), y: ty + eh - 1, side: 'back' });
      doors.push({ x: tx + ew - 1, y: ty + Math.floor(eh / 2), side: 'side' });
      break;
    case 3: // back=left, side=bottom
      doors.push({ x: tx, y: ty + Math.floor(eh / 2), side: 'back' });
      doors.push({ x: tx + Math.floor(ew / 2), y: ty + eh - 1, side: 'side' });
      break;
    default: // back=top, side=left
      doors.push({ x: tx + Math.floor(ew / 2), y: ty, side: 'back' });
      doors.push({ x: tx, y: ty + Math.floor(eh / 2), side: 'side' });
      break;
  }
  return doors;
}

// Get all 4 wall edges for a rotation
// back = NW-facing walls (full height), front = SE-facing walls (half height, transparent)
export function allWallEdges(rot) {
  switch (rot) {
    case 1: return { back: ['right', 'top'],    front: ['left', 'bottom'] };
    case 2: return { back: ['bottom', 'right'], front: ['top', 'left'] };
    case 3: return { back: ['left', 'bottom'],  front: ['right', 'top'] };
    default: return { back: ['top', 'left'],    front: ['bottom', 'right'] };
  }
}

// Detect doors by scanning room edges for adjacent corridor tiles
// Returns array of { x, y, edge } for each door position
export function detectDoors(tx, ty, w, h, tileMap, mapW, mapH) {
  const doors = [];
  const edges = [
    { name: 'top',    tiles: () => { const t = []; for (let dx = 0; dx < w; dx++) t.push({ x: tx + dx, y: ty, nx: tx + dx, ny: ty - 1 }); return t; }},
    { name: 'bottom', tiles: () => { const t = []; for (let dx = 0; dx < w; dx++) t.push({ x: tx + dx, y: ty + h - 1, nx: tx + dx, ny: ty + h }); return t; }},
    { name: 'left',   tiles: () => { const t = []; for (let dy = 0; dy < h; dy++) t.push({ x: tx, y: ty + dy, nx: tx - 1, ny: ty + dy }); return t; }},
    { name: 'right',  tiles: () => { const t = []; for (let dy = 0; dy < h; dy++) t.push({ x: tx + w - 1, y: ty + dy, nx: tx + w, ny: ty + dy }); return t; }},
  ];

  for (const edge of edges) {
    const tiles = edge.tiles();
    // Find contiguous runs of tiles whose neighbor is a corridor
    let runStart = -1;
    for (let i = 0; i <= tiles.length; i++) {
      const t = tiles[i];
      const isCorridor = t && t.nx >= 0 && t.nx < mapW && t.ny >= 0 && t.ny < mapH && tileMap[t.ny][t.nx] === 1;
      if (isCorridor) {
        if (runStart < 0) runStart = i;
      } else {
        if (runStart >= 0) {
          // Pick center of the run
          const mid = Math.floor((runStart + i - 1) / 2);
          doors.push({ x: tiles[mid].x, y: tiles[mid].y, edge: edge.name });
          runStart = -1;
        }
      }
    }
  }
  return doors;
}
