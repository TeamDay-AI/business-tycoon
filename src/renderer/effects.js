// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Effects Renderer (particles, room activity)
// ═══════════════════════════════════════════════════════════════

import { TILE_W, TILE_H } from '../config.js';
import { getCtx, toScreen, getZoom } from '../engine.js';
import { getRoomInstances } from '../map.js';
import { G } from '../game.js';

// ─── Construction Animation ────────────────────────────────
export function drawConstruction() {
  const ctx = getCtx();
  const zoom = getZoom();
  const tick = G.gameTick;

  for (const room of getRoomInstances()) {
    const cp = room.constructionProgress ?? 1;
    if (cp >= 1) continue;

    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    const center = toScreen(cx, cy);

    // Diagonal sweep: reveal tiles from NW corner
    const maxDiag = room.w + room.h;
    const sweepLine = cp * maxDiag * 1.3; // sweep slightly ahead of progress

    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const diag = dx + dy;
        if (diag < sweepLine) continue; // Already revealed

        // Unrevealed tiles get a dark overlay
        const tx = room.x + dx, ty = room.y + dy;
        const s = toScreen(tx, ty);
        const hw = TILE_W * zoom / 2;
        const hh = TILE_H * zoom / 2;

        ctx.fillStyle = 'rgba(10,8,12,0.7)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - hh);
        ctx.lineTo(s.x + hw, s.y);
        ctx.lineTo(s.x, s.y + hh);
        ctx.lineTo(s.x - hw, s.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Scaffolding sparkles along the sweep line
    const sparkleCount = Math.max(2, Math.floor(room.w * 0.6));
    for (let i = 0; i < sparkleCount; i++) {
      const phase = (tick * 0.08 + i * 2.3) % (Math.PI * 2);
      const sparkleX = room.x + (sweepLine * 0.5 + Math.sin(phase) * room.w * 0.3);
      const sparkleY = room.y + (sweepLine * 0.5 + Math.cos(phase + i) * room.h * 0.3);

      if (sparkleX < room.x || sparkleX >= room.x + room.w ||
          sparkleY < room.y || sparkleY >= room.y + room.h) continue;

      const ss = toScreen(sparkleX, sparkleY);
      const brightness = 0.4 + Math.sin(tick * 0.12 + i) * 0.3;
      const size = (2 + Math.sin(tick * 0.1 + i * 1.7) * 1.5) * zoom;

      ctx.fillStyle = `rgba(240,180,80,${brightness})`;
      ctx.beginPath();
      ctx.arc(ss.x, ss.y - 8 * zoom, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Progress bar above the room
    const barW = 50 * zoom;
    const barH = 4 * zoom;
    const barY = center.y - room.h * TILE_H * zoom / 2 - 18 * zoom;

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(center.x - barW / 2 - 6 * zoom, barY - 14 * zoom, barW + 12 * zoom, 24 * zoom, 5 * zoom);
    ctx.fill();

    // Bar track
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(center.x - barW / 2, barY, barW, barH);

    // Bar fill (orange gradient)
    const barFill = ctx.createLinearGradient(center.x - barW / 2, 0, center.x - barW / 2 + barW * cp, 0);
    barFill.addColorStop(0, '#e07030');
    barFill.addColorStop(1, '#f0a050');
    ctx.fillStyle = barFill;
    ctx.fillRect(center.x - barW / 2, barY, barW * cp, barH);

    // Label
    ctx.fillStyle = '#f0d0a0';
    ctx.font = `bold ${Math.max(8, 9 * zoom)}px system-ui`;
    ctx.textAlign = 'center';
    const pct = Math.round(cp * 100);
    ctx.fillText(`🔨 BUILDING ${pct}%`, center.x, barY - 3 * zoom);
  }
}

export function drawRoomActivity() {
  const ctx = getCtx();
  const zoom = getZoom();

  for (const p of G.projects) {
    if (p.state !== 'in_progress') continue;
    const room = getRoomInstances().find(r => r.typeKey === p.targetOffice);
    if (!room) continue;

    const center = toScreen(room.x + room.w / 2, room.y + room.h / 2);
    const barW = 55 * zoom;
    const barY = center.y - room.h * TILE_H * zoom / 2 - 12 * zoom;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(center.x - barW/2 - 4*zoom, barY - 12*zoom, barW + 8*zoom, 20*zoom, 4*zoom);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(center.x - barW/2, barY, barW, 4*zoom);
    ctx.fillStyle = p.template.color;
    ctx.fillRect(center.x - barW/2, barY, barW * p.phaseProgress, 4*zoom);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(8, 9*zoom)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(p.currentPhase.toUpperCase(), center.x, barY - 2*zoom);
  }
}

export function drawParticles() {
  const ctx = getCtx();
  const zoom = getZoom();

  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.font = `bold ${14*zoom}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

export function drawEntrance() {
  const ctx = getCtx();
  const zoom = getZoom();
  const es = toScreen(12, 21);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = `${12*zoom}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('▼ ENTRANCE', es.x, es.y + Math.sin(G.gameTick*0.04)*3*zoom);
}
