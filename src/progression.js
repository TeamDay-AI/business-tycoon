// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Progressive Office Unlocks (Tech Tree)
//  Company-type-aware unlock rules
// ═══════════════════════════════════════════════════════════════

import { OFFICE_TYPES, COMMON_ROOMS, COMPANY_TYPES, DIVERSIFICATION_CONFIG, COMPANY_OFFICE_ROLES } from './config.js';
import { countRoomsByType, getRoomInstances } from './map.js';
import { G } from './game.js';

// ─── Per-company-type tech trees ─────────────────────────
const TECH_TREES = {
  digital_agency: {
    lobby:     { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    seo:       { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    content:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:        { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    design:    { tier: 2, requirement: 'Reach $4,000 revenue', check: () => G.totalRevenue >= 4000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/4,000 rev` },
    sales:     { tier: 2, requirement: 'Reach $6,000 revenue', check: () => G.totalRevenue >= 6000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/6,000 rev` },
    video:     { tier: 3, requirement: 'Build Content + Design, $15K revenue', check: () => countRoomsByType('content') > 0 && countRoomsByType('design') > 0 && G.totalRevenue >= 15000, progress: () => `Content ${countRoomsByType('content') > 0 ? '✓' : '✗'} · Design ${countRoomsByType('design') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/15K` },
    marketing: { tier: 3, requirement: 'Reach $10,000 revenue', check: () => G.totalRevenue >= 10000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/10,000 rev` },
    data:      { tier: 4, requirement: 'Week 3 and $25K revenue', check: () => G.week >= 3 && G.totalRevenue >= 25000, progress: () => `Week ${G.week}/3 · ${Math.round(G.totalRevenue).toLocaleString()}/25K` },
    pr:        { tier: 4, requirement: 'Reach $20,000 revenue', check: () => G.totalRevenue >= 20000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/20,000 rev` },
    meeting:   { tier: 5, requirement: 'Data Lab + 4 agents', check: () => countRoomsByType('data') > 0 && G.agents.length >= 4, progress: () => `Data Lab ${countRoomsByType('data') > 0 ? '✓' : '✗'} · ${G.agents.length}/4 agents` },
    finance:   { tier: 6, requirement: 'Reach $50,000 revenue', check: () => G.totalRevenue >= 50000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/50K` },
    legal:     { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    it:        { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  saas_startup: {
    lobby:       { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    engineering: { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:     { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:          { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    design:      { tier: 2, requirement: 'Reach $4,000 revenue', check: () => G.totalRevenue >= 4000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/4K` },
    content:     { tier: 2, requirement: 'Reach $6,000 revenue', check: () => G.totalRevenue >= 6000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/6K` },
    sales:       { tier: 3, requirement: 'Build Design, $12K revenue', check: () => countRoomsByType('design') > 0 && G.totalRevenue >= 12000, progress: () => `Design ${countRoomsByType('design') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/12K` },
    it:          { tier: 3, requirement: 'Reach $15,000 revenue', check: () => G.totalRevenue >= 15000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/15K` },
    data:        { tier: 4, requirement: 'Week 3 and $25K revenue', check: () => G.week >= 3 && G.totalRevenue >= 25000, progress: () => `Week ${G.week}/3 · ${Math.round(G.totalRevenue).toLocaleString()}/25K` },
    marketing:   { tier: 4, requirement: 'Reach $20,000 revenue', check: () => G.totalRevenue >= 20000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/20K` },
    rd:          { tier: 5, requirement: 'Engineering + Data, $40K revenue', check: () => countRoomsByType('engineering') > 0 && countRoomsByType('data') > 0 && G.totalRevenue >= 40000, progress: () => `Engineering ${countRoomsByType('engineering') > 0 ? '✓' : '✗'} · Data ${countRoomsByType('data') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/40K` },
    meeting:     { tier: 5, requirement: '4 agents', check: () => G.agents.length >= 4, progress: () => `${G.agents.length}/4 agents` },
    finance:     { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    legal:       { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  ecommerce: {
    lobby:     { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    sales:     { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    warehouse: { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:        { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    design:    { tier: 2, requirement: 'Reach $4,000 revenue', check: () => G.totalRevenue >= 4000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/4K` },
    content:   { tier: 2, requirement: 'Reach $6,000 revenue', check: () => G.totalRevenue >= 6000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/6K` },
    marketing: { tier: 3, requirement: 'Reach $10,000 revenue', check: () => G.totalRevenue >= 10000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/10K` },
    pr:        { tier: 3, requirement: 'Reach $15,000 revenue', check: () => G.totalRevenue >= 15000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/15K` },
    data:      { tier: 4, requirement: 'Week 3 and $25K revenue', check: () => G.week >= 3 && G.totalRevenue >= 25000, progress: () => `Week ${G.week}/3 · ${Math.round(G.totalRevenue).toLocaleString()}/25K` },
    meeting:   { tier: 5, requirement: '4 agents', check: () => G.agents.length >= 4, progress: () => `${G.agents.length}/4 agents` },
    finance:   { tier: 6, requirement: 'Reach $50,000 revenue', check: () => G.totalRevenue >= 50000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/50K` },
    it:        { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    legal:     { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  creative_house: {
    lobby:     { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    design:    { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    content:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:        { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    video:     { tier: 2, requirement: 'Reach $5,000 revenue', check: () => G.totalRevenue >= 5000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/5K` },
    seo:       { tier: 2, requirement: 'Reach $8,000 revenue', check: () => G.totalRevenue >= 8000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/8K` },
    sales:     { tier: 3, requirement: 'Reach $12,000 revenue', check: () => G.totalRevenue >= 12000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/12K` },
    pr:        { tier: 3, requirement: 'Reach $15,000 revenue', check: () => G.totalRevenue >= 15000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/15K` },
    marketing: { tier: 4, requirement: 'Reach $25,000 revenue', check: () => G.totalRevenue >= 25000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/25K` },
    finance:   { tier: 6, requirement: 'Reach $50,000 revenue', check: () => G.totalRevenue >= 50000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/50K` },
  },
  tech_lab: {
    lobby:       { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    engineering: { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    data:        { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:          { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    design:      { tier: 2, requirement: 'Reach $5,000 revenue', check: () => G.totalRevenue >= 5000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/5K` },
    support:     { tier: 2, requirement: 'Reach $6,000 revenue', check: () => G.totalRevenue >= 6000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/6K` },
    sales:       { tier: 3, requirement: 'Reach $12,000 revenue', check: () => G.totalRevenue >= 12000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/12K` },
    it:          { tier: 3, requirement: 'Reach $15,000 revenue', check: () => G.totalRevenue >= 15000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/15K` },
    marketing:   { tier: 4, requirement: 'Reach $20,000 revenue', check: () => G.totalRevenue >= 20000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/20K` },
    rd:          { tier: 5, requirement: 'Engineering + Data, $40K revenue', check: () => countRoomsByType('engineering') > 0 && countRoomsByType('data') > 0 && G.totalRevenue >= 40000, progress: () => `Engineering ${countRoomsByType('engineering') > 0 ? '✓' : '✗'} · Data ${countRoomsByType('data') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/40K` },
    meeting:     { tier: 5, requirement: '4 agents', check: () => G.agents.length >= 4, progress: () => `${G.agents.length}/4 agents` },
    finance:     { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    legal:       { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  maker_co: {
    lobby:       { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    workshop:    { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    warehouse:   { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:          { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    engineering: { tier: 2, requirement: 'Reach $5,000 revenue', check: () => G.totalRevenue >= 5000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/5K` },
    design:      { tier: 2, requirement: 'Reach $6,000 revenue', check: () => G.totalRevenue >= 6000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/6K` },
    sales:       { tier: 3, requirement: 'Reach $12,000 revenue', check: () => G.totalRevenue >= 12000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/12K` },
    support:     { tier: 3, requirement: 'Reach $10,000 revenue', check: () => G.totalRevenue >= 10000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/10K` },
    rd:          { tier: 4, requirement: 'Workshop + Engineering, $30K revenue', check: () => countRoomsByType('workshop') > 0 && countRoomsByType('engineering') > 0 && G.totalRevenue >= 30000, progress: () => `Workshop ${countRoomsByType('workshop') > 0 ? '✓' : '✗'} · Engineering ${countRoomsByType('engineering') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/30K` },
    finance:     { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    legal:       { tier: 6, requirement: 'Reach $70,000 revenue', check: () => G.totalRevenue >= 70000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/70K` },
    it:          { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  consulting_firm: {
    lobby:       { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    data:        { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    content:     { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:     { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    hr:          { tier: 2, requirement: 'Reach $3,000 revenue', check: () => G.totalRevenue >= 3000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/3K` },
    engineering: { tier: 2, requirement: 'Reach $5,000 revenue', check: () => G.totalRevenue >= 5000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/5K` },
    sales:       { tier: 3, requirement: 'Reach $10,000 revenue', check: () => G.totalRevenue >= 10000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/10K` },
    pr:          { tier: 3, requirement: 'Reach $12,000 revenue', check: () => G.totalRevenue >= 12000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/12K` },
    marketing:   { tier: 4, requirement: 'Reach $20,000 revenue', check: () => G.totalRevenue >= 20000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/20K` },
    meeting:     { tier: 5, requirement: '4 agents', check: () => G.agents.length >= 4, progress: () => `${G.agents.length}/4 agents` },
    finance:     { tier: 6, requirement: 'Reach $50,000 revenue', check: () => G.totalRevenue >= 50000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/50K` },
    legal:       { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    it:          { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
  staffing_agency: {
    lobby:       { tier: 0, requirement: 'Start room', check: () => true, progress: () => 'Available' },
    hr:          { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    support:     { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    sales:       { tier: 1, requirement: 'Core office', check: () => true, progress: () => 'Available' },
    content:     { tier: 2, requirement: 'Reach $5,000 revenue', check: () => G.totalRevenue >= 5000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/5K` },
    marketing:   { tier: 3, requirement: 'Reach $10,000 revenue', check: () => G.totalRevenue >= 10000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/10K` },
    pr:          { tier: 3, requirement: 'Reach $8,000 revenue', check: () => G.totalRevenue >= 8000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/8K` },
    data:        { tier: 4, requirement: 'Reach $20,000 revenue', check: () => G.totalRevenue >= 20000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/20K` },
    meeting:     { tier: 5, requirement: '4 agents', check: () => G.agents.length >= 4, progress: () => `${G.agents.length}/4 agents` },
    finance:     { tier: 6, requirement: 'Reach $50,000 revenue', check: () => G.totalRevenue >= 50000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/50K` },
    legal:       { tier: 6, requirement: 'Reach $60,000 revenue', check: () => G.totalRevenue >= 60000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/60K` },
    it:          { tier: 6, requirement: 'Reach $80,000 revenue', check: () => G.totalRevenue >= 80000, progress: () => `${Math.round(G.totalRevenue).toLocaleString()}/80K` },
  },
};

// ─── Branch nodes (tier 4 choices) ──────────────────────
// Player picks one branch at tier 4. Can pick a second at tier 5 from remaining.
const BRANCH_NODES = {
  specialize: {
    name: 'Specialize',
    icon: '🎯',
    tier: 4,
    description: '+20% delivery pay, 2nd worker in core offices',
    cost: 30000,
    requirement: '3 delivery offices built',
    check: () => {
      if (G.totalRevenue < 30000) return false;
      const { delivery } = getDeliveryOfficesForCompany();
      return delivery.filter(k => countRoomsByType(k) > 0).length >= 3;
    },
    progress: () => {
      const { delivery } = getDeliveryOfficesForCompany();
      const built = delivery.filter(k => countRoomsByType(k) > 0).length;
      return `${built}/3 delivery · ${Math.round(G.totalRevenue).toLocaleString()}/30K`;
    },
    excludes: [],
  },
  diversify_branch: {
    name: 'Diversify',
    icon: '🔀',
    tier: 4,
    description: 'Unlock ability to flip offices to Delivery',
    cost: 25000,
    requirement: '5 rooms built',
    check: () => {
      if (G.totalRevenue < 25000) return false;
      return getRoomInstances().length >= 5;
    },
    progress: () => `${getRoomInstances().length}/5 rooms · ${Math.round(G.totalRevenue).toLocaleString()}/25K`,
    excludes: [],
  },
  scale_ops: {
    name: 'Scale Ops',
    icon: '📊',
    tier: 4,
    description: 'Finance/Legal/IT unlock at 50% revenue thresholds',
    cost: 20000,
    requirement: 'HR built',
    check: () => {
      if (G.totalRevenue < 20000) return false;
      return countRoomsByType('hr') > 0;
    },
    progress: () => `HR ${countRoomsByType('hr') > 0 ? '✓' : '✗'} · ${Math.round(G.totalRevenue).toLocaleString()}/20K`,
    excludes: [],
  },
};

// Set mutual exclusions: choosing one locks the other two at same tier
for (const key of Object.keys(BRANCH_NODES)) {
  BRANCH_NODES[key].excludes = Object.keys(BRANCH_NODES).filter(k => k !== key);
}

// Helper: get delivery offices for current company type (raw, without diversification)
function getDeliveryOfficesForCompany() {
  const typeKey = G.companyType || 'digital_agency';
  const roles = COMPANY_OFFICE_ROLES[typeKey];
  return roles || { delivery: [], growth: [], infrastructure: [] };
}

// Common rooms always use same rules regardless of company type
const COMMON_RULES = {
  breakroom: {
    tier: 1,
    requirement: 'Hire at least 1 agent',
    check: () => G.agents.length >= 1,
    progress: () => `${Math.min(G.agents.length, 1)}/1 agents`,
  },
  meeting: {
    tier: 5,
    requirement: '4 agents',
    check: () => G.agents.length >= 4,
    progress: () => `${G.agents.length}/4 agents`,
  },
};

function getRulesForCompanyType() {
  const typeKey = G.companyType || 'digital_agency';
  const tree = TECH_TREES[typeKey] || TECH_TREES.digital_agency;
  return { ...tree, ...COMMON_RULES };
}

function getHREarlyUnlockInfo() {
  const nonLobbyRooms = getRoomInstances().filter(r => r.typeKey !== 'lobby').length;
  const completedProjects = (G.completedLog || []).length;
  const revenueMet = G.totalRevenue >= 3000;
  const tractionMet = completedProjects >= 1;
  const footprintMet = nonLobbyRooms >= 2;
  return {
    unlocked: revenueMet || tractionMet || footprintMet,
    progress: `${Math.round(G.totalRevenue).toLocaleString()}/3,000 rev · ${Math.min(completedProjects, 1)}/1 projects · ${Math.min(nonLobbyRooms, 2)}/2 rooms`,
  };
}

function getRoomDef(typeKey) {
  return OFFICE_TYPES[typeKey] || COMMON_ROOMS[typeKey];
}

function ensureUnlockSet() {
  if (!G.unlockedRooms || !(G.unlockedRooms instanceof Set)) {
    G.unlockedRooms = new Set(['lobby']);
  }
  // Ensure start-unlocked rooms for company type
  const typeKey = G.companyType || 'digital_agency';
  const companyDef = COMPANY_TYPES[typeKey];
  if (companyDef) {
    for (const key of companyDef.startUnlocked) G.unlockedRooms.add(key);
  }
}

export function getRoomLabel(typeKey) {
  return getRoomDef(typeKey)?.name || typeKey;
}

export function syncRoomUnlocks() {
  ensureUnlockSet();
  const rules = getRulesForCompanyType();
  const newlyUnlocked = [];
  for (const [roomKey, rule] of Object.entries(rules)) {
    if (G.unlockedRooms.has(roomKey)) continue;
    if (roomKey === 'hr' && isOfficeAvailable('hr')) {
      const hrInfo = getHREarlyUnlockInfo();
      if (hrInfo.unlocked) {
        G.unlockedRooms.add(roomKey);
        newlyUnlocked.push(roomKey);
        continue;
      }
    }
    if (rule.check()) {
      G.unlockedRooms.add(roomKey);
      newlyUnlocked.push(roomKey);
    }
  }

  // Scale Ops branch: force-unlock finance/legal/it at halved thresholds
  if (hasScaleOpsBranch()) {
    const scaleOpsRooms = {
      finance: 25000,  // half of typical 50K
      legal:   30000,  // half of typical 60K
      it:      40000,  // half of typical 80K
    };
    for (const [roomKey, threshold] of Object.entries(scaleOpsRooms)) {
      if (!G.unlockedRooms.has(roomKey) && isOfficeAvailable(roomKey) && G.totalRevenue >= threshold) {
        G.unlockedRooms.add(roomKey);
        newlyUnlocked.push(roomKey);
      }
    }
  }

  return newlyUnlocked;
}

export function getRoomUnlockState(typeKey) {
  ensureUnlockSet();
  const rules = getRulesForCompanyType();
  const rule = rules[typeKey];
  if (!rule) {
    return {
      unlocked: true,
      tier: 1,
      requirement: 'No requirement',
      progress: 'Available',
    };
  }

  if (G.unlockedRooms.has(typeKey)) {
    return {
      unlocked: true,
      tier: rule.tier,
      requirement: rule.requirement,
      progress: 'Unlocked',
    };
  }

  if (typeKey === 'hr' && isOfficeAvailable('hr')) {
    const hrInfo = getHREarlyUnlockInfo();
    if (hrInfo.unlocked) {
      G.unlockedRooms.add('hr');
      return {
        unlocked: true,
        tier: rule.tier,
        requirement: 'Reach $3,000 revenue OR complete 1 project OR build 2 rooms',
        progress: 'Unlocked',
      };
    }
    return {
      unlocked: false,
      tier: rule.tier,
      requirement: 'Reach $3,000 revenue OR complete 1 project OR build 2 rooms',
      progress: hrInfo.progress,
    };
  }

  return {
    unlocked: false,
    tier: rule.tier,
    requirement: rule.requirement,
    progress: rule.progress(),
  };
}

export function getUnlockTree() {
  const rules = getRulesForCompanyType();
  const tree = [];
  for (const [roomKey, rule] of Object.entries(rules)) {
    const def = getRoomDef(roomKey);
    const state = getRoomUnlockState(roomKey);
    tree.push({
      key: roomKey,
      name: def?.name || roomKey,
      icon: def?.icon || '🏢',
      tier: rule.tier,
      unlocked: state.unlocked,
      requirement: state.requirement,
      progress: state.progress,
      type: 'room',
    });
  }

  // Add branch nodes
  const chosenBranches = new Set(G.techTreeBranches || []);
  const excludedByChosen = new Set();
  for (const chosen of chosenBranches) {
    const node = BRANCH_NODES[chosen];
    if (node) node.excludes.forEach(k => excludedByChosen.add(k));
  }

  for (const [key, node] of Object.entries(BRANCH_NODES)) {
    const chosen = chosenBranches.has(key);
    const excluded = excludedByChosen.has(key) && !chosen;
    // Allow second pick if only 1 branch chosen (tier 5 pick from remaining)
    const canPickSecond = chosenBranches.size === 1 && !chosen && !excluded;
    const effectiveTier = canPickSecond ? 5 : node.tier;

    tree.push({
      key,
      name: node.name,
      icon: node.icon,
      tier: effectiveTier,
      unlocked: chosen,
      excluded,
      requirement: node.description,
      progress: chosen ? 'Chosen' : excluded ? 'Locked' : node.progress(),
      type: 'branch',
      canChoose: !chosen && !excluded && node.check(),
      cost: node.cost,
    });
  }

  return tree.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

// Choose a tech tree branch
export function chooseTechBranch(key) {
  const node = BRANCH_NODES[key];
  if (!node) return false;
  if (G.techTreeBranches.includes(key)) return false;
  if (!node.check()) return false;
  if (G.money < node.cost) return false;

  // Check not excluded by previous choice (allow second pick if only 1 chosen)
  const chosenBranches = new Set(G.techTreeBranches);
  for (const chosen of chosenBranches) {
    const existing = BRANCH_NODES[chosen];
    if (existing && existing.excludes.includes(key) && chosenBranches.size >= 2) return false;
  }

  G.money -= node.cost;
  G.techTreeBranches.push(key);
  return true;
}

// Branch query helpers
export function hasSpecializeBranch() {
  return (G.techTreeBranches || []).includes('specialize');
}

export function hasDiversifyBranch() {
  return (G.techTreeBranches || []).includes('diversify_branch');
}

export function hasScaleOpsBranch() {
  return (G.techTreeBranches || []).includes('scale_ops');
}

// Check if an office is available for the current company type
export function isOfficeAvailable(officeKey) {
  const typeKey = G.companyType || 'digital_agency';
  const companyDef = COMPANY_TYPES[typeKey];
  if (!companyDef) return true;
  // Common rooms always available
  if (['lobby', 'breakroom', 'meeting'].includes(officeKey)) return true;
  return companyDef.available.includes(officeKey);
}
