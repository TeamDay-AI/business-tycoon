// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Simulation Tick Orchestrator
// ═══════════════════════════════════════════════════════════════

import { ECONOMY, PROJECT_TEMPLATES, TUTORIAL_HINTS, COMPANY_TYPES, OFFICE_TYPES, AGENT_ROLES, AGENT_SALARY, SPEECH_RAISE, SPEECH_QUIT, ALIGNMENT, SPEECH_QUIT_MISALIGNED, SPEECH_ALIGNED, SPEECH_TEAM_BUILDING, GROWTH_MODELS } from './config.js';
import { getRoomInstances, findRoomByType, findAllRoomsByType, countRoomsByType, updateConstruction } from './map.js';
import { G, trackEvent } from './game.js';
import { Project } from './project.js';
import {
  calculateFunnel, calculateDailyCosts,
  updateAnalyticsLevel, getReputationPremium,
  getPayMultiplier, getOfficeSynergies,
  getDataLabEfficiencyBonus, getITEfficiencyBonus,
  getLegalPayBonus, getFinanceLoanRate, getWarehouseCapacityBonus, getPRReputationBonus,
  hasSalesCapacity, hasSupportStaffed,
  getMarketingBudget, getSalesCommission,
  getOfficeRole, getProjectSpawnWeight, getOfficeCategoriesForCompany,
  getDiversificationSynergyBonus, calculateACV,
  getPerksBonus,
  hasProductGrowth, calculateMRR, calculateProductLevelGain, getConsultingPremium,
} from './economy.js';
import { toScreen } from './engine.js';
import { showToast } from './ui/toast.js';
import { deselectAgent } from './ui/panels.js';
import { showLevelIntro } from './ui/intro.js';
import { syncRoomUnlocks, getRoomLabel, hasSpecializeBranch } from './progression.js';
import {
  sfxProjectComplete, sfxMoney, sfxSynergy, sfxDeal,
  sfxUnlock, sfxWin, sfxGameOver, sfxDayTick, sfxWeekStart,
  sfxFirstClients,
} from './sfx.js';
import { showLoanModal } from './ui/loan.js';
import { rollCandidatesForRole, getCandidatesForRole, hasHRStaff } from './recruitment.js';
import { tryFireEvent, tickEventBuffs, tickDailyEventBuffs, isOfficeFlooded } from './events.js';
import { Visitor, isRoomOccupiedByVisitor } from './visitor.js';

// ─── Task Assignment ───────────────────────────────────────
function assignTasks() {
  for (const project of G.projects) {
    if (project.state !== 'waiting') continue;

    const targetOffice = project.targetOffice;
    // Skip flooded offices
    if (isOfficeFlooded(targetOffice)) continue;
    const hasMeetingRoom = !!findRoomByType('meeting');
    let maxWorkers = hasMeetingRoom ? 2 : 1;
    // Specialize branch: 2nd worker slot in core delivery offices
    if (hasSpecializeBranch() && getOfficeRole(targetOffice) === 'delivery' && !G.diversifiedOffices.has(targetOffice)) {
      maxWorkers = Math.max(maxWorkers, 2);
    }
    let idleAgents = G.agents
      .filter(a => a.role.office === targetOffice && a.state === 'idle' && !a.task && a.energy > 0.2 && !a.inMeeting && !a._servingVisitor)
      .sort((a, b) => b.energy - a.energy) // prefer well-rested agents
      .slice(0, maxWorkers);

    // CEO can fill any role when no specialists are available
    if (idleAgents.length === 0) {
      const ceo = G.agents.find(a => a.roleKey === 'ceo' && a.state === 'idle' && !a.task && a.energy > 0.2 && !a.inMeeting && !a._servingVisitor);
      if (ceo) idleAgents = [ceo];
    }

    if (idleAgents.length > 0) {
      project.state = 'in_progress';
      project.stalled = false;
      project.assignedAgents = idleAgents;

      const room = findRoomByType(targetOffice);
      for (const agent of idleAgents) {
        agent.task = project;
        if (room) agent.moveToRoom(room.id);
      }
    } else {
      project.stalled = true;
    }
  }
}

// ─── Project Progress ──────────────────────────────────────
function updateProjects(dt) {
  for (const p of G.projects) {
    if (p.state !== 'in_progress') continue;

    const workers = p.assignedAgents.filter(a => a.state === 'working');
    if (workers.length > 0) {
      // Throughput scales with team size and individual efficiency.
      const teamEfficiency = workers.reduce((s, a) => s + a.efficiency, 0);
      const teamBonus = workers.length > 1 ? 1 + (workers.length - 1) * 0.08 : 1;
      p.phaseProgress += (dt / (p.phaseTime * 60)) * teamEfficiency * teamBonus;

      if (p.phaseProgress >= 1) {
        // Calculate quality from workers
        let avgQuality = workers.reduce((s, a) => s + a.quality, 0) / workers.length;

        // Deadline pressure: rushing near deadline reduces quality (-15%)
        if (p.deadlineUrgent) avgQuality *= 0.85;

        // Collaboration bonus: +10% quality if meeting room exists and >1 agent
        const collabBonus = (findRoomByType('meeting') && workers.length > 1) ? 0.1 : 0;

        // Save workers before releasing (advancePhase clears assignedAgents)
        const projectWorkers = [...p.assignedAgents];

        // Release agents (pass task difficulty based on phase time)
        const taskDifficulty = Math.min(3, p.phaseTime / 30); // normalize: 30s base → 1.0
        for (const a of p.assignedAgents) {
          a.onTaskComplete(taskDifficulty);
        }

        if (p.advancePhase(avgQuality + collabBonus)) {
          // Apply synergy bonuses before calculating pay
          const synergy = getOfficeSynergies(p.targetOffice);
          if (synergy.totalBonus > 0) {
            p.qualityScore += synergy.totalBonus;
            p.synergyLabels = synergy.activeLabels;
          }

          // Support bonus: +1 reputation
          const supportRepBonus = hasSupportStaffed() ? 1 : 0;

          // Project complete!
          const isCostProject = p.template?.cost === true;
          let finalPay;
          let commissionCost = 0;

          if (isCostProject) {
            // Cost projects: fixed operational expense, no bonuses applied
            finalPay = Math.round(p.pay); // negative basePay
          } else {
            // Revenue projects: apply all pay bonuses
            finalPay = p.getFinalPay();
            const legalBonus = getLegalPayBonus();
            if (legalBonus > 0) finalPay = Math.round(finalPay * (1 + legalBonus));

            // R&D breakthrough bonus
            if (G.rdBreakthrough && G.rdBreakthrough.office === p.targetOffice && G.week <= G.rdBreakthrough.expiresWeek) {
              finalPay = Math.round(finalPay * 1.20);
            }

            // Company type project pay multiplier
            const companyDef2 = COMPANY_TYPES[G.companyType] || {};
            const companyPayMult = companyDef2.bonuses?.projectPayMultiplier || 1.0;
            if (companyPayMult !== 1.0) finalPay = Math.round(finalPay * companyPayMult);

            // Placement fee multiplier (staffing agency: HR/support projects pay more)
            const placementMult = companyDef2.bonuses?.placementFeeMultiplier || 0;
            if (placementMult > 0 && (p.targetOffice === 'hr' || p.targetOffice === 'support')) {
              finalPay = Math.round(finalPay * placementMult);
            }

            // Consulting/reputation premium: steep non-linear curve
            if (companyDef2.bonuses?.reputationPayMultiplier) {
              const premium = getConsultingPremium();
              finalPay = Math.round(finalPay * premium);
            }

            // Specialize branch: +20% on core delivery projects
            if (hasSpecializeBranch() && getOfficeRole(p.targetOffice) === 'delivery' && !G.diversifiedOffices.has(p.targetOffice)) {
              finalPay = Math.round(finalPay * 1.20);
            }

            // Diversification synergy bonus
            const divSynergy = getDiversificationSynergyBonus();
            if (divSynergy.payBonus > 0) {
              finalPay = Math.round(finalPay * (1 + divSynergy.payBonus));
            }

            // Sales commission deduction (higher commission = bigger deals but eats profit)
            if (p.salesClosed) {
              const { commissionRate } = getSalesCommission();
              if (commissionRate > 0) {
                commissionCost = Math.round(finalPay * commissionRate);
                finalPay -= commissionCost;
              }
            }
          }

          G.money += finalPay;
          if (isCostProject) {
            G.dayCostAcc = (G.dayCostAcc || 0) + Math.abs(finalPay);
          } else {
            G.totalRevenue += finalPay;
            G.dayRevenueAcc += finalPay;
          }
          G.metrics.officeRevenue[p.targetOffice] = (G.metrics.officeRevenue[p.targetOffice] || 0) + finalPay;
          const repDeltaBase = p.getReputationChange() + supportRepBonus;
          const prRepMult = getPRReputationBonus();
          const companyDefRep = COMPANY_TYPES[G.companyType] || {};
          const companyRepMult = companyDefRep.bonuses?.reputationGainMultiplier || 1.0;
          const repDelta = repDeltaBase > 0 ? Math.round(repDeltaBase * prRepMult * companyRepMult) : repDeltaBase;
          G.reputation = Math.round(Math.min(100, Math.max(0, G.reputation + repDelta)));

          // Product level gain (SaaS/AI Lab) from engineering/R&D projects
          if (hasProductGrowth() && (p.targetOffice === 'engineering' || p.targetOffice === 'rd')) {
            const levelGain = calculateProductLevelGain(p.qualityScore);
            G.productLevel = Math.min(100, G.productLevel + levelGain);
            G.engineeringProjectsThisWeek++;
            if (G.productLevel >= 10 && G.productLevel - levelGain < 10) {
              showToast('🔧 Product Lv.10 — MRR is starting to trickle in!');
            } else if (G.productLevel >= 50 && G.productLevel - levelGain < 50) {
              showToast('🚀 Product Lv.50 — MRR inflection point! Passive income exceeds costs.');
            }
          }

          G.completedLog.unshift({
            name: p.name,
            pay: finalPay,
            quality: p.qualityScore,
            time: G.gameTick,
            source: p.source || 'organic',
          });
          if (G.completedLog.length > 20) G.completedLog.pop();

          // Credit workers with project history
          const perAgentPay = Math.round(finalPay / Math.max(1, projectWorkers.length));
          for (const a of projectWorkers) {
            a.totalRevenue += perAgentPay;
            a.workHistory.unshift({ name: p.name, pay: perAgentPay, quality: p.qualityScore, day: G.day });
            if (a.workHistory.length > 10) a.workHistory.pop();
          }

          // Particles
          const room = getRoomInstances().find(r => r.typeKey === p.targetOffice);
          if (room && !isCostProject) {
            const s = toScreen(room.x + room.w / 2, room.y + room.h / 2);
            for (let i = 0; i < 8; i++) {
              G.particles.push(createParticle(s.x, s.y, 'money'));
            }
          }

          const qualityStars = p.qualityScore > 0.7 ? ' ⭐' : p.qualityScore > 0.4 ? '' : ' 😬';
          sfxProjectComplete();
          if (isCostProject) {
            showToast(
              `✅ ${p.name}${qualityStars}<span class="toast-money" style="color:#e06050">-$${Math.abs(finalPay).toLocaleString()}</span>`,
              { html: true }
            );
          } else {
            sfxMoney();
            showToast(
              `✅ ${p.name}${qualityStars}<span class="toast-money">+$${finalPay.toLocaleString()}</span>`,
              { html: true }
            );
          }

          // Synergy toast
          if (synergy.activeLabels.length > 0) {
            sfxSynergy();
            showToast(`🤝 Synergy! ${synergy.activeLabels.join(', ')} → quality +${Math.round(synergy.totalBonus * 100)}%`);
          }
          // Sales commission toast
          if (p.salesClosed && commissionCost > 0) {
            sfxDeal();
            const { commissionRate } = getSalesCommission();
            showToast(
              `💵 Sales deal closed <span class="toast-money" style="color:#e0a030">-$${commissionCost.toLocaleString()}</span> <span style="font-size:10px;color:var(--text-dim)">(${Math.round(commissionRate * 100)}% commission)</span>`,
              { html: true }
            );
          }

          // HR synergy: "Hiring Round" produces candidates for a needed role
          if (p.targetOffice === 'hr' && p.template.name === 'Hiring Round') {
            spawnCandidateVisitor();
            // If manually assigned a target role, recruit for that specifically
            if (p._recruitTarget && AGENT_ROLES[p._recruitTarget]) {
              rollCandidatesForRole(p._recruitTarget, 3);
              const roleDef = AGENT_ROLES[p._recruitTarget];
              showToast(`👥 HR found candidates: ${roleDef.title}!`);
            } else {
              const companyAvail = getCompanyAvailableOffices();
              const candidateRoles = Object.entries(AGENT_ROLES)
                .filter(([k, r]) => k !== 'ceo' && companyAvail.has(r.office) && countRoomsByType(r.office) > 0)
                .filter(([k]) => getCandidatesForRole(k).length === 0)
                .map(([k]) => k);
              if (candidateRoles.length > 0) {
                const targetRole = candidateRoles[Math.floor(Math.random() * candidateRoles.length)];
                rollCandidatesForRole(targetRole, 3);
                const roleDef = AGENT_ROLES[targetRole];
                showToast(`👥 HR found candidates: ${roleDef.title}!`);
              }
            }
          }
        }
      }
    }
  }

  // Remove done projects
  G.projects = G.projects.filter(p => p.state !== 'done');
}

// ─── Day/Week Cycle ────────────────────────────────────────
function processDayCycle(dt) {
  G.dayTicks += dt;

  if (G.dayTicks >= ECONOMY.day_ticks) {
    G.dayTicks -= ECONOMY.day_ticks;
    G.day++;
    sfxDayTick();

    // Analytics milestones
    if ([7, 14, 30, 60, 100].includes(G.day)) {
      trackEvent(`game-day-${G.day}`, { company: G.companyType, money: Math.round(G.money), agents: G.agents.length, revenue: Math.round(G.totalRevenue) });
    }

    // Daily costs
    const costs = calculateDailyCosts();
    G.money -= costs;
    G.metrics.dailyCosts = costs;

    // MRR income (SaaS/AI Lab) — passive revenue from product level
    if (hasProductGrowth() && G.productLevel > 0) {
      const dailyMRR = calculateMRR();
      G.mrr = dailyMRR;
      G.money += dailyMRR;
      G.totalRevenue += dailyMRR;
      G.dayRevenueAcc += dailyMRR;
      G.mrrHistory.push(dailyMRR);
      if (G.mrrHistory.length > 30) G.mrrHistory.shift();
    }

    // Revenue/profit metrics
    const dayRevenue = G.dayRevenueAcc;
    const dayProfit = dayRevenue - costs;
    G.metrics.dailyRevenue = dayRevenue;
    G.dailyProfitHistory.push(dayProfit);
    if (G.dailyProfitHistory.length > 60) G.dailyProfitHistory.shift();

    const weeklyWindow = G.dailyProfitHistory.slice(-ECONOMY.week_days);
    G.metrics.weeklyProfit = weeklyWindow.reduce((sum, p) => sum + p, 0);

    const avgWindow = G.dailyProfitHistory.slice(-10);
    const avgDailyProfit = avgWindow.length > 0
      ? avgWindow.reduce((sum, p) => sum + p, 0) / avgWindow.length
      : 0;
    G.metrics.projectedMonthly = Math.round(avgDailyProfit * 30);
    // Record daily history for cashflow graph
    G.dailyHistory.push({
      day: G.day,
      cash: G.money,
      revenue: dayRevenue,
      costs: costs,
      employees: G.agents.length,
    });
    if (G.dailyHistory.length > 60) G.dailyHistory.shift();

    G.dayRevenueAcc = 0;

    // Day counter for agents + alignment decay
    const teamSize = G.agents.filter(a => a.roleKey !== 'ceo').length;
    for (const a of G.agents) {
      a.daysSinceBreak++;
      // Alignment decays daily — bigger teams drift faster
      if (a.roleKey !== 'ceo') {
        const decay = ALIGNMENT.decay_per_day + Math.max(0, teamSize - 3) * ALIGNMENT.decay_team_size_factor;
        a.alignment = Math.max(0, a.alignment - decay);
      }
    }

    // Update team alignment metric
    const nonCeo = G.agents.filter(a => a.roleKey !== 'ceo');
    G.teamAlignment = nonCeo.length > 0
      ? nonCeo.reduce((sum, a) => sum + a.alignment, 0) / nonCeo.length
      : 1.0;

    // ─── Daily Facility Bonuses (perks_package) ───────────
    const perksBonus = getPerksBonus();
    if (perksBonus.motivRecovery > 0 || perksBonus.moodRecovery > 0) {
      for (const a of G.agents) {
        if (perksBonus.motivRecovery > 0) {
          a.motivation = Math.min(1.0, a.motivation + perksBonus.motivRecovery / ECONOMY.week_days);
        }
        if (perksBonus.moodRecovery > 0) {
          a.mood = Math.min(1.0, a.mood + perksBonus.moodRecovery / ECONOMY.week_days);
        }
      }
    }

    // ─── Salary Negotiation & Quitting ────────────────────
    const hrStaffed = hasHRStaff();
    const agentsToRemove = [];
    for (const a of G.agents) {
      if (a.roleKey === 'ceo') continue;

      const currentSalary = a.salary ?? AGENT_SALARY[a.roleKey] ?? 70;

      // Check for raise request trigger
      if (!a.wantsRaise && currentSalary < a.expectedSalary * 0.85 && a.motivation < 0.5) {
        a.wantsRaise = true;
        a.raiseDeadline = G.day + 7 + (hrStaffed ? 5 : 0);
        a.say(SPEECH_RAISE[Math.floor(Math.random() * SPEECH_RAISE.length)], 250);
        showToast(`💬 ${a.name} wants a raise! ($${currentSalary} → $${a.expectedSalary}/day)`);
      }

      // Check for quitting — salary-based
      if (a.wantsRaise && G.day > a.raiseDeadline && a.motivation < 0.35) {
        // ESOP reduces quit chance: 10% ESOP pool → 30% less likely to leave
        const esopRetention = G.capTable.esop > 0 ? Math.min(0.4, G.capTable.esop * 0.03) : 0;
        const quitChance = Math.max(0.1, (0.5 + a.iq * 0.15 + a.skill * 0.15) - esopRetention);
        if (Math.random() < quitChance) {
          a.say(SPEECH_QUIT[Math.floor(Math.random() * SPEECH_QUIT.length)], 300);
          if (a.task) {
            a.task.state = 'waiting';
            a.task.assignedAgents = a.task.assignedAgents.filter(w => w !== a);
            a.task = null;
          }
          agentsToRemove.push(a);
          showToast(`👋 ${a.name} quit! Not happy with compensation.`);
          continue;
        }
      }

      // Check for quitting — misalignment-based
      // Very low alignment + low motivation = they feel lost and leave
      if (a.alignment < ALIGNMENT.misalignment_quit_threshold && a.motivation < 0.4) {
        const esopRetention2 = G.capTable.esop > 0 ? Math.min(0.1, G.capTable.esop * 0.01) : 0;
        const misalignQuit = Math.max(0.05, 0.15 + (ALIGNMENT.misalignment_quit_threshold - a.alignment) * 2 - esopRetention2);
        if (Math.random() < misalignQuit) {
          a.say(SPEECH_QUIT_MISALIGNED[Math.floor(Math.random() * SPEECH_QUIT_MISALIGNED.length)], 300);
          if (a.task) {
            a.task.state = 'waiting';
            a.task.assignedAgents = a.task.assignedAgents.filter(w => w !== a);
            a.task = null;
          }
          agentsToRemove.push(a);
          showToast(`👋 ${a.name} quit! Team has no direction.`);
        }
      }
    }
    // Remove quitting agents
    if (agentsToRemove.length > 0) {
      G.agents = G.agents.filter(a => !agentsToRemove.includes(a));
      if (G.selectedAgent && agentsToRemove.includes(G.selectedAgent)) {
        deselectAgent();
      }
      G.uiDirty = true;
    }

    // Reputation maintenance: Support office stabilizes reputation
    if (hasSupportStaffed()) {
      G.reputation = Math.round(Math.min(100, G.reputation + ECONOMY.support_rep_gain));
    } else if (G.agents.length > 0) {
      // Only decay if the player has hired anyone (don't punish empty studios)
      G.reputation = Math.round(Math.max(0, G.reputation - ECONOMY.support_rep_decay));
    }

    // Update Data Lab efficiency bonus for agents
    G.dataLabBonus = getDataLabEfficiencyBonus();

    // Update IT efficiency bonus
    G.itBonus = getITEfficiencyBonus();

    // Process remodeling timers (diversification)
    for (const [officeKey, daysLeft] of Object.entries(G.remodelingOffices)) {
      if (daysLeft > 0) {
        G.remodelingOffices[officeKey]--;
        if (G.remodelingOffices[officeKey] <= 0) {
          delete G.remodelingOffices[officeKey];
          G.diversifiedOffices.add(officeKey);
          const roomDef = OFFICE_TYPES[officeKey];
          showToast(`${roomDef?.icon || '🏗️'} ${roomDef?.name || officeKey} remodel complete — now Delivery!`);
        }
      }
    }

    // External events — daily buff ticks + random event trigger
    tickDailyEventBuffs();
    G.eventTimer++;
    // Fire events roughly every 10-20 days (random spread)
    if (G.eventTimer >= 10 && Math.random() < 0.12) {
      G.eventTimer = 0;
      tryFireEvent();
    }

    // Update loan interest rate from Finance office
    G.loanInterestRate = getFinanceLoanRate();

    // Weekly cycle
    if (G.day % ECONOMY.week_days === 0) {
      G.week++;
      processWeek();
    }

    // Check for level-up (driven by revenue/team/offices, not time)
    showLevelIntro({ week: G.week, day: G.day });

    // Update analytics
    updateAnalyticsLevel();

    // Unlock progression
    const newlyUnlocked = syncRoomUnlocks();
    for (const roomKey of newlyUnlocked) {
      sfxUnlock();
      showToast(`🧪 Tech Tree: ${getRoomLabel(roomKey)} unlocked!`);
    }

    // Check win/loss
    const result = G.checkWinCondition();
    if (result === 'win') {
      sfxWin();
      const companyName = COMPANY_TYPES[G.companyType]?.name || 'company';
      showToast(`🎉 $1M REVENUE! You built a thriving ${companyName.toLowerCase()}!`);
    } else if (result === 'need_loan') {
      G.gameSpeed = 0;
      showLoanModal();
    } else if (result === 'bankrupt') {
      sfxGameOver();
      showToast('💀 BANKRUPT! Your company ran out of money.');
    }

    G.uiDirty = true;
  }
}

function processWeek() {
  sfxWeekStart();

  // Tick down weekly event buffs
  tickEventBuffs();

  // Finance office: smarter auto-repay (keeps $1000 buffer instead of $500)
  const financeBuffer = countRoomsByType('finance') > 0 ? 1000 : 500;

  // Loan interest compounds weekly
  const interest = G.applyWeeklyInterest();
  if (interest > 0) {
    showToast(`🏦 Loan interest: +$${interest.toLocaleString()} added to debt`);
  }

  // Auto-repay debt from positive cash balance
  if (G.debt > 0 && G.money > financeBuffer + 500) {
    const repayAmount = Math.min(G.money - financeBuffer, G.debt);
    if (repayAmount > 0) {
      const paid = G.repayDebt(repayAmount);
      if (paid > 0) {
        showToast(`🏦 Auto-repaid $${paid.toLocaleString()} debt`);
      }
    }
  }

  // Tech debt: product level decays if no engineering projects completed this week (SaaS/AI Lab)
  if (hasProductGrowth() && G.productLevel > 0 && G.engineeringProjectsThisWeek === 0) {
    G.productLevel = Math.max(0, G.productLevel - 0.5);
  }
  G.engineeringProjectsThisWeek = 0;

  // R&D breakthrough cycle — rdInnovationRate speeds it up (AI Lab: every 2 weeks vs 3)
  if (countRoomsByType('rd') > 0) {
    G.rdBreakthroughTimer++;
    const companyDef = COMPANY_TYPES[G.companyType] || {};
    const rdRate = companyDef.bonuses?.rdInnovationRate || 1.0;
    const rdCycleWeeks = Math.max(1, Math.round(3 / rdRate));
    if (G.rdBreakthroughTimer >= rdCycleWeeks) {
      G.rdBreakthroughTimer = 0;
      // Pick a random staffed delivery/growth office
      const cats = getOfficeCategoriesForCompany();
      const targetOffices = [...cats.delivery.offices, ...cats.growth.offices];
      const staffed = targetOffices.filter(o =>
        countRoomsByType(o) > 0 && G.agents.some(a => a.role.office === o)
      );
      if (staffed.length > 0) {
        const target = staffed[Math.floor(Math.random() * staffed.length)];
        const roomDef = OFFICE_TYPES[target];
        G.rdBreakthrough = { office: target, expiresWeek: G.week + 2 };
        showToast(`🔬 R&D Breakthrough! ${roomDef?.icon || '🔬'} ${roomDef?.name || target} projects +20% pay for 2 weeks`);
      }
    }
  }

  // Biweekly standup: if meeting room exists, everyone gathers physically
  const hasMeeting = findRoomByType('meeting');
  if (hasMeeting && G.week % 2 === 0 && !G.standupActive && !G.teamBuildingActive) {
    startStandup(hasMeeting);
  } else if (hasMeeting && G.week % 2 === 0 && !G.standupActive) {
    // Team building active, just give the boost silently
    for (const a of G.agents) a.onMeetingBoost();
  }
}

// ─── Helper: offices available for current company type ────
function getCompanyAvailableOffices() {
  const typeKey = G.companyType || 'digital_agency';
  const companyDef = COMPANY_TYPES[typeKey];
  if (!companyDef) return new Set(Object.keys(OFFICE_TYPES));
  return new Set([...companyDef.available, 'lobby', 'breakroom', 'meeting']);
}

// ─── Project Spawning (from client funnel) ─────────────────
function spawnProjects(dt) {
  if (G.gameOver) return;

  // Starter projects: 2 founding client projects after first office + first hire
  if (!G.starterProjectsGiven && G.agents.length > 0 && getRoomInstances().length > 1) {
    G.starterProjectsGiven = true;
    const builtOffices = new Set(getRoomInstances().map(r => r.typeKey));
    const companyAvailable = getCompanyAvailableOffices();
    const validTemplates = PROJECT_TEMPLATES.filter(t =>
      builtOffices.has(t.office) && companyAvailable.has(t.office) &&
      (!t.clientFacing || getOfficeRole(t.office) === 'delivery')
    );
    if (validTemplates.length > 0) {
      for (let i = 0; i < 2; i++) {
        const tpl = validTemplates[Math.floor(Math.random() * validTemplates.length)];
        const premium = getReputationPremium();
        const starterProject = new Project(tpl, premium);
        starterProject.source = 'referral';
        G.projects.push(starterProject);
      }
      sfxFirstClients();
      showToast('🎉 Your first clients are here! 2 founding projects received.');
    }
  }

  const funnel = calculateFunnel();
  calculateACV();
  const paidShare = funnel.totalVisitors > 0
    ? Math.max(0, Math.min(1, funnel.paidVisitors / funnel.totalVisitors))
    : 0;

  // Sales gates project flow: without Sales, only 30% of clients convert to projects
  const hasSales = hasSalesCapacity();
  const flowRate = hasSales ? 1.0 : ECONOMY.no_sales_flow_rate;
  let effectiveClients = funnel.clients * flowRate;

  // Paid campaigns should produce a visible early trickle of opportunities.
  const hasDeliveryStaff = G.agents.length > 0;
  const mktBudget = getMarketingBudget();
  const paidCampaignFloor = (mktBudget >= 80 && hasDeliveryStaff)
    ? Math.min(1.2, 0.25 + mktBudget / 400)
    : 0;
  if (paidCampaignFloor > 0) {
    effectiveClients = Math.max(effectiveClients, hasSales ? paidCampaignFloor : paidCampaignFloor * 0.7);
  }

  // Market boom event buff
  if (G.marketBoom) {
    effectiveClients *= (1 + G.marketBoom.bonus);
  }

  // Clients per day → projects per day_ticks
  const projectsPerTick = effectiveClients / ECONOMY.day_ticks;

  G.spawnTimer += dt * projectsPerTick;

  // Warehouse capacity bonus
  const maxProjects = Math.round(12 * (1 + getWarehouseCapacityBonus()));

  while (G.spawnTimer >= 1 && G.projects.length < maxProjects) {
    G.spawnTimer -= 1;

    // Pick a project template that matches available offices and company type
    const builtOffices2 = new Set(getRoomInstances().map(r => r.typeKey));
    const companyAvailable2 = getCompanyAvailableOffices();
    const validTemplates = PROJECT_TEMPLATES.filter(t => {
      if (!builtOffices2.has(t.office) || !companyAvailable2.has(t.office)) return false;
      // Client-facing templates only spawn when office is in delivery role
      if (t.clientFacing && getOfficeRole(t.office) !== 'delivery') return false;
      // Skip remodeling or flooded offices
      if (G.remodelingOffices[t.office] > 0) return false;
      if (isOfficeFlooded(t.office)) return false;
      return true;
    });

    if (validTemplates.length > 0) {
      // Weighted selection: delivery offices get more projects
      const weights = validTemplates.map(t => getProjectSpawnWeight(t.office));
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      let roll = Math.random() * totalWeight;
      let tplIdx = 0;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { tplIdx = i; break; }
      }
      const tpl = validTemplates[tplIdx];
      const premium = getReputationPremium();
      const payMult = getPayMultiplier();
      const p = new Project(tpl, premium);
      p.pay = Math.round(p.pay * payMult);
      const referralChance = (G.metrics.referralRate || 0) / 100;
      p.source = Math.random() < referralChance ? 'referral'
        : Math.random() < paidShare ? 'paid' : 'organic';
      // Sales commission: bigger deals when sales office is active
      if (hasSales) {
        p.salesClosed = true;
        const { payMultiplier } = getSalesCommission();
        p.pay = Math.round(p.pay * payMultiplier);
      }
      // Bulk order chance (Maker Co, E-commerce): 3x pay projects
      const spawnCompanyDef = COMPANY_TYPES[G.companyType] || {};
      const bulkChance = spawnCompanyDef.bonuses?.bulkOrderChance || 0;
      if (bulkChance > 0 && Math.random() < bulkChance) {
        p.pay *= 3;
        p.name = '\u{1F4E6} Bulk: ' + p.name;
        p.isBulkOrder = true;
      }
      G.projects.push(p);
      G.completedTriggers.add('first_project');
      // Spawn a client visitor walking in
      if (Math.random() < 0.4) spawnClientVisitor();
      G.uiDirty = true;
    }
  }

  // Partnership projects (from external event)
  if (G.partnershipProjects > 0 && G.projects.length < maxProjects) {
    const builtOffices3 = new Set(getRoomInstances().map(r => r.typeKey));
    const companyAvailable3 = getCompanyAvailableOffices();
    const partnerTemplates = PROJECT_TEMPLATES.filter(t =>
      builtOffices3.has(t.office) && companyAvailable3.has(t.office) &&
      (!t.clientFacing || getOfficeRole(t.office) === 'delivery')
    );
    if (partnerTemplates.length > 0) {
      const tpl = partnerTemplates[Math.floor(Math.random() * partnerTemplates.length)];
      const p = new Project(tpl, getReputationPremium());
      p.pay = Math.round(p.pay * 1.5 * 0.75); // premium project with 25% referral cut
      p.source = 'referral';
      p.name = '🤝 ' + p.name;
      G.projects.push(p);
      G.partnershipProjects--;
      showToast(`🤝 Partnership project arrived! ${G.partnershipProjects} remaining.`);
      G.uiDirty = true;
    }
  }

  // Age existing projects & expire overdue ones
  for (const p of G.projects) {
    p.dayAge += dt / ECONOMY.day_ticks;
  }

  // Hard deadline: projects that exceed deadline are FAILED — no payment
  const expired = G.projects.filter(p => p.state !== 'done' && p.dayAge > p.deadline && !p.template?.cost);
  for (const p of expired) {
    // Release assigned agents
    for (const a of p.assignedAgents) {
      a.task = null;
      a.state = 'idle';
      a.workTimer = 0;
    }
    G.reputation = Math.round(Math.max(0, G.reputation - 2));
    showToast(`💀 ${p.name} expired! No payment received. Rep -2`);
  }
  if (expired.length > 0) {
    G.projects = G.projects.filter(p => !expired.includes(p));
    G.uiDirty = true;
  }
}

// ─── Internal Project Spawning (infrastructure offices) ───
// Infrastructure offices (HR, IT, finance, etc.) generate internal work
// on a timer, independent of the client funnel.
function spawnInternalProjects(dt) {
  if (G.gameOver) return;
  if (!G.internalSpawnTimers) G.internalSpawnTimers = {};

  const builtOffices = new Set(getRoomInstances().map(r => r.typeKey));
  const companyAvail = getCompanyAvailableOffices();

  // Internal templates: non-clientFacing templates for infrastructure offices
  const internalTemplates = PROJECT_TEMPLATES.filter(t =>
    !t.clientFacing &&
    builtOffices.has(t.office) &&
    companyAvail.has(t.office) &&
    getOfficeRole(t.office) === 'infrastructure' &&
    !G.remodelingOffices[t.office]
  );

  // Group by office
  const byOffice = new Map();
  for (const t of internalTemplates) {
    if (!byOffice.has(t.office)) byOffice.set(t.office, []);
    byOffice.get(t.office).push(t);
  }

  for (const [office, templates] of byOffice) {
    // Only spawn if the office has idle staff
    const hasStaff = G.agents.some(a => a.role.office === office);
    if (!hasStaff) continue;

    // Don't pile up — skip if there's already a waiting/in-progress project for this office
    const hasActiveProject = G.projects.some(p =>
      p.targetOffice === office && (p.state === 'waiting' || p.state === 'in_progress')
    );
    if (hasActiveProject) continue;

    // Tick the timer (roughly every 3 game-days)
    if (!G.internalSpawnTimers[office]) G.internalSpawnTimers[office] = 0;
    G.internalSpawnTimers[office] += dt;

    const spawnInterval = ECONOMY.day_ticks * 3;
    if (G.internalSpawnTimers[office] >= spawnInterval) {
      G.internalSpawnTimers[office] -= spawnInterval;

      const tpl = templates[Math.floor(Math.random() * templates.length)];
      const p = new Project(tpl, getReputationPremium());
      p.source = 'internal';
      G.projects.push(p);
      G.uiDirty = true;
    }
  }
}

const HINT_BY_TRIGGER = Object.fromEntries(
  TUTORIAL_HINTS.map(h => [h.trigger, h.text])
);

const FIRST_HIRE_HINTS = {
  fashion_retail:  'Your agent needs projects! Build a Shopfront to attract walk-in customers.',
  ecommerce:       'Your agent needs projects! Build a Sales Office and Warehouse to start selling.',
  maker_co:        'Your agent needs projects! Build a Workshop to start making products.',
  tech_lab:        'Your agent needs projects! Build an Engineering Lab to start building tech.',
  staffing_agency: 'Your agent needs projects! Build an HR Office to start placing candidates.',
};
const FIRST_HIRE_DEFAULT = 'Your agent needs projects! Build a Marketing HQ for paid traffic or Sales Office to close deals.';

function showTutorialHint(trigger) {
  let text = HINT_BY_TRIGGER[trigger];
  if (trigger === 'first_hire') text = FIRST_HIRE_HINTS[G.companyType] || FIRST_HIRE_DEFAULT;
  if (!text || G.shownHints.has(trigger)) return false;
  G.shownHints.add(trigger);
  G.lastHintTick = G.gameTick;
  showToast(`💡 ${text}`);
  return true;
}

function updateTutorialHints() {
  // Ensure at least a short gap between hints.
  if (G.gameTick - G.lastHintTick < 220) return;

  if (!G.shownHints.has('start')) {
    showTutorialHint('start');
    return;
  }
  if (G.completedTriggers.has('first_room') && !G.shownHints.has('first_room')) {
    showTutorialHint('first_room');
    return;
  }
  if (G.completedTriggers.has('first_hire') && !G.shownHints.has('first_hire')) {
    showTutorialHint('first_hire');
    return;
  }
  if (G.completedTriggers.has('first_project') && !G.shownHints.has('first_project')) {
    showTutorialHint('first_project');
    return;
  }

  if (!G.shownHints.has('low_mood') && G.agents.some(a => a.mood < 0.4)) {
    showTutorialHint('low_mood');
    return;
  }

  if (!G.shownHints.has('low_energy') && G.agents.some(a => a.energy < 0.25)) {
    showTutorialHint('low_energy');
    return;
  }

  if (!G.shownHints.has('low_motivation') && G.agents.some(a => a.motivation < 0.35)) {
    showTutorialHint('low_motivation');
    return;
  }

  if (!G.shownHints.has('low_alignment') && G.agents.filter(a => a.roleKey !== 'ceo').some(a => a.alignment < 0.25)) {
    showTutorialHint('low_alignment');
    return;
  }

  const stalledCount = G.projects.filter(p => p.stalled).length;
  if (!G.shownHints.has('stalled') && stalledCount >= 2) {
    showTutorialHint('stalled');
    return;
  }

  if (!G.shownHints.has('analytics') && G.day >= 5 && G.analyticsLevel === 0) {
    showTutorialHint('analytics');
  }
}

// ─── Particles ─────────────────────────────────────────────
export function createParticle(x, y, type) {
  return {
    x, y, type, life: 1,
    vx: (Math.random() - 0.5) * 2,
    vy: -2 - Math.random() * 1.5,
    text: type === 'money' ? '+$' : '★',
    color: type === 'money' ? '#50c878' : '#f0d050',
  };
}

function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= dt * 0.015;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

// ─── Weekly Standup Meeting ──────────────────────────────
const STANDUP_CHEERS = [
  'Yeah!', 'Let\'s go!', 'Wooo!', 'Team! 🙌', 'All in!',
  'Let\'s crush it!', 'High five! ✋', 'Go team!', 'Bring it!', 'Heck yeah!',
];

function startStandup(meetingRoom) {
  G.standupActive = true;
  G.standupPhase = 'gather';
  G.standupTimer = 0;

  // Center of meeting room
  const cx = meetingRoom.x + Math.floor(meetingRoom.w / 2);
  const cy = meetingRoom.y + Math.floor(meetingRoom.h / 2);
  G.standupCenter = { x: cx, y: cy };

  // Send available agents — those serving visitors stay behind
  const allAgents = G.ceo ? [G.ceo, ...G.agents.filter(a => a !== G.ceo)] : [...G.agents];
  for (const a of allAgents) {
    if (a._servingVisitor) continue; // don't abandon customers!
    a.inMeeting = true;
    // Release current task
    if (a.task) {
      a.task.state = 'waiting';
      a.task.assignedAgents = a.task.assignedAgents.filter(w => w !== a);
      a.task = null;
    }
    a.state = 'walking';
    a.moveToRoom(meetingRoom.id);
  }
  showToast('🤝 Weekly standup! Everyone to the meeting room.');
}

function updateStandup(dt) {
  if (!G.standupActive) return;

  // Only agents who are actually attending (inMeeting=true)
  const attending = G.agents.filter(a => a.inMeeting);
  if (attending.length === 0) { endStandup(); return; }

  if (G.standupPhase === 'gather') {
    // Wait for everyone to arrive (or timeout)
    G.standupTimer += dt;
    const allArrived = attending.every(a => a.state !== 'walking');
    if (allArrived || G.standupTimer > 150) {
      // Transition to huddle — agents stay where they are (no teleporting)
      G.standupPhase = 'huddle';
      G.standupTimer = 0;
      const cx = G.standupCenter.x;
      const cy = G.standupCenter.y;
      for (const a of attending) {
        if (a.state === 'walking') a.path = []; // stop walking if timed out
        a.state = 'idle';
        a.bobY = 0;
        // Face toward meeting center
        const dx = cx - a.x, dy = cy - a.y;
        if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 1 : 3;
        else a.dir = dy > 0 ? 2 : 0;
      }
    }
  } else if (G.standupPhase === 'huddle') {
    // Brief huddle — agents bob gently, look at each other
    G.standupTimer += dt;
    for (const a of attending) {
      a.bobY = Math.sin(a.frame * 0.06 + a.id) * 1;
      a.state = 'idle'; // keep them in place
    }
    if (G.standupTimer > 60) {
      // Transition to cheer
      G.standupPhase = 'cheer';
      G.standupTimer = 0;
      for (const a of attending) {
        const cheer = STANDUP_CHEERS[Math.floor(Math.random() * STANDUP_CHEERS.length)];
        a.say(cheer, 50);
      }
    }
  } else if (G.standupPhase === 'cheer') {
    // Cheer phase — agents jump/bounce excitedly
    G.standupTimer += dt;
    for (const a of attending) {
      // Excited jumping animation
      a.bobY = -Math.abs(Math.sin((G.standupTimer + a.id * 5) * 0.15)) * 6;
    }
    if (G.standupTimer > 30) {
      endStandup();
    }
  }
}

function endStandup() {
  // Attending agents: release from meeting and walk back to their office
  for (const a of G.agents) {
    if (a.inMeeting) {
      a.inMeeting = false;
      a.bobY = 0;
      a.state = 'idle';
      // Walk back to their office
      const rooms = getRoomInstances();
      const home = rooms.find(r => r.typeKey === a.role.office);
      if (home) a.moveToRoom(home.id);
    }
    // Everyone gets the morale boost (even those who stayed serving customers)
    a.onMeetingBoost();
  }
  G.standupActive = false;
  G.standupPhase = null;
  G.standupTimer = 0;
  G.standupCenter = null;
  showToast('🤝 Standup done! Team morale boosted.');
}

// ─── Team Building (CEO action) ─────────────────────────
function updateTeamBuilding(dt) {
  if (!G.teamBuildingActive) return;

  // Only animate agents actually attending (inMeeting=true)
  const attending = G.agents.filter(a => a.inMeeting);

  // Phase: gather — wait for agents to arrive, then form circle
  if (G.teamBuildingPhase === 'gather') {
    G.teamBuildingTimer -= dt;
    const allArrived = attending.every(a => a.state !== 'walking');
    if (allArrived || G.teamBuildingTimer <= (ALIGNMENT.team_building_ticks - 300)) {
      G.teamBuildingPhase = 'circle';
      // Stop walking agents and face center — no teleporting
      if (G.standupCenter) {
        const cx = G.standupCenter.x, cy = G.standupCenter.y;
        for (const a of attending) {
          if (a.state === 'walking') a.path = [];
          a.state = 'idle';
          const dx = cx - a.x, dy = cy - a.y;
          if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 1 : 3;
          else a.dir = dy > 0 ? 2 : 0;
        }
      }
    }
    return;
  }

  // Phase: circle — agents huddle, CEO speaks
  if (G.teamBuildingPhase === 'circle') {
    G.teamBuildingTimer -= dt;
    for (const a of attending) {
      a.bobY = Math.sin(a.frame * 0.06 + a.id) * 1;
      a.state = 'idle';
    }
    if (G.teamBuildingTimer <= 60) {
      G.teamBuildingPhase = 'cheer';
      for (const a of attending) {
        const cheer = STANDUP_CHEERS[Math.floor(Math.random() * STANDUP_CHEERS.length)];
        a.say(cheer, 60);
      }
    }
    return;
  }

  // Phase: cheer — jumping, then end
  if (G.teamBuildingPhase === 'cheer') {
    G.teamBuildingTimer -= dt;
    for (const a of attending) {
      a.bobY = -Math.abs(Math.sin((G.gameTick + a.id * 5) * 0.15)) * 6;
    }
  }

  if (G.teamBuildingTimer <= 0) {
    // Team building complete — boost all agents
    G.teamBuildingActive = false;
    G.teamBuildingTimer = 0;
    G.teamBuildingPhase = null;
    G.standupCenter = null;

    const rooms = getRoomInstances();
    for (const a of G.agents) {
      if (a.inMeeting) {
        a.inMeeting = false;
        a.bobY = 0;
        a.state = 'idle';
        // Walk back to their office
        const home = rooms.find(r => r.typeKey === a.role.office);
        if (home) a.moveToRoom(home.id);
      }
      // Everyone gets the boost (even those who stayed serving customers)
      a.onTeamBuilding();
    }

    // CEO finishes meeting too
    if (G.ceo) {
      G.ceo.inMeeting = false;
      G.ceo.bobY = 0;
      G.ceo.state = 'idle';
      G.ceo.task = null;
      const ceoRoom = rooms.find(r => r.typeKey === 'ceo');
      if (ceoRoom) G.ceo.moveToRoom(ceoRoom.id);
    }

    const avgAlign = G.agents.filter(a => a.roleKey !== 'ceo').length > 0
      ? G.agents.filter(a => a.roleKey !== 'ceo').reduce((s, a) => s + a.alignment, 0) / G.agents.filter(a => a.roleKey !== 'ceo').length
      : 1;
    G.teamAlignment = avgAlign;

    const alignPct = Math.round(avgAlign * 100);
    const msg = alignPct > 70
      ? SPEECH_ALIGNED[Math.floor(Math.random() * SPEECH_ALIGNED.length)]
      : 'Team alignment improved!';
    showToast(`🎯 Team building done! Alignment: ${alignPct}% — ${msg}`);
    G.uiDirty = true;
  }
}

export function startTeamBuilding() {
  if (G.teamBuildingActive) return false;
  if (!G.ceo) return false;
  if (G.standupActive) return false; // don't overlap with standup

  const hasMeeting = findRoomByType('meeting');
  if (!hasMeeting) {
    showToast('❌ Need a Meeting Room for team building!');
    return false;
  }

  G.teamBuildingActive = true;
  G.teamBuildingTimer = ALIGNMENT.team_building_ticks;
  G.teamBuildingPhase = 'gather';

  // Store meeting room center for circle formation
  const cx = hasMeeting.x + Math.floor(hasMeeting.w / 2);
  const cy = hasMeeting.y + Math.floor(hasMeeting.h / 2);
  G.standupCenter = { x: cx, y: cy };

  // CEO leads the meeting
  G.ceo.inMeeting = true;
  if (G.ceo.task) {
    G.ceo.task.state = 'waiting';
    G.ceo.task.assignedAgents = G.ceo.task.assignedAgents.filter(w => w !== G.ceo);
    G.ceo.task = null;
  }
  G.ceo.state = 'walking';
  G.ceo.say(SPEECH_TEAM_BUILDING[Math.floor(Math.random() * SPEECH_TEAM_BUILDING.length)], 200);
  G.ceo.moveToRoom(hasMeeting.id);

  // All agents join the meeting — except those serving visitors
  for (const a of G.agents) {
    if (a.roleKey === 'ceo') continue;
    if (a._servingVisitor) continue; // don't abandon customers!
    a.inMeeting = true;
    // Release their current task
    if (a.task) {
      a.task.state = 'waiting';
      a.task.assignedAgents = a.task.assignedAgents.filter(w => w !== a);
      a.task = null;
    }
    a.state = 'walking';
    a.moveToRoom(hasMeeting.id);
  }

  showToast('🎯 CEO called a team building! Everyone to the meeting room.');
  G.uiDirty = true;
  return true;
}

// ─── Visitors ───────────────────────────────────────────────
const PATIENCE_DRAIN = { client: 0.0003, candidate: 0.0002, walkin: 0.0004, customer: 0.0003 };
const MAX_VISITORS = 6;

function spawnVisitor(type, targetRoom) {
  if (G.visitors.length >= MAX_VISITORS) return null;
  const v = new Visitor(type, targetRoom);
  if (!v.spawnAtLobbyEntrance()) return null;
  G.visitors.push(v);
  return v;
}

function tickVisitors(dt) {
  // 1. Update all visitors — pass visitors array for queuing checks
  for (const v of G.visitors) {
    // Patience drain in waiting-like states
    const waitState = v.state === 'seated_waiting' || v.state === 'agent_arriving' || v.state === 'queuing_outside';
    if (waitState) {
      const rate = v.state === 'queuing_outside' ? 0.5 : 1.0;
      v.patience -= (PATIENCE_DRAIN[v.type] || 0.0003) * dt * rate;
    }
    v.update(dt, G.visitors);
  }

  // 2. Agent dispatch — find idle agents to send to visitors who need them
  for (const v of G.visitors) {
    if (!v.needsAgent || v.assignedAgent) continue;
    if (v.state !== 'seated_waiting') continue;

    let matchingAgent = null;
    const role = v.requestedRole;

    if (role) {
      // Find idle agent of the right role anywhere in the office
      matchingAgent = G.agents.find(a =>
        a.role.office === role && a.state === 'idle' && !a.task && !a.inMeeting && !a._servingVisitor
      );
    }
    if (!matchingAgent) {
      // Fallback: any idle agent, or CEO
      matchingAgent = G.agents.find(a =>
        a.state === 'idle' && !a.task && !a.inMeeting && !a._servingVisitor
      );
    }

    if (matchingAgent) {
      // Dispatch agent to visitor
      matchingAgent._servingVisitor = v;
      v.assignedAgent = matchingAgent;
      v.needsAgent = false;
      v.state = 'agent_arriving';
      v.stateTimer = 0;

      // Send agent walking to visitor's room or position
      if (v.targetRoom) {
        matchingAgent.moveToRoom(v.targetRoom.id);
      } else {
        matchingAgent.moveTo(Math.round(v.x), Math.round(v.y));
      }
    }
  }

  // 3. Satisfaction modifiers from office amenities (on first tick of seated_waiting)
  const hasBreakroom = !!findRoomByType('breakroom');
  const hasDesign = !!findRoomByType('design');
  for (const v of G.visitors) {
    if (v.state === 'seated_waiting' && v.stateTimer === 0) {
      if (hasBreakroom) v.satisfaction += 0.05;
      if (hasDesign) v.satisfaction += 0.05;
    }
  }

  // 4. Process departures and outcomes
  for (const v of G.visitors) {
    if (v.state !== 'gone') continue;
    applyVisitorOutcome(v);
  }

  // 5. Clean up gone visitors
  G.visitors = G.visitors.filter(v => v.state !== 'gone');

  // 6. Spawn new visitors from events
  const walkinThreshold = findRoomByType('shopfront') ? 15 : 30;
  if (G.reputation > walkinThreshold && G.visitors.length < MAX_VISITORS) {
    const companyDef = COMPANY_TYPES[G.companyType] || {};
    const walkinMult = companyDef.bonuses?.walkinMultiplier || 1.0;
    const walkinChance = (G.reputation - walkinThreshold) / (100 - walkinThreshold) * (1 / 600) * walkinMult;
    if (Math.random() < walkinChance * dt) {
      const hasShopfront = !!findRoomByType('shopfront');
      spawnVisitor(hasShopfront ? 'customer' : 'walkin', hasShopfront ? 'shopfront' : null);
    }
  }
}

function applyVisitorOutcome(v) {
  const satisfied = v.satisfaction > 0.6;
  const verySatisfied = v.satisfaction > 0.8;
  const angry = v.satisfaction <= 0.35;

  if (v.type === 'client' || v.type === 'customer') {
    // Customer purchase — direct sale revenue with money particles
    if (v.type === 'customer' && satisfied) {
      const saleAmount = Math.round(80 + Math.random() * 120 + (verySatisfied ? 100 : 0));
      G.money += saleAmount;
      G.totalRevenue += saleAmount;
      G.reputation = Math.min(100, G.reputation + (verySatisfied ? 1 : 0.3));
      // Green money particles at visitor position
      const s = toScreen(v.x, v.y);
      for (let i = 0; i < 5; i++) {
        const p = createParticle(s.x, s.y, 'money');
        p.text = i === 0 ? `+$${saleAmount}` : '+$';
        G.particles.push(p);
      }
    } else {
      // Client visitors adjust project quality
      const recentProject = G.projects.find(p =>
        p.state === 'in_progress' || p.state === 'waiting'
      );
      if (recentProject) {
        if (verySatisfied) {
          recentProject.qualityScore = Math.min(1, (recentProject.qualityScore || 0.5) + 0.2);
          G.reputation = Math.min(100, G.reputation + 1);
        } else if (satisfied) {
          recentProject.qualityScore = Math.min(1, (recentProject.qualityScore || 0.5) + 0.1);
        } else if (angry) {
          recentProject.qualityScore = Math.max(0, (recentProject.qualityScore || 0.5) - 0.15);
        }
      }
    }
    G.visitorStats.totalServed++;
  } else if (v.type === 'candidate') {
    // Satisfied candidates = better pool quality (handled by HR project completion)
    G.visitorStats.totalServed++;
  } else {
    // Walk-in reputation effects
    if (satisfied) {
      G.reputation = Math.min(100, G.reputation + 0.5);
    } else if (angry) {
      G.reputation = Math.max(0, G.reputation - 0.3);
    }
  }

  if (angry) G.visitorStats.totalAngry++;

  // Running average satisfaction
  const n = G.visitorStats.totalServed + G.visitorStats.totalAngry;
  if (n > 0) {
    G.visitorStats.avgSatisfaction =
      G.visitorStats.avgSatisfaction * ((n - 1) / n) + v.satisfaction / n;
  }
}

// Called from spawnProjects when a new project is created
export function spawnClientVisitor() {
  if (G.visitors.length >= MAX_VISITORS) return;
  const hasShopfront = !!findRoomByType('shopfront');
  const hasSalesRoom = !!findRoomByType('sales');
  spawnVisitor('client', hasShopfront ? 'shopfront' : hasSalesRoom ? 'sales' : 'lobby');
}

// Called when HR hiring round project is spawned
export function spawnCandidateVisitor() {
  if (G.visitors.length >= MAX_VISITORS) return;
  spawnVisitor('candidate', 'hr');
}

// ─── Main Tick ─────────────────────────────────────────────
export function simulationTick(dt) {
  if (G.gameOver) return;

  // Construction progress
  const builtRooms = updateConstruction(dt);
  for (const room of builtRooms) {
    showToast(`✅ ${room.type.icon} ${room.type.name} ready!`);
    G.uiDirty = true;
  }

  // Team building progress
  updateTeamBuilding(dt);
  // Weekly standup progress
  updateStandup(dt);

  // Update agents
  for (const agent of G.agents) agent.update(dt);

  // Project management (skip task assignment during meetings)
  updateProjects(dt);
  if (!G.teamBuildingActive && !G.standupActive) {
    assignTasks();
  }
  spawnProjects(dt);
  spawnInternalProjects(dt);

  // Visitors
  tickVisitors(dt);

  // Day/week cycle
  processDayCycle(dt);
  updateTutorialHints();

  // Particles
  updateParticles(dt);
}
