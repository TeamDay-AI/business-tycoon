// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Agent Renderer (characters, accessories)
// ═══════════════════════════════════════════════════════════════

import { getCtx, toScreen, getZoom } from '../engine.js';
import { shadeColor } from './primitives.js';
import { G } from '../game.js';

export let hoveredAgent = null;

export function setHoveredAgent(a) { hoveredAgent = a; }

export function drawAgent(agent) {
  const ctx = getCtx();
  const s = toScreen(agent.x, agent.y);
  const zoom = getZoom();
  const cx = s.x, cy = s.y + agent.bobY * zoom;
  const z = zoom;
  const color = agent.role.color;
  const isSelected = (agent === G.selectedAgent);
  const isHovered = (agent === hoveredAgent);
  const isWalking = agent.state === 'walking';

  // Selection/hover glow
  if (isSelected || isHovered) {
    ctx.strokeStyle = isSelected ? color : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isSelected ? 2 * z : 1 * z;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3*z, 12*z, 6*z, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (isSelected) {
      ctx.fillStyle = color + '15';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 3*z, 12*z, 6*z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2*z, 7*z, 3.5*z, 0, 0, Math.PI*2); ctx.fill();

  const legAnim = isWalking ? Math.sin(agent.frame * 0.5) * 3 * z : 0;
  const armAnim = isWalking ? Math.sin(agent.frame * 0.5 + Math.PI) * 2 * z : 0;

  // Legs
  ctx.fillStyle = '#2a2535';
  ctx.fillRect(cx - 4*z, cy - 6*z, 3*z, 7*z + legAnim);
  ctx.fillRect(cx + 1*z, cy - 6*z, 3*z, 7*z - legAnim);

  // Body
  const bodyGrad = ctx.createLinearGradient(cx - 6*z, cy - 18*z, cx + 6*z, cy - 6*z);
  bodyGrad.addColorStop(0, color);
  bodyGrad.addColorStop(1, shadeColor(color, -20));
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(cx - 6*z, cy - 18*z, 12*z, 13*z);

  // Arms
  ctx.fillStyle = color;
  ctx.fillRect(cx - 9*z, cy - 16*z + armAnim, 4*z, 9*z);
  ctx.fillRect(cx + 5*z, cy - 16*z - armAnim, 4*z, 9*z);

  // Hands
  ctx.fillStyle = agent.skinTone;
  ctx.fillRect(cx - 9*z, cy - 7*z + armAnim, 3*z, 3*z);
  ctx.fillRect(cx + 6*z, cy - 7*z - armAnim, 3*z, 3*z);

  // Head
  ctx.fillStyle = agent.skinTone;
  ctx.beginPath(); ctx.arc(cx, cy - 23*z, 6*z, 0, Math.PI*2); ctx.fill();

  // Hair
  ctx.fillStyle = agent.hairColor;
  if (agent.hairStyle === 0) {
    ctx.beginPath(); ctx.arc(cx, cy - 25*z, 6*z, -Math.PI, 0); ctx.fill();
  } else if (agent.hairStyle === 1) {
    ctx.beginPath(); ctx.arc(cx, cy - 25*z, 6.5*z, -Math.PI, 0.2); ctx.fill();
    ctx.fillRect(cx + 4*z, cy - 26*z, 2*z, 5*z);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - 24*z, 7*z, -Math.PI * 0.9, Math.PI * 0.1); ctx.fill();
    ctx.fillRect(cx - 6*z, cy - 24*z, 2*z, 6*z);
    ctx.fillRect(cx + 4*z, cy - 24*z, 2*z, 6*z);
  }

  // Eyes
  const eyeOff = (agent.dir === 1 || agent.dir === 2 ? 1 : -1) * z;
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 3*z + eyeOff, cy - 24*z, 2*z, 2*z);
  ctx.fillRect(cx + 1*z + eyeOff, cy - 24*z, 2*z, 2*z);
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 2*z + eyeOff, cy - 24*z, 1*z, 2*z);
  ctx.fillRect(cx + 2*z + eyeOff, cy - 24*z, 1*z, 2*z);

  // Accessory
  drawAccessory(ctx, agent, cx, cy, z);

  // State indicator
  drawStateIndicator(ctx, agent, cx, cy, z);

  // Energy bar (below feet, above name)
  drawEnergyBar(ctx, agent, cx, cy, z);

  // Speech bubble
  if (agent.speech && agent.speechTimer > 0) {
    drawSpeechBubble(ctx, cx, cy - 40*z, agent.speech, z, agent.speechTimer);
  }

  // Name tag
  ctx.fillStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.5)';
  ctx.font = `${Math.max(8, 9*z)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(agent.name, cx, cy + 12*z);
}

function drawAccessory(ctx, agent, cx, cy, z) {
  switch (agent.role.accessory) {
    case 'glasses':
      ctx.strokeStyle = '#999'; ctx.lineWidth = z;
      ctx.beginPath();
      ctx.rect(cx-5*z, cy-25*z, 4*z, 3*z);
      ctx.rect(cx+1*z, cy-25*z, 4*z, 3*z);
      ctx.moveTo(cx-1*z, cy-24*z); ctx.lineTo(cx+1*z, cy-24*z);
      ctx.stroke();
      break;
    case 'cap':
      ctx.fillStyle = '#2a4a2a';
      ctx.fillRect(cx-6*z, cy-29*z, 12*z, 3*z);
      ctx.fillRect(cx-1*z, cy-30*z, 9*z, 2*z);
      break;
    case 'beret':
      ctx.fillStyle = '#2a1a30';
      ctx.beginPath(); ctx.ellipse(cx+z, cy-28*z, 7*z, 3*z, 0, 0, Math.PI*2); ctx.fill();
      break;
    case 'headphones':
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.arc(cx, cy-26*z, 7*z, -Math.PI*0.75, -Math.PI*0.25); ctx.stroke();
      ctx.fillStyle = '#444';
      ctx.fillRect(cx-7*z, cy-24*z, 3*z, 4*z);
      ctx.fillRect(cx+4*z, cy-24*z, 3*z, 4*z);
      break;
    case 'headset':
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5*z;
      ctx.beginPath(); ctx.arc(cx, cy-26*z, 7*z, -Math.PI*0.7, -Math.PI*0.3); ctx.stroke();
      ctx.fillStyle = '#444';
      ctx.fillRect(cx-7*z, cy-24*z, 3*z, 4*z);
      ctx.fillRect(cx+4*z, cy-24*z, 3*z, 4*z);
      ctx.strokeStyle = '#666'; ctx.lineWidth = z;
      ctx.beginPath(); ctx.moveTo(cx-6*z, cy-22*z);
      ctx.quadraticCurveTo(cx-8*z, cy-18*z, cx-4*z, cy-18*z);
      ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(cx-4*z, cy-18*z, 2*z, 0, Math.PI*2); ctx.fill();
      break;
    case 'pen':
      ctx.fillStyle = '#ddd';
      ctx.save(); ctx.translate(cx+7*z, cy-10*z); ctx.rotate(-0.4);
      ctx.fillRect(-z, -7*z, 2*z, 7*z); ctx.restore();
      break;
  }
}

function drawEnergyBar(ctx, agent, cx, cy, z) {
  const e = agent.energy;
  const barW = 16 * z;
  const barH = 2.5 * z;
  const bx = cx - barW / 2;
  const by = cy + 5 * z;

  // Only show when not full (avoid visual clutter)
  if (e >= 0.98) return;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(bx - 0.5*z, by - 0.5*z, barW + 1*z, barH + 1*z, 1.5*z);
  ctx.fill();

  // Fill color: green → yellow → red
  let color;
  if (e > 0.6) color = `rgba(80,200,120,0.8)`;
  else if (e > 0.35) color = `rgba(224,180,48,0.8)`;
  else color = `rgba(224,70,50,${0.6 + Math.sin(agent.frame * 0.15) * 0.3})`; // pulse when low

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx, by, barW * e, barH, 1*z);
  ctx.fill();
}

function drawStateIndicator(ctx, agent, cx, cy, z) {
  const tick = G.gameTick;

  if (agent.state === 'thinking') {
    // Three animated dots
    for (let i = 0; i < 3; i++) {
      const bounce = Math.sin(tick * 0.12 + i * 0.8) * 3 * z;
      const alpha = 0.4 + Math.sin(tick * 0.12 + i * 0.8) * 0.3;
      ctx.fillStyle = `rgba(224,192,48,${alpha})`;
      ctx.beginPath();
      ctx.arc(cx + (i - 1) * 5 * z, cy - 34*z + bounce, 2.5 * z, 0, Math.PI * 2);
      ctx.fill();
    }
    // Spinning circle
    ctx.strokeStyle = 'rgba(224,192,48,0.3)';
    ctx.lineWidth = 1.5 * z;
    ctx.beginPath();
    ctx.arc(cx, cy - 42 * z, 5 * z, tick * 0.08, tick * 0.08 + Math.PI * 1.3);
    ctx.stroke();
  } else if (agent.state === 'working') {
    const pa = 0.4 + Math.sin(agent.frame * 0.1) * 0.2;
    ctx.fillStyle = `rgba(80,200,120,${pa})`;
    ctx.beginPath(); ctx.arc(cx, cy - 34*z, 3*z, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${7*z}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('⚡', cx, cy - 31*z);
  } else if (agent.state === 'break') {
    ctx.fillStyle = 'rgba(192,144,80,0.6)';
    ctx.beginPath(); ctx.arc(cx, cy - 34*z, 3*z, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${7*z}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('☕', cx, cy - 31*z);
  }
}

// ─── Visitor Drawing ────────────────────────────────────────
const VISITOR_COLORS = { client: '#8090a0', candidate: '#90a080', walkin: '#a09080' };
const VISITOR_ICONS = { client: '💼', candidate: '📋', walkin: '👀' };

export function drawVisitor(v) {
  const ctx = getCtx();
  const s = toScreen(v.x, v.y);
  const zoom = getZoom();
  const cx = s.x, cy = s.y + v.bobY * zoom;
  const z = zoom;
  const color = VISITOR_COLORS[v.type] || '#8888';
  const isWalking = v.state === 'walking' || v.state === 'entering' || v.state === 'leaving' || v.state === 'browsing';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2*z, 6*z, 3*z, 0, 0, Math.PI*2); ctx.fill();

  const legAnim = isWalking ? Math.sin(v.frame * 0.5) * 3 * z : 0;
  const armAnim = isWalking ? Math.sin(v.frame * 0.5 + Math.PI) * 2 * z : 0;

  // Legs
  ctx.fillStyle = '#3a3540';
  ctx.fillRect(cx - 4*z, cy - 6*z, 3*z, 7*z + legAnim);
  ctx.fillRect(cx + 1*z, cy - 6*z, 3*z, 7*z - legAnim);

  // Body (neutral suit tone)
  const bodyGrad = ctx.createLinearGradient(cx - 6*z, cy - 18*z, cx + 6*z, cy - 6*z);
  bodyGrad.addColorStop(0, color);
  bodyGrad.addColorStop(1, shadeColor(color, -15));
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(cx - 6*z, cy - 18*z, 12*z, 13*z);

  // Arms
  ctx.fillStyle = color;
  ctx.fillRect(cx - 9*z, cy - 16*z + armAnim, 4*z, 9*z);
  ctx.fillRect(cx + 5*z, cy - 16*z - armAnim, 4*z, 9*z);

  // Hands
  ctx.fillStyle = v.skinTone;
  ctx.fillRect(cx - 9*z, cy - 7*z + armAnim, 3*z, 3*z);
  ctx.fillRect(cx + 6*z, cy - 7*z - armAnim, 3*z, 3*z);

  // Head
  ctx.fillStyle = v.skinTone;
  ctx.beginPath(); ctx.arc(cx, cy - 23*z, 6*z, 0, Math.PI*2); ctx.fill();

  // Hair
  ctx.fillStyle = v.hairColor;
  if (v.hairStyle === 0) {
    ctx.beginPath(); ctx.arc(cx, cy - 25*z, 6*z, -Math.PI, 0); ctx.fill();
  } else if (v.hairStyle === 1) {
    ctx.beginPath(); ctx.arc(cx, cy - 25*z, 6.5*z, -Math.PI, 0.2); ctx.fill();
    ctx.fillRect(cx + 4*z, cy - 26*z, 2*z, 5*z);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - 24*z, 7*z, -Math.PI * 0.9, Math.PI * 0.1); ctx.fill();
    ctx.fillRect(cx - 6*z, cy - 24*z, 2*z, 6*z);
    ctx.fillRect(cx + 4*z, cy - 24*z, 2*z, 6*z);
  }

  // Eyes
  const eyeOff = (v.dir === 1 || v.dir === 2 ? 1 : -1) * z;
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 3*z + eyeOff, cy - 24*z, 2*z, 2*z);
  ctx.fillRect(cx + 1*z + eyeOff, cy - 24*z, 2*z, 2*z);
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 2*z + eyeOff, cy - 24*z, 1*z, 2*z);
  ctx.fillRect(cx + 2*z + eyeOff, cy - 24*z, 1*z, 2*z);

  // Type icon above head
  ctx.font = `${8*z}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(VISITOR_ICONS[v.type] || '?', cx, cy - 33*z);

  // Patience bar (only when waiting)
  if (v.state === 'waiting' && v.patience < 0.95) {
    const barW = 16 * z;
    const barH = 2.5 * z;
    const bx = cx - barW / 2;
    const by = cy + 5 * z;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(bx - 0.5*z, by - 0.5*z, barW + 1*z, barH + 1*z, 1.5*z);
    ctx.fill();

    // Yellow → orange → red
    let barColor;
    if (v.patience > 0.6) barColor = 'rgba(224,200,48,0.8)';
    else if (v.patience > 0.3) barColor = 'rgba(224,140,48,0.8)';
    else barColor = `rgba(224,60,40,${0.6 + Math.sin(v.frame * 0.15) * 0.3})`;

    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW * v.patience, barH, 1*z);
    ctx.fill();
  }

  // Speech bubble
  if (v.speech && v.speechTimer > 0) {
    drawSpeechBubble(ctx, cx, cy - 40*z, v.speech, z, v.speechTimer);
  }
}

function drawSpeechBubble(ctx, x, y, text, z, timer) {
  const alpha = Math.min(1, timer / 20);
  ctx.save();
  ctx.globalAlpha = alpha;

  const fontSize = Math.max(9, 10 * z);
  ctx.font = `${fontSize}px system-ui`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 14 * z;
  const ph = 18 * z;
  const bx = x - pw / 2;
  const by = y - ph;

  ctx.fillStyle = 'rgba(30,25,35,0.9)';
  ctx.beginPath();
  ctx.roundRect(bx, by, pw, ph, 6 * z);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = z;
  ctx.stroke();

  // Tail
  ctx.fillStyle = 'rgba(30,25,35,0.9)';
  ctx.beginPath();
  ctx.moveTo(x - 4*z, by + ph);
  ctx.lineTo(x, by + ph + 5*z);
  ctx.lineTo(x + 4*z, by + ph);
  ctx.closePath(); ctx.fill();

  // Text
  ctx.fillStyle = '#e8ddd0';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, by + 13 * z);

  ctx.restore();
}
