// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Game State Singleton
// ═══════════════════════════════════════════════════════════════

import { START_MONEY, WIN_REVENUE, BANKRUPTCY_THRESHOLD, ECONOMY } from './config.js';

// ─── Analytics helper (Umami custom events) ────────────────
export function trackEvent(name, data) {
  try { if (typeof umami !== 'undefined') umami.track(name, data); } catch(e) {}
}

const EQUIPMENT_DEFAULTS = {
  sales_pricing: 'standard',
  sales_followup: 'balanced',
  seo_focus: 'content',
  seo_keywords: 'broad',
  content_research: 'thorough',
  content_style: 'longform',
  video_quality: 'standard',
  video_effects: 'basic',
  design_style: 'bold',
  design_palette: 'warm',
  support_sla: 'standard',
  support_templates: 'basic',
  coffee_quality: 'instant',
  break_duration: 'normal',
  meeting_schedule: 'weekly',
  meeting_focus: 'review',
  lobby_style: 'casual',
  eng_methodology: 'balanced',
  eng_stack: 'stable',
  workshop_quality: 'quick',
  workshop_tools: 'basic',
  marketing_channel: 'both',
  marketing_spend: 'standard',
  sales_commission: 'standard',
  pr_approach: 'steady',
  perks_package: 'none',
  workspace_quality: 'basic',
};

export const G = {
  // Company type (set during picker)
  companyType: null,

  // Room unlock progression
  unlockedRooms: new Set(['lobby', 'seo', 'content', 'support']),

  // Economy
  money: START_MONEY,
  totalRevenue: 0,
  reputation: ECONOMY.starting_reputation,
  day: 1,
  week: 1,

  // Marketing
  marketingBudget: 0,  // per day

  // Entity lists
  agents: [],
  ceo: null,
  projects: [],
  completedLog: [],
  particles: [],
  visitors: [],
  visitorStats: { totalServed: 0, totalAngry: 0, avgSatisfaction: 0.5 },

  // Project spawning
  spawnTimer: 0,
  spawnInterval: 0, // controlled by economy

  // Game progression
  gameSpeed: 1,
  gameTick: 0,
  frameCount: 0,
  dayTicks: 0,

  // UI state
  selectedAgent: null,
  uiDirty: true,
  buildMode: false,

  // Tutorial
  tutorialStep: 0,
  completedTriggers: new Set(),
  shownHints: new Set(),
  lastHintTick: -9999,

  // Analytics visibility (0-3)
  analyticsLevel: 0,

  // Data Lab global efficiency bonus (updated daily, read by agent.efficiency)
  dataLabBonus: 0,

  // IT efficiency bonus
  itBonus: 0,

  // R&D breakthrough
  rdBreakthrough: null,       // { office, expiresWeek }
  rdBreakthroughTimer: 0,     // weeks until next check

  // Team alignment
  teamAlignment: 0,           // average alignment across all agents (computed)
  teamBuildingActive: false,   // true when CEO is running a team building
  teamBuildingTimer: 0,        // ticks remaining for team building
  teamBuildingPhase: null,     // 'gather' | 'circle' | 'cheer' | null

  // Standup meeting (weekly)
  standupActive: false,        // true when standup is in progress
  standupPhase: null,          // 'gather' | 'huddle' | 'cheer' | null
  standupTimer: 0,             // ticks remaining in current phase
  standupCenter: null,         // { x, y } center of meeting room for circle

  // Win/loss
  gameOver: false,
  gameWon: false,

  // Loans
  debt: 0,
  loanCount: 0,
  loanInterestRate: 0.18, // 18% per game-week
  loanModalOpen: false,

  // Equipment configurations (player choices)
  equipmentConfig: { ...EQUIPMENT_DEFAULTS },

  // Daily history for cashflow graph (ring buffer, last 30 days)
  dailyHistory: [],

  // Onboarding
  starterProjectsGiven: false,
  missionDismissed: false,

  // External events
  activeEvent: null,
  preEventSpeed: 1,
  firedEventIds: new Set(),
  eventTimer: 0,           // days until next event check
  vcEquitySold: false,     // only one VC deal per game
  competitorDebuff: null,  // { weeksLeft, acvPenalty, retentionPenalty }
  marketBoom: null,        // { weeksLeft, bonus, payBonus? }
  viralBuff: null,         // { weeksLeft, organicMultiplier }
  techBuff: null,          // { weeksLeft, efficiencyBonus }
  freeWorkerDaysLeft: 0,
  floodedOffice: null,     // { office, daysLeft }
  partnershipProjects: 0,  // premium projects to spawn

  // Cap table — equity ownership
  capTable: {
    ceo: 100,        // founder/CEO ownership %
    investors: 0,    // VC / angel investor %
    esop: 0,         // employee stock option pool %
  },
  equityLog: [],     // [{ day, type, pct, label }] — history of dilution events
  esopVested: 0,     // how much of ESOP pool has vested to employees

  // Diversification & tech tree branching
  diversifiedOffices: new Set(),    // offices flipped to delivery role
  remodelingOffices: {},            // { officeKey: daysRemaining }
  techTreeBranches: [],             // chosen branch keys (e.g. 'specialize', 'diversify_branch', 'scale_ops')

  // Growth model state (SaaS/AI Lab product-led growth)
  productLevel: 0,                  // 0-100 scale, SaaS/Tech only
  mrr: 0,                           // daily MRR income
  mrrHistory: [],                   // last 30 days of MRR for trending
  engineeringProjectsThisWeek: 0,   // for tech debt tracking

  // Economy tracking (for analytics display)
  dayRevenueAcc: 0,
  dailyProfitHistory: [],
  metrics: {
    paidVisitors: 0,
    organicVisitors: 0,
    totalVisitors: 0,
    leads: 0,
    clients: 0,
    potentialClients: 0,
    salesCapacity: 0,
    staffingBalance: 100,
    websiteCR: 0,
    closeRate: 0,
    contentQuality: 0,
    designQuality: 0,
    seoQuality: 0,
    salesFactor: 0,
    dailyCosts: 0,
    dailyRevenue: 0,
    weeklyProfit: 0,
    projectedMonthly: 0,
    officeRevenue: {},
    acv: 0,
    acvFactors: [],
    retentionRate: 60,
    referralRate: 0,
  },

  checkWinCondition() {
    if (this.totalRevenue >= WIN_REVENUE && !this.gameWon) {
      this.gameWon = true;
      this.gameOver = true;
      trackEvent('game-win', { day: this.day, company: this.companyType, revenue: this.totalRevenue, ceo_stake: this.capTable.ceo });
      return 'win';
    }
    if (this.money <= 0 && !this.gameOver && !this.loanModalOpen) {
      this.loanModalOpen = true;
      return 'need_loan';
    }
    if (this.money <= BANKRUPTCY_THRESHOLD && !this.gameOver) {
      this.gameOver = true;
      trackEvent('game-bankrupt', { day: this.day, company: this.companyType, revenue: this.totalRevenue, agents: this.agents.length });
      return 'bankrupt';
    }
    return null;
  },

  takeLoan(amount) {
    this.debt += amount;
    this.money += amount;
    this.loanCount++;
    this.loanModalOpen = false;
  },

  applyWeeklyInterest() {
    if (this.debt > 0) {
      const interest = Math.round(this.debt * this.loanInterestRate);
      this.debt += interest;
      return interest;
    }
    return 0;
  },

  repayDebt(amount) {
    const payment = Math.min(amount, this.debt);
    this.debt -= payment;
    this.money -= payment;
    return payment;
  },

  reset() {
    this.companyType = null;
    this.money = START_MONEY;
    this.unlockedRooms = new Set(['lobby', 'seo', 'content', 'support']);
    this.totalRevenue = 0;
    this.reputation = ECONOMY.starting_reputation;
    this.day = 1;
    this.week = 1;
    this.marketingBudget = 0;
    this.agents = [];
    this.ceo = null;
    this.projects = [];
    this.completedLog = [];
    this.particles = [];
    this.visitors = [];
    this.visitorStats = { totalServed: 0, totalAngry: 0, avgSatisfaction: 0.5 };
    this.spawnTimer = 0;
    this.gameSpeed = 1;
    this.gameTick = 0;
    this.frameCount = 0;
    this.dayTicks = 0;
    this.selectedAgent = null;
    this.uiDirty = true;
    this.buildMode = false;
    this.tutorialStep = 0;
    this.completedTriggers = new Set();
    this.shownHints = new Set();
    this.lastHintTick = -9999;
    this.analyticsLevel = 0;
    this.dataLabBonus = 0;
    this.itBonus = 0;
    this.rdBreakthrough = null;
    this.rdBreakthroughTimer = 0;
    this.teamAlignment = 0;
    this.teamBuildingActive = false;
    this.teamBuildingTimer = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.debt = 0;
    this.loanCount = 0;
    this.loanModalOpen = false;
    this.dayRevenueAcc = 0;
    this.dailyProfitHistory = [];
    this.metrics.officeRevenue = {};
    this.equipmentConfig = { ...EQUIPMENT_DEFAULTS };
    this.dailyHistory = [];
    this.starterProjectsGiven = false;
    this.missionDismissed = false;
    this.activeEvent = null;
    this.preEventSpeed = 1;
    this.firedEventIds = new Set();
    this.eventTimer = 0;
    this.vcEquitySold = false;
    this.competitorDebuff = null;
    this.marketBoom = null;
    this.viralBuff = null;
    this.techBuff = null;
    this.freeWorkerDaysLeft = 0;
    this.floodedOffice = null;
    this.partnershipProjects = 0;
    this.capTable = { ceo: 100, investors: 0, esop: 0 };
    this.equityLog = [];
    this.esopVested = 0;
    this.diversifiedOffices = new Set();
    this.remodelingOffices = {};
    this.techTreeBranches = [];
    this.productLevel = 0;
    this.mrr = 0;
    this.mrrHistory = [];
    this.engineeringProjectsThisWeek = 0;
  },
};
