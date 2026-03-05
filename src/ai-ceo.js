// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — AI CEO Mode
//  Autonomous play: builds offices, hires agents, manages company
// ═══════════════════════════════════════════════════════════════

import { AGENT_ROLES, AGENT_SALARY } from './config.js';
import { G } from './game.js';
import { placeRoom, canPlaceRoom, addCorridor, getRoomInstances, countRoomsByType, connectRoomToCorridor, getRoomDef, getTileMap, getWalkable, findRoomByType } from './map.js';
import { findPath } from './pathfinding.js';
import { hireAgent } from './build-mode.js';
import { rollCandidatesForRole, getCandidatesForRole } from './recruitment.js';
import { getRoomUnlockState, isOfficeAvailable, chooseTechBranch } from './progression.js';
import { showToast } from './ui/toast.js';
import { startTeamBuilding } from './simulation.js';
import { getActivePlan, getAllExpansions, isExpansionAvailable, isExpansionPurchased, purchaseExpansion, isOnFloor } from './floorplan.js';
import { MAP_W, MAP_H } from './config.js';
import { sfxBuild } from './sfx.js';
import { setSpeed } from './ui/speed.js';

// ─── State ──────────────────────────────────────────────
let aiEnabled = false;
let aiTickTimer = 0;
const AI_THINK_INTERVAL = 300;
const AI_MIN_ACTION_GAP = 150;

let lastBuildAttemptTick = 0;
let corridorBudgetUsed = 0; // track how many corridor tiles we've painted

export function isAiCeoEnabled() { return aiEnabled; }

export function toggleAiCeo() {
  aiEnabled = !aiEnabled;
  if (aiEnabled) {
    showToast('🤖 AI CEO activated! Sit back and enjoy.');
    if (G.gameSpeed < 2) setSpeed(2);
  } else {
    showToast('🤖 AI CEO deactivated. You\'re in control.');
  }
  return aiEnabled;
}

export function enableAiCeo() {
  aiEnabled = true;
}

// ─── Priority-ordered build plan per company type ──────
const BUILD_PRIORITIES = {
  digital_agency:  ['content', 'seo', 'breakroom', 'support', 'hr', 'design', 'sales', 'marketing', 'video', 'data', 'meeting', 'pr', 'finance', 'legal', 'it'],
  saas_startup:    ['engineering', 'breakroom', 'support', 'hr', 'design', 'content', 'sales', 'it', 'data', 'marketing', 'meeting', 'rd', 'finance', 'legal'],
  ecommerce:       ['sales', 'warehouse', 'breakroom', 'support', 'hr', 'design', 'content', 'marketing', 'pr', 'data', 'meeting', 'finance', 'it', 'legal'],
  creative_house:  ['design', 'content', 'breakroom', 'support', 'hr', 'video', 'seo', 'sales', 'pr', 'marketing', 'meeting', 'finance'],
  tech_lab:        ['engineering', 'data', 'breakroom', 'hr', 'design', 'support', 'sales', 'it', 'marketing', 'meeting', 'rd', 'finance', 'legal'],
  maker_co:        ['workshop', 'warehouse', 'breakroom', 'hr', 'engineering', 'design', 'sales', 'support', 'rd', 'meeting', 'finance', 'legal', 'it'],
  consulting_firm: ['data', 'content', 'breakroom', 'support', 'hr', 'engineering', 'sales', 'pr', 'marketing', 'meeting', 'finance', 'legal', 'it'],
  staffing_agency: ['hr', 'support', 'sales', 'breakroom', 'content', 'marketing', 'pr', 'data', 'meeting', 'finance', 'legal', 'it'],
  fashion_retail:  ['shopfront', 'warehouse', 'design', 'breakroom', 'hr', 'sales', 'marketing', 'support', 'pr', 'content', 'meeting', 'finance', 'legal', 'it'],
};

// Maps office types to the agent role key needed
const OFFICE_TO_ROLE = {};
for (const [roleKey, roleDef] of Object.entries(AGENT_ROLES)) {
  if (roleKey === 'ceo') continue;
  OFFICE_TO_ROLE[roleDef.office] = roleKey;
}

// ─── Main AI tick (called from game loop) ───────────────
export function aiCeoTick(dt) {
  if (!aiEnabled || G.gameOver) return;

  // Handle event modals even when paused
  if (G.activeEvent) {
    aiTickTimer += 1;
    if (aiTickTimer > 60) {
      aiTickTimer = 0;
      handleEventModal();
    }
    return;
  }

  aiTickTimer += dt;
  if (aiTickTimer < AI_THINK_INTERVAL) return;
  aiTickTimer = 0;

  if (G.teamBuildingActive) return;

  // Priority order of decisions
  if (handleRaises()) return;
  if (handleTeamBuilding()) return;
  if (handleEquipment()) return;
  if (handleExpansions()) return;
  if (handleBuilding()) return;
  if (handleHiring()) return;
  if (handleTechTree()) return;
  if (handleLoan()) return;
}

// ─── Handle event modals (auto-pick first/best choice) ──
function handleEventModal() {
  if (!G.activeEvent) return false;

  const choicesEl = document.getElementById('event-choices');
  if (choicesEl) {
    const firstBtn = choicesEl.querySelector('.event-choice-btn');
    if (firstBtn) {
      firstBtn.click();
      return true;
    }
  }

  // Fallback: manually resolve
  const event = G.activeEvent;
  if (event.choices && event.choices.length > 0) {
    const choice = event.choices[0];
    choice.effect();
    const toast = typeof choice.toast === 'function' ? choice.toast() : choice.toast;
    showToast(`🤖 ${toast}`);
    G.activeEvent = null;
    G.gameSpeed = G.preEventSpeed || 2;
    const modal = document.getElementById('event-modal');
    if (modal) modal.style.display = 'none';
    G.uiDirty = true;
    return true;
  }
  return false;
}

// ─── Handle pending raises ──────────────────────────────
function handleRaises() {
  for (const a of G.agents) {
    if (a.wantsRaise && a.roleKey !== 'ceo') {
      const currentSalary = a.salary ?? AGENT_SALARY[a.roleKey] ?? 70;
      const newSalary = a.expectedSalary;
      if (G.money > newSalary * 14) {
        a.salary = newSalary;
        a.wantsRaise = false;
        a.raiseDeadline = 0;
        a.motivation = Math.min(1.0, a.motivation + 0.3);
        showToast(`🤖 AI CEO gave ${a.name} a raise: $${currentSalary} → $${newSalary}/day`);
        return true;
      }
    }
  }
  return false;
}

// ─── Team building when alignment is low ────────────────
function handleTeamBuilding() {
  if (!G.ceo) return false;
  const nonCeo = G.agents.filter(a => a.roleKey !== 'ceo');
  if (nonCeo.length < 2) return false;

  const avgAlignment = nonCeo.reduce((s, a) => s + a.alignment, 0) / nonCeo.length;
  if (avgAlignment < 0.35 && countRoomsByType('meeting') > 0) {
    return startTeamBuilding();
  }
  return false;
}

// ─── Equipment/config optimization ──────────────────────
function handleEquipment() {
  let changed = false;

  if (G.equipmentConfig.coffee_quality === 'instant' && G.money > 3000 && countRoomsByType('breakroom') > 0) {
    G.equipmentConfig.coffee_quality = 'espresso';
    showToast('🤖 AI CEO upgraded to espresso machine!');
    changed = true;
  }

  if (G.equipmentConfig.content_style === 'longform' && G.totalRevenue < 10000 && countRoomsByType('content') > 0) {
    G.equipmentConfig.content_style = 'viral';
    changed = true;
  }

  if (G.equipmentConfig.sales_pricing === 'standard' && G.reputation > 60 && countRoomsByType('sales') > 0) {
    G.equipmentConfig.sales_pricing = 'premium';
    showToast('🤖 AI CEO switched to premium pricing!');
    changed = true;
  }

  // Fashion store: start with discount pricing for volume, switch to standard once reputation is high
  if (countRoomsByType('shopfront') > 0 && G.equipmentConfig.pricing_strategy !== undefined) {
    if (G.equipmentConfig.pricing_strategy === 'standard' && G.reputation < 50) {
      G.equipmentConfig.pricing_strategy = 'discount';
      showToast('🤖 AI CEO set discount pricing for more foot traffic!');
      changed = true;
    } else if (G.equipmentConfig.pricing_strategy === 'discount' && G.reputation > 65) {
      G.equipmentConfig.pricing_strategy = 'standard';
      showToast('🤖 AI CEO switched to standard pricing — reputation is strong!');
      changed = true;
    } else if (G.equipmentConfig.pricing_strategy === 'standard' && G.reputation > 80 && G.totalRevenue > 30000) {
      G.equipmentConfig.pricing_strategy = 'premium';
      showToast('🤖 AI CEO switched to premium pricing — fashion brand established!');
      changed = true;
    }
  }

  if (G.equipmentConfig.seo_focus === 'content' && G.totalRevenue > 20000) {
    G.equipmentConfig.seo_focus = 'technical';
    changed = true;
  }

  if (G.equipmentConfig.perks_package === 'none' && G.agents.length >= 4 && G.money > 5000) {
    G.equipmentConfig.perks_package = 'basic';
    changed = true;
  }
  if (G.equipmentConfig.perks_package === 'basic' && G.agents.length >= 8 && G.money > 15000) {
    G.equipmentConfig.perks_package = 'premium';
    changed = true;
  }

  if (G.equipmentConfig.workspace_quality === 'basic' && G.agents.length >= 5 && G.money > 8000) {
    G.equipmentConfig.workspace_quality = 'ergonomic';
    changed = true;
  }

  if (G.equipmentConfig.marketing_spend === 'standard' && G.totalRevenue > 30000 && G.money > 10000 && countRoomsByType('marketing') > 0) {
    G.equipmentConfig.marketing_spend = 'aggressive';
    changed = true;
  }

  return changed;
}

// ═══════════════════════════════════════════════════════════════
//  SPATIAL INTELLIGENCE — The smart part
// ═══════════════════════════════════════════════════════════════

// Count how many free (empty + on-floor) tiles exist
function countFreeTiles() {
  const tileMap = getTileMap();
  let count = 0;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileMap[y][x] === 0 && isOnFloor(x, y)) count++;
    }
  }
  return count;
}

// Check if a rectangle of free tiles exists at position (for future room fit)
// Count how many 7x5 rooms could still be placed after hypothetically
// placing a room at (rx, ry, w, h). This prevents greedy placements
// that block future rooms.
function countFutureSlots(rx, ry, rw, rh) {
  const tileMap = getTileMap();

  // Temporarily mark the tiles as occupied
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const mx = rx + dx, my = ry + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
        tileMap[my][mx] = 99; // temp marker
      }
    }
  }

  // Scan for 7x5 slots that could still be placed
  let slots = 0;
  const checked = new Set();
  for (let y = 0; y < MAP_H - 4; y += 3) { // stride=3 for speed
    for (let x = 0; x < MAP_W - 6; x += 3) {
      const key = `${x},${y}`;
      if (checked.has(key)) continue;
      checked.add(key);
      let fits = true;
      outer: for (let dy = 0; dy < 5; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const mx = x + dx, my = y + dy;
          if (mx >= MAP_W || my >= MAP_H) { fits = false; break outer; }
          if (tileMap[my][mx] !== 0) { fits = false; break outer; }
          if (!isOnFloor(mx, my)) { fits = false; break outer; }
        }
      }
      if (fits) slots++;
    }
  }

  // Restore tiles
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const mx = rx + dx, my = ry + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
        tileMap[my][mx] = 0;
      }
    }
  }

  return slots;
}

// ─── Buy land expansions PROACTIVELY ────────────────────
function handleExpansions() {
  const freeTiles = countFreeTiles();
  const builtRoomCount = getRoomInstances().filter(r => r.typeKey !== 'lobby').length;

  // Proactive: buy expansion when free space is getting tight
  // A typical room is 7x5=35 tiles, so we want at least 3-4 rooms worth of space
  const needsSpace = freeTiles < 180 && builtRoomCount >= 2;
  // Also expand if we simply have money and are growing
  const wantsGrowth = freeTiles < 300 && G.totalRevenue > 8000;

  if (!needsSpace && !wantsGrowth) return false;

  const expansions = getAllExpansions();
  // Sort by cost (cheapest first) to expand efficiently
  const available = expansions
    .filter(exp => !isExpansionPurchased(exp.id) && isExpansionAvailable(exp))
    .sort((a, b) => a.cost - b.cost);

  for (const exp of available) {
    // AI CEO cheats a little — gets a 50% discount on land
    const aiCost = Math.round(exp.cost * 0.5);
    const canAfford = G.money >= aiCost + 1000;
    if (canAfford) {
      const cost = aiCost;
      G.money -= cost;
      purchaseExpansion(exp.id);

      // Build a MINIMAL corridor spine through the new land
      // Just a 2-wide horizontal corridor at the vertical center
      const midY = exp.y + Math.floor(exp.h / 2);
      for (let x = exp.x; x < exp.x + exp.w; x++) {
        addCorridor(x, midY);
        addCorridor(x, midY - 1);
      }

      // Connect to existing corridors: vertical connector at the seam
      const tileMap = getTileMap();
      const seamX = exp.x; // left edge of expansion
      // Paint a vertical 2-wide corridor from the expansion spine to the nearest existing corridor
      for (let searchDir = -1; searchDir <= 1; searchDir += 2) {
        for (let y = midY; y >= exp.y && y < exp.y + exp.h; y += searchDir) {
          if (tileMap[y]?.[seamX - 1] === 1 || tileMap[y]?.[seamX - 2] === 1) break; // reached existing corridor
          if (isOnFloor(seamX, y) && tileMap[y][seamX] === 0) addCorridor(seamX, y);
          if (isOnFloor(seamX + 1, y) && tileMap[y][seamX + 1] === 0) addCorridor(seamX + 1, y);
        }
      }

      showToast(`🤖 AI CEO expanded: ${exp.name}! -$${cost.toLocaleString()} (50% off)`);
      corridorBudgetUsed = 0;
      return true;
    }
  }
  return false;
}

// ─── Smart room placement ───────────────────────────────
// Key insight: place rooms in a GRID pattern along corridors,
// leaving consistent gaps for future rooms. Never scatter randomly.

function findRoomPlacement(w, h) {
  const plan = getActivePlan();
  const corridorY = plan?.corridorY || 22;
  const corridorXStart = plan?.corridorX?.[0] || 6;
  const corridorXEnd = plan?.corridorX?.[1] || 30;
  const centerX = (corridorXStart + corridorXEnd) / 2;

  const candidates = [];

  for (let y = 0; y < MAP_H - h; y++) {
    for (let x = 0; x < MAP_W - w; x++) {
      if (!canPlaceRoom(x, y, w, h)) continue;

      // Score the placement
      let score = 0;

      // Prefer positions close to the main corridor (vertically)
      const vertDist = Math.abs(y + h / 2 - corridorY);
      score -= vertDist * 3;

      // Prefer positions close to center (horizontally)
      const horizDist = Math.abs(x + w / 2 - centerX);
      score -= horizDist * 1;

      // CRITICAL: Penalize placements that block future rooms
      // Check how many 7x5 slots remain after this placement
      const futureSlots = countFutureSlots(x, y, w, h);
      score += futureSlots * 20; // heavily reward preserving space

      // Prefer placing on one side of the corridor (alternating above/below)
      // This creates a neat row layout
      const builtAbove = getRoomInstances().filter(r => r.y + r.h / 2 < corridorY).length;
      const builtBelow = getRoomInstances().filter(r => r.y + r.h / 2 > corridorY).length;
      if (y + h / 2 < corridorY && builtAbove <= builtBelow) score += 10;
      if (y + h / 2 > corridorY && builtBelow <= builtAbove) score += 10;

      // Bonus: align with existing room edges (creates neat grid)
      for (const room of getRoomInstances()) {
        if (x === room.x || x === room.x + room.w) score += 5;
        if (y === room.y || y === room.y + room.h) score += 5;
      }

      candidates.push({ x, y, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

// ─── Build next room ────────────────────────────────────
function handleBuilding() {
  if (G.gameTick - lastBuildAttemptTick < AI_MIN_ACTION_GAP) return false;

  const companyType = G.companyType || 'digital_agency';
  const buildOrder = BUILD_PRIORITIES[companyType] || BUILD_PRIORITIES.digital_agency;

  // Check remaining space BEFORE building — if tight, try to expand first
  const freeTiles = countFreeTiles();
  if (freeTiles < 60) {
    // Almost no space — don't build, expansion handler will trigger
    return false;
  }

  // Fashion retail: build extra shopfronts in mid-game (revenue rooms scale walk-in income)
  const isFashion = companyType === 'fashion_retail';
  const shopfrontCount = isFashion ? countRoomsByType('shopfront') : 0;
  const wantsMoreShopfronts = isFashion && shopfrontCount < 3 && shopfrontCount >= 1 && G.totalRevenue > 8000;

  for (const roomKey of buildOrder) {
    const existing = countRoomsByType(roomKey);
    // Allow duplicates only for fashion shopfronts mid-game
    if (existing > 0 && !(roomKey === 'shopfront' && wantsMoreShopfronts)) continue;
    if (!isOfficeAvailable(roomKey)) continue;

    const unlock = getRoomUnlockState(roomKey);
    if (!unlock.unlocked) continue;

    const def = getRoomDef(roomKey);
    if (!def) continue;
    const cost = def.cost || 1000;

    const reserve = Math.max(2000, G.metrics.dailyCosts * 3);
    if (G.money < cost + reserve) continue;

    const w = def.size?.w || 7;
    const h = def.size?.h || 5;
    const pos = findRoomPlacement(w, h);

    if (pos) {
      G.money -= cost;
      const room = placeRoom(roomKey, pos.x, pos.y, w, h);
      if (room) {
        connectRoomToCorridor(room);
        ensureRoomReachable(room);
        sfxBuild();
        showToast(`🤖 AI CEO built ${def.icon} ${def.name}! -$${cost.toLocaleString()}`);
        lastBuildAttemptTick = G.gameTick;
        G.uiDirty = true;
        return true;
      } else {
        G.money += cost;
      }
    } else {
      lastBuildAttemptTick = G.gameTick;
      // Can't place — need a corridor branch, but be SURGICAL about it
      if (freeTiles > 100) {
        extendCorridorBranch();
      }
      // If freeTiles is low, the expansion handler will deal with it
    }
  }
  return false;
}

// ─── Surgical corridor extension ────────────────────────
// Instead of flooding, paint ONE targeted branch to open up a new zone
function extendCorridorBranch() {
  // Limit total corridor painting to prevent flooding
  if (corridorBudgetUsed > 20) return;

  const tileMap = getTileMap();
  const plan = getActivePlan();
  const corridorY = plan?.corridorY || 22;

  // Find the endpoints of existing corridors and extend them in ONE direction
  // Strategy: find corridor tiles that have open floor space behind them
  // and extend a 2-wide branch perpendicular to the main corridor

  // Collect corridor edge tiles (tiles adjacent to empty floor)
  const edges = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileMap[y][x] !== 1) continue;

      // Check each direction for a buildable zone
      for (const [dx, dy, dir] of [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']]) {
        // Look 2-8 tiles ahead — is there a large open zone?
        let openCount = 0;
        for (let step = 1; step <= 8; step++) {
          const nx = x + dx * step, ny = y + dy * step;
          if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) break;
          if (!isOnFloor(nx, ny)) break;
          if (tileMap[ny][nx] === 0) openCount++;
          else break; // hit something
        }
        if (openCount >= 5) {
          // There's a large open zone — this is a good branch direction
          // Score by how much room-space it opens up
          edges.push({ x, y, dx, dy, dir, openCount });
        }
      }
    }
  }

  if (edges.length === 0) return;

  // Pick the branch that opens up the most space
  edges.sort((a, b) => b.openCount - a.openCount);
  const best = edges[0];

  // Paint a 2-wide branch (4-6 tiles long, not more)
  const branchLen = Math.min(6, best.openCount);
  let painted = 0;
  for (let step = 1; step <= branchLen; step++) {
    const nx = best.x + best.dx * step;
    const ny = best.y + best.dy * step;
    if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && tileMap[ny][nx] === 0 && isOnFloor(nx, ny)) {
      addCorridor(nx, ny);
      painted++;

      // Paint parallel tile for 2-wide corridor
      let px, py;
      if (best.dx === 0) { // vertical branch — make it 2-wide horizontally
        px = nx + 1; py = ny;
      } else { // horizontal branch — make it 2-wide vertically
        px = nx; py = ny - 1;
      }
      if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H && tileMap[py][px] === 0 && isOnFloor(px, py)) {
        addCorridor(px, py);
        painted++;
      }
    }
  }

  corridorBudgetUsed += painted;
}

// ─── Ensure room is reachable from lobby via corridors ──
// After placing a room, verify A* can path from lobby to the new room.
// If not, build a corridor path to connect them.
function ensureRoomReachable(room) {
  const lobby = findRoomByType('lobby');
  if (!lobby) return;

  // Get a walkable lobby tile as the origin
  const lobbyDoor = lobby.doors?.[0];
  if (!lobbyDoor) return;

  // Check if any of the new room's doors are reachable from lobby
  const walkableMap = getWalkable();
  const roomDoors = room.doors || [];

  for (const door of roomDoors) {
    const path = findPath(walkableMap, lobbyDoor.x, lobbyDoor.y, door.x, door.y);
    if (path) return; // already reachable, nothing to do
  }

  // Room is NOT reachable — we need to build a corridor path.
  // Strategy: BFS on floor tiles from the room's adjacent corridor tiles
  // toward any tile that IS reachable from the lobby.
  // Then paint corridors along that path.

  // Step 1: Find corridor tiles adjacent to the new room
  const tileMap = getTileMap();
  const roomCorridors = [];
  for (let dy = -1; dy <= room.h; dy++) {
    for (let dx = -1; dx <= room.w; dx++) {
      if (dx >= 0 && dx < room.w && dy >= 0 && dy < room.h) continue;
      const mx = room.x + dx, my = room.y + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H && tileMap[my][mx] === 1) {
        roomCorridors.push({ x: mx, y: my });
      }
    }
  }
  if (roomCorridors.length === 0) return;

  // Step 2: Find all tiles reachable from lobby (flood fill on walkable)
  const reachable = new Set();
  const queue = [{ x: lobbyDoor.x, y: lobbyDoor.y }];
  reachable.add(`${lobbyDoor.x},${lobbyDoor.y}`);
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + ddx, ny = cur.y + ddy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && !reachable.has(key) && walkableMap[ny][nx]) {
        reachable.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  // Step 3: BFS from room's corridor tiles through empty floor tiles
  // to find shortest path to any reachable tile
  const visited = new Map(); // key -> parent key
  const bfsQueue = [];
  for (const rc of roomCorridors) {
    const key = `${rc.x},${rc.y}`;
    visited.set(key, null);
    // If this corridor tile is already reachable, room IS connected (edge case)
    if (reachable.has(key)) return;
    bfsQueue.push(rc);
  }

  let target = null;
  while (bfsQueue.length > 0) {
    const cur = bfsQueue.shift();
    for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + ddx, ny = cur.y + ddy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
      if (visited.has(key)) continue;
      if (!isOnFloor(nx, ny)) continue;

      // Can traverse empty tiles or existing corridors
      const tile = tileMap[ny][nx];
      if (tile !== 0 && tile !== 1) continue;

      visited.set(key, `${cur.x},${cur.y}`);

      // Did we reach the connected network?
      if (reachable.has(key)) {
        target = { x: nx, y: ny };
        break;
      }
      bfsQueue.push({ x: nx, y: ny });
    }
    if (target) break;
  }

  if (!target) return; // couldn't find a path (shouldn't happen on valid floor)

  // Step 4: Trace back the path and paint corridors
  let key = `${target.x},${target.y}`;
  let painted = 0;
  while (key) {
    const [px, py] = key.split(',').map(Number);
    if (tileMap[py][px] === 0) {
      addCorridor(px, py);
      painted++;
    }
    key = visited.get(key);
  }

  if (painted > 0) {
    showToast(`🤖 AI CEO built ${painted} corridor tiles to connect the new room.`);
  }
}

// ─── Hire agents for offices that need staff ────────────
function handleHiring() {
  if (G.money < 2000) return false;

  const companyType = G.companyType || 'digital_agency';
  const buildOrder = BUILD_PRIORITIES[companyType] || BUILD_PRIORITIES.digital_agency;
  const builtRooms = new Set(getRoomInstances().filter(r => r.constructionProgress >= 1).map(r => r.typeKey));

  const totalAgents = G.agents.filter(a => a.roleKey !== 'ceo').length;
  const isFounderMode = totalAgents < 3;
  const maxAgents = isFounderMode ? 3 : Math.max(3, Math.floor(G.totalRevenue / 3000) + 2);
  if (totalAgents >= maxAgents) return false;

  for (const roomKey of buildOrder) {
    if (!builtRooms.has(roomKey)) continue;
    if (roomKey === 'lobby' || roomKey === 'breakroom' || roomKey === 'meeting') continue;

    const roleKey = OFFICE_TO_ROLE[roomKey];
    if (!roleKey) continue;

    const staffCount = G.agents.filter(a => a.role.office === roomKey).length;
    const needsStaff = staffCount === 0;
    // Fashion shopfronts: hire up to 3 shop assistants aggressively (walk-in revenue scales with min(assistants, 3))
    const isFashionShop = roomKey === 'shopfront' && G.companyType === 'fashion_retail';
    const maxShopStaff = isFashionShop ? Math.min(3, countRoomsByType('shopfront') * 2) : 2;
    const needsMore = isFashionShop
      ? staffCount < maxShopStaff && G.totalRevenue > 3000 * staffCount
      : staffCount === 1 && totalAgents >= 5 && G.totalRevenue > 15000;
    if (!needsStaff && !needsMore) continue;

    let candidates = getCandidatesForRole(roleKey);
    if (candidates.length === 0) {
      rollCandidatesForRole(roleKey, 3);
      candidates = getCandidatesForRole(roleKey);
    }

    if (candidates.length > 0) {
      const bestCandidate = candidates.reduce((best, c) => {
        const score = c.efficiency * 100 - c.salary * 0.5;
        const bestScore = best.efficiency * 100 - best.salary * 0.5;
        return score > bestScore ? c : best;
      });

      const totalCost = bestCandidate.signingCost + bestCandidate.salary * 7;
      if (G.money > totalCost + 1500) {
        const hired = hireAgent(roleKey, bestCandidate);
        if (hired) {
          const pool = getCandidatesForRole(roleKey);
          const idx = pool.findIndex(c => c.id === bestCandidate.id);
          if (idx >= 0) pool.splice(idx, 1);
          return true;
        }
      }
    }
  }

  return false;
}

// ─── Tech tree branch selection ─────────────────────────
function handleTechTree() {
  if (G.techTreeBranches.length >= 2) return false;

  const preferred = G.techTreeBranches.length === 0
    ? ['specialize', 'scale_ops', 'diversify_branch']
    : ['scale_ops', 'specialize', 'diversify_branch'];

  for (const branch of preferred) {
    if (G.techTreeBranches.includes(branch)) continue;
    if (chooseTechBranch(branch)) {
      showToast(`🤖 AI CEO chose tech branch: ${branch}!`);
      return true;
    }
  }
  return false;
}

// ─── Auto-take loans when needed ────────────────────────
function handleLoan() {
  if (G.money < 500 && G.money > -2000 && G.projects.length > 0 && G.loanCount < 3) {
    const loanAmount = 5000;
    G.takeLoan(loanAmount);
    showToast(`🤖 AI CEO took a $${loanAmount.toLocaleString()} loan to stay afloat.`);
    return true;
  }
  return false;
}
