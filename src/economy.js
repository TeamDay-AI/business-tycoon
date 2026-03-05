// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Economy Engine (client pipeline, costs)
// ═══════════════════════════════════════════════════════════════

import {
  ECONOMY, ROOM_COSTS, AGENT_SALARY, ANALYTICS_LEVELS, EQUIPMENT_CONFIGS,
  OFFICE_SYNERGIES, COMPANY_TYPES, COMPANY_OFFICE_ROLES, OFFICE_ROLE_WEIGHTS,
  DIVERSIFICATION_CONFIG, OFFICE_TYPES, COMMON_ROOMS, PROJECT_TEMPLATES,
  GROWTH_MODELS,
} from './config.js';
import { getRoomInstances, countRoomsByType } from './map.js';
import { G } from './game.js';
import {
  getCompetitorAcvPenalty, getCompetitorRetentionPenalty,
  getMarketBoomPayBonus, getViralOrganicMultiplier,
  getTechEfficiencyBonus, getFreeWorkerSavings,
} from './events.js';

// Get equipment configuration value
export function getEquipmentValue(configKey) {
  return G.equipmentConfig[configKey] || EQUIPMENT_CONFIGS[configKey]?.default || 'standard';
}

// Calculate effective quality scores from agents
function getWorkforceQuality() {
  let contentQ = 0, designQ = 0, seoQ = 0, salesF = 0;
  let contentCount = 0, designCount = 0, seoCount = 0, salesCount = 0;
  let salesEfficiencySum = 0;
  let deliveryEfficiencySum = 0;

  for (const a of G.agents) {
    const q = a.quality;
    const eff = a.efficiency;
    switch (a.role.office) {
      case 'content': contentQ += q; contentCount++; deliveryEfficiencySum += eff; break;
      case 'design':  designQ += q;  designCount++;  deliveryEfficiencySum += eff; break;
      case 'seo':     seoQ += q;     seoCount++;     deliveryEfficiencySum += eff; break;
      case 'sales':   salesF += q;   salesCount++; salesEfficiencySum += eff; break;
      default: deliveryEfficiencySum += eff; break;
    }
  }

  return {
    content: contentCount > 0 ? contentQ / contentCount : 0,
    design: designCount > 0 ? designQ / designCount : 0,
    seo: seoCount > 0 ? seoQ / seoCount : 0,
    sales: salesCount > 0 ? salesF / salesCount : 0,
    salesCount,
    salesEfficiencySum,
    deliveryEfficiencySum,
  };
}

// Marketing budget derived from Marketing HQ office + spend level setting
export function getMarketingBudget() {
  const manualBudget = Math.max(0, G.marketingBudget || 0);
  const hasMarketing = countRoomsByType('marketing') > 0 &&
    G.agents.some(a => a.role.office === 'marketing');
  const hasCampaignOps = hasMarketing ||
    countRoomsByType('content') > 0 ||
    countRoomsByType('sales') > 0;
  if (!hasCampaignOps) return 0;
  const spend = G.equipmentConfig.marketing_spend;
  const hqPreset = spend === 'lean' ? 80 : spend === 'aggressive' ? 400 : 200;
  // Marketing HQ can augment manual office budget; otherwise use manual budget directly.
  return hasMarketing ? Math.max(manualBudget, hqPreset) : manualBudget;
}

// Sales commission: higher rate → bigger deals but commission eats profit
// Net effect: none=×1.0, standard=×1.058, generous=×1.025, lavish=×0.91
export function getSalesCommission() {
  const mode = G.equipmentConfig.sales_commission;
  switch (mode) {
    case 'none':     return { payMultiplier: 1.0,  commissionRate: 0 };
    case 'generous': return { payMultiplier: 1.25, commissionRate: 0.18 };
    case 'lavish':   return { payMultiplier: 1.30, commissionRate: 0.30 };
    default:         return { payMultiplier: 1.15, commissionRate: 0.08 }; // standard
  }
}

// Client pipeline funnel calculation
export function calculateFunnel() {
  const quality = getWorkforceQuality();
  const effectiveMarketingBudget = getMarketingBudget();
  const hasFounder = G.agents.some(a => a.roleKey === 'ceo');

  // Equipment modifiers
  const pricingMode = G.equipmentConfig.sales_pricing;
  const followupMode = G.equipmentConfig.sales_followup;
  const seoFocus = G.equipmentConfig.seo_focus;
  const seoKeywords = G.equipmentConfig.seo_keywords;
  const designStyle = G.equipmentConfig.design_style;
  const designPalette = G.equipmentConfig.design_palette;
  const contentStyle = G.equipmentConfig.content_style;

  // SEO focus bonus
  const seoFocusBonus = seoFocus === 'technical' ? 0.3 : seoFocus === 'content' ? 0.1 : 0.1;
  const contentFocusBonus = seoFocus === 'content' ? 0.2 : 0;

  // Keyword strategy
  const organicKeywordMult = seoKeywords === 'broad' ? 1.2 : seoKeywords === 'niche' ? 0.8 : 1.0;
  const crKeywordMult = seoKeywords === 'broad' ? 0.9 : seoKeywords === 'niche' ? 1.3 : 1.1;

  // Design bonuses
  const designCRBonus = (designStyle === 'minimalist' ? 0.1 : designStyle === 'bold' ? 0.15 : 0.05)
    + (designPalette === 'vibrant' ? 0.08 : 0.05);
  const designOrganicBonus = designStyle === 'playful' ? 0.1 : 0;

  // Content style organic bonus
  const contentOrganicBonus = contentStyle === 'viral' ? 0.3 : 0;

  // Marketing HQ & PR passive effects
  const hasMarketingHQ = countRoomsByType('marketing') > 0 &&
    G.agents.some(a => a.role.office === 'marketing');
  const hasPR = countRoomsByType('pr') > 0 &&
    G.agents.some(a => a.role.office === 'pr');
  const cpcDiscount = hasMarketingHQ ? 0.75 : 1.0;
  const prOrganicBase = hasPR ? 5 : 0;
  const prRepBonus = hasPR ? 1.5 : 1.0;

  // Company type bonus
  const companyDef = COMPANY_TYPES[G.companyType] || {};
  const organicMultiplier = companyDef.bonuses?.organicMultiplier || 1.0;
  const marketingEfficiency = companyDef.bonuses?.marketingEfficiency || 1.0;

  // Effective CPC (improved by design quality + marketing HQ)
  const effectiveCPC = (ECONOMY.base_cpc / (1 + quality.design * 0.3)) * cpcDiscount;

  // Paid visitors from marketing budget
  const paidVisitors = effectiveMarketingBudget > 0 ? (effectiveMarketingBudget / effectiveCPC) * marketingEfficiency : 0;

  // Organic visitors from reputation + quality
  const organicVisitors =
    (G.reputation * ECONOMY.reputation_organic_factor +
    (quality.content + contentFocusBonus) * ECONOMY.content_organic_factor +
    (quality.seo + seoFocusBonus) * ECONOMY.seo_organic_factor +
    prOrganicBase) *
    organicKeywordMult * (1 + designOrganicBonus + contentOrganicBonus) * organicMultiplier * getViralOrganicMultiplier();
  const founderDemandMult = companyDef.bonuses?.founderDemandMultiplier || 1.0;
  const founderDemand = hasFounder ? (8 + G.reputation * 0.2) * founderDemandMult : 0;

  const totalVisitors = paidVisitors + organicVisitors + founderDemand;

  // Website conversion rate
  const websiteCR = ECONOMY.base_website_cr *
    (1 + quality.design * ECONOMY.design_quality_cr_boost) *
    (1 + quality.content * ECONOMY.content_quality_cr_boost) *
    crKeywordMult * (1 + designCRBonus);

  const leads = totalVisitors * websiteCR;

  // Close rate
  const hasMeetingRoom = countRoomsByType('meeting') > 0;
  const meetingFactor = hasMeetingRoom ? ECONOMY.meeting_room_close_boost : 1.0;
  const reputationFactor = 0.8 + (G.reputation / 100) * 0.4;
  const salesFactor = quality.sales > 0 ? (1 + quality.sales * 0.5) : 0.7;

  const pricingCloseMult = pricingMode === 'budget' ? 1.3 : pricingMode === 'premium' ? 0.7 : 1.0;
  const followupCloseMult = followupMode === 'relaxed' ? 0.8 : followupMode === 'aggressive' ? 1.3 : 1.0;

  const closeRate = ECONOMY.base_close_rate * salesFactor * meetingFactor * reputationFactor
    * pricingCloseMult * followupCloseMult;
  const potentialClients = leads * closeRate;

  // Sales throughput caps how many clients can be processed.
  const baseSalesCapacity = quality.salesCount > 0
    ? quality.salesEfficiencySum * ECONOMY.sales_capacity_per_eff
    : ECONOMY.no_sales_capacity;
  const salesCapacity = hasFounder ? Math.max(baseSalesCapacity, 0.2) : baseSalesCapacity;

  // Balance GTM (sales + marketing) vs delivery headcount.
  const founderGtmPower = hasFounder ? 0.6 : 0;
  const gtmPower = quality.salesEfficiencySum + founderGtmPower + (effectiveMarketingBudget / ECONOMY.marketing_power_divisor);
  const requiredGtm = Math.max(0.6, quality.deliveryEfficiencySum * ECONOMY.delivery_gtm_ratio);
  const staffingBalance = Math.max(0.15, Math.min(1, gtmPower / requiredGtm));

  const clients = Math.min(potentialClients, salesCapacity) * staffingBalance;

  // AARRR: Retention — Support reduces churn, increasing effective client lifetime value
  // Without support: 60% retention (high churn). With support: up to 95%.
  const hasSupport = hasSupportStaffed();
  const supportSLA = G.equipmentConfig?.support_sla || 'standard';
  const slaRetentionBoost = supportSLA === 'premium' ? 0.10 : supportSLA === 'basic' ? -0.05 : 0;
  const competitorRetPenalty = getCompetitorRetentionPenalty() / 100;
  const retentionRate = Math.max(0.30, (hasSupport
    ? Math.min(0.95, 0.80 + (G.reputation / 100) * 0.10 + slaRetentionBoost)
    : Math.max(0.40, 0.60 + (G.reputation / 100) * 0.05)) - competitorRetPenalty);

  // AARRR: Referral — high reputation + support = referral multiplier on organic leads
  const referralRate = G.reputation > 40
    ? (hasSupport ? 0.10 + (G.reputation - 40) * 0.003 : 0.02 + (G.reputation - 40) * 0.001)
    : 0;

  // Update metrics
  G.metrics.paidVisitors = Math.round(paidVisitors);
  G.metrics.organicVisitors = Math.round(organicVisitors);
  G.metrics.totalVisitors = Math.round(totalVisitors);
  G.metrics.leads = Math.round(leads * 10) / 10;
  G.metrics.clients = Math.round(clients * 10) / 10;
  G.metrics.potentialClients = Math.round(potentialClients * 10) / 10;
  G.metrics.salesCapacity = Math.round(salesCapacity * 10) / 10;
  G.metrics.staffingBalance = Math.round(staffingBalance * 100);
  G.metrics.websiteCR = Math.round(websiteCR * 10000) / 100; // percentage
  G.metrics.closeRate = Math.round(closeRate * 1000) / 10; // percentage
  G.metrics.contentQuality = Math.round(quality.content * 100);
  G.metrics.designQuality = Math.round(quality.design * 100);
  G.metrics.seoQuality = Math.round(quality.seo * 100);
  G.metrics.salesFactor = Math.round(salesFactor * 100);
  G.metrics.retentionRate = Math.round(retentionRate * 100);
  G.metrics.referralRate = Math.round(referralRate * 100);

  return { paidVisitors, organicVisitors, totalVisitors, leads, clients, closeRate, potentialClients, salesCapacity, staffingBalance, retentionRate, referralRate };
}

// ─── Perks & Workspace Helpers ─────────────────────────
export function getPerksCost() {
  const pkg = G.equipmentConfig?.perks_package || 'none';
  if (pkg === 'elite') return 60;
  if (pkg === 'premium') return 35;
  if (pkg === 'basic') return 15;
  return 0;
}

export function getPerksBonus() {
  const pkg = G.equipmentConfig?.perks_package || 'none';
  switch (pkg) {
    case 'elite':   return { motivRecovery: 0.3, moodRecovery: 0.1, energyBonus: 0.15 };
    case 'premium': return { motivRecovery: 0.2, moodRecovery: 0.05, energyBonus: 0 };
    case 'basic':   return { motivRecovery: 0.1, moodRecovery: 0, energyBonus: 0 };
    default:        return { motivRecovery: 0, moodRecovery: 0, energyBonus: 0 };
  }
}

export function getWorkspaceCost() {
  const ws = G.equipmentConfig?.workspace_quality || 'basic';
  if (ws === 'premium') return 40;
  if (ws === 'ergonomic') return 20;
  return 0;
}

// Daily costs calculation
export function calculateDailyCosts() {
  let roomCost = 0;
  // Grace period: first room is free for 7 days
  const rooms = getRoomInstances();
  for (let i = 0; i < rooms.length; i++) {
    const cost = ROOM_COSTS[rooms[i].typeKey] || 0;
    // First room free during grace period
    if (i === 0 && G.day <= (ECONOMY.grace_period_days || 7)) {
      continue;
    }
    roomCost += cost;
  }

  let salaryCost = 0;
  for (const agent of G.agents) {
    salaryCost += (agent.salary ?? AGENT_SALARY[agent.roleKey] ?? 70);
  }

  // Facility costs (only charged if agents exist)
  const facilityCost = G.agents.length > 0 ? getPerksCost() + getWorkspaceCost() : 0;

  // Free worker (sweat equity) reduces salary costs
  const freeWorkerDiscount = getFreeWorkerSavings();
  const totalCost = Math.max(0, roomCost + salaryCost + getMarketingBudget() + facilityCost - freeWorkerDiscount);
  G.metrics.dailyCosts = totalCost;
  return totalCost;
}

// Update analytics level based on data lab + analyst
export function updateAnalyticsLevel() {
  const hasDataLab = countRoomsByType('data') > 0;
  const dataAnalysts = G.agents.filter(a => a.roleKey === 'data_analyst');
  const hasAnalyst = dataAnalysts.length > 0;
  const experiencedAnalyst = dataAnalysts.some(a => a.skill > 0.6);

  if (!hasDataLab) {
    G.analyticsLevel = 0;
  } else if (!hasAnalyst) {
    G.analyticsLevel = 1;
  } else if (!experiencedAnalyst) {
    G.analyticsLevel = 2;
  } else {
    G.analyticsLevel = 3;
  }
}

// Get analytics text based on visibility level
export function getAnalyticsInsight(metric, value) {
  switch (G.analyticsLevel) {
    case 0:
      return getVagueInsight(metric, value);
    case 1:
      return getRoughInsight(metric, value);
    case 2:
      return getExactInsight(metric, value);
    case 3:
      return getFullInsight(metric, value);
    default:
      return '???';
  }
}

function getVagueInsight(metric, value) {
  const phrases = {
    visitors: value > 50 ? 'Traffic seems decent' : 'Not many visitors',
    leads: value > 5 ? 'Some interest coming in' : 'Pretty quiet',
    revenue: value > 500 ? 'Things are picking up' : 'Revenue is slow',
    costs: value > 300 ? 'Expenses feel heavy' : 'Costs seem manageable',
  };
  return phrases[metric] || 'Hard to tell...';
}

function getRoughInsight(metric, value) {
  const round = v => Math.round(v / 10) * 10;
  const phrases = {
    visitors: `~${round(value)} visitors/day`,
    leads: `About ${Math.round(value)} leads`,
    revenue: `Roughly $${round(value)}/day`,
    costs: `Around $${round(value)}/day`,
  };
  return phrases[metric] || `~${round(value)}`;
}

function getExactInsight(metric, value) {
  const phrases = {
    visitors: `${Math.round(value)} visitors/day`,
    leads: `${Math.round(value * 10) / 10} leads/day`,
    revenue: `$${Math.round(value).toLocaleString()}/day`,
    costs: `$${Math.round(value).toLocaleString()}/day`,
  };
  return phrases[metric] || `${Math.round(value)}`;
}

function getFullInsight(metric, value) {
  const f = G.metrics;
  const phrases = {
    visitors: `${Math.round(f.totalVisitors)} visitors (${Math.round(f.paidVisitors)} paid, ${Math.round(f.organicVisitors)} organic)`,
    leads: `${(f.leads).toFixed(1)} leads/day (${f.websiteCR}% CR)`,
    revenue: `$${Math.round(value).toLocaleString()}/day — ${f.closeRate}% close rate`,
    costs: `$${Math.round(value).toLocaleString()}/day — Projected monthly: $${Math.round(value * 30).toLocaleString()}`,
  };
  return phrases[metric] || `${Math.round(value)} (full data available)`;
}

// Reputation premium for project pay
export function getReputationPremium() {
  return 1.0 + (G.reputation - 20) * 0.005; // 1.0 at rep 20, up to 1.4 at rep 100
}

// Pay multiplier based on sales pricing strategy
export function getPayMultiplier() {
  const mode = G.equipmentConfig.sales_pricing;
  return mode === 'budget' ? 0.7 : mode === 'premium' ? 1.3 : 1.0;
}

// Check if an office type is staffed (has room + at least one agent)
function isOfficeStaffed(officeType) {
  if (officeType === 'data') {
    // Data Lab counts if room exists (analytics level ≥ 1)
    return countRoomsByType('data') > 0;
  }
  return countRoomsByType(officeType) > 0 &&
    G.agents.some(a => a.role.office === officeType);
}

// Get synergy bonuses for a completing office
export function getOfficeSynergies(officeType) {
  const synergies = OFFICE_SYNERGIES[officeType] || [];
  let totalBonus = 0;
  const activeLabels = [];

  for (const s of synergies) {
    if (isOfficeStaffed(s.requires)) {
      totalBonus += s.bonus;
      activeLabels.push(s.label);
    }
  }

  // Global: Data Lab level ≥ 2 gives +5% quality to all projects
  if (G.analyticsLevel >= 2) {
    totalBonus += 0.05;
    activeLabels.push('Data insights');
  }

  return { totalBonus, activeLabels };
}

// Data Lab efficiency bonus for agents (stored in G.dataLabBonus)
export function getDataLabEfficiencyBonus() {
  const base = G.analyticsLevel >= 3 ? 0.10 : G.analyticsLevel >= 2 ? 0.05 : 0;
  return base * diversificationPenalty('data');
}

// IT Server Room efficiency bonus (stored in G.itBonus)
export function getITEfficiencyBonus() {
  return countRoomsByType('it') > 0 ? 0.08 * diversificationPenalty('it') : 0;
}

// Legal department pay bonus
export function getLegalPayBonus() {
  return countRoomsByType('legal') > 0 ? 0.15 * diversificationPenalty('legal') : 0;
}

// PR reputation multiplier
export function getPRReputationBonus() {
  const hasPR = countRoomsByType('pr') > 0 &&
    G.agents.some(a => a.role.office === 'pr');
  if (!hasPR) return 1.0;
  // Diversified: halfway between 1.0 and 1.5 → 1.25
  return G.diversifiedOffices.has('pr') ? 1.25 : 1.5;
}

// HR signing cost discount
export function getHRSigningDiscount() {
  if (countRoomsByType('hr') === 0) return 0;
  let discount = 0.30 * diversificationPenalty('hr');
  // Staffing agency bonus
  const companyDef = COMPANY_TYPES[G.companyType] || {};
  if (companyDef.bonuses?.hireCostDiscount) {
    discount = Math.min(0.90, discount + companyDef.bonuses.hireCostDiscount);
  }
  return discount;
}

// Finance office loan interest rate
export function getFinanceLoanRate() {
  if (countRoomsByType('finance') === 0) return 0.18;
  // Diversified: halfway between 0.12 and 0.18 → 0.15
  return G.diversifiedOffices.has('finance') ? 0.15 : 0.12;
}

// Warehouse project capacity bonus
export function getWarehouseCapacityBonus() {
  return countRoomsByType('warehouse') > 0 ? 0.20 * diversificationPenalty('warehouse') : 0;
}

// Check if Sales office exists with agents
export function hasSalesCapacity() {
  return countRoomsByType('sales') > 0 &&
    G.agents.some(a => a.role.office === 'sales');
}

// Check if Support office is staffed
export function hasSupportStaffed() {
  return countRoomsByType('support') > 0 &&
    G.agents.some(a => a.role.office === 'support');
}

// ─── Dynamic Office Roles & Diversification ─────────────

const COMMON_KEYS = new Set(['lobby', 'breakroom', 'meeting']);

// Get the role of an office based on company type + diversification
export function getOfficeRole(officeKey) {
  if (COMMON_KEYS.has(officeKey)) return 'common';
  if (G.diversifiedOffices.has(officeKey)) return 'delivery';

  const typeKey = G.companyType || 'digital_agency';
  const roles = COMPANY_OFFICE_ROLES[typeKey];
  if (!roles) return 'infrastructure';

  if (roles.delivery.includes(officeKey)) return 'delivery';
  if (roles.growth.includes(officeKey)) return 'growth';
  return 'infrastructure';
}

// Spawn weight for project spawning (0 if remodeling)
export function getProjectSpawnWeight(officeKey) {
  if (G.remodelingOffices[officeKey] > 0) return 0;
  const role = getOfficeRole(officeKey);
  return OFFICE_ROLE_WEIGHTS[role] || 0.15;
}

// Dynamic office categories (replaces static OFFICE_CATEGORIES for UI)
export function getOfficeCategoriesForCompany() {
  const typeKey = G.companyType || 'digital_agency';
  const roles = COMPANY_OFFICE_ROLES[typeKey];
  if (!roles) {
    // Fallback to static categories
    return {
      delivery:   { label: 'Delivery',       icon: '⚡', offices: ['seo','content','video','design','data','engineering','workshop'] },
      growth:     { label: 'Growth',         icon: '📈', offices: ['sales','marketing','pr'] },
      operations: { label: 'Operations',     icon: '🏗️', offices: ['support','hr','finance','legal','it','rd','warehouse'] },
      common:     { label: 'Common',         icon: '🏠', offices: ['lobby','breakroom','meeting'] },
    };
  }

  // Compute dynamic lists: diversified offices move to delivery
  const delivery = [...roles.delivery];
  const growth = [];
  const infrastructure = [];

  for (const key of roles.growth) {
    if (G.diversifiedOffices.has(key)) delivery.push(key);
    else growth.push(key);
  }
  for (const key of roles.infrastructure) {
    if (G.diversifiedOffices.has(key)) delivery.push(key);
    else infrastructure.push(key);
  }

  return {
    delivery:   { label: 'Delivery',       icon: '⚡', offices: delivery },
    growth:     { label: 'Growth',         icon: '📈', offices: growth },
    operations: { label: 'Infrastructure', icon: '🏗️', offices: infrastructure },
    common:     { label: 'Common',         icon: '🏠', offices: ['lobby','breakroom','meeting'] },
  };
}

// Can an office be diversified to delivery?
export function canDiversifyOffice(officeKey) {
  if (COMMON_KEYS.has(officeKey)) return false;
  if (getOfficeRole(officeKey) === 'delivery') return false;
  if (G.remodelingOffices[officeKey] > 0) return false;
  if (countRoomsByType(officeKey) === 0) return false;
  return G.money >= getDiversificationCost(officeKey);
}

// Cost to diversify an office
export function getDiversificationCost(officeKey) {
  return DIVERSIFICATION_CONFIG.premiumOffices.includes(officeKey)
    ? DIVERSIFICATION_CONFIG.premiumCost
    : DIVERSIFICATION_CONFIG.baseCost;
}

// Synergy bonus from having multiple delivery verticals
export function getDiversificationSynergyBonus() {
  const deliveryCount = getOfficeCategoriesForCompany().delivery.offices
    .filter(key => countRoomsByType(key) > 0).length;
  if (deliveryCount >= 6) return { payBonus: 0.15, label: '+15% pay (6+ delivery)' };
  if (deliveryCount >= 4) return { payBonus: 0.10, label: '+10% pay (4+ delivery)' };
  if (deliveryCount >= 2) return { payBonus: 0.05, label: '+5% pay (2+ delivery)' };
  return { payBonus: 0, label: '' };
}

// Helper: penalty multiplier for diversified offices (passive bonuses halved)
export function diversificationPenalty(officeKey) {
  return G.diversifiedOffices.has(officeKey) ? DIVERSIFICATION_CONFIG.passiveBonusReduction : 1.0;
}

// ─── ACV (Average Contract Value) ──────────────────────
// Theoretical ACV based on current multipliers applied to average project base pay.
// Grows as the player invests in Sales, R&D, Legal, Brand, Reputation, etc.
export function calculateACV() {
  const builtOffices = new Set(getRoomInstances().map(r => r.typeKey));
  const companyAvail = getCompanyAvailableOffices();

  // Only count client-facing or delivery templates for offices we actually have
  const validTemplates = PROJECT_TEMPLATES.filter(t =>
    builtOffices.has(t.office) && companyAvail.has(t.office) &&
    (!t.clientFacing || getOfficeRole(t.office) === 'delivery')
  );
  if (validTemplates.length === 0) return { acv: 0, factors: [] };

  const avgBasePay = validTemplates.reduce((s, t) => s + t.basePay, 0) / validTemplates.length;
  let acv = avgBasePay;
  const factors = [];

  // Reputation premium
  const repPremium = getReputationPremium();
  if (repPremium > 1.01) {
    acv *= repPremium;
    factors.push({ label: 'Reputation', mult: repPremium });
  }

  // Sales pricing
  const payMult = getPayMultiplier();
  if (payMult !== 1.0) {
    acv *= payMult;
    factors.push({ label: 'Pricing Strategy', mult: payMult });
  }

  // Legal
  const legalBonus = getLegalPayBonus();
  if (legalBonus > 0) {
    acv *= (1 + legalBonus);
    factors.push({ label: 'Legal', mult: 1 + legalBonus });
  }

  // R&D breakthrough (temporary)
  if (G.rdBreakthrough && G.week <= G.rdBreakthrough.expiresWeek) {
    acv *= 1.10;
    factors.push({ label: 'R&D Breakthrough', mult: 1.10 });
  }

  // Company bonuses
  const companyDef = COMPANY_TYPES[G.companyType] || {};
  const companyPayMult = companyDef.bonuses?.projectPayMultiplier || 1.0;
  if (companyPayMult !== 1.0) {
    acv *= companyPayMult;
    factors.push({ label: companyDef.name || 'Company', mult: companyPayMult });
  }

  // Sales deals (net of commission)
  if (hasSalesCapacity()) {
    const { payMultiplier, commissionRate } = getSalesCommission();
    const netMult = payMultiplier * (1 - commissionRate);
    if (netMult !== 1.0) {
      acv *= netMult;
      factors.push({ label: 'Sales Deals', mult: netMult });
    }
  }

  // Diversification synergy
  const divSynergy = getDiversificationSynergyBonus();
  if (divSynergy.payBonus > 0) {
    acv *= (1 + divSynergy.payBonus);
    factors.push({ label: 'Diversification', mult: 1 + divSynergy.payBonus });
  }

  // Retention (Support office) — clients stay longer = higher lifetime value
  const retention = (G.metrics.retentionRate || 60) / 100;
  // LTV multiplier: at 60% retention → 1.0x, at 95% → ~1.6x (geometric series approximation)
  const ltvMult = 1 / (1 - retention * 0.6);
  const baseLtvMult = 1 / (1 - 0.60 * 0.6);
  const retentionEffect = ltvMult / baseLtvMult;
  if (retentionEffect > 1.02) {
    acv *= retentionEffect;
    factors.push({ label: 'Retention (Support)', mult: retentionEffect });
  }

  // Event buffs: competitor penalty + market boom pay bonus
  const compPenalty = getCompetitorAcvPenalty();
  if (compPenalty > 0) {
    acv *= (1 - compPenalty);
    factors.push({ label: 'Competitor Pressure', mult: 1 - compPenalty });
  }
  const boomPay = getMarketBoomPayBonus();
  if (boomPay > 0) {
    acv *= (1 + boomPay);
    factors.push({ label: 'Market Boom', mult: 1 + boomPay });
  }

  G.metrics.acv = Math.round(acv);
  G.metrics.acvFactors = factors;
  return { acv: Math.round(acv), factors };
}

function getCompanyAvailableOffices() {
  const typeKey = G.companyType || 'digital_agency';
  const companyDef = COMPANY_TYPES[typeKey];
  if (!companyDef) return new Set(Object.keys(OFFICE_TYPES));
  return new Set([...companyDef.available, 'lobby', 'breakroom', 'meeting']);
}

// ─── Growth Model Helpers ────────────────────────────────

// Does this company type use the product-level / MRR system?
export function hasProductGrowth() {
  const gm = GROWTH_MODELS[G.companyType];
  return gm && gm.model === 'exponential';
}

// Calculate daily MRR from product level (SaaS/AI Lab only)
export function calculateMRR() {
  if (!hasProductGrowth()) return 0;
  const mrrPerLevel = G.companyType === 'saas_startup' ? 15 : 10;
  const retention = (G.metrics.retentionRate || 60) / 100;
  return Math.round(G.productLevel * mrrPerLevel * retention);
}

// Calculate product level gain from a completed engineering/R&D project
export function calculateProductLevelGain(qualityScore) {
  const companyDef = COMPANY_TYPES[G.companyType] || {};
  const rdRate = companyDef.bonuses?.rdInnovationRate || 1.0;
  const baseGain = 2 + qualityScore * 3; // 2-5 points based on quality
  return baseGain * rdRate;
}

// Get consulting premium multiplier based on reputation
export function getConsultingPremium() {
  const companyDef = COMPANY_TYPES[G.companyType] || {};
  if (!companyDef.bonuses?.reputationPayMultiplier) return 1.0;
  const repNorm = Math.max(0, (G.reputation - 35) / 65); // 0 at rep 35, 1 at rep 100
  return 1 + (companyDef.bonuses.reputationPayMultiplier - 1) * Math.pow(repNorm, 1.8) * 4;
}

// Company valuation — vanity metric for analytics panel
export function calculateValuation() {
  const gm = GROWTH_MODELS[G.companyType];
  if (!gm) return 0;

  if (gm.model === 'exponential') {
    // SaaS/Tech: ARR-based valuation (10-20x ARR depending on growth)
    const dailyMRR = calculateMRR();
    const arr = dailyMRR * 365;
    // Growth rate from MRR history (last 7 vs previous 7 days)
    let growthRate = 0;
    if (G.mrrHistory.length >= 14) {
      const recent = G.mrrHistory.slice(-7).reduce((s, v) => s + v, 0);
      const prev = G.mrrHistory.slice(-14, -7).reduce((s, v) => s + v, 0);
      growthRate = prev > 0 ? Math.max(0, (recent - prev) / prev) : 0;
    }
    const multiple = 10 + Math.min(10, growthRate * 50);
    return Math.round(arr * multiple);
  }

  // Agency/Consulting/Physical: EBITDA-based (3-5x annual profit)
  const avgWindow = G.dailyProfitHistory.slice(-10);
  const avgDailyProfit = avgWindow.length > 0
    ? avgWindow.reduce((s, p) => s + p, 0) / avgWindow.length
    : 0;
  const annualProfit = Math.max(0, avgDailyProfit * 365);
  // Consulting gets higher multiple for brand value
  const baseMult = gm.model === 'premium' ? 5 : gm.model === 'physical' ? 3.5 : 4;
  const repBonus = G.reputation > 50 ? (G.reputation - 50) / 100 : 0;
  return Math.round(annualProfit * (baseMult + repBonus));
}
