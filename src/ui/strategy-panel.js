// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Strategy Panel (business identity + tech tree)
// ═══════════════════════════════════════════════════════════════

import { OFFICE_GUIDE, COMPANY_TYPES, OFFICE_TYPES, DIVERSIFICATION_CONFIG, GROWTH_MODELS } from '../config.js';
import { getRoomInstances, countRoomsByType } from '../map.js';
import { G } from '../game.js';
import { getUnlockTree, chooseTechBranch, hasDiversifyBranch } from '../progression.js';
import {
  getOfficeCategoriesForCompany, getOfficeRole, canDiversifyOffice,
  getDiversificationCost, getDiversificationSynergyBonus,
} from '../economy.js';
import { showToast } from './toast.js';

let strategyEl = null;

function money(n) {
  return `$${Math.round(n || 0).toLocaleString()}`;
}

function getBusinessIdentity() {
  const companyDef = COMPANY_TYPES[G.companyType];
  if (companyDef) {
    const gm = GROWTH_MODELS[G.companyType];
    const gmBadge = gm ? ` · <span style="font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(80,144,224,0.15);color:#80b8e8;border:1px solid rgba(80,144,224,0.3)">${gm.label}</span>` : '';
    return {
      title: `${companyDef.icon} ${companyDef.name}${gmBadge}`,
      subtitle: companyDef.tagline,
    };
  }
  return { title: 'Unfocused Startup', subtitle: 'Build your first office to define your business model.' };
}

function buildMoneyDrivers() {
  const builtRooms = getRoomInstances();
  const builtTypes = new Set(builtRooms.map(r => r.typeKey));
  const categories = getOfficeCategoriesForCompany();
  let html = '';

  for (const [catKey, cat] of Object.entries(categories)) {
    if (catKey === 'common') continue;
    const roomsInCat = cat.offices.filter(key => builtTypes.has(key) && key !== 'lobby');
    if (roomsInCat.length === 0) continue;

    html += `<div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px">${cat.icon} ${cat.label}</div>`;
    for (const key of roomsInCat) {
      const room = builtRooms.find(r => r.typeKey === key);
      if (!room) continue;
      const active = G.projects.filter(p => p.targetOffice === key && p.state === 'in_progress').length;
      const earned = G.metrics.officeRevenue?.[key] || 0;
      const guide = OFFICE_GUIDE[key];
      if (!guide) continue;

      // Diversification status
      let diversifyHtml = '';
      if (G.remodelingOffices[key] > 0) {
        diversifyHtml = `<div style="font-size:10px;color:var(--warning);margin-top:2px">🏗️ Remodeling (${G.remodelingOffices[key]} day${G.remodelingOffices[key] > 1 ? 's' : ''} left)</div>`;
      } else if (G.diversifiedOffices.has(key)) {
        diversifyHtml = `<div style="font-size:10px;color:#50c878;margin-top:2px">⚡ Diversified to Delivery</div>`;
      } else if (hasDiversifyBranch() && canDiversifyOffice(key)) {
        const cost = getDiversificationCost(key);
        diversifyHtml = `<button class="diversify-btn" data-office="${key}" style="font-size:10px;padding:2px 8px;margin-top:3px;cursor:pointer;background:rgba(80,200,120,0.15);border:1px solid rgba(80,200,120,0.4);border-radius:4px;color:#89dca5">🔀 Diversify ($${cost.toLocaleString()})</button>`;
      }

      html += `
        <div class="strategy-row">
          <div class="strategy-row-main">${room.type.icon} ${room.type.name}</div>
          <div class="strategy-row-meta">${guide.role}</div>
          <div class="strategy-row-sub">${guide.impact}</div>
          <div class="strategy-row-stats">Earned ${money(earned)} · Active ${active}</div>
          ${diversifyHtml}
        </div>
      `;
    }
  }

  // Diversification synergy summary
  const synergy = getDiversificationSynergyBonus();
  if (synergy.payBonus > 0) {
    html += `<div style="font-size:10px;padding:4px 6px;margin-top:6px;background:rgba(80,200,120,0.1);border:1px solid rgba(80,200,120,0.25);border-radius:4px;color:#89dca5">🤝 Delivery Synergy: ${synergy.label}</div>`;
  }

  return html || '<div class="strategy-empty">No money drivers yet. Build your first office.</div>';
}

function getTechTreeRows() {
  const tree = getUnlockTree();
  return tree.map(node => {
    if (node.type === 'branch') {
      const stateIcon = node.unlocked ? '✅' : node.excluded ? '❌' : node.canChoose ? '🔓' : '🔒';
      const bgColor = node.unlocked ? 'rgba(80,200,120,0.1)' : node.excluded ? 'rgba(224,80,80,0.08)' : node.canChoose ? 'rgba(224,160,48,0.1)' : '';
      const borderColor = node.unlocked ? 'rgba(80,200,120,0.3)' : node.excluded ? 'rgba(224,80,80,0.2)' : node.canChoose ? 'rgba(224,160,48,0.3)' : '';
      const chooseBtn = node.canChoose
        ? `<button class="branch-choose-btn" data-branch="${node.key}" style="font-size:10px;padding:3px 10px;margin-top:4px;cursor:pointer;background:rgba(224,160,48,0.2);border:1px solid rgba(224,160,48,0.5);border-radius:4px;color:#f0c040">Choose This Path ($${node.cost.toLocaleString()})</button>`
        : '';
      return `
        <div class="tech-node ${node.unlocked ? 'done' : ''}" style="background:${bgColor};border:1px solid ${borderColor};border-radius:6px;padding:6px 8px;margin:4px 0">
          <div class="tech-title">${stateIcon} Tier ${node.tier} · ${node.icon} ${node.name}</div>
          <div class="tech-progress" style="font-size:11px">${node.requirement}</div>
          <div class="tech-progress">${node.progress}</div>
          ${chooseBtn}
        </div>
      `;
    }
    return `
      <div class="tech-node ${node.unlocked ? 'done' : ''}">
        <div class="tech-title">${node.unlocked ? '✅' : '🔒'} Tier ${node.tier} · ${node.icon} ${node.name}</div>
        <div class="tech-progress">${node.unlocked ? 'Unlocked' : `${node.requirement} (${node.progress})`}</div>
      </div>
    `;
  }).join('');
}

function getSourceMixSummary() {
  const recent = (G.completedLog || []).slice(0, 10);
  if (recent.length === 0) {
    return 'Last 10 sources: no completed projects yet.';
  }

  const counts = { paid: 0, organic: 0, referral: 0 };
  for (const p of recent) {
    const key = p.source === 'paid' || p.source === 'referral' ? p.source : 'organic';
    counts[key]++;
  }

  const total = recent.length;
  const pct = n => Math.round((n / total) * 100);
  return `Last ${total} sources: 📣 Paid ${pct(counts.paid)}% · 🌿 Organic ${pct(counts.organic)}% · 🤝 Referral ${pct(counts.referral)}%`;
}

function getBottleneckDiagnosis() {
  if (G.agents.length === 0) return { state: 'blocked', text: 'No team yet. Hire your first agent.' };

  const hasTrafficOffice = getRoomInstances().some(r =>
    ['content', 'sales', 'marketing', 'seo'].includes(r.typeKey)
  );
  if (!hasTrafficOffice) {
    return { state: 'blocked', text: 'No traffic source. Build Marketing HQ, Content, or Sales.' };
  }

  const staffCount = G.agents.filter(a => a.roleKey !== 'ceo').length;
  if (staffCount === 0) {
    return { state: 'blocked', text: 'No delivery staff. Hire specialists for built offices.' };
  }

  if ((G.metrics.totalVisitors || 0) < 20) {
    return { state: 'warn', text: 'Traffic bottleneck. Build Marketing HQ or improve organic.' };
  }
  if ((G.metrics.leads || 0) < 0.5) {
    return { state: 'warn', text: 'Lead bottleneck. Improve content/design conversion quality.' };
  }
  if ((G.metrics.salesCapacity || 0) < 0.2) {
    return { state: 'warn', text: 'Sales bottleneck. Hire Sales or increase marketing leverage.' };
  }
  if ((G.metrics.clients || 0) < 0.2) {
    return { state: 'warn', text: 'Pipeline is warming up. Keep speed up and monitor inflow.' };
  }

  return { state: 'ok', text: 'Pipeline healthy. Expect regular project inflow.' };
}

export function initStrategyPanel() {
  strategyEl = document.getElementById('strategy-panel');
}

export function updateStrategyPanel() {
  if (!strategyEl) return;

  const identity = getBusinessIdentity();
  const balance = G.metrics.staffingBalance ?? 100;
  const potential = G.metrics.potentialClients ?? 0;
  const actual = G.metrics.clients ?? 0;
  const capacity = G.metrics.salesCapacity ?? 0;
  const balanceNote = balance < 70
    ? 'GTM bottleneck: add Sales/Marketing or reduce delivery headcount.'
    : 'Healthy GTM/Delivery balance.';
  const bottleneck = getBottleneckDiagnosis();
  const bottleneckColor = bottleneck.state === 'ok'
    ? 'var(--success)'
    : bottleneck.state === 'warn' ? 'var(--warning)' : '#e09090';
  const sourceMix = getSourceMixSummary();
  strategyEl.innerHTML = `
    <div class="strategy-card">
      <h4>Business Identity</h4>
      <div class="strategy-business">${identity.title}</div>
      <div class="strategy-note">${identity.subtitle}</div>
    </div>

    <div class="strategy-card">
      <h4>What Makes Money</h4>
      <div class="strategy-note">Potential clients/day: ${potential.toFixed(1)} · Sales capacity/day: ${capacity.toFixed(1)} · Actual projects/day: ${actual.toFixed(1)}</div>
      <div class="strategy-note">GTM balance: ${balance}% · ${balanceNote}</div>
      <div class="strategy-note" style="margin-top:6px;color:${bottleneckColor}">Diagnosis: ${bottleneck.text}</div>
      <div class="strategy-note" style="margin-top:4px">${sourceMix}</div>
      ${buildMoneyDrivers()}
    </div>

    <div class="strategy-card">
      <h4>Tech Tree</h4>
      ${getTechTreeRows()}
    </div>
  `;

  // Branch choice buttons
  strategyEl.querySelectorAll('.branch-choose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const branchKey = btn.dataset.branch;
      const success = chooseTechBranch(branchKey);
      if (success) {
        const labels = { specialize: 'Specialize', diversify_branch: 'Diversify', scale_ops: 'Scale Ops' };
        showToast(`🎯 Branch chosen: ${labels[branchKey] || branchKey}!`);
        G.uiDirty = true;
        updateStrategyPanel();
      } else {
        showToast('Cannot choose this branch — check requirements or funds.');
      }
    });
  });

  // Diversify buttons
  strategyEl.querySelectorAll('.diversify-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const officeKey = btn.dataset.office;
      if (!canDiversifyOffice(officeKey)) {
        showToast('Cannot diversify this office.');
        return;
      }
      const cost = getDiversificationCost(officeKey);
      G.money -= cost;
      G.remodelingOffices[officeKey] = DIVERSIFICATION_CONFIG.remodelingDays;
      const roomDef = OFFICE_TYPES[officeKey];
      showToast(`🏗️ ${roomDef?.name || officeKey} is being remodeled to Delivery (${DIVERSIFICATION_CONFIG.remodelingDays} days)`);
      G.uiDirty = true;
      updateStrategyPanel();
    });
  });
}
