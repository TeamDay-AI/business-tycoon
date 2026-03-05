// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Right Panel (projects, staff, offices tabs)
// ═══════════════════════════════════════════════════════════════

import { OFFICE_GUIDE, ROOM_COSTS, AGENT_SALARY, OFFICE_TYPES, COMMON_ROOMS, AGENT_ROLES, PROJECT_TEMPLATES, SENIORITY_LEVELS, seniorityStars, getIQLabel, ALIGNMENT, GROWTH_MODELS } from '../config.js';
import { getRoomInstances } from '../map.js';
import { G } from '../game.js';
import { getOfficeCategoriesForCompany, getReputationPremium, hasProductGrowth, getConsultingPremium } from '../economy.js';
import { Project } from '../project.js';
import { rollCandidatesForRole, getCandidatesForRole } from '../recruitment.js';
import { startTeamBuilding } from '../simulation.js';
import { showToast } from './toast.js';

function getNoProjectsDiagnosis() {
  if (G.agents.length === 0) {
    return 'No active projects — hire your first agent.';
  }

  const hasTrafficSource = getRoomInstances().some(r =>
    ['content', 'sales', 'marketing', 'seo'].includes(r.typeKey)
  );
  if (!hasTrafficSource) {
    return 'No active projects — build Marketing HQ, Content Studio, or Sales Office.';
  }

  const staffCount = G.agents.filter(a => a.roleKey !== 'ceo').length;
  if (staffCount === 0) {
    return 'No active projects — hire delivery staff for at least one office.';
  }

  const totalVisitors = (G.metrics.paidVisitors || 0) + (G.metrics.organicVisitors || 0);
  const leads = G.metrics.leads || 0;
  const salesCapacity = G.metrics.salesCapacity || 0;
  const clients = G.metrics.clients || 0;

  if (totalVisitors < 20) {
    return 'No active projects — traffic is low. Build Marketing HQ for paid ads or grow organic.';
  }
  if (leads < 0.5) {
    return 'No active projects — conversion is weak. Improve design/content setup.';
  }
  if (salesCapacity < 0.2) {
    return 'No active projects — sales capacity is near zero. Hire Sales or add Marketing.';
  }
  if (clients < 0.2) {
    return 'No active projects — pipeline is warming up. Wait a bit or improve GTM balance.';
  }

  return 'No active projects — pipeline is active; next projects should appear soon.';
}

function renderProjectSourceTag(source) {
  if (source === 'paid') return '<span style="font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(224,112,48,0.16);color:#f0b080;border:1px solid rgba(224,112,48,0.35)">📣 Paid</span>';
  if (source === 'referral') return '<span style="font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(80,200,120,0.16);color:#89dca5;border:1px solid rgba(80,200,120,0.35)">🤝 Referral</span>';
  return '<span style="font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(120,140,170,0.16);color:#b7c3d6;border:1px solid rgba(120,140,170,0.35)">🌿 Organic</span>';
}

export function initPanels() {
  // Tab switching
  document.querySelectorAll('.panel-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel-content').forEach(c => c.style.display = 'none');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
    });
  });
}

export function selectAgent(agent) {
  G.selectedAgent = agent;
  document.getElementById('agent-panel').classList.add('visible');
  document.getElementById('panel').classList.add('hidden');
  updateAgentPanel();
}

export function deselectAgent() {
  G.selectedAgent = null;
  document.getElementById('agent-panel').classList.remove('visible');
  document.getElementById('panel').classList.remove('hidden');
}

export function updateAgentPanel() {
  const a = G.selectedAgent;
  if (!a) return;

  const avatarEl = document.getElementById('ap-avatar');
  if (a.avatar) {
    avatarEl.innerHTML = `<img src="${a.avatar}" alt="${a.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else {
    avatarEl.innerHTML = '';
    avatarEl.textContent = a.role.emoji;
  }
  avatarEl.style.background = a.role.color + '20';
  avatarEl.style.borderColor = a.role.color;
  document.getElementById('ap-name').textContent = a.name;

  const roleEl = document.getElementById('ap-role');
  roleEl.textContent = a.role.title;
  roleEl.style.background = a.role.color + '20';
  roleEl.style.color = a.role.color;

  // Seniority stars
  const senEl = document.getElementById('ap-seniority');
  if (senEl) {
    const tier = SENIORITY_LEVELS[a.seniority] || SENIORITY_LEVELS[2];
    const tierColor = a.seniority >= 4 ? '#f0d050' : a.seniority >= 3 ? '#b0c8e8' : 'var(--text-dim)';
    senEl.innerHTML = `<span style="color:${tierColor}">${seniorityStars(a.seniority)} ${tier.label}</span>`;
  }

  document.getElementById('ap-tasks').textContent = a.tasksCompleted;

  const moods = ['😫','😟','😐','🙂','😊','🤩'];
  document.getElementById('ap-mood').textContent = moods[Math.min(5, Math.floor(a.mood * 6))];

  // Skill bar
  const skillEl = document.getElementById('ap-skill');
  if (skillEl) skillEl.textContent = Math.round(a.skill * 100) + '%';

  // Energy bar
  const energyEl = document.getElementById('ap-energy');
  if (energyEl) {
    const ePct = Math.round(a.energy * 100);
    energyEl.textContent = ePct + '%';
    energyEl.style.color = ePct > 60 ? '' : ePct > 35 ? '#e0b430' : '#e05050';
  }
  const energyBarEl = document.getElementById('ap-energy-bar');
  if (energyBarEl) {
    energyBarEl.style.width = Math.round(a.energy * 100) + '%';
    energyBarEl.style.background = a.energy > 0.6 ? '#50c878' : a.energy > 0.35 ? '#e0b430' : '#e05050';
  }

  // IQ display
  const iqLabelEl = document.getElementById('ap-iq-label');
  const iqValueEl = document.getElementById('ap-iq-value');
  if (iqLabelEl) {
    const iqInfo = getIQLabel(a.iq);
    const iqColor = a.iq >= 1.3 ? '#f0d050' : a.iq >= 1.0 ? '#b0c8e8' : 'var(--text-dim)';
    iqLabelEl.textContent = iqInfo.label;
    iqLabelEl.style.color = iqColor;
  }
  if (iqValueEl) {
    iqValueEl.textContent = `Skill cap: ${Math.round(a.maxSkill * 100)}%`;
  }

  // Motivation bar
  const motivEl = document.getElementById('ap-motivation');
  if (motivEl) {
    const mPct = Math.round(a.motivation * 100);
    motivEl.textContent = mPct + '%';
    motivEl.style.color = mPct > 60 ? '' : mPct > 35 ? '#e0a030' : '#e05050';
  }
  const motivBarEl = document.getElementById('ap-motivation-bar');
  if (motivBarEl) {
    const mPct = Math.round(a.motivation * 100);
    motivBarEl.style.width = mPct + '%';
    motivBarEl.style.background = a.motivation > 0.6 ? '#e07030' : a.motivation > 0.35 ? '#e0a030' : '#e05050';
  }

  // Alignment bar
  const alignEl = document.getElementById('ap-alignment');
  if (alignEl) {
    if (a.roleKey === 'ceo') {
      alignEl.textContent = '—';
      alignEl.style.color = 'var(--text-faint)';
    } else {
      const aPct = Math.round(a.alignment * 100);
      alignEl.textContent = aPct + '%';
      alignEl.style.color = aPct > 60 ? '#50a8e8' : aPct > 35 ? '#e0a030' : '#e05050';
    }
  }
  const alignBarEl = document.getElementById('ap-alignment-bar');
  if (alignBarEl) {
    if (a.roleKey === 'ceo') {
      alignBarEl.style.width = '100%';
      alignBarEl.style.background = '#50a8e8';
    } else {
      const aPct = Math.round(a.alignment * 100);
      alignBarEl.style.width = aPct + '%';
      alignBarEl.style.background = a.alignment > 0.6 ? '#50a8e8' : a.alignment > 0.35 ? '#e0a030' : '#e05050';
    }
  }

  // Raise request area
  const raiseArea = document.getElementById('ap-raise-area');
  if (raiseArea) {
    if (a.wantsRaise && a.roleKey !== 'ceo') {
      raiseArea.style.display = '';
      const raiseInfo = document.getElementById('ap-raise-info');
      const currentSalary = a.salary ?? AGENT_SALARY[a.roleKey] ?? 70;
      const daysLeft = Math.max(0, a.raiseDeadline - G.day);
      if (raiseInfo) {
        raiseInfo.textContent = `Current: $${currentSalary}/day → Wants: $${a.expectedSalary}/day (${daysLeft} days left)`;
      }
      // Bind raise buttons (only once per render)
      const giveBtn = document.getElementById('ap-raise-give');
      const denyBtn = document.getElementById('ap-raise-deny');
      if (giveBtn && !giveBtn._bound) {
        giveBtn._bound = true;
        giveBtn.addEventListener('click', () => {
          if (!G.selectedAgent || !G.selectedAgent.wantsRaise) return;
          const ag = G.selectedAgent;
          ag.giveRaise();
          showToast(`💰 ${ag.name} got a raise to $${ag.salary}/day`);
          updateAgentPanel();
        });
      }
      if (denyBtn && !denyBtn._bound) {
        denyBtn._bound = true;
        denyBtn.addEventListener('click', () => {
          if (!G.selectedAgent || !G.selectedAgent.wantsRaise) return;
          const ag = G.selectedAgent;
          ag.denyRaise();
          ag.wantsRaise = false;
          showToast(`${ag.name} is disappointed...`);
          updateAgentPanel();
        });
      }
    } else {
      raiseArea.style.display = 'none';
    }
  }

  // Efficiency
  const effEl = document.getElementById('ap-efficiency');
  if (effEl) effEl.textContent = (a.efficiency).toFixed(2) + 'x';

  const statusText = a.inMeeting ? '🎯 In Meeting'
    : a.state === 'idle' ? '💤 Waiting for tasks'
    : a.state === 'walking' ? '🚶 Moving to position'
    : a.state === 'working' ? '⚡ ' + (a.task ? a.task.name : 'Working')
    : a.state === 'thinking' ? '🧠 AI Processing...'
    : a.state === 'break' ? '☕ On break'
    : a.state;
  document.getElementById('ap-status').textContent = statusText;

  // Revenue
  const revEl = document.getElementById('ap-revenue');
  if (revEl) revEl.textContent = '$' + a.totalRevenue.toLocaleString();

  // Agent actions (micromanagement) — only rebuild if action set changed
  const actionsEl = document.getElementById('ap-actions');
  if (actionsEl) {
    const showActions = (a.state === 'idle' && !a.task && a.roleKey !== 'ceo')
      || (a.roleKey === 'ceo' && a.state === 'idle' && !a.task);
    const actions = showActions ? getAgentActions(a) : [];
    const actionKey = actions.map(act => act.id).join(',');

    // Skip DOM rebuild if same agent + same actions (prevents hover/click flicker)
    if (actionsEl.dataset.key !== `${a.id}:${actionKey}`) {
      actionsEl.dataset.key = `${a.id}:${actionKey}`;
      actionsEl.innerHTML = '';

      if (actions.length > 0) {
        let html = `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-faint);margin-bottom:6px">Assign Task</div>`;
        html += actions.map(act =>
          `<button class="agent-action-btn" data-action="${act.id}" style="
            display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;margin-bottom:4px;
            border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(255,255,255,0.03);
            color:var(--text-body);font-size:12px;cursor:pointer;text-align:left;
            transition:background 0.15s,border-color 0.15s;
          " onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='rgba(255,255,255,0.15)'"
             onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.08)'">
            <span style="font-size:16px">${act.icon}</span>
            <span>
              <div style="font-weight:600">${act.label}</div>
              <div style="font-size:10px;color:var(--text-dim)">${act.desc}</div>
            </span>
          </button>`
        ).join('');
        actionsEl.innerHTML = html;

        actionsEl.querySelectorAll('.agent-action-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const actionId = btn.dataset.action;
            executeAgentAction(a, actionId);
            updateAgentPanel();
          });
        });
      }
    }
  }

  // Work history
  const histEl = document.getElementById('ap-history');
  if (histEl) {
    if (a.workHistory.length === 0) {
      histEl.innerHTML = '<span style="color:var(--text-faint);font-style:italic">No projects yet</span>';
    } else {
      histEl.innerHTML = a.workHistory.map(h => {
        const stars = h.quality > 0.7 ? '⭐' : h.quality > 0.4 ? '✓' : '⚠';
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
          <span>${stars} ${h.name}</span>
          <span style="color:var(--success)">+$${h.pay.toLocaleString()}</span>
        </div>`;
      }).join('');
    }
  }
}

export function updateUI() {
  // HUD stats
  const moneyEl = document.getElementById('hud-money');
  const prevMoney = moneyEl.dataset.prev ? parseInt(moneyEl.dataset.prev) : G.money;
  moneyEl.textContent = '$' + G.money.toLocaleString();
  moneyEl.style.color = G.money < 0 ? '#e05050' : G.money < 500 ? '#e0a030' : '';
  if (G.money > prevMoney + 50) {
    moneyEl.classList.remove('flash-green');
    void moneyEl.offsetWidth; // trigger reflow
    moneyEl.classList.add('flash-green');
  }
  moneyEl.dataset.prev = G.money;
  document.getElementById('hud-revenue').textContent = '$' + G.totalRevenue.toLocaleString();
  document.getElementById('hud-day').textContent = `D${G.day}`;
  document.getElementById('hud-rep').textContent = Math.round(G.reputation);

  // Team alignment HUD
  const hudAlign = document.getElementById('hud-alignment');
  if (hudAlign) {
    const nonCeo = G.agents.filter(a => a.roleKey !== 'ceo');
    if (nonCeo.length > 0) {
      const avg = Math.round(G.teamAlignment * 100);
      hudAlign.textContent = avg + '%';
      hudAlign.style.color = avg > 60 ? '#50a8e8' : avg > 35 ? '#e0a030' : '#e05050';
    } else {
      hudAlign.textContent = '—';
      hudAlign.style.color = 'var(--text-faint)';
    }
  }

  // Debt indicator
  const debtStat = document.getElementById('hud-debt-stat');
  if (debtStat) {
    if (G.debt > 0) {
      debtStat.style.display = '';
      document.getElementById('hud-debt').textContent = '$' + G.debt.toLocaleString();
    } else {
      debtStat.style.display = 'none';
    }
  }

  // Projects tab
  const pl = document.getElementById('project-list');
  pl.innerHTML = G.projects.map(p => {
    const progress = p.progress * 100;
    const workerSuffix = p.assignedAgents?.length ? ` · ${p.assignedAgents.length} worker${p.assignedAgents.length !== 1 ? 's' : ''}` : '';
    const phase = p.state === 'in_progress' ? `${p.currentPhase}${workerSuffix}`
      : (p.stalled ? '<span style="color:#e05050">Needs agent!</span>' : 'Queued');
    const urgent = p.deadlineUrgent;
    const borderStyle = urgent ? ' style="border-color:rgba(224,80,80,0.3)"' : '';
    const daysLeft = p.deadlineRemaining.toFixed(1);
    const deadlineColor = urgent ? '#e05050' : 'var(--text-faint)';
    return `<div class="project-card"${borderStyle}>
      <div class="row"><span class="title">${p.template.icon} ${p.name}</span><span class="pay">$${p.pay.toLocaleString()}</span></div>
      <div style="margin-top:5px;display:flex;align-items:center;gap:8px">
        ${renderProjectSourceTag(p.source)}
        <span style="font-size:10px;color:${deadlineColor}">${urgent ? '⚠️' : '⏰'} ${daysLeft}d left</span>
      </div>
      <div class="phase">${phase}</div>
      <div class="bar"><div class="bar-fill" style="width:${progress}%;background:${p.template.color}"></div></div>
    </div>`;
  }).join('') || `<div style="font-size:12px;color:var(--text-faint);padding:8px 0">${getNoProjectsDiagnosis()}</div>`;

  // Completed log
  const cl = document.getElementById('completed-list');
  cl.innerHTML = G.completedLog.slice(0, 5).map(c => {
    const qualityIcon = c.quality > 0.7 ? '⭐' : c.quality > 0.4 ? '✓' : '⚠';
    const qualityColor = c.quality > 0.7 ? 'var(--warning)' : c.quality > 0.4 ? 'var(--success)' : '#e05050';
    return `<div class="completed-entry">
      <div class="completed-row">
        <span style="color:${qualityColor}">${qualityIcon}</span>
        <span class="completed-name">${c.name}</span>
        <span class="completed-pay">+$${c.pay.toLocaleString()}</span>
      </div>
    </div>`;
  }).join('') || '<span style="color:var(--text-faint)">None yet</span>';

  // Staff tab — use delegated click handler (set once, survives innerHTML rebuilds)
  const sl = document.getElementById('staff-list');
  if (!sl._delegated) {
    sl._delegated = true;
    sl.addEventListener('click', e => {
      const row = e.target.closest('.staff-row');
      if (!row) return;
      const id = parseInt(row.dataset.agentId);
      const agent = G.agents.find(a => a.id === id);
      if (agent) selectAgent(agent);
    });
  }
  sl.innerHTML = G.agents.map(a => {
    const stCls = a.inMeeting ? 'thinking' : a.state === 'working' ? 'working' : a.state === 'thinking' ? 'thinking'
      : a.state === 'walking' ? 'walking' : a.state === 'break' ? 'idle' : 'idle';
    const stText = a.inMeeting ? '🎯 Meeting' : a.state === 'thinking' ? 'AI...' : a.state === 'break' ? 'Break' :
      a.state.charAt(0).toUpperCase() + a.state.slice(1);
    const avatarHtml = a.avatar
      ? `<img class="staff-avatar" src="${a.avatar}" alt="${a.name}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid ${a.role.color}">`
      : `<div class="staff-dot" style="background:${a.role.color}"></div>`;
    const ePct = Math.round(a.energy * 100);
    const eColor = ePct > 60 ? '#50c878' : ePct > 35 ? '#e0b430' : '#e05050';
    const senColor = a.seniority >= 4 ? '#f0d050' : a.seniority >= 3 ? '#b0c8e8' : 'var(--text-faint)';
    const iqInfo = getIQLabel(a.iq);
    const iqColor = a.iq >= 1.3 ? '#f0d050' : a.iq >= 1.0 ? '#b0c8e8' : 'var(--text-faint)';
    const mPct = Math.round(a.motivation * 100);
    const mColor = mPct > 60 ? '#e07030' : mPct > 35 ? '#e0a030' : '#e05050';
    const raiseIcon = a.wantsRaise ? ' 💰' : '';
    const alPct = a.roleKey === 'ceo' ? 100 : Math.round(a.alignment * 100);
    const alColor = alPct > 60 ? '#50a8e8' : alPct > 35 ? '#e0a030' : '#e05050';
    return `<div class="staff-row" data-agent-id="${a.id}">
      ${avatarHtml}
      <span class="staff-name">${a.name}${raiseIcon}</span>
      <span style="font-size:9px;color:${senColor};letter-spacing:-0.5px" title="${(SENIORITY_LEVELS[a.seniority] || SENIORITY_LEVELS[2]).label}">${'★'.repeat(a.seniority)}</span>
      <span style="font-size:9px;color:${iqColor}" title="IQ: ${iqInfo.label}">🧠</span>
      <span title="Alignment: ${alPct}%"><span style="display:inline-block;width:16px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;vertical-align:middle;overflow:hidden"><span style="display:block;width:${alPct}%;height:100%;background:${alColor};border-radius:2px"></span></span></span>
      <span title="Motivation: ${mPct}%"><span style="display:inline-block;width:16px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;vertical-align:middle;overflow:hidden"><span style="display:block;width:${mPct}%;height:100%;background:${mColor};border-radius:2px"></span></span></span>
      <span class="staff-energy" title="Energy: ${ePct}%"><span style="display:inline-block;width:16px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;vertical-align:middle;overflow:hidden"><span style="display:block;width:${ePct}%;height:100%;background:${eColor};border-radius:2px"></span></span></span>
      <span class="staff-status ${stCls}">${stText}</span>
    </div>`;
  }).join('');

  // Offices tab
  const ol = document.getElementById('office-list');
  const rooms = getRoomInstances();

  ol.innerHTML = rooms.map(r => {
    const active = G.projects.find(p => p.state === 'in_progress' && p.targetOffice === r.typeKey);
    const guide = OFFICE_GUIDE[r.typeKey];
    const officeRev = G.metrics.officeRevenue?.[r.typeKey] || 0;
    const agentCount = G.agents.filter(a => {
      const rx = Math.round(a.x), ry = Math.round(a.y);
      return rx >= r.x && rx < r.x + r.w && ry >= r.y && ry < r.y + r.h;
    }).length;
    return `<div style="padding:6px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.03)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span>${r.type.icon} <strong>${r.type.name}</strong>
          <span style="color:var(--text-dim);font-size:11px"> · ${agentCount} agent${agentCount!==1?'s':''}</span>
        </span>
        ${officeRev > 0 ? `<span style="font-size:11px;font-weight:700;color:var(--success);font-variant-numeric:tabular-nums">$${Math.round(officeRev).toLocaleString()}</span>` : ''}
      </div>
      ${guide ? `<div style="font-size:10px;color:var(--text-faint);margin-top:2px">${guide.role} · ${guide.impact}</div>` : ''}
      ${active ? `<div style="color:${active.template.color};font-size:11px;margin-top:2px">● ${active.name}</div>` : ''}
    </div>`;
  }).join('');

  // Update agent panel if open
  if (G.selectedAgent) updateAgentPanel();

  // HUD funnel
  const hudVisitors = document.getElementById('hud-visitors');
  const hudLeads = document.getElementById('hud-leads');
  const hudProjects = document.getElementById('hud-projects');
  const hudAcv = document.getElementById('hud-acv');
  if (hudVisitors) hudVisitors.textContent = Math.round(G.metrics.totalVisitors);
  if (hudLeads) hudLeads.textContent = G.metrics.leads.toFixed(1);
  if (hudProjects) hudProjects.textContent = G.metrics.clients.toFixed(1);
  if (hudAcv) hudAcv.textContent = '$' + (G.metrics.acv || 0).toLocaleString();

  // Growth model — shown only in analytics panel, not in HUD (saves space)

  // Finance summary with P&L categories
  const financeSummary = document.getElementById('finance-summary');
  if (financeSummary) {
    const costs = G.metrics.dailyCosts;
    const rev = G.metrics.dailyRevenue || 0;
    const profit = rev - costs;

    // Calculate costs by P&L category (dynamic)
    const categories = getOfficeCategoriesForCompany();
    const catCosts = {};
    for (const [catKey, cat] of Object.entries(categories)) {
      let total = 0;
      for (const officeKey of cat.offices) {
        const roomCount = rooms.filter(r => r.typeKey === officeKey).length;
        if (roomCount > 0) total += (ROOM_COSTS[officeKey] || 0) * roomCount;
        // Add agent salaries for this office
        for (const a of G.agents) {
          if (a.role?.office === officeKey) {
            total += (a.salary ?? AGENT_SALARY[a.roleKey] ?? 70);
          }
        }
      }
      if (total > 0) catCosts[catKey] = total;
    }

    let catBreakdownHtml = '';
    for (const [catKey, cat] of Object.entries(categories)) {
      if (!catCosts[catKey]) continue;
      catBreakdownHtml += `
        <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px">
          <span style="color:var(--text-dim)">${cat.icon} ${cat.label}</span>
          <span style="color:var(--text-dim)">$${Math.round(catCosts[catKey]).toLocaleString()}/day</span>
        </div>`;
    }

    financeSummary.innerHTML = `
      <h4>Daily P&L</h4>
      <div style="font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0">
          <span style="color:var(--text-dim)">Revenue</span>
          <span style="color:var(--success);font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">
            $${Math.round(rev).toLocaleString()}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0">
          <span style="color:var(--text-dim)">Costs</span>
          <span style="color:#e05050;font-weight:600;font-variant-numeric:tabular-nums">
            -$${Math.round(costs).toLocaleString()}
          </span>
        </div>
        ${catBreakdownHtml ? `<div style="padding:4px 0 2px 8px;border-left:2px solid var(--border)">${catBreakdownHtml}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-top:1px solid var(--border);margin-top:6px">
          <span style="font-weight:700;font-size:13px">Net Profit</span>
          <span style="color:${profit >= 0 ? 'var(--success)' : '#e05050'};font-weight:800;font-size:15px;font-variant-numeric:tabular-nums">
            ${profit >= 0 ? '+' : ''}$${Math.round(profit).toLocaleString()}<span style="font-size:11px;font-weight:500;opacity:0.7">/day</span>
          </span>
        </div>
        <div style="display:flex;gap:12px;padding:6px 0;color:var(--text-faint);font-size:11px;justify-content:flex-end">
          <span>👥 ${G.agents.length} staff</span>
          <span>📁 ${G.projects.filter(p => p.state === 'in_progress').length} active</span>
        </div>
        ${G.debt > 0 ? `
        <div style="border-top:1px solid rgba(224,80,80,0.2);margin-top:4px;padding-top:6px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0">
            <span style="color:#e05050;font-weight:600">🏦 Debt</span>
            <span style="color:#e05050;font-weight:800;font-size:14px;font-variant-numeric:tabular-nums">$${G.debt.toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--text-faint);font-size:10px">
            <span>Weekly interest (${Math.round(G.loanInterestRate * 100)}%)</span>
            <span style="color:#e0a030;font-weight:600">+$${Math.round(G.debt * G.loanInterestRate).toLocaleString()}</span>
          </div>
        </div>` : ''}
      </div>
    `;
  }
}

// ─── Agent Micromanagement ──────────────────────────────
function getAgentActions(agent) {
  const actions = [];
  const office = agent.role.office;

  // CEO can run team building
  if (agent.roleKey === 'ceo') {
    if (!G.teamBuildingActive && G.agents.length > 1) {
      const hasMeeting = getRoomInstances().some(r => r.typeKey === 'meeting');
      if (hasMeeting) {
        const alignPct = Math.round(G.teamAlignment * 100);
        actions.push({
          id: 'ceo:team_building',
          icon: '🎯',
          label: 'Team Building',
          desc: `Align the team (${alignPct}% avg) · All agents stop working`,
        });
      }
    }
    return actions;
  }

  if (office === 'hr') {
    // HR can recruit for any built office that needs staff
    const builtOffices = new Set(getRoomInstances().map(r => r.typeKey));
    for (const [roleKey, roleDef] of Object.entries(AGENT_ROLES)) {
      if (roleKey === 'ceo' || roleKey === 'hr_manager') continue;
      if (!builtOffices.has(roleDef.office)) continue;
      // Show if no candidates exist for this role
      if (getCandidatesForRole(roleKey).length === 0) {
        actions.push({
          id: `recruit:${roleKey}`,
          icon: roleDef.emoji,
          label: `Find ${roleDef.title}`,
          desc: `Run hiring round for ${OFFICE_TYPES[roleDef.office]?.name || roleDef.office}`,
        });
      }
    }
    // Always show generic hiring round
    if (actions.length === 0) {
      actions.push({
        id: 'recruit:any',
        icon: '👥',
        label: 'Hiring Round',
        desc: 'Search for candidates across all departments',
      });
    }
  } else {
    // Non-HR agents: find internal project templates for their office
    const internalTemplates = PROJECT_TEMPLATES.filter(t =>
      t.office === office && !t.clientFacing
    );
    for (const tpl of internalTemplates) {
      // Don't offer if there's already an active project of this type
      const hasActive = G.projects.some(p =>
        p.template.name === tpl.name && (p.state === 'waiting' || p.state === 'in_progress')
      );
      if (!hasActive) {
        actions.push({
          id: `project:${tpl.name}`,
          icon: tpl.icon,
          label: tpl.name,
          desc: `Internal task · ${tpl.phases.join(' → ')}`,
        });
      }
    }
  }
  return actions;
}

function executeAgentAction(agent, actionId) {
  if (actionId === 'ceo:team_building') {
    startTeamBuilding();
    return;
  }
  if (actionId.startsWith('recruit:')) {
    const targetRoleKey = actionId.split(':')[1];

    // Create a Hiring Round project and assign it immediately
    const hiringTpl = PROJECT_TEMPLATES.find(t => t.office === 'hr' && t.name === 'Hiring Round');
    if (!hiringTpl) return;

    const p = new Project(hiringTpl, getReputationPremium());
    p.source = 'internal';
    // Tag which role we're recruiting for (used on completion)
    if (targetRoleKey !== 'any') {
      p._recruitTarget = targetRoleKey;
    }
    G.projects.push(p);
    G.uiDirty = true;

    const roleDef = targetRoleKey !== 'any' ? AGENT_ROLES[targetRoleKey] : null;
    showToast(`📋 Assigned: Find ${roleDef ? roleDef.title : 'candidates'}`);
  } else if (actionId.startsWith('project:')) {
    const tplName = actionId.split(':').slice(1).join(':');
    const tpl = PROJECT_TEMPLATES.find(t => t.name === tplName);
    if (!tpl) return;

    const p = new Project(tpl, getReputationPremium());
    p.source = 'internal';
    G.projects.push(p);
    G.uiDirty = true;
    showToast(`📋 Assigned: ${tpl.icon} ${tpl.name}`);
  }
}
