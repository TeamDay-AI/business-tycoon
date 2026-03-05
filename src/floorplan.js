// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Floor Plans (base layouts that limit placement)
// ═══════════════════════════════════════════════════════════════

import { MAP_W, MAP_H } from './config.js';

// Floor plan = startRegions (free) + expansions (purchasable)
// Each plan specifies corridor and lobby placement

const FLOOR_PLANS = {
  l_shape: {
    name: 'L-Shape Office',
    startRegions: [
      { x: 5, y: 15, w: 16, h: 18 },
    ],
    expansions: [
      { id: 'l_top',   name: 'North Wing',   x: 5,  y: 5,  w: 16, h: 10, cost: 2000 },
      { id: 'l_right', name: 'East Wing',     x: 21, y: 17, w: 18, h: 16, cost: 3000 },
      { id: 'l_far',   name: 'Far East Wing', x: 21, y: 5,  w: 18, h: 12, cost: 4000, requires: 'l_right' },
    ],
    corridorY: 22,
    corridorX: [6, 20],
    lobbyPos: { x: 10, y: 23 },
  },
  h_shape: {
    name: 'H-Shape Complex',
    startRegions: [
      { x: 3, y: 12, w: 16, h: 20 },
      { x: 19, y: 18, w: 12, h: 10 },
    ],
    expansions: [
      { id: 'h_right', name: 'East Block',    x: 31, y: 12, w: 16, h: 20, cost: 3000 },
      { id: 'h_ltop',  name: 'North-West',    x: 3,  y: 4,  w: 16, h: 8,  cost: 2000 },
      { id: 'h_rtop',  name: 'North-East',    x: 31, y: 4,  w: 16, h: 8,  cost: 2500, requires: 'h_right' },
      { id: 'h_lbot',  name: 'South-West',    x: 3,  y: 32, w: 16, h: 6,  cost: 1500 },
      { id: 'h_rbot',  name: 'South-East',    x: 31, y: 32, w: 16, h: 6,  cost: 1500, requires: 'h_right' },
    ],
    corridorY: 22,
    corridorX: [4, 30],
    lobbyPos: { x: 22, y: 23 },
    extraCorridors: [
      { y: 12, x1: 4, x2: 18 },
    ],
  },
  t_shape: {
    name: 'T-Shape Tower',
    startRegions: [
      { x: 2, y: 5, w: 44, h: 14 },
    ],
    expansions: [
      { id: 't_stem',  name: 'South Stem',    x: 12, y: 19, w: 24, h: 12, cost: 2500 },
      { id: 't_deep',  name: 'Deep South',    x: 12, y: 31, w: 24, h: 8,  cost: 2000, requires: 't_stem' },
    ],
    corridorY: 11,
    corridorX: [3, 45],
    lobbyPos: { x: 20, y: 8 },
  },
  u_shape: {
    name: 'U-Shape Campus',
    startRegions: [
      { x: 3, y: 14, w: 16, h: 22 },
    ],
    expansions: [
      { id: 'u_right',  name: 'East Block',    x: 31, y: 14, w: 16, h: 22, cost: 3000 },
      { id: 'u_bridge', name: 'South Bridge',  x: 19, y: 28, w: 12, h: 8,  cost: 2000 },
      { id: 'u_ltop',   name: 'North-West',    x: 3,  y: 4,  w: 16, h: 10, cost: 2000 },
      { id: 'u_rtop',   name: 'North-East',    x: 31, y: 4,  w: 16, h: 10, cost: 2500, requires: 'u_right' },
    ],
    corridorY: 22,
    corridorX: [4, 18],
    lobbyPos: { x: 7, y: 23 },
  },
  cross: {
    name: 'Cross HQ',
    startRegions: [
      { x: 15, y: 12, w: 18, h: 18 },
    ],
    expansions: [
      { id: 'c_left',  name: 'West Wing',     x: 3,  y: 15, w: 12, h: 12, cost: 2500 },
      { id: 'c_right', name: 'East Wing',     x: 33, y: 15, w: 12, h: 12, cost: 2500 },
      { id: 'c_top',   name: 'North Tower',   x: 15, y: 2,  w: 18, h: 10, cost: 2000 },
      { id: 'c_bot',   name: 'South Tower',   x: 15, y: 30, w: 18, h: 10, cost: 2000 },
    ],
    corridorY: 22,
    corridorX: [16, 32],
    lobbyPos: { x: 21, y: 23 },
  },
  wide: {
    name: 'Open Floor',
    startRegions: [
      { x: 8, y: 12, w: 32, h: 18 },
    ],
    expansions: [
      { id: 'w_left',  name: 'West Extension',  x: 2,  y: 12, w: 6,  h: 18, cost: 1500 },
      { id: 'w_right', name: 'East Extension',  x: 40, y: 12, w: 6,  h: 18, cost: 1500 },
      { id: 'w_top',   name: 'North Floor',     x: 8,  y: 4,  w: 32, h: 8,  cost: 2000 },
      { id: 'w_bot',   name: 'South Floor',     x: 8,  y: 30, w: 32, h: 8,  cost: 2000 },
    ],
    corridorY: 22,
    corridorX: [9, 39],
    lobbyPos: { x: 20, y: 23 },
  },
};

// Current active floor plan
let floorMask = null; // 2D boolean array [y][x]
let activePlan = null;
let purchasedExpansions = new Set();

export function initFloorPlan(planKey) {
  const plan = FLOOR_PLANS[planKey];
  if (!plan) return null;

  activePlan = plan;
  purchasedExpansions = new Set();

  // Build mask from start regions only
  floorMask = [];
  for (let y = 0; y < MAP_H; y++) {
    floorMask[y] = new Array(MAP_W).fill(false);
  }

  for (const r of plan.startRegions) {
    stampRegion(r);
  }

  return plan;
}

function stampRegion(r) {
  for (let dy = 0; dy < r.h; dy++) {
    for (let dx = 0; dx < r.w; dx++) {
      const mx = r.x + dx, my = r.y + dy;
      if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
        floorMask[my][mx] = true;
      }
    }
  }
}

export function purchaseExpansion(expansionId) {
  if (!activePlan) return false;
  const exp = activePlan.expansions?.find(e => e.id === expansionId);
  if (!exp || purchasedExpansions.has(expansionId)) return false;

  purchasedExpansions.add(expansionId);
  stampRegion(exp);
  return true;
}

export function isExpansionAvailable(exp) {
  if (purchasedExpansions.has(exp.id)) return false;
  if (exp.requires && !purchasedExpansions.has(exp.requires)) return false;
  return true;
}

export function isExpansionPurchased(expansionId) {
  return purchasedExpansions.has(expansionId);
}

export function getAvailableExpansions() {
  if (!activePlan?.expansions) return [];
  return activePlan.expansions.filter(e => isExpansionAvailable(e));
}

export function getAllExpansions() {
  return activePlan?.expansions || [];
}

export function isOnFloor(x, y) {
  if (!floorMask) return true; // No plan = everything allowed
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
  return floorMask[y][x];
}

export function getFloorMask() { return floorMask; }
export function getActivePlan() { return activePlan; }

export function getFloorPlanKeys() {
  return Object.keys(FLOOR_PLANS);
}

export function getFloorPlanName(key) {
  return FLOOR_PLANS[key]?.name || key;
}

export function pickRandomPlan() {
  const keys = Object.keys(FLOOR_PLANS);
  return keys[Math.floor(Math.random() * keys.length)];
}
