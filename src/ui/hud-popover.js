// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — HUD Tooltip Popovers
// ═══════════════════════════════════════════════════════════════

import { G } from '../game.js';
import { getRoomInstances } from '../map.js';
import { ECONOMY } from '../config.js';
import { getMarketingBudget, hasSalesCapacity, getReputationPremium } from '../economy.js';
import { getActiveBuffSummary, getCeoNetWorth } from '../events.js';

const popoverEl = () => document.getElementById('hud-popover');
let hideTimer = null;

function row(label, value, color) {
  const c = color ? ` style="color:${color}"` : '';
  return `<div class="hud-popover-row"><span class="lbl">${label}</span><span class="val"${c}>${value}</span></div>`;
}

function divider() {
  return `<div class="hud-popover-divider"></div>`;
}

function getContent(tipKey) {
  const m = G.metrics || {};
  const costs = m.dailyCosts || 0;
  const rev = m.dailyRevenue || 0;
  const profit = rev - costs;

  switch (tipKey) {
    case 'cash': {
      const agentCount = G.agents.length;
      const totalSalary = G.agents.reduce((s, a) => s + (a.salary || 0), 0);
      const roomCount = getRoomInstances().length;
      const mktBudget = getMarketingBudget();
      return `
        <div class="hud-popover-title">💰 Cash Balance</div>
        <div class="hud-popover-desc">Your operating funds. Goes up from completed projects, goes down from daily costs.</div>
        ${row('Daily Revenue', `$${Math.round(rev).toLocaleString()}`, '#50c878')}
        ${row('Daily Costs', `-$${Math.round(costs).toLocaleString()}`, '#e05050')}
        ${divider()}
        ${row('Salaries', `$${totalSalary}/day · ${agentCount} staff`)}
        ${row('Office Rent', `$${roomCount * 15}/day · ${roomCount} rooms`)}
        ${mktBudget > 0 ? row('Marketing', `$${mktBudget}/day`) : ''}
        ${divider()}
        ${row('Net Profit', `${profit >= 0 ? '+' : ''}$${Math.round(profit).toLocaleString()}/day`, profit >= 0 ? '#50c878' : '#e05050')}
        ${G.capTable.ceo < 100 ? `${divider()}${row('CEO Stake', `${G.capTable.ceo}%`, G.capTable.ceo >= 50 ? '#50c878' : '#e0a030')}${G.capTable.investors > 0 ? row('Investors', `${G.capTable.investors}%`, '#e07030') : ''}${G.capTable.esop > 0 ? row('ESOP', `${G.capTable.esop}%`, '#5090e0') : ''}${row('CEO Net Worth', `$${getCeoNetWorth().toLocaleString()}`, G.capTable.ceo >= 50 ? '#50c878' : '#e0a030')}` : ''}
        ${(() => { const buffs = getActiveBuffSummary(); return buffs.length > 0 ? `${divider()}<div class="hud-popover-title" style="font-size:11px;margin-top:2px">Active Events</div>${buffs.map(b => `<div style="font-size:10px;color:var(--text-dim);padding:1px 0">${b}</div>`).join('')}` : ''; })()}
      `;
    }

    case 'revenue': {
      const projectsDone = G.completedLog.length;
      const premium = getReputationPremium();
      const activeProjects = G.projects.filter(p => p.state === 'in_progress').length;
      const waitingProjects = G.projects.filter(p => p.state === 'waiting').length;
      return `
        <div class="hud-popover-title">📈 Total Revenue</div>
        <div class="hud-popover-desc">Lifetime earnings from completed projects. Higher reputation = bigger project payouts.</div>
        ${row('Projects Completed', projectsDone)}
        ${row('Active / Queued', `${activeProjects} / ${waitingProjects}`)}
        ${divider()}
        ${row('Rep Premium', `${Math.round(premium * 100)}%`, premium > 1 ? '#50c878' : '')}
        ${row('Daily Revenue', `$${Math.round(rev).toLocaleString()}/day`, '#50c878')}
      `;
    }

    case 'debt': {
      const rate = G.loanInterestRate || 0;
      const weekly = Math.round(G.debt * rate);
      return `
        <div class="hud-popover-title">🏦 Outstanding Debt</div>
        <div class="hud-popover-desc">Loan balance with weekly interest. Pay it off to reduce overhead.</div>
        ${row('Principal', `$${G.debt.toLocaleString()}`, '#e05050')}
        ${row('Interest Rate', `${Math.round(rate * 100)}%/week`)}
        ${row('Weekly Interest', `+$${weekly.toLocaleString()}`, '#e0a030')}
      `;
    }

    case 'day': {
      const weekDay = ((G.day - 1) % 7) + 1;
      const weeksIn = G.week || Math.ceil(G.day / 7);
      return `
        <div class="hud-popover-title">📅 Day ${G.day}</div>
        <div class="hud-popover-desc">Week ${weeksIn}, Day ${weekDay}/7. Costs are charged daily. Revenue reports are weekly.</div>
        ${row('Week', weeksIn)}
        ${row('Day of Week', `${weekDay}/7`)}
        ${row('Speed', `${G.speed || 1}x`)}
      `;
    }

    case 'rep': {
      const premium = getReputationPremium();
      return `
        <div class="hud-popover-title">⭐ Reputation</div>
        <div class="hud-popover-desc">Your company's reputation. Higher rep attracts more visitors and increases project payouts.</div>
        ${row('Score', Math.round(G.reputation))}
        ${row('Pay Premium', `${Math.round(premium * 100)}%`, premium > 1 ? '#50c878' : '')}
        ${divider()}
        <div class="hud-popover-desc" style="margin:0;font-size:10px">
          +2 rep from ⭐ quality projects<br>
          +1 rep from ✓ decent projects<br>
          -1 rep from late deliveries
        </div>
      `;
    }

    case 'funnel': {
      const hasSales = hasSalesCapacity();
      const flowRate = hasSales ? 1.0 : ECONOMY.no_sales_flow_rate;
      const mktBudget = getMarketingBudget();
      const acv = m.acv || 0;
      const acvFactors = m.acvFactors || [];
      return `
        <div class="hud-popover-title">👁 Client Funnel</div>
        <div class="hud-popover-desc">How visitors become projects. Marketing + Reputation drive traffic. Sales converts leads into clients.</div>
        ${row('👁 Visitors/day', Math.round(m.totalVisitors || 0))}
        ${row('  Organic', Math.round(m.organicVisitors || 0), '#50c878')}
        ${row('  Paid', Math.round(m.paidVisitors || 0), '#4090e0')}
        ${divider()}
        ${row('📞 Leads/day', (m.leads || 0).toFixed(1))}
        ${row('🤝 Deals/day', (m.clients || 0).toFixed(1))}
        ${divider()}
        ${row('Conv. Rate', `${Math.round(flowRate * 100)}%`, hasSales ? '#50c878' : '#e0a030')}
        ${!hasSales ? `<div class="hud-popover-desc" style="margin:4px 0 0;font-size:10px;color:#e0a030">⚠ No Sales office — only ${Math.round(ECONOMY.no_sales_flow_rate * 100)}% of leads convert</div>` : ''}
        ${mktBudget > 0 ? row('Marketing Budget', `$${mktBudget}/day`) : '<div class="hud-popover-desc" style="margin:4px 0 0;font-size:10px;color:var(--text-faint)">💡 Set a marketing budget to boost paid visitors</div>'}
        ${divider()}
        <div class="hud-popover-title" style="font-size:12px;margin-top:2px">💰 ACV — Average Contract Value</div>
        <div class="hud-popover-desc">Expected payout per project based on your current multipliers.</div>
        ${row('ACV', `$${acv.toLocaleString()}`, '#50c878')}
        ${acvFactors.length > 0 ? acvFactors.map(f =>
          row(`  ${f.label}`, `${f.mult > 1 ? '+' : ''}${Math.round((f.mult - 1) * 100)}%`, f.mult > 1 ? '#50c878' : '#e0a030')
        ).join('') : row('  No bonuses yet', '—', 'var(--text-faint)')}
      `;
    }

    case 'alignment': {
      const nonCeo = G.agents.filter(a => a.roleKey !== 'ceo');
      const avg = nonCeo.length > 0
        ? nonCeo.reduce((s, a) => s + a.alignment, 0) / nonCeo.length
        : 0;
      const avgPct = Math.round(avg * 100);
      const lowest = nonCeo.length > 0
        ? nonCeo.reduce((min, a) => a.alignment < min.alignment ? a : min, nonCeo[0])
        : null;
      const misaligned = nonCeo.filter(a => a.alignment < 0.35).length;
      return `
        <div class="hud-popover-title">🎯 Team Alignment</div>
        <div class="hud-popover-desc">How well your team understands the vision. New hires start low. Weekly standups and CEO team building improve alignment.</div>
        ${row('Average', `${avgPct}%`, avgPct > 60 ? '#50a8e8' : avgPct > 35 ? '#e0a030' : '#e05050')}
        ${row('Team Size', nonCeo.length)}
        ${misaligned > 0 ? row('⚠ Misaligned', `${misaligned} agent${misaligned > 1 ? 's' : ''}`, '#e05050') : ''}
        ${lowest ? row('Lowest', `${lowest.name}: ${Math.round(lowest.alignment * 100)}%`, lowest.alignment < 0.35 ? '#e05050' : '') : ''}
        ${divider()}
        <div class="hud-popover-desc" style="margin:0;font-size:10px">
          🤝 Weekly standups: +${Math.round(0.08 * 100)}% alignment<br>
          🎯 CEO Team Building: +${Math.round(0.15 * 100)}% alignment<br>
          ⚠ Low alignment → wasted work, quitting
        </div>
      `;
    }

    default:
      return '';
  }
}

export function initHudPopovers() {
  const el = popoverEl();
  if (!el) return;

  document.querySelectorAll('[data-hud-tip]').forEach(stat => {
    stat.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      const tipKey = stat.dataset.hudTip;
      const content = getContent(tipKey);
      if (!content) return;

      el.innerHTML = content;
      el.classList.add('visible');

      // Position below the stat
      const rect = stat.getBoundingClientRect();
      el.style.left = Math.max(8, rect.left + rect.width / 2 - el.offsetWidth / 2) + 'px';
      el.style.top = (rect.bottom + 8) + 'px';

      // Keep within viewport
      const elRect = el.getBoundingClientRect();
      if (elRect.right > window.innerWidth - 8) {
        el.style.left = (window.innerWidth - elRect.width - 8) + 'px';
      }
    });

    stat.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        el.classList.remove('visible');
      }, 100);
    });
  });
}
