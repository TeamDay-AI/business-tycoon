// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Render Orchestrator (depth sorting, frame)
// ═══════════════════════════════════════════════════════════════

import { getCtx, getSize, getZoom, toScreen, toTile, getMouse } from '../engine.js';
import { getCanvas } from '../engine.js';
import { getRoomInstances } from '../map.js';
import { getAllExpansions, isExpansionAvailable, isExpansionPurchased } from '../floorplan.js';
import { G } from '../game.js';
import { COMPANY_TYPES, GROWTH_MODELS } from '../config.js';
import { calculateValuation, calculateMRR } from '../economy.js';
import { getCeoNetWorth } from '../events.js';
import { drawFloor, drawBuildGrid, drawExpansionZones } from './floor.js';
import { drawBackWalls, drawFrontWalls, drawWallShadows } from './walls.js';
import { drawFurniture } from './furniture.js';
import { drawAgent, drawVisitor, hoveredAgent, setHoveredAgent } from './agents.js';
import { drawRoomActivity, drawParticles, drawEntrance, drawConstruction } from './effects.js';
import { drawBuildGhost } from '../build-mode.js';

let gameOverOverlayShown = false;

export function updateHover() {
  const zoom = getZoom();
  const { x: mouseX, y: mouseY } = getMouse();
  let found = null;
  let foundFurniture = null;

  for (const agent of G.agents) {
    const s = toScreen(agent.x, agent.y);
    const dx = mouseX - s.x, dy = mouseY - (s.y - 10 * zoom);
    if (Math.abs(dx) < 14 * zoom && Math.abs(dy) < 20 * zoom) {
      found = agent;
      break;
    }
  }

  // Check interactive furniture hover
  if (!found) {
    for (const room of getRoomInstances()) {
      for (const f of room.furnitureList) {
        if (!f.interactive) continue;
        const s = toScreen(f.x, f.y);
        const dx = mouseX - s.x, dy = mouseY - (s.y - 10 * zoom);
        if (Math.abs(dx) < 20 * zoom && Math.abs(dy) < 25 * zoom) {
          foundFurniture = { furniture: f, room };
          break;
        }
      }
      if (foundFurniture) break;
    }
  }

  // Check expansion zone hover
  let hoveredExpansion = null;
  if (!found && !foundFurniture && !G.buildMode) {
    const { tx, ty } = toTile(mouseX, mouseY);
    for (const exp of getAllExpansions()) {
      if (isExpansionPurchased(exp.id) || !isExpansionAvailable(exp)) continue;
      if (tx >= exp.x && tx < exp.x + exp.w && ty >= exp.y && ty < exp.y + exp.h) {
        hoveredExpansion = exp;
        break;
      }
    }
  }

  setHoveredAgent(found);
  G._hoveredFurniture = foundFurniture;
  G._hoveredExpansion = hoveredExpansion;
  getCanvas().classList.toggle('pointer', !!found || !!foundFurniture || !!hoveredExpansion || G.buildMode);
}

export function render() {
  const ctx = getCtx();
  const { W, H } = getSize();

  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bg = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, '#1a1520');
  bg.addColorStop(1, '#0d0b0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Floor tiles + expansion zones + build grid overlay
  drawFloor();
  drawExpansionZones();
  drawBuildGrid();

  // Wall shadows on floor (subtle)
  drawWallShadows();

  // Back walls (behind furniture/agents — NW-facing, full height)
  drawBackWalls();

  // Depth-sorted renderables (furniture + agents)
  const renderables = [];
  for (const room of getRoomInstances()) {
    for (const f of room.furnitureList) {
      renderables.push({ type: 'f', data: f, depth: f.x + f.y, y: f.y });
    }
  }
  for (const agent of G.agents) {
    renderables.push({ type: 'a', data: agent, depth: agent.x + agent.y, y: agent.y });
  }
  for (const v of G.visitors) {
    if (v.state !== 'gone') {
      renderables.push({ type: 'v', data: v, depth: v.x + v.y, y: v.y });
    }
  }
  renderables.sort((a, b) => a.depth - b.depth || a.y - b.y);

  for (const r of renderables) {
    if (r.type === 'f') drawFurniture(r.data);
    else if (r.type === 'v') drawVisitor(r.data);
    else drawAgent(r.data);
  }

  // Front walls (AFTER furniture — SE-facing, short, transparent peek-inside)
  drawFrontWalls();

  // Overlays
  drawConstruction();
  drawRoomActivity();
  drawParticles();
  drawEntrance();
  drawBuildGhost();

  // Expansion hover tooltip
  if (G._hoveredExpansion) {
    drawExpansionTooltip(ctx);
  }

  // Game over overlay
  if (G.gameOver) {
    drawGameOverOverlay(ctx, W, H);
  }
}

function drawExpansionTooltip(ctx) {
  const exp = G._hoveredExpansion;
  const { x: mx, y: my } = getMouse();
  const canAfford = G.money >= exp.cost;

  const text = `🗺️ ${exp.name} — $${exp.cost.toLocaleString()}`;
  const hint = canAfford ? 'Click to buy' : 'Not enough funds';
  ctx.font = 'bold 12px system-ui';
  const textW = ctx.measureText(text).width;
  ctx.font = '10px system-ui';
  const hintW = ctx.measureText(hint).width;
  const boxW = Math.max(textW, hintW) + 24;
  const boxH = 42;
  const bx = mx - boxW / 2;
  const by = my - boxH - 14;

  ctx.fillStyle = 'rgba(20,17,22,0.95)';
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = canAfford ? 'rgba(240,180,80,0.5)' : 'rgba(224,80,80,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f0d0a0';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, mx, by + 17);
  ctx.fillStyle = canAfford ? '#50c878' : '#e05050';
  ctx.font = '10px system-ui';
  ctx.fillText(hint, mx, by + 33);
}

function drawGameOverOverlay(ctx, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  // Show HTML overlay on first call
  if (!gameOverOverlayShown) {
    gameOverOverlayShown = true;
    showGameOverOverlay();
  }
}

function showGameOverOverlay() {
  const existing = document.getElementById('game-over-overlay');
  if (existing) existing.remove();

  const isWin = G.gameWon;
  const companyDef = COMPANY_TYPES[G.companyType] || { name: 'Company', icon: '🏢' };
  const growthModel = GROWTH_MODELS[G.companyType] || { model: 'linear', label: 'Linear' };
  const valuation = calculateValuation();
  const ceoNetWorth = getCeoNetWorth();
  const ceoStake = G.capTable.ceo;
  const investorStake = G.capTable.investors;
  const esopStake = G.capTable.esop;

  // Valuation methodology details
  let methodName, methodFormula, methodBreakdown;
  if (growthModel.model === 'exponential') {
    const mrr = calculateMRR();
    const arr = Math.round(mrr * 365);
    let growthRate = 0;
    if (G.mrrHistory.length >= 14) {
      const recent = G.mrrHistory.slice(-7).reduce((s, v) => s + v, 0);
      const prev = G.mrrHistory.slice(-14, -7).reduce((s, v) => s + v, 0);
      growthRate = prev > 0 ? Math.max(0, (recent - prev) / prev) : 0;
    }
    const multiple = 10 + Math.min(10, growthRate * 50);
    methodName = 'Revenue Multiple (SaaS)';
    methodFormula = `ARR × ${multiple.toFixed(1)}x`;
    methodBreakdown = `
      <div class="go-calc-row"><span>Monthly Recurring Revenue</span><span>$${mrr.toLocaleString()}/day</span></div>
      <div class="go-calc-row"><span>Annual Run Rate (ARR)</span><span>$${arr.toLocaleString()}</span></div>
      <div class="go-calc-row"><span>Growth Rate</span><span>${(growthRate * 100).toFixed(0)}%</span></div>
      <div class="go-calc-row highlight"><span>Multiple</span><span>${multiple.toFixed(1)}x</span></div>
    `;
  } else {
    const avgWindow = G.dailyProfitHistory.slice(-10);
    const avgDailyProfit = avgWindow.length > 0
      ? avgWindow.reduce((s, p) => s + p, 0) / avgWindow.length : 0;
    const annualProfit = Math.max(0, Math.round(avgDailyProfit * 365));
    const baseMult = growthModel.model === 'premium' ? 5 : growthModel.model === 'physical' ? 3.5 : 4;
    const repBonus = G.reputation > 50 ? (G.reputation - 50) / 100 : 0;
    const totalMult = baseMult + repBonus;
    const modelLabel = growthModel.model === 'premium' ? 'Consulting'
      : growthModel.model === 'physical' ? 'Physical/Retail' : 'Agency';
    methodName = `EBITDA Multiple (${modelLabel})`;
    methodFormula = `EBITDA × ${totalMult.toFixed(1)}x`;
    methodBreakdown = `
      <div class="go-calc-row"><span>Avg Daily Profit</span><span>$${Math.round(avgDailyProfit).toLocaleString()}</span></div>
      <div class="go-calc-row"><span>Annual EBITDA</span><span>$${annualProfit.toLocaleString()}</span></div>
      <div class="go-calc-row"><span>Base Multiple</span><span>${baseMult}x</span></div>
      ${repBonus > 0 ? `<div class="go-calc-row"><span>Reputation Bonus</span><span>+${repBonus.toFixed(1)}x</span></div>` : ''}
      <div class="go-calc-row highlight"><span>Total Multiple</span><span>${totalMult.toFixed(1)}x</span></div>
    `;
  }

  // ROI from starting $10k
  const startMoney = 10000;
  const roiMultiple = ceoNetWorth > 0 ? (ceoNetWorth / startMoney).toFixed(0) : 0;

  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.innerHTML = `
    <style>
      #game-over-overlay {
        position: fixed; inset: 0; z-index: 50;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.88);
        font-family: system-ui, -apple-system, sans-serif;
        animation: goFadeIn 0.4s ease;
      }
      @keyframes goFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes goSlideUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
      .go-card {
        background: rgba(20,17,22,0.98); border: 1px solid rgba(240,160,80,0.25);
        border-radius: 16px; padding: 32px 36px; text-align: center;
        max-width: 480px; width: 92%; max-height: 90vh; overflow-y: auto;
        animation: goSlideUp 0.5s ease 0.1s both;
        scrollbar-width: thin; scrollbar-color: rgba(240,160,80,0.2) transparent;
      }
      .go-card::-webkit-scrollbar { width: 4px }
      .go-card::-webkit-scrollbar-thumb { background: rgba(240,160,80,0.2); border-radius: 4px }
      .go-emoji { font-size: 44px; margin-bottom: 4px }
      .go-title { font-size: 26px; font-weight: 800; margin: 0 0 2px }
      .go-subtitle { color: #a08870; font-size: 13px; margin: 0 0 20px }
      .go-section { text-align: left; margin-bottom: 16px }
      .go-section-label {
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.2px; color: #665848; margin-bottom: 6px;
      }
      .go-hero {
        background: linear-gradient(135deg, rgba(80,200,120,0.08), rgba(80,200,120,0.02));
        border: 1px solid rgba(80,200,120,0.15); border-radius: 12px;
        padding: 16px; margin-bottom: 16px; text-align: center;
      }
      .go-hero-value { font-size: 32px; font-weight: 800; color: #50c878; margin: 0 }
      .go-hero-label { font-size: 11px; color: #7a9a7a; margin: 2px 0 0 }
      .go-journey {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        margin: 10px 0 0; font-size: 13px; color: #a08870;
      }
      .go-journey-val { font-weight: 700; color: #f0d0a0 }
      .go-journey-arrow { color: #50c878; font-size: 16px }
      .go-journey-mult { font-size: 11px; color: #50c878; font-weight: 700 }
      .go-valuation-box {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px; padding: 14px; text-align: left;
      }
      .go-valuation-method {
        font-size: 11px; font-weight: 600; color: #f0d0a0; margin-bottom: 8px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .go-valuation-method span:last-child { color: #887060; font-weight: 400; font-size: 10px }
      .go-calc-row {
        display: flex; justify-content: space-between; padding: 3px 0;
        font-size: 11px; color: #887060;
      }
      .go-calc-row span:last-child { color: #c0a890; font-weight: 600 }
      .go-calc-row.highlight { color: #f0d0a0; font-weight: 600; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 4px; padding-top: 6px }
      .go-calc-row.highlight span:last-child { color: #f0d0a0 }
      .go-valuation-total {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(240,160,80,0.15);
        font-size: 14px; font-weight: 700; color: #f0d0a0;
      }
      .go-equity-bar {
        display: flex; height: 10px; border-radius: 5px; overflow: hidden;
        margin: 8px 0 6px; background: rgba(255,255,255,0.04);
      }
      .go-equity-seg-ceo { background: #50c878 }
      .go-equity-seg-inv { background: #e07030 }
      .go-equity-seg-esop { background: #5090e0 }
      .go-equity-legend {
        display: flex; justify-content: center; gap: 14px;
        font-size: 10px; color: #887060; margin-bottom: 4px;
      }
      .go-equity-legend span { display: flex; align-items: center; gap: 4px }
      .go-equity-legend .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block }
      .go-stats {
        display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
        margin-bottom: 16px;
      }
      .go-stat {
        background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 6px;
        text-align: center;
      }
      .go-stat-val { font-size: 16px; font-weight: 700; color: #f0d0a0 }
      .go-stat-lbl { font-size: 9px; color: #665848; text-transform: uppercase; letter-spacing: 0.5px }
      .go-lesson {
        background: rgba(240,180,80,0.06); border: 1px solid rgba(240,180,80,0.12);
        border-radius: 8px; padding: 10px 14px; text-align: left;
        font-size: 11px; color: #a08870; line-height: 1.5; margin-bottom: 16px;
      }
      .go-lesson strong { color: #f0d0a0 }
      .go-restart {
        padding: 14px 36px; border-radius: 10px; border: none;
        background: linear-gradient(135deg, #e07030, #c05020); color: white;
        font-size: 15px; font-weight: 700; cursor: pointer;
        transition: all 0.15s; width: 100%;
      }
      .go-restart:hover { transform: translateY(-1px); filter: brightness(1.1) }
    </style>
    <div class="go-card">
      <div class="go-emoji">${isWin ? '🎉' : '💀'}</div>
      <h2 class="go-title" style="color: ${isWin ? '#50c878' : '#e05050'}">
        ${isWin ? 'YOU WIN!' : 'BANKRUPT'}
      </h2>
      <p class="go-subtitle">
        ${companyDef.icon} ${companyDef.name} · ${growthModel.label} · ${G.week} weeks
      </p>

      ${isWin ? `
        <!-- CEO Net Worth Hero -->
        <div class="go-hero">
          <div class="go-hero-value">$${ceoNetWorth.toLocaleString()}</div>
          <div class="go-hero-label">CEO Net Worth</div>
          <div class="go-journey">
            <span class="go-journey-val">$${startMoney.toLocaleString()}</span>
            <span class="go-journey-arrow">→</span>
            <span class="go-journey-val">$${ceoNetWorth.toLocaleString()}</span>
            <span class="go-journey-mult">(${roiMultiple}x)</span>
          </div>
        </div>

        <!-- Valuation Breakdown -->
        <div class="go-section">
          <div class="go-section-label">Business Valuation</div>
          <div class="go-valuation-box">
            <div class="go-valuation-method">
              <span>${methodName}</span>
              <span>${methodFormula}</span>
            </div>
            ${methodBreakdown}
            <div class="go-valuation-total">
              <span>Company Valuation</span>
              <span>$${valuation.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Equity Split -->
        <div class="go-section">
          <div class="go-section-label">Cap Table</div>
          <div class="go-equity-bar">
            <div class="go-equity-seg-ceo" style="width:${ceoStake}%"></div>
            <div class="go-equity-seg-inv" style="width:${investorStake}%"></div>
            <div class="go-equity-seg-esop" style="width:${esopStake}%"></div>
          </div>
          <div class="go-equity-legend">
            <span><span class="dot" style="background:#50c878"></span> CEO ${ceoStake}%</span>
            ${investorStake > 0 ? `<span><span class="dot" style="background:#e07030"></span> Investors ${investorStake}%</span>` : ''}
            ${esopStake > 0 ? `<span><span class="dot" style="background:#5090e0"></span> ESOP ${esopStake}%</span>` : ''}
          </div>
          <div class="go-calc-row" style="margin-top:4px">
            <span>$${valuation.toLocaleString()} × ${ceoStake}% CEO stake</span>
            <span style="color:#50c878;font-weight:700">= $${ceoNetWorth.toLocaleString()}</span>
          </div>
        </div>
      ` : `
        <!-- Bankrupt summary -->
        <div class="go-hero" style="background: linear-gradient(135deg, rgba(224,80,80,0.08), rgba(224,80,80,0.02)); border-color: rgba(224,80,80,0.15)">
          <div class="go-hero-value" style="color:#e05050">Day ${G.day}</div>
          <div class="go-hero-label" style="color:#a07070">Ran out of funds</div>
        </div>
      `}

      <!-- Stats -->
      <div class="go-stats">
        <div class="go-stat">
          <div class="go-stat-val">${G.day}</div>
          <div class="go-stat-lbl">Days</div>
        </div>
        <div class="go-stat">
          <div class="go-stat-val">${G.completedLog.length}</div>
          <div class="go-stat-lbl">Projects</div>
        </div>
        <div class="go-stat">
          <div class="go-stat-val">${G.agents.length}</div>
          <div class="go-stat-lbl">Team Size</div>
        </div>
      </div>

      <!-- Lesson -->
      <div class="go-lesson">
        ${isWin ? getValuationLesson(growthModel.model, ceoStake, roiMultiple) : getBankruptLesson()}
      </div>

      <button class="go-restart" id="restart-btn">Play Again</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('restart-btn').addEventListener('click', () => {
    overlay.remove();
    gameOverOverlayShown = false;
    window.dispatchEvent(new CustomEvent('studio-tycoon-restart'));
  });
}

function getValuationLesson(model, ceoStake, roiMultiple) {
  const tips = [];
  if (model === 'exponential') {
    tips.push('<strong>SaaS businesses</strong> are valued on recurring revenue multiples (10-20x ARR). High growth rates command higher multiples — investors pay for the trajectory, not just today\'s revenue.');
  } else if (model === 'premium') {
    tips.push('<strong>Consulting firms</strong> are valued at ~5x annual profit. Reputation drives premium pricing — the real moat is brand trust, not volume.');
  } else if (model === 'physical') {
    tips.push('<strong>Physical/retail businesses</strong> trade at ~3.5x annual profit. Margins matter more than revenue — operational efficiency is the game.');
  } else {
    tips.push('<strong>Agencies</strong> are typically valued at ~4x annual profit (EBITDA). Unlike SaaS, agencies trade on profitability, not growth rate.');
  }
  if (ceoStake < 60) {
    tips.push(`You kept only <strong>${ceoStake}%</strong> of the company. Dilution funded growth, but eroded your personal upside.`);
  } else if (ceoStake === 100) {
    tips.push('You kept <strong>100%</strong> ownership — bootstrapped all the way. Maximum upside, but a tougher road.');
  }
  if (roiMultiple >= 50) {
    tips.push(`<strong>${roiMultiple}x return</strong> from $10k starting capital — that\'s venture-grade performance.`);
  }
  return tips.join(' ');
}

function getBankruptLesson() {
  const tips = ['Going bankrupt is part of the learning.'];
  if (G.agents.length > 5 && G.day < 30) {
    tips.push('Hiring too fast burns cash before revenue catches up. <strong>Stay lean early.</strong>');
  } else if (G.completedLog.length < 3) {
    tips.push('Too few projects completed. <strong>Focus on getting projects done</strong> to generate revenue.');
  } else {
    tips.push('Watch your daily burn rate vs. revenue. <strong>Profit = survival.</strong>');
  }
  return tips.join(' ');
}

export function resetRenderer() {
  gameOverOverlayShown = false;
}
