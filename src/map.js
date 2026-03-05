// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Tile Map & Room Management
// ═══════════════════════════════════════════════════════════════

import { MAP_W, MAP_H, OFFICE_TYPES, COMMON_ROOMS } from './config.js';
import { isOnFloor } from './floorplan.js';
import { rotateOffset, allWallEdges, detectDoors } from './rotation.js';

// Map data arrays
const tileMap = [];     // 0=void, 1=corridor, 2=room
const tileRoomId = [];  // room index or -1
const walkable = [];

// Initialize empty map
for (let y = 0; y < MAP_H; y++) {
  tileMap[y] = new Array(MAP_W).fill(0);
  tileRoomId[y] = new Array(MAP_W).fill(-1);
  walkable[y] = new Array(MAP_W).fill(false);
}

export function getTileMap() { return tileMap; }
export function getTileRoomId() { return tileRoomId; }
export function getWalkable() { return walkable; }

// Room instances
const roomInstances = [];
let nextRoomId = 0;

export function getRoomInstances() { return roomInstances; }

export function getRoomDef(typeKey) {
  return OFFICE_TYPES[typeKey] || COMMON_ROOMS[typeKey];
}

export function placeRoom(typeKey, tx, ty, w, h, rot = 0) {
  const typeDef = getRoomDef(typeKey);
  if (!typeDef) return null;

  // Construction time scales with room area (bigger rooms take longer)
  // Lobby and breakroom build instantly — they're basic infrastructure
  const instant = (typeKey === 'lobby' || typeKey === 'breakroom');
  const area = w * h;
  const buildTicks = instant ? 0 : Math.round(80 + area * 3); // ~80-200 ticks

  const room = {
    id: nextRoomId++, typeKey, type: typeDef, x: tx, y: ty, w, h,
    rotation: rot, furnitureList: [], workPositions: [],
    constructionProgress: instant ? 1 : 0,
    constructionTime: buildTicks,
    constructionTick: instant ? buildTicks : 0,
  };

  // Fill tiles
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const mx = tx + dx, my = ty + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
        tileMap[my][mx] = 2;
        tileRoomId[my][mx] = room.id;
        walkable[my][mx] = true;
      }
    }
  }

  // Mark ALL 4 edges non-walkable (fully enclosed room)
  const edges = allWallEdges(rot);
  for (const edge of [...edges.back, ...edges.front]) {
    markEdgeNonWalkable(tx, ty, w, h, edge);
  }

  // Smart door placement — detect corridor adjacency
  room.doors = detectDoors(tx, ty, w, h, tileMap, MAP_W, MAP_H);
  for (const door of room.doors) {
    if (door.x >= 0 && door.x < MAP_W && door.y >= 0 && door.y < MAP_H) {
      walkable[door.y][door.x] = true;
    }
  }

  // Place furniture (rotate local offsets)
  // For rotated rooms, we need the original definition's w/h (before rotation swap)
  const origW = (rot === 1 || rot === 3) ? h : w;
  const origH = (rot === 1 || rot === 3) ? w : h;
  if (typeDef.furniture) {
    for (const f of typeDef.furniture) {
      const r = rotateOffset(f.lx, f.ly, origW, origH, rot);
      const fx = tx + r.lx, fy = ty + r.ly;
      if (fx >= 0 && fx < MAP_W && fy >= 0 && fy < MAP_H) {
        room.furnitureList.push({ ...f, x: fx, y: fy, _room: room });
        if (f.type !== 'chair' && f.type !== 'plant' && f.type !== 'rug') {
          walkable[fy][fx] = false;
        }
      }
    }
  }

  // Work positions (rotate local offsets → absolute coords)
  if (typeDef.workTiles) {
    for (const [lx, ly] of typeDef.workTiles) {
      const r = rotateOffset(lx, ly, origW, origH, rot);
      const wx = tx + r.lx, wy = ty + r.ly;
      if (wx >= 0 && wx < MAP_W && wy >= 0 && wy < MAP_H && walkable[wy][wx]) {
        room.workPositions.push({ x: wx, y: wy });
      }
    }
  }

  roomInstances.push(room);
  return room;
}

function markEdgeNonWalkable(tx, ty, w, h, edge) {
  switch (edge) {
    case 'top':
      for (let dx = 0; dx < w; dx++) {
        const mx = tx + dx, my = ty;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) walkable[my][mx] = false;
      }
      break;
    case 'bottom':
      for (let dx = 0; dx < w; dx++) {
        const mx = tx + dx, my = ty + h - 1;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) walkable[my][mx] = false;
      }
      break;
    case 'left':
      for (let dy = 0; dy < h; dy++) {
        const mx = tx, my = ty + dy;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) walkable[my][mx] = false;
      }
      break;
    case 'right':
      for (let dy = 0; dy < h; dy++) {
        const mx = tx + w - 1, my = ty + dy;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) walkable[my][mx] = false;
      }
      break;
  }
}

// Re-scan a room's edges for corridor adjacency and update doors
export function refreshDoors(roomId) {
  const room = roomInstances.find(r => r.id === roomId);
  if (!room) return;

  // First, re-wall all edges (remove old door walkability)
  const edges = allWallEdges(room.rotation || 0);
  for (const edge of [...edges.back, ...edges.front]) {
    markEdgeNonWalkable(room.x, room.y, room.w, room.h, edge);
  }

  // Detect new doors
  room.doors = detectDoors(room.x, room.y, room.w, room.h, tileMap, MAP_W, MAP_H);
  for (const door of room.doors) {
    if (door.x >= 0 && door.x < MAP_W && door.y >= 0 && door.y < MAP_H) {
      walkable[door.y][door.x] = true;
    }
  }
}

// When a corridor tile is added, refresh any touching room's doors
function refreshAdjacentRoomDoors(x, y) {
  const checked = new Set();
  for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && tileMap[ny][nx] === 2) {
      const rid = tileRoomId[ny][nx];
      if (rid >= 0 && !checked.has(rid)) {
        checked.add(rid);
        refreshDoors(rid);
      }
    }
  }
}

export function addCorridor(x, y) {
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H && tileMap[y][x] === 0 && isOnFloor(x, y)) {
    tileMap[y][x] = 1;
    walkable[y][x] = true;
    refreshAdjacentRoomDoors(x, y);
  }
}

export function addCorridorLine(x1, y1, x2, y2) {
  if (y1 === y2) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) addCorridor(x, y1);
  } else {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) addCorridor(x1, y);
  }
}

// Check if a room can be placed at a location
export function canPlaceRoom(tx, ty, w, h) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const mx = tx + dx, my = ty + dy;
      if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return false;
      if (tileMap[my][mx] !== 0) return false;
      if (!isOnFloor(mx, my)) return false;
    }
  }
  // Enforce corridor adjacency — must touch at least one corridor tile
  return isAdjacentToCorridor(tx, ty, w, h);
}

// Check if a position is adjacent to a corridor
export function isAdjacentToCorridor(tx, ty, w, h) {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      if (dx >= 0 && dx < w && dy >= 0 && dy < h) continue; // Skip interior
      const mx = tx + dx, my = ty + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
        if (tileMap[my][mx] === 1) return true;
      }
    }
  }
  return false;
}

// No-op — corridor-first building replaces auto-connect
export function connectRoomToCorridor(_room) {}

export function isRoomReady(room) {
  return room.constructionProgress >= 1;
}

export function findRoomByType(typeKey) {
  return roomInstances.find(r => r.typeKey === typeKey && isRoomReady(r));
}

export function countRoomsByType(typeKey) {
  return roomInstances.filter(r => r.typeKey === typeKey && isRoomReady(r)).length;
}

// Returns array of rooms that just completed construction this tick
export function updateConstruction(dt) {
  const completed = [];
  for (const room of roomInstances) {
    if (room.constructionProgress >= 1) continue;
    const wasDone = room.constructionProgress >= 1;
    room.constructionTick += dt;
    room.constructionProgress = Math.min(1, room.constructionTick / room.constructionTime);
    if (!wasDone && room.constructionProgress >= 1) {
      completed.push(room);
    }
  }
  return completed;
}
