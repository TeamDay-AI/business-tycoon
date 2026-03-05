// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Cashflow Graph (canvas mini chart)
// ═══════════════════════════════════════════════════════════════

import { G } from '../game.js';

const chartTargets = [];

export function initCashflowGraph() {
  chartTargets.length = 0;
  for (const id of ['cashflow-canvas', 'cashflow-floating-canvas']) {
    const canvas = document.getElementById(id);
    if (canvas) chartTargets.push({ canvas, ctx: canvas.getContext('2d') });
  }
}

export function updateCashflowGraph() {
  if (chartTargets.length === 0) return;
  for (const target of chartTargets) drawChart(target.canvas, target.ctx);
}

function drawChart(canvas, ctx) {
  const data = G.dailyHistory;
  if (data.length < 2) {
    // Show placeholder
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#665848';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Cashflow data appears after Day 2', canvas.width / 2, canvas.height / 2);
    return;
  }

  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 16, right: 8, bottom: 20, left: 42 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Find value ranges
  let maxVal = 1000, minVal = 0;
  let maxEmp = 1;
  for (const d of data) {
    maxVal = Math.max(maxVal, d.cash, d.revenue, d.costs);
    minVal = Math.min(minVal, d.cash);
    maxEmp = Math.max(maxEmp, d.employees);
  }
  // Add padding to range
  const range = maxVal - minVal || 1000;
  maxVal += range * 0.1;
  minVal -= range * 0.05;

  // Y-axis helper
  const yScale = (v) => pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  const xScale = (i) => pad.left + (i / (data.length - 1)) * chartW;

  // Draw employee bars (background)
  const barW = Math.max(2, chartW / data.length - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < data.length; i++) {
    const barH = (data[i].employees / maxEmp) * chartH * 0.5;
    ctx.fillRect(xScale(i) - barW/2, pad.top + chartH - barH, barW, barH);
  }

  // Zero line
  if (minVal < 0) {
    const zeroY = yScale(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + chartW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw lines
  function drawLine(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = xScale(i);
      const y = yScale(data[i][key]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawLine('costs', '#e05050');
  drawLine('revenue', '#50c878');
  drawLine('cash', '#f0a050');

  // Y-axis labels
  ctx.fillStyle = '#665848';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'right';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = minVal + (maxVal - minVal) * (i / ySteps);
    const y = yScale(val);
    ctx.fillText(formatShort(val), pad.left - 4, y + 3);
    // Grid line
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  // X-axis labels
  ctx.fillStyle = '#665848';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  const xLabelEvery = Math.max(1, Math.ceil(data.length / 6));
  for (let i = 0; i < data.length; i += xLabelEvery) {
    ctx.fillText(`D${data[i].day}`, xScale(i), H - 4);
  }

  // Legend
  ctx.font = '9px system-ui';
  ctx.textAlign = 'left';
  const legends = [
    { label: 'Cash', color: '#f0a050' },
    { label: 'Revenue', color: '#50c878' },
    { label: 'Costs', color: '#e05050' },
  ];
  let lx = pad.left;
  for (const l of legends) {
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, 4, 8, 2);
    ctx.fillStyle = '#a08870';
    ctx.fillText(l.label, lx + 10, 9);
    lx += ctx.measureText(l.label).width + 18;
  }
}

function formatShort(val) {
  if (Math.abs(val) >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1000) return '$' + (val / 1000).toFixed(1) + 'K';
  return '$' + Math.round(val);
}
