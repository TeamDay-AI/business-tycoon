// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Analytics Panel (insight display, levels 0-3)
// ═══════════════════════════════════════════════════════════════

import { ANALYTICS_LEVELS, GROWTH_MODELS, COMPANY_TYPES } from '../config.js';
import { G } from '../game.js';
import { getAnalyticsInsight, calculateDailyCosts, hasProductGrowth, calculateMRR, getConsultingPremium, calculateValuation } from '../economy.js';
import { getCeoNetWorth } from '../events.js';

let analyticsEl = null;

export function initAnalyticsPanel() {
  analyticsEl = document.getElementById('analytics-panel');
}

export function updateAnalyticsPanel() {
  if (!analyticsEl) return;

  const level = G.analyticsLevel;
  const levelInfo = ANALYTICS_LEVELS[level];
  const m = G.metrics;

  let html = `
    <div class="analytics-header">
      <h3>📊 Business Insights</h3>
      <span class="analytics-level">Level ${level}: ${levelInfo.name}</span>
    </div>
    <p class="analytics-desc">${levelInfo.description}</p>
  `;

  if (level === 0) {
    html += `
      <div class="analytics-card vague">
        <div class="insight">${getAnalyticsInsight('visitors', m.totalVisitors)}</div>
        <div class="insight">${getAnalyticsInsight('leads', m.leads)}</div>
        <div class="insight">${getAnalyticsInsight('revenue', m.dailyRevenue)}</div>
      </div>
      <div class="analytics-hint">Build a Data Lab to see real numbers.</div>
    `;
  } else if (level === 1) {
    html += `
      <div class="analytics-card basic">
        <div class="metric-row">
          <span class="metric-label">Visitors</span>
          <span class="metric-value">${getAnalyticsInsight('visitors', m.totalVisitors)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Leads</span>
          <span class="metric-value">${getAnalyticsInsight('leads', m.leads)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Costs</span>
          <span class="metric-value">${getAnalyticsInsight('costs', m.dailyCosts || calculateDailyCosts())}</span>
        </div>
      </div>
      <div class="analytics-hint">Hire a Data Analyst for exact metrics.</div>
    `;
  } else if (level === 2) {
    html += `
      <div class="analytics-card standard">
        <div class="metric-row">
          <span class="metric-label">Daily Visitors</span>
          <span class="metric-value">${getAnalyticsInsight('visitors', m.totalVisitors)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Leads/Day</span>
          <span class="metric-value">${getAnalyticsInsight('leads', m.leads)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Conversion</span>
          <span class="metric-value">${m.websiteCR}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Close Rate</span>
          <span class="metric-value">${m.closeRate}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Daily Costs</span>
          <span class="metric-value negative">${getAnalyticsInsight('costs', m.dailyCosts || calculateDailyCosts())}</span>
        </div>
      </div>
      <div class="analytics-hint">Level up your analyst for full funnel insights.</div>
    `;
  } else {
    // Level 3: Full insight
    html += `
      <div class="analytics-card full">
        <h4>AARRR Funnel</h4>
        <div class="funnel">
          <div class="funnel-row">
            <span>🌐 Acquisition</span>
            <span>${getAnalyticsInsight('visitors', m.totalVisitors)}</span>
          </div>
          <div class="funnel-arrow">↓ ${m.websiteCR}% CR</div>
          <div class="funnel-row">
            <span>🎯 Activation</span>
            <span>${getAnalyticsInsight('leads', m.leads)}</span>
          </div>
          <div class="funnel-arrow">↓ ${m.closeRate}% close</div>
          <div class="funnel-row">
            <span>💰 Revenue</span>
            <span>${m.clients.toFixed(1)}/day · <strong style="color:var(--success)">$${(m.acv || 0).toLocaleString()}</strong> ACV</span>
          </div>
          <div class="funnel-arrow">↓</div>
          <div class="funnel-row" style="background:${m.retentionRate > 75 ? 'rgba(80,200,120,0.06)' : 'rgba(224,80,80,0.06)'}">
            <span>🔄 Retention</span>
            <span style="color:${m.retentionRate > 75 ? 'var(--success)' : m.retentionRate > 60 ? 'var(--warning)' : '#e05050'};font-weight:700">${m.retentionRate}%</span>
          </div>
          <div class="funnel-arrow">↓</div>
          <div class="funnel-row">
            <span>📣 Referral</span>
            <span style="color:${m.referralRate > 5 ? 'var(--success)' : 'var(--text-dim)'}">${m.referralRate}%</span>
          </div>
        </div>

        <h4>Quality Scores</h4>
        <div class="quality-bars">
          <div class="quality-row">
            <span>Content</span>
            <div class="q-bar"><div class="q-fill" style="width:${m.contentQuality}%;background:#9068d0"></div></div>
            <span>${m.contentQuality}%</span>
          </div>
          <div class="quality-row">
            <span>Design</span>
            <div class="q-bar"><div class="q-fill" style="width:${m.designQuality}%;background:#d058a0"></div></div>
            <span>${m.designQuality}%</span>
          </div>
          <div class="quality-row">
            <span>SEO</span>
            <div class="q-bar"><div class="q-fill" style="width:${m.seoQuality}%;background:#50b868"></div></div>
            <span>${m.seoQuality}%</span>
          </div>
          <div class="quality-row">
            <span>Sales</span>
            <div class="q-bar"><div class="q-fill" style="width:${m.salesFactor}%;background:#e0a030"></div></div>
            <span>${m.salesFactor}%</span>
          </div>
        </div>

        <h4>Deal Value (ACV)</h4>
        <div class="metric-row" style="padding:5px 0">
          <span style="font-weight:600">Avg Contract Value</span>
          <span class="positive" style="font-weight:800;font-size:15px;font-variant-numeric:tabular-nums">
            $${(m.acv || 0).toLocaleString()}
          </span>
        </div>
        ${(m.acvFactors || []).length > 0 ? `
          <div style="padding:2px 0 6px 8px;border-left:2px solid var(--border)">
            ${(m.acvFactors || []).map(f => `
              <div class="metric-row" style="font-size:10px;padding:1px 0">
                <span style="color:var(--text-dim)">${f.label}</span>
                <span style="color:${f.mult >= 1 ? 'var(--success)' : '#e05050'}">${f.mult >= 1 ? '+' : ''}${Math.round((f.mult - 1) * 100)}%</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <h4>Projections</h4>
        <div class="metric-row">
          <span>Weekly Profit</span>
          <span class="${G.metrics.weeklyProfit >= 0 ? 'positive' : 'negative'}" style="font-weight:700;font-variant-numeric:tabular-nums">
            ${m.weeklyProfit >= 0 ? '+' : ''}$${Math.round(m.weeklyProfit).toLocaleString()}<span style="font-weight:400;opacity:0.7">/wk</span>
          </span>
        </div>
        <div class="metric-row" style="font-size:13px;padding:5px 0">
          <span style="font-weight:600">Monthly Projection</span>
          <span class="${m.projectedMonthly >= 0 ? 'positive' : 'negative'}" style="font-weight:800;font-size:14px;font-variant-numeric:tabular-nums">
            ${m.projectedMonthly >= 0 ? '+' : ''}$${Math.round(m.projectedMonthly).toLocaleString()}<span style="font-weight:400;font-size:11px;opacity:0.7">/mo</span>
          </span>
        </div>
        <div class="metric-row recommendation">
          ${getRecommendation()}
        </div>

        ${getGrowthModelCard()}

        <h4>Company Valuation</h4>
        <div class="metric-row" style="padding:5px 0">
          <span style="font-weight:600">Estimated Value</span>
          <span style="font-weight:800;font-size:15px;color:#f0d050;font-variant-numeric:tabular-nums">
            $${calculateValuation().toLocaleString()}
          </span>
        </div>
        <div style="font-size:10px;color:var(--text-faint);padding:2px 0">
          ${getValuationMethod()}
        </div>

        <h4>Cap Table</h4>
        ${getCapTableCard()}

        <div class="metric-row" style="padding:6px 0;border-top:1px solid var(--border);margin-top:4px">
          <span style="font-weight:700">CEO Net Worth</span>
          <span style="font-weight:800;font-size:16px;color:${G.capTable.ceo >= 50 ? '#50c878' : G.capTable.ceo >= 25 ? '#e0a030' : '#e05050'};font-variant-numeric:tabular-nums">
            $${getCeoNetWorth().toLocaleString()}
          </span>
        </div>
        <div style="font-size:10px;color:var(--text-faint);padding:2px 0">
          Valuation × ${G.capTable.ceo}% CEO stake
        </div>
      </div>
    `;
  }

  analyticsEl.innerHTML = html;
}

function getRecommendation() {
  const m = G.metrics;
  if (G.agents.length === 0) return '💡 Hire your first agent to get started!';
  if (m.totalVisitors < 10) {
    if (G.companyType === 'fashion_retail') return '💡 Build more Shopfronts and hire Shop Assistants for walk-in customers.';
    return '💡 Build a Marketing HQ for paid traffic or grow organic with Content/SEO.';
  }
  if (m.leads > 5 && m.closeRate < 10) return '💡 Hire a Sales Rep to improve your close rate.';
  if (m.contentQuality < 30) return '💡 Hire a Content Writer to improve organic traffic.';
  if (m.designQuality < 30) return '💡 A Designer would boost your conversion rate.';
  if (G.agents.some(a => a.mood < 0.4)) return '💡 Your team needs a break! Build a Break Room.';
  const stalledCount = G.projects.filter(p => p.stalled).length;
  if (stalledCount > 2) return `💡 ${stalledCount} projects stalled — hire more agents!`;
  return '📈 Business is running well. Keep growing!';
}

function getGrowthModelCard() {
  const gm = GROWTH_MODELS[G.companyType];
  if (!gm) return '';

  let content = '';

  if (gm.model === 'exponential') {
    // SaaS / AI Lab — Product level bar + MRR trend
    const lvl = Math.round(G.productLevel);
    const dailyMRR = calculateMRR();
    const lvlColor = lvl > 50 ? '#50c878' : lvl > 25 ? '#e0a030' : '#5090c0';
    const profitPoint = G.metrics.dailyCosts > 0
      ? Math.round((G.metrics.dailyCosts / Math.max(1, (G.companyType === 'saas_startup' ? 15 : 10))) / ((G.metrics.retentionRate || 60) / 100))
      : 0;
    content = `
      <div class="metric-row" style="padding:4px 0">
        <span>Product Level</span>
        <span style="font-weight:700;color:${lvlColor}">${lvl}/100</span>
      </div>
      <div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;margin:4px 0;overflow:hidden">
        <div style="width:${lvl}%;height:100%;background:${lvlColor};border-radius:3px;transition:width 0.3s"></div>
      </div>
      <div class="metric-row" style="padding:4px 0">
        <span>Daily MRR</span>
        <span style="font-weight:700;color:var(--success)">$${dailyMRR.toLocaleString()}/day</span>
      </div>
      ${profitPoint > 0 ? `<div style="font-size:10px;color:var(--text-faint);padding:2px 0">Path to profitability: Product Lv.${profitPoint}</div>` : ''}
    `;
  } else if (gm.model === 'premium') {
    // Consulting — reputation curve + current premium
    const premium = getConsultingPremium();
    const premColor = premium > 2.0 ? '#f0d050' : premium > 1.3 ? '#b0c8e8' : 'var(--text-dim)';
    content = `
      <div class="metric-row" style="padding:4px 0">
        <span>Reputation Premium</span>
        <span style="font-weight:700;color:${premColor}">${premium.toFixed(2)}x</span>
      </div>
      <div style="font-size:10px;color:var(--text-faint);padding:2px 0">
        Build reputation through PR, Support, and quality work. Premium scales exponentially above rep 50.
      </div>
    `;
  } else if (gm.model === 'physical') {
    // Maker / E-commerce — bulk order stats
    const companyDef = COMPANY_TYPES[G.companyType] || {};
    const bulkChance = companyDef.bonuses?.bulkOrderChance || 0;
    const bulkCount = (G.completedLog || []).filter(p => p.name && p.name.includes('Bulk:')).length;
    const revenuePerEmployee = G.agents.length > 0
      ? Math.round(G.totalRevenue / G.agents.length)
      : 0;
    content = `
      <div class="metric-row" style="padding:4px 0">
        <span>Bulk Order Chance</span>
        <span style="font-weight:700">${Math.round(bulkChance * 100)}%</span>
      </div>
      <div class="metric-row" style="padding:4px 0">
        <span>Bulk Orders Completed</span>
        <span style="font-weight:700;color:var(--success)">${bulkCount}</span>
      </div>
      <div class="metric-row" style="padding:4px 0">
        <span>Revenue/Employee</span>
        <span style="font-weight:700">$${revenuePerEmployee.toLocaleString()}</span>
      </div>
    `;
  } else {
    // Linear (Agency, Staffing) — headcount efficiency
    const revenuePerEmployee = G.agents.length > 0
      ? Math.round(G.totalRevenue / G.agents.length)
      : 0;
    content = `
      <div class="metric-row" style="padding:4px 0">
        <span>Revenue/Employee</span>
        <span style="font-weight:700">$${revenuePerEmployee.toLocaleString()}</span>
      </div>
      <div class="metric-row" style="padding:4px 0">
        <span>Headcount</span>
        <span style="font-weight:700">${G.agents.length}</span>
      </div>
    `;
  }

  return `
    <h4>${gm.label}</h4>
    ${content}
  `;
}

function getCapTableCard() {
  const c = G.capTable;
  const total = c.ceo + c.investors + c.esop;
  // Normalize in case rounding issues
  const ceoPct = Math.round(c.ceo / total * 100);
  const invPct = Math.round(c.investors / total * 100);
  const esopPct = 100 - ceoPct - invPct;

  const ceoColor = '#50c878';
  const invColor = '#e07030';
  const esopColor = '#5090e0';

  let html = `
    <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin:6px 0">
      ${ceoPct > 0 ? `<div style="width:${ceoPct}%;background:${ceoColor}"></div>` : ''}
      ${invPct > 0 ? `<div style="width:${invPct}%;background:${invColor}"></div>` : ''}
      ${esopPct > 0 ? `<div style="width:${esopPct}%;background:${esopColor}"></div>` : ''}
    </div>
    <div style="display:flex;gap:10px;font-size:10px;flex-wrap:wrap">
      <span style="color:${ceoColor}">● CEO ${c.ceo}%</span>
      ${c.investors > 0 ? `<span style="color:${invColor}">● Investors ${c.investors}%</span>` : ''}
      ${c.esop > 0 ? `<span style="color:${esopColor}">● ESOP ${c.esop}%</span>` : ''}
    </div>
  `;

  // Show dilution history
  if (G.equityLog.length > 0) {
    html += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid var(--border)">`;
    for (const e of G.equityLog.slice(-5)) {
      const color = e.type === 'investors' ? invColor : esopColor;
      html += `<div style="font-size:10px;color:var(--text-dim);padding:1px 0">
        <span style="color:${color}">D${e.day}</span> -${e.pct}% → ${e.label}
      </div>`;
    }
    html += `</div>`;
  }

  return html;
}

function getValuationMethod() {
  const gm = GROWTH_MODELS[G.companyType];
  if (!gm) return '';
  if (gm.model === 'exponential') return 'ARR multiple (10-20x based on MRR growth rate)';
  if (gm.model === 'premium') return 'EBITDA multiple (5x + reputation bonus)';
  if (gm.model === 'physical') return 'EBITDA multiple (3.5x)';
  return 'EBITDA multiple (4x)';
}
