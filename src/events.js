// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — External Events System
//  Random events with tradeoff decisions that spice up gameplay
// ═══════════════════════════════════════════════════════════════

import { G } from './game.js';
import { showToast } from './ui/toast.js';
import { countRoomsByType } from './map.js';
import { ECONOMY } from './config.js';

// ─── Event Definitions ──────────────────────────────────────
// Each event has:
//   id, icon, title, description, choices[]
//   condition(G) → boolean (can this event fire?)
//   Each choice: { label, description, effect(G), toast }

export const EXTERNAL_EVENTS = [
  // ── VC & Investment ──────────────────────────────
  {
    id: 'vc_offer_generous',
    icon: '💰',
    title: 'VC Offer — Generous Terms',
    description: 'A venture capital firm sees potential in your company. They offer <b>$20,000 for 20%</b> equity. Good terms, but you lose some control.',
    category: 'investment',
    condition: () => G.day >= 14 && G.totalRevenue >= 5000 && !G.vcEquitySold,
    choices: [
      {
        label: 'Accept $20k for 20%',
        description: () => `+$20,000 cash · CEO: ${G.capTable.ceo}% → ${Math.round(G.capTable.ceo - 20)}%`,
        effect: () => {
          G.money += 20000;
          diluteCeo(20, 'investors', 'VC — Generous Terms');
          G.vcEquitySold = true;
        },
        toast: () => `💰 VC deal closed! +$20,000. CEO now owns ${G.capTable.ceo}%.`,
      },
      {
        label: 'Decline',
        description: () => `Keep ${G.capTable.ceo}% ownership`,
        effect: () => {},
        toast: '🤚 You turned down the VC. Full ownership retained.',
      },
    ],
  },
  {
    id: 'vc_offer_aggressive',
    icon: '🦈',
    title: 'VC Offer — Shark Deal',
    description: 'An aggressive investor offers <b>$10,000 for 50%</b> of your company. Terrible terms — but the cash could save a struggling company.',
    category: 'investment',
    condition: () => G.day >= 21 && G.money < 3000 && !G.vcEquitySold,
    choices: [
      {
        label: 'Accept $10k for 50%',
        description: () => `+$10,000 cash · CEO: ${G.capTable.ceo}% → ${Math.max(0, G.capTable.ceo - 50)}%`,
        effect: () => {
          G.money += 10000;
          diluteCeo(50, 'investors', 'VC — Shark Deal');
          G.vcEquitySold = true;
        },
        toast: () => `🦈 Shark deal done. +$10,000 but CEO now owns ${G.capTable.ceo}%.`,
      },
      {
        label: 'No way!',
        description: () => `Keep ${G.capTable.ceo}% ownership, find another way`,
        effect: () => {
          G.reputation = Math.min(100, G.reputation + 3);
        },
        toast: '💪 You stood your ground. +3 reputation for integrity.',
      },
    ],
  },
  {
    id: 'free_worker_offer',
    icon: '🤝',
    title: 'Sweat Equity Proposal',
    description: 'A talented developer says: <i>"I\'ll work for free for 2 weeks if you give me 5% equity."</i> They\'re skilled but it dilutes ownership.',
    category: 'investment',
    condition: () => G.day >= 10 && G.agents.length >= 2 && G.capTable.ceo > 40,
    choices: [
      {
        label: 'Accept — 5% ESOP',
        description: () => `Free engineer for 14 days · CEO: ${G.capTable.ceo}% → ${G.capTable.ceo - 5}%`,
        effect: () => {
          diluteCeo(5, 'esop', 'Sweat equity — Engineer');
          G.freeWorkerDaysLeft = 14;
        },
        toast: () => `🤝 Sweat equity deal! Free engineer for 2 weeks. CEO owns ${G.capTable.ceo}%.`,
      },
      {
        label: 'Pass',
        description: 'No equity dilution',
        effect: () => {},
        toast: '👋 You passed on the sweat equity deal.',
      },
    ],
  },

  // ── Competition & Market ─────────────────────────
  {
    id: 'new_competitor',
    icon: '⚔️',
    title: 'New Competitor Enters Market',
    description: 'A well-funded competitor just launched, offering lower prices. Your <b>ACV drops 15%</b> and <b>retention drops 5%</b> for the next 3 weeks.',
    category: 'market',
    condition: () => G.day >= 21 && G.totalRevenue >= 10000,
    choices: [
      {
        label: 'Invest in quality ($3,000)',
        description: 'Halve the competitor damage',
        effect: () => {
          if (G.money >= 3000) {
            G.money -= 3000;
            G.competitorDebuff = { weeksLeft: 3, acvPenalty: 0.07, retentionPenalty: 3 };
            G._lastEventResult = 'invested';
          } else {
            G.competitorDebuff = { weeksLeft: 3, acvPenalty: 0.15, retentionPenalty: 5 };
            G._lastEventResult = 'broke';
          }
        },
        toast: () => G._lastEventResult === 'invested'
          ? '⚔️ You invested in quality to fight the competitor. Reduced impact.'
          : '⚔️ Not enough cash! Full competitor impact applies.',
      },
      {
        label: 'Ride it out',
        description: 'Accept -15% ACV and -5% retention for 3 weeks',
        effect: () => {
          G.competitorDebuff = { weeksLeft: 3, acvPenalty: 0.15, retentionPenalty: 5 };
        },
        toast: '⚔️ New competitor is undercutting you. Brace for impact!',
      },
    ],
  },
  {
    id: 'market_boom',
    icon: '🚀',
    title: 'Market Boom!',
    description: 'The industry is booming! Demand surges — you\'ll get <b>+30% more projects</b> for the next 2 weeks. But can your team handle the load?',
    category: 'market',
    condition: () => G.day >= 14 && G.agents.length >= 3,
    choices: [
      {
        label: 'Take on everything!',
        description: '+30% project flow for 2 weeks',
        effect: () => {
          G.marketBoom = { weeksLeft: 2, bonus: 0.30 };
        },
        toast: '🚀 Market boom! +30% projects incoming for 2 weeks.',
      },
      {
        label: 'Cherry-pick premium only',
        description: '+10% projects but +15% pay per project',
        effect: () => {
          G.marketBoom = { weeksLeft: 2, bonus: 0.10, payBonus: 0.15 };
        },
        toast: '🚀 Cherry-picking premium clients. +10% projects, +15% pay!',
      },
    ],
  },
  {
    id: 'client_disaster',
    icon: '😱',
    title: 'Major Client Complaint',
    description: 'A high-profile client posted a scathing review online. <b>Reputation -8</b> unless you invest in damage control.',
    category: 'market',
    condition: () => G.reputation >= 30 && G.completedLog.length >= 5,
    choices: [
      {
        label: 'PR crisis management ($2,000)',
        description: 'Only -2 rep instead of -8',
        effect: () => {
          if (G.money >= 2000) {
            G.money -= 2000;
            G.reputation = Math.max(0, G.reputation - 2);
            G._lastEventResult = 'managed';
          } else {
            G.reputation = Math.max(0, G.reputation - 8);
            G._lastEventResult = 'broke';
          }
        },
        toast: () => G._lastEventResult === 'managed'
          ? '🛡️ Crisis managed! -$2,000 but only -2 reputation.'
          : '😱 Can\'t afford damage control! Reputation -8.',
      },
      {
        label: 'Ignore it',
        description: 'Reputation -8',
        effect: () => {
          G.reputation = Math.max(0, G.reputation - 8);
        },
        toast: '😱 Bad review spreading... Reputation -8.',
      },
    ],
  },

  // ── Government & Legal ───────────────────────────
  {
    id: 'government_grant',
    icon: '🏛️',
    title: 'Government Grant Available',
    description: 'A <b>$5,000 innovation grant</b> is available — but you need a <b>Legal office</b> to handle the paperwork.',
    category: 'government',
    condition: () => G.day >= 14,
    choices: [
      {
        label: 'Apply for the grant',
        description: () => countRoomsByType('legal') > 0 ? '+$5,000 free money!' : 'Need Legal office!',
        effect: () => {
          if (countRoomsByType('legal') > 0) {
            G.money += 5000;
            G._lastEventResult = 'granted';
          } else {
            G._lastEventResult = 'no_legal';
          }
        },
        toast: () => G._lastEventResult === 'granted'
          ? '🏛️ Grant approved! +$5,000.'
          : '🏛️ Application rejected — no Legal office to file paperwork!',
      },
      {
        label: 'Skip it',
        description: 'Too much bureaucracy',
        effect: () => {},
        toast: '📋 You skipped the grant application.',
      },
    ],
  },
  {
    id: 'tax_audit',
    icon: '🔍',
    title: 'Tax Audit!',
    description: 'The tax authority is auditing your company. Without a <b>Finance office</b>, you\'ll pay a <b>$3,000 fine</b>. With one, it\'s just a minor hassle.',
    category: 'government',
    condition: () => G.day >= 28 && G.totalRevenue >= 15000,
    choices: [
      {
        label: 'Face the audit',
        description: () => countRoomsByType('finance') > 0 ? 'Finance handles it — $500 fee' : '$3,000 fine!',
        effect: () => {
          if (countRoomsByType('finance') > 0) {
            G.money -= 500;
            G._lastEventResult = 'finance';
          } else {
            G.money -= 3000;
            G._lastEventResult = 'no_finance';
          }
        },
        toast: () => G._lastEventResult === 'finance'
          ? '🔍 Finance team handled the audit. -$500 admin fee.'
          : '🔍 Audit failed! -$3,000 fine. Consider building a Finance office.',
      },
      {
        label: 'Hire an external accountant',
        description: '-$1,500 regardless',
        effect: () => {
          G.money -= 1500;
        },
        toast: '🔍 External accountant handled the audit. -$1,500.',
      },
    ],
  },

  // ── Talent & People ──────────────────────────────
  {
    id: 'poaching_attempt',
    icon: '🎯',
    title: 'Competitor Poaching Your Star!',
    description: () => {
      const star = getBestAgent();
      return star
        ? `A competitor is offering <b>${star.name}</b> (your best performer) a 50% raise to leave. Counter-offer or lose them?`
        : 'A competitor wants to poach one of your team members.';
    },
    category: 'talent',
    condition: () => G.agents.filter(a => a.roleKey !== 'ceo').length >= 3,
    choices: [
      {
        label: 'Counter-offer (+30% raise)',
        description: 'Keep them but salary goes up',
        effect: () => {
          const star = getBestAgent();
          if (star) {
            star.salary = Math.round((star.salary || 70) * 1.3);
            star.motivation = Math.min(1, star.motivation + 0.3);
            star.mood = Math.min(1, star.mood + 0.2);
          }
        },
        toast: () => {
          const star = getBestAgent();
          return star
            ? `🎯 Counter-offer accepted! ${star.name} stays but costs 30% more.`
            : '🎯 You retained your team member with a raise.';
        },
      },
      {
        label: 'Let them go',
        description: 'Lose your best performer',
        effect: () => {
          const star = getBestAgent();
          if (star) {
            if (star.task) {
              star.task.state = 'waiting';
              star.task.assignedAgents = star.task.assignedAgents.filter(w => w !== star);
              star.task = null;
            }
            G.agents = G.agents.filter(a => a !== star);
            G.reputation = Math.max(0, G.reputation - 2);
          }
        },
        toast: () => {
          const star = getBestAgent();
          return star
            ? `👋 ${star.name} left for the competitor. -2 reputation.`
            : '👋 Lost a team member to the competition.';
        },
      },
    ],
  },
  {
    id: 'team_morale_crisis',
    icon: '😤',
    title: 'Team Morale Crisis',
    description: 'Burnout is spreading. Multiple team members are unhappy. You can throw a company party or push through.',
    category: 'talent',
    condition: () => G.agents.filter(a => a.mood < 0.4).length >= 2,
    choices: [
      {
        label: 'Throw a party! 🎉',
        description: '-$1,500, full mood & motivation boost',
        effect: () => {
          G.money -= 1500;
          for (const a of G.agents) {
            a.mood = Math.min(1, a.mood + 0.3);
            a.motivation = Math.min(1, a.motivation + 0.2);
          }
        },
        toast: '🎉 Company party! Everyone feels better. -$1,500.',
      },
      {
        label: 'Tough it out',
        description: 'Risk losing more people',
        effect: () => {
          for (const a of G.agents) {
            if (a.mood < 0.4) a.mood = Math.max(0, a.mood - 0.1);
          }
        },
        toast: '😤 No party. Morale continues to decline...',
      },
    ],
  },

  // ── Opportunities ────────────────────────────────
  {
    id: 'viral_moment',
    icon: '📱',
    title: 'Your Work Went Viral!',
    description: 'A recent project got shared on social media. You\'re getting tons of attention! <b>+10 reputation</b> and <b>double organic traffic</b> for 1 week.',
    category: 'opportunity',
    condition: () => G.completedLog.length >= 3 && G.completedLog[0]?.quality > 0.6,
    choices: [
      {
        label: 'Capitalize on it! ($1,000)',
        description: 'Amplify for +15 rep instead of +10',
        effect: () => {
          if (G.money >= 1000) {
            G.money -= 1000;
            G.reputation = Math.min(100, G.reputation + 15);
            G._lastEventResult = 'amplified';
          } else {
            G.reputation = Math.min(100, G.reputation + 10);
            G._lastEventResult = 'organic';
          }
          G.viralBuff = { weeksLeft: 1, organicMultiplier: 2.0 };
        },
        toast: () => G._lastEventResult === 'amplified'
          ? '📱 Viral moment amplified! +15 rep, 2x organic traffic for 1 week.'
          : '📱 Went viral! +10 rep, 2x organic traffic for 1 week.',
      },
      {
        label: 'Enjoy the attention',
        description: '+10 rep, 2x organic for 1 week',
        effect: () => {
          G.reputation = Math.min(100, G.reputation + 10);
          G.viralBuff = { weeksLeft: 1, organicMultiplier: 2.0 };
        },
        toast: '📱 Viral moment! +10 reputation, double organic traffic.',
      },
    ],
  },
  {
    id: 'partnership_offer',
    icon: '🤝',
    title: 'Partnership Opportunity',
    description: 'A complementary company wants to partner. They\'ll send you <b>3 guaranteed premium projects</b> — but they take a <b>25% referral cut</b> on each.',
    category: 'opportunity',
    condition: () => G.day >= 21 && G.reputation >= 35,
    choices: [
      {
        label: 'Accept partnership',
        description: '3 premium projects (75% pay each)',
        effect: () => {
          G.partnershipProjects = 3;
        },
        toast: '🤝 Partnership deal! 3 premium projects incoming (25% referral fee).',
      },
      {
        label: 'Decline',
        description: 'No strings attached',
        effect: () => {},
        toast: '✋ You prefer to grow organically.',
      },
    ],
  },
  {
    id: 'office_flood',
    icon: '🌊',
    title: 'Office Flood!',
    description: 'A pipe burst! One of your offices is flooded. Repairs cost <b>$2,000</b> or you lose the office for 5 days.',
    category: 'disaster',
    condition: () => G.day >= 14 && G.agents.length >= 2,
    choices: [
      {
        label: 'Pay for repairs ($2,000)',
        description: 'Fixed immediately',
        effect: () => {
          G.money -= 2000;
        },
        toast: '🌊 Flood repaired! -$2,000.',
      },
      {
        label: 'Wait for it to dry',
        description: 'Random office disabled for 5 days',
        effect: () => {
          // Pick a random non-lobby office
          const offices = [...new Set(G.agents.map(a => a.role.office))].filter(o => o !== 'lobby');
          if (offices.length > 0) {
            const target = offices[Math.floor(Math.random() * offices.length)];
            G.floodedOffice = { office: target, daysLeft: 5 };
          }
        },
        toast: '🌊 Office flooded! Waiting for it to dry out...',
      },
    ],
  },
  {
    id: 'esop_request',
    icon: '📋',
    title: 'Team Wants Stock Options',
    description: () => {
      const teamSize = G.agents.filter(a => a.roleKey !== 'ceo').length;
      return `Your team of <b>${teamSize} employees</b> is asking for stock options. Creating an ESOP pool would boost retention and motivation — but dilutes your ownership.`;
    },
    category: 'talent',
    condition: () => G.agents.filter(a => a.roleKey !== 'ceo').length >= 4 && G.capTable.esop < 10 && G.capTable.ceo > 50,
    choices: [
      {
        label: 'Create 10% ESOP pool',
        description: () => `CEO: ${G.capTable.ceo}% → ${G.capTable.ceo - 10}% · All staff get +motivation`,
        effect: () => {
          diluteCeo(10, 'esop', 'ESOP pool creation');
          for (const a of G.agents) {
            if (a.roleKey !== 'ceo') {
              a.motivation = Math.min(1, a.motivation + 0.25);
              a.mood = Math.min(1, a.mood + 0.15);
            }
          }
        },
        toast: () => `📋 ESOP created! 10% pool for employees. CEO owns ${G.capTable.ceo}%. Team is motivated!`,
      },
      {
        label: 'Small pool (5%)',
        description: () => `CEO: ${G.capTable.ceo}% → ${G.capTable.ceo - 5}% · Moderate morale boost`,
        effect: () => {
          diluteCeo(5, 'esop', 'ESOP pool (small)');
          for (const a of G.agents) {
            if (a.roleKey !== 'ceo') {
              a.motivation = Math.min(1, a.motivation + 0.12);
            }
          }
        },
        toast: () => `📋 Small ESOP created. CEO owns ${G.capTable.ceo}%.`,
      },
      {
        label: 'No stock options',
        description: 'Risk higher turnover',
        effect: () => {
          for (const a of G.agents) {
            if (a.roleKey !== 'ceo') {
              a.motivation = Math.max(0, a.motivation - 0.1);
            }
          }
        },
        toast: '📋 No ESOP. Team is disappointed — motivation drops.',
      },
    ],
  },
  {
    id: 'angel_investor',
    icon: '👼',
    title: 'Angel Investor Interested',
    description: () => `An angel investor loves your vision. They offer <b>$8,000 for 10%</b> equity — plus they\'ll boost your reputation by +5 through their network. CEO currently owns <b>${G.capTable.ceo}%</b>.`,
    category: 'investment',
    condition: () => G.day >= 10 && G.capTable.ceo > 40 && G.capTable.investors < 40 && !G.vcEquitySold,
    choices: [
      {
        label: 'Accept angel deal',
        description: () => `+$8,000 +5 rep · CEO: ${G.capTable.ceo}% → ${G.capTable.ceo - 10}%`,
        effect: () => {
          G.money += 8000;
          G.reputation = Math.min(100, G.reputation + 5);
          diluteCeo(10, 'investors', 'Angel investor');
        },
        toast: () => `👼 Angel deal! +$8,000 +5 rep. CEO owns ${G.capTable.ceo}%.`,
      },
      {
        label: 'Decline',
        description: () => `Keep ${G.capTable.ceo}% ownership`,
        effect: () => {},
        toast: '🤚 Angel investor passed on.',
      },
    ],
  },
  {
    id: 'acqui_hire_offer',
    icon: '🏢',
    title: 'Acquisition Offer!',
    description: () => {
      const val = getValuationForEvent();
      return `A larger company wants to <b>acqui-hire your team</b>. They\'re offering <b>$${Math.round(val * 0.6).toLocaleString()}</b> (60% of your $${val.toLocaleString()} valuation). Your CEO stake (${G.capTable.ceo}%) would be worth <b>$${Math.round(val * 0.6 * G.capTable.ceo / 100).toLocaleString()}</b>.`;
    },
    category: 'investment',
    condition: () => G.day >= 35 && G.agents.length >= 5 && G.totalRevenue >= 50000,
    choices: [
      {
        label: 'Accept — cash out',
        description: () => {
          const val = getValuationForEvent();
          const payout = Math.round(val * 0.6 * G.capTable.ceo / 100);
          return `CEO gets $${payout.toLocaleString()} · Game ends`;
        },
        effect: () => {
          const val = getValuationForEvent();
          const payout = Math.round(val * 0.6 * G.capTable.ceo / 100);
          G.money += payout;
          G.totalRevenue += payout;
          G._acquiHirePayout = payout;
          // Don't end game — let them keep playing or trigger win
        },
        toast: () => `🏢 Acqui-hire! CEO pocketed $${(G._acquiHirePayout || 0).toLocaleString()}. Company continues under new ownership.`,
      },
      {
        label: 'Keep building',
        description: 'Stay independent',
        effect: () => {
          G.reputation = Math.min(100, G.reputation + 3);
        },
        toast: '💪 You turned down the acquisition. +3 reputation for independence.',
      },
    ],
  },
  {
    id: 'secondary_sale',
    icon: '💎',
    title: 'Secondary Share Sale',
    description: () => `A private buyer wants to buy <b>5% of your company</b> at current valuation. This lets you take <b>cash off the table</b> personally without diluting existing investors.`,
    category: 'investment',
    condition: () => G.day >= 28 && G.capTable.ceo > 30 && G.totalRevenue >= 20000,
    choices: [
      {
        label: 'Sell 5% — cash out',
        description: () => {
          const val = getValuationForEvent();
          const payout = Math.round(val * 0.05);
          return `+$${payout.toLocaleString()} personal · CEO: ${G.capTable.ceo}% → ${G.capTable.ceo - 5}%`;
        },
        effect: () => {
          const val = getValuationForEvent();
          const payout = Math.round(val * 0.05);
          G.money += payout;
          diluteCeo(5, 'investors', 'Secondary share sale');
        },
        toast: () => {
          const val = getValuationForEvent();
          return `💎 Sold 5% at $${val.toLocaleString()} valuation. CEO owns ${G.capTable.ceo}%.`;
        },
      },
      {
        label: 'Hold my shares',
        description: () => `Keep ${G.capTable.ceo}% ownership`,
        effect: () => {},
        toast: '💎 No sale. Diamond hands.',
      },
    ],
  },
  {
    id: 'tech_breakthrough',
    icon: '💡',
    title: 'Industry Tech Breakthrough',
    description: 'A new AI tool can boost your team\'s productivity by <b>+20%</b> — but it costs <b>$4,000</b> to implement.',
    category: 'opportunity',
    condition: () => G.day >= 21 && G.agents.length >= 3,
    choices: [
      {
        label: 'Buy it! ($4,000)',
        description: '+20% efficiency for all agents, 3 weeks',
        effect: () => {
          if (G.money >= 4000) {
            G.money -= 4000;
            G.techBuff = { weeksLeft: 3, efficiencyBonus: 0.20 };
            G._lastEventResult = 'bought';
          } else {
            G._lastEventResult = 'broke';
          }
        },
        toast: () => G._lastEventResult === 'bought'
          ? '💡 Tech upgrade! +20% team efficiency for 3 weeks.'
          : '💡 Can\'t afford the upgrade!',
      },
      {
        label: 'We\'re fine',
        description: 'No change',
        effect: () => {},
        toast: '💡 You passed on the tech upgrade.',
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────
function getBestAgent() {
  const nonCeo = G.agents.filter(a => a.roleKey !== 'ceo');
  if (nonCeo.length === 0) return null;
  return nonCeo.reduce((best, a) => (a.skill + a.iq) > (best.skill + best.iq) ? a : best, nonCeo[0]);
}

// Dilute CEO equity → transfer to investors or ESOP
function diluteCeo(pct, target, label) {
  const actual = Math.min(pct, G.capTable.ceo);
  G.capTable.ceo -= actual;
  G.capTable[target] = (G.capTable[target] || 0) + actual;
  G.equityLog.push({ day: G.day, type: target, pct: actual, label });
}

// Quick valuation estimate (avoids circular dep with economy.js)
function getValuationForEvent() {
  const avgWindow = G.dailyProfitHistory.slice(-10);
  const avgDailyProfit = avgWindow.length > 0
    ? avgWindow.reduce((s, p) => s + p, 0) / avgWindow.length
    : 0;
  const annualProfit = Math.max(0, avgDailyProfit * 365);
  const repBonus = G.reputation > 50 ? (G.reputation - 50) / 100 : 0;
  return Math.round(annualProfit * (4 + repBonus)) || 50000; // fallback $50k
}

// Calculate CEO net worth: valuation × CEO ownership %
export function getCeoNetWorth() {
  const val = getValuationForEvent();
  return Math.round(val * G.capTable.ceo / 100);
}

// ─── Event Engine ─────────────────────────────────────────

// Check and tick down active event buffs each week
export function tickEventBuffs() {
  if (G.competitorDebuff) {
    G.competitorDebuff.weeksLeft--;
    if (G.competitorDebuff.weeksLeft <= 0) {
      G.competitorDebuff = null;
      showToast('⚔️ Competitor impact faded. Market normalized.');
    }
  }
  if (G.marketBoom) {
    G.marketBoom.weeksLeft--;
    if (G.marketBoom.weeksLeft <= 0) {
      G.marketBoom = null;
      showToast('📉 Market boom ended. Back to normal.');
    }
  }
  if (G.viralBuff) {
    G.viralBuff.weeksLeft--;
    if (G.viralBuff.weeksLeft <= 0) {
      G.viralBuff = null;
      showToast('📱 Viral buzz faded.');
    }
  }
  if (G.techBuff) {
    G.techBuff.weeksLeft--;
    if (G.techBuff.weeksLeft <= 0) {
      G.techBuff = null;
      showToast('💡 Tech boost expired.');
    }
  }
}

// Tick down daily buffs
export function tickDailyEventBuffs() {
  if (G.freeWorkerDaysLeft > 0) {
    G.freeWorkerDaysLeft--;
    if (G.freeWorkerDaysLeft <= 0) {
      showToast('🤝 Sweat equity period ended. Engineer leaves.');
    }
  }
  if (G.floodedOffice) {
    G.floodedOffice.daysLeft--;
    if (G.floodedOffice.daysLeft <= 0) {
      showToast(`🌊 ${G.floodedOffice.office} office dried out — back in business!`);
      G.floodedOffice = null;
    }
  }
}

// Try to fire a random event
export function tryFireEvent() {
  if (G.activeEvent) return; // already showing one
  if (G.day < 10) return; // no events in first 10 days

  // Eligible events (not fired recently)
  const firedIds = G.firedEventIds || new Set();
  const eligible = EXTERNAL_EVENTS.filter(e => {
    if (firedIds.has(e.id)) return false;
    try { return e.condition(); } catch { return false; }
  });

  if (eligible.length === 0) {
    // Reset fired events after exhausting all — allow repeats
    if (firedIds.size >= EXTERNAL_EVENTS.length * 0.7) {
      G.firedEventIds = new Set();
    }
    return;
  }

  const event = eligible[Math.floor(Math.random() * eligible.length)];
  G.activeEvent = event;
  G.firedEventIds = firedIds;
  G.firedEventIds.add(event.id);

  // Pause game while deciding
  G.preEventSpeed = G.gameSpeed;
  G.gameSpeed = 0;

  showEventModal(event);
}

// ─── Modal UI ─────────────────────────────────────────────
function showEventModal(event) {
  const modal = document.getElementById('event-modal');
  if (!modal) return;

  const desc = typeof event.description === 'function' ? event.description() : event.description;

  document.getElementById('event-icon').textContent = event.icon;
  document.getElementById('event-title').textContent = event.title;
  document.getElementById('event-description').innerHTML = desc;

  const choicesEl = document.getElementById('event-choices');
  choicesEl.innerHTML = '';

  event.choices.forEach((choice, idx) => {
    // Re-evaluate description for dynamic checks
    const choiceDesc = typeof choice.description === 'function' ? choice.description() : choice.description;

    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    if (idx === 0) btn.classList.add('event-choice-primary');
    btn.innerHTML = `
      <span class="event-choice-label">${choice.label}</span>
      <span class="event-choice-desc">${choiceDesc}</span>
    `;
    btn.addEventListener('click', () => {
      choice.effect();
      const toast = typeof choice.toast === 'function' ? choice.toast() : choice.toast;
      showToast(toast);
      hideEventModal();
      G.activeEvent = null;
      G.gameSpeed = G.preEventSpeed || 1;
      G.uiDirty = true;
    });
    choicesEl.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function hideEventModal() {
  const modal = document.getElementById('event-modal');
  if (modal) modal.style.display = 'none';
}

// ─── Event Buff Getters (for economy.js integration) ───────
export function getCompetitorAcvPenalty() {
  return G.competitorDebuff ? G.competitorDebuff.acvPenalty : 0;
}

export function getCompetitorRetentionPenalty() {
  return G.competitorDebuff ? G.competitorDebuff.retentionPenalty : 0;
}

export function getMarketBoomBonus() {
  return G.marketBoom ? G.marketBoom.bonus : 0;
}

export function getMarketBoomPayBonus() {
  return G.marketBoom ? (G.marketBoom.payBonus || 0) : 0;
}

export function getViralOrganicMultiplier() {
  return G.viralBuff ? G.viralBuff.organicMultiplier : 1.0;
}

export function getTechEfficiencyBonus() {
  return G.techBuff ? G.techBuff.efficiencyBonus : 0;
}

export function getFreeWorkerSavings() {
  // Saves ~$100/day in engineering salary
  return G.freeWorkerDaysLeft > 0 ? 100 : 0;
}

export function isOfficeFlooded(officeKey) {
  return G.floodedOffice && G.floodedOffice.office === officeKey;
}

// Summary of active buffs/debuffs for HUD display
export function getActiveBuffSummary() {
  const buffs = [];
  if (G.competitorDebuff) buffs.push(`⚔️ Competitor: -${Math.round(G.competitorDebuff.acvPenalty * 100)}% ACV (${G.competitorDebuff.weeksLeft}w)`);
  if (G.marketBoom) buffs.push(`🚀 Market Boom: +${Math.round(G.marketBoom.bonus * 100)}% projects (${G.marketBoom.weeksLeft}w)`);
  if (G.viralBuff) buffs.push(`📱 Viral: ${G.viralBuff.organicMultiplier}x organic (${G.viralBuff.weeksLeft}w)`);
  if (G.techBuff) buffs.push(`💡 Tech: +${Math.round(G.techBuff.efficiencyBonus * 100)}% efficiency (${G.techBuff.weeksLeft}w)`);
  if (G.freeWorkerDaysLeft > 0) buffs.push(`🤝 Free worker: ${G.freeWorkerDaysLeft}d left`);
  if (G.floodedOffice) buffs.push(`🌊 ${G.floodedOffice.office} flooded: ${G.floodedOffice.daysLeft}d`);
  return buffs;
}

// Cap table summary for UI
export function getCapTableSummary() {
  const c = G.capTable;
  return { ceo: c.ceo, investors: c.investors, esop: c.esop };
}
