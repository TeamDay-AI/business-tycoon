// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Build Mode (room placement, corridor painting)
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H, MAP_W, MAP_H, OFFICE_TYPES, COMMON_ROOMS, AGENT_ROLES, HIRE_COST, AGENT_SALARY } from './config.js';
import { getCtx, toScreen, toTile, getZoom, getMouse } from './engine.js';
import { canPlaceRoom, placeRoom, addCorridor, connectRoomToCorridor, getRoomInstances, getRoomDef, isAdjacentToCorridor, getTileMap } from './map.js';
import { getActivePlan, isOnFloor } from './floorplan.js';
import { G } from './game.js';
import { Agent } from './agent.js';
import { showToast } from './ui/toast.js';
import { getRoomUnlockState } from './progression.js';
import { sfxBuild, sfxHire, sfxError } from './sfx.js';
import { rotatedSize } from './rotation.js';

let selectedRoomType = null;
let ghostValid = false;
let ghostTx = 0, ghostTy = 0;
let rotation = 0;
let corridorMode = false;
let corridorDragging = false;

export function getSelectedRoomType() { return selectedRoomType; }
export function setSelectedRoomType(type) {
  selectedRoomType = type;
  if (type) corridorMode = false; // Selecting a room exits corridor mode
}
export function getRotation() { return rotation; }
export function cycleRotation() { rotation = (rotation + 1) % 4; }
export function resetRotation() { rotation = 0; }

export function isCorridorMode() { return corridorMode; }
export function setCorridorMode(enabled) {
  corridorMode = enabled;
  if (enabled) selectedRoomType = null; // Corridor mode clears room selection
}

export function handleBuildClick(sx, sy) {
  if (!G.buildMode) return false;

  const { tx, ty } = toTile(sx, sy);

  // Corridor mode — paint single tile
  if (corridorMode) {
    const tileMap = getTileMap();
    if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && tileMap[ty][tx] === 0 && isOnFloor(tx, ty)) {
      addCorridor(tx, ty);
      sfxBuild();
      return true;
    }
    return true; // Consume click even if invalid
  }

  if (!selectedRoomType) return false;

  const def = getRoomDef(selectedRoomType);
  if (!def) return false;
  const unlock = getRoomUnlockState(selectedRoomType);
  if (!unlock.unlocked) {
    sfxError();
    showToast(`🔒 Locked: ${unlock.requirement}`);
    return true;
  }

  const baseW = def.size?.w || 7;
  const baseH = def.size?.h || 5;
  const { w, h } = rotatedSize(baseW, baseH, rotation);
  const cost = def.cost || 1000;

  // Center the room on click
  const rx = tx - Math.floor(w / 2);
  const ry = ty - Math.floor(h / 2);

  if (!canPlaceRoom(rx, ry, w, h)) {
    sfxError();
    showToast('Cannot place here — needs corridor adjacency!');
    return true;
  }

  if (G.money < cost) {
    sfxError();
    showToast(`Not enough funds! Need $${cost.toLocaleString()}`);
    return true;
  }

  G.money -= cost;
  const room = placeRoom(selectedRoomType, rx, ry, w, h, rotation);
  if (room) {
    connectRoomToCorridor(room);
    sfxBuild();
    showToast(`🔨 Building ${def.name}... -$${cost.toLocaleString()}`);
    G.uiDirty = true;

    // Tutorial progression
    if (!G.completedTriggers.has('first_room')) {
      G.completedTriggers.add('first_room');
    }

    // Exit build mode after placing
    G.buildMode = false;
    selectedRoomType = null;
    rotation = 0;
    corridorMode = false;
    const bp = document.getElementById('build-panel');
    if (bp) bp.classList.remove('visible');
    const buildBtn = document.getElementById('build-btn');
    if (buildBtn) buildBtn.classList.remove('active');
  }

  return true;
}

// Handle corridor drag painting
export function handleBuildMouseDown(sx, sy) {
  if (!G.buildMode || !corridorMode) return;
  corridorDragging = true;
  handleBuildClick(sx, sy);
}

export function handleBuildMouseMove(sx, sy) {
  if (!corridorDragging || !corridorMode) return;
  const { tx, ty } = toTile(sx, sy);
  const tileMap = getTileMap();
  if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && tileMap[ty][tx] === 0 && isOnFloor(tx, ty)) {
    addCorridor(tx, ty);
  }
}

export function handleBuildMouseUp() {
  corridorDragging = false;
}

export function drawBuildGhost() {
  if (!G.buildMode) return;

  const ctx = getCtx();
  const zoom = getZoom();
  const { x: mouseX, y: mouseY } = getMouse();
  const { tx, ty } = toTile(mouseX, mouseY);
  const tw = TILE_W * zoom, th = TILE_H * zoom;

  // Corridor mode ghost — single highlighted diamond
  if (corridorMode) {
    const s = toScreen(tx, ty);
    const tileMap = getTileMap();
    const valid = tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && tileMap[ty][tx] === 0 && isOnFloor(tx, ty);
    const color = valid ? 'rgba(80,200,120,0.35)' : 'rgba(224,80,80,0.25)';
    const borderColor = valid ? 'rgba(80,200,120,0.7)' : 'rgba(224,80,80,0.6)';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - th / 2);
    ctx.lineTo(s.x + tw / 2, s.y);
    ctx.lineTo(s.x, s.y + th / 2);
    ctx.lineTo(s.x - tw / 2, s.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = valid ? '#50c878' : '#e05050';
    ctx.font = `bold ${10 * zoom}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('Corridor', s.x, s.y - 4 * zoom);
    return;
  }

  if (!selectedRoomType) return;

  const def = getRoomDef(selectedRoomType);
  if (!def) return;

  const baseW = def.size?.w || 7;
  const baseH = def.size?.h || 5;
  const { w, h } = rotatedSize(baseW, baseH, rotation);
  const rx = tx - Math.floor(w / 2);
  const ry = ty - Math.floor(h / 2);

  ghostTx = rx; ghostTy = ry;
  ghostValid = canPlaceRoom(rx, ry, w, h) && G.money >= (def.cost || 1000);

  const color = ghostValid ? 'rgba(80,200,120,0.25)' : 'rgba(224,80,80,0.25)';
  const borderColor = ghostValid ? 'rgba(80,200,120,0.6)' : 'rgba(224,80,80,0.6)';

  // Check which edge tiles touch corridors for door preview
  const tileMap = getTileMap();

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const s = toScreen(rx + dx, ry + dy);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - th / 2);
      ctx.lineTo(s.x + tw / 2, s.y);
      ctx.lineTo(s.x, s.y + th / 2);
      ctx.lineTo(s.x - tw / 2, s.y);
      ctx.closePath();
      ctx.fill();

      // Border on edges
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight edge tiles touching corridors (green = door will appear)
      const isEdge = dx === 0 || dx === w - 1 || dy === 0 || dy === h - 1;
      if (isEdge) {
        const gx = rx + dx, gy = ry + dy;
        const touchesCorridor = (
          (gx > 0 && tileMap[gy]?.[gx - 1] === 1) ||
          (gx < MAP_W - 1 && tileMap[gy]?.[gx + 1] === 1) ||
          (gy > 0 && tileMap[gy - 1]?.[gx] === 1) ||
          (gy < MAP_H - 1 && tileMap[gy + 1]?.[gx] === 1)
        );
        if (touchesCorridor) {
          ctx.fillStyle = 'rgba(80,200,120,0.3)';
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - th / 2);
          ctx.lineTo(s.x + tw / 2, s.y);
          ctx.lineTo(s.x, s.y + th / 2);
          ctx.lineTo(s.x - tw / 2, s.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // Room name label
  const center = toScreen(rx + w / 2, ry + h / 2);
  ctx.fillStyle = ghostValid ? '#50c878' : '#e05050';
  ctx.font = `bold ${12 * zoom}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(`${def.icon} ${def.name}`, center.x, center.y - 5 * zoom);
  ctx.font = `${10 * zoom}px system-ui`;
  const rotLabel = rotation > 0 ? ` ↻${rotation * 90}°` : '';
  ctx.fillText(`$${(def.cost || 1000).toLocaleString()}${rotLabel}`, center.x, center.y + 10 * zoom);

  // Show hint if not adjacent to corridor
  if (!ghostValid && rx >= 0 && ry >= 0) {
    const allEmpty = (() => {
      for (let ddy = 0; ddy < h; ddy++)
        for (let ddx = 0; ddx < w; ddx++) {
          const mx = rx + ddx, my = ry + ddy;
          if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return false;
          if (tileMap[my][mx] !== 0) return false;
        }
      return true;
    })();
    if (allEmpty && !isAdjacentToCorridor(rx, ry, w, h)) {
      ctx.fillStyle = '#e05050';
      ctx.font = `${9 * zoom}px system-ui`;
      ctx.fillText('Paint corridors first!', center.x, center.y + 22 * zoom);
    }
  }
}

// ─── Hire Agent ────────────────────────────────────────────
export function hireAgent(roleKey, candidate = null) {
  const signingCost = candidate?.signingCost ?? HIRE_COST;
  if (G.money < signingCost) {
    sfxError();
    showToast('Not enough funds to hire!');
    return false;
  }

  const role = AGENT_ROLES[roleKey];
  if (!role) return false;

  // Check if matching office exists
  const hasOffice = getRoomInstances().some(r => r.typeKey === role.office);
  if (!hasOffice) {
    sfxError();
    showToast(`Build a ${OFFICE_TYPES[role.office]?.name || 'matching office'} first!`);
    return false;
  }

  G.money -= signingCost;
  const plan = getActivePlan();
  const lp = plan ? plan.lobbyPos : { x: 10, y: 18 };
  const spawn = { x: lp.x + 2, y: lp.y + 2 };
  const agent = new Agent(roleKey, spawn.x, spawn.y, candidate);
  if (candidate?.salary) agent.salary = candidate.salary;
  G.agents.push(agent);

  // Send to their office
  const officeRoom = getRoomInstances().find(r => r.typeKey === role.office);
  if (officeRoom) {
    setTimeout(() => agent.moveToRoom(officeRoom.id), 200);
  }

  sfxHire();
  const salaryInfo = ` ($${(agent.salary ?? AGENT_SALARY[roleKey] ?? 70)}/day)`;
  showToast(`Hired ${agent.name} as ${role.title}${salaryInfo}! -$${signingCost}`);
  G.uiDirty = true;

  if (!G.completedTriggers.has('first_hire')) {
    G.completedTriggers.add('first_hire');
  }
  return true;
}
