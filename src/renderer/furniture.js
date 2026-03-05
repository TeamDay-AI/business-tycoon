// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Furniture Renderer (19 furniture types)
// ═══════════════════════════════════════════════════════════════

import { getCtx, toScreen, getZoom } from '../engine.js';
import { drawBox } from './primitives.js';
import { G } from '../game.js';
import { getRoomInstances } from '../map.js';

function getMonitorAnchor(f, cx, cy, z) {
  // If a monitor is near a desk, anchor it to the desk top plane.
  const room = getRoomInstances().find(r => r.furnitureList?.some(fi => fi === f));
  if (!room) return { x: cx, y: cy, linkedToDesk: false };

  let desk = null;
  let bestDist = Infinity;
  for (const fi of room.furnitureList) {
    if (fi.type !== 'desk') continue;
    const d = Math.abs(fi.x - f.x) + Math.abs(fi.y - f.y);
    if (d < bestDist) { bestDist = d; desk = fi; }
  }
  if (!desk || bestDist > 2) return { x: cx, y: cy, linkedToDesk: false };

  const ds = toScreen(desk.x, desk.y);
  const ms = toScreen(f.x, f.y);
  const vx = ms.x - ds.x;
  const vy = ms.y - ds.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;

  // Desk top center from drawBox(50, 24, 14): y + bh/2 - depth.
  const deskTopCenterY = ds.y + (24 * z) / 2 - 14 * z;
  // Keep monitor stand on top face, slightly pushed toward monitor tile direction.
  return {
    x: ds.x + ux * 8 * z,
    y: deskTopCenterY + uy * 3 * z + 3.2 * z,
    linkedToDesk: true,
  };
}

export function drawFurniture(f) {
  const ctx = getCtx();
  const s = toScreen(f.x, f.y);
  const cx = s.x, cy = s.y, z = getZoom();
  const tick = G.gameTick;

  // Construction fade-in: furniture appears late in construction
  const cp = f._room?.constructionProgress ?? 1;
  if (cp < 0.6) return; // No furniture until 60% built
  const furnitureAlpha = Math.min(1, (cp - 0.6) / 0.3); // Fade 0.6→0.9
  if (furnitureAlpha < 1) {
    ctx.save();
    ctx.globalAlpha = furnitureAlpha;
  }

  // Interactive furniture glow
  if (f.interactive) {
    const pulse = 0.5 + Math.sin(tick * 0.04) * 0.2;
    const glowRadius = 25 * z;
    const glow = ctx.createRadialGradient(cx, cy - 10*z, 0, cx, cy - 10*z, glowRadius);
    glow.addColorStop(0, `rgba(240,160,80,${pulse * 0.15})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - glowRadius, cy - 10*z - glowRadius, glowRadius * 2, glowRadius * 2);
  }

  // Interactive indicator
  if (f.interactive && z > 0.6) {
    ctx.fillStyle = 'rgba(240,160,80,0.8)';
    ctx.font = `${8*z}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('⚙', cx, cy - 40*z);
  }

  switch (f.type) {
    case 'desk':
      drawBox(cx, cy, 50*z, 24*z, 14*z, '#8B7355', '#6B5335', '#7B6345');
      break;

    case 'monitor': {
      const n = f.screens || 1;
      const anchor = getMonitorAnchor(f, cx, cy, z);
      const baseCx = anchor.x;
      const baseCy = anchor.y;

      // Small workstation top so monitor doesn't look like it's floating on floor/air.
      if (!anchor.linkedToDesk) {
        drawBox(baseCx, baseCy - 2.2*z, 22*z, 11*z, 5*z, '#3f4046', '#2f3035', '#35363c');
      } else {
        ctx.fillStyle = '#2b3037';
        ctx.fillRect(baseCx - 7*z, baseCy - 3.1*z, 14*z, 2.4*z); // keyboard/mat on desk
      }

      for (let i = 0; i < n; i++) {
        const mx = baseCx + (i - (n-1)/2) * 14 * z;
        const my = baseCy;
        // Monitor body
        ctx.fillStyle = '#0e1013';
        ctx.fillRect(mx - 10*z, my - 25*z, 20*z, 15*z);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(mx - 9.5*z, my - 24.5*z, 19*z, 1.2*z); // top bevel highlight

        // Screen panel
        const hue = [208, 156, 274][i % 3];
        const pulse = 0.86 + Math.sin(tick * 0.06 + i * 0.8) * 0.1;
        ctx.fillStyle = `hsl(${hue},42%,${15 + pulse * 5}%)`;
        ctx.fillRect(mx - 8*z, my - 23*z, 16*z, 11*z);

        // UI bars on screen
        ctx.fillStyle = `hsla(${hue},65%,${42 + pulse * 8}%,0.8)`;
        ctx.fillRect(mx - 7*z, my - 21.6*z, 5*z, 2.2*z);
        ctx.fillRect(mx - 1*z, my - 21.6*z, 6*z, 2.2*z);
        ctx.fillStyle = 'rgba(220,240,255,0.35)';
        ctx.fillRect(mx - 7*z, my - 17.8*z, 12*z, 1.6*z);

        // Screen sheen
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.moveTo(mx - 8*z, my - 23*z);
        ctx.lineTo(mx - 1*z, my - 23*z);
        ctx.lineTo(mx - 4*z, my - 18*z);
        ctx.lineTo(mx - 8*z, my - 18*z);
        ctx.closePath();
        ctx.fill();

        // Stand + base + keyboard hint
        ctx.fillStyle = '#2a2d33';
        ctx.fillRect(mx - 1.8*z, my - 10.2*z, 3.6*z, 5.5*z);
        ctx.fillStyle = '#3a3f47';
        ctx.fillRect(mx - 6*z, my - 4.8*z, 12*z, 2.2*z);
        ctx.fillStyle = '#20262e';
        ctx.fillRect(mx - 5.5*z, my - 1.2*z, 11*z, 1.6*z);
      }
      break;
    }

    case 'chair':
      drawBox(cx, cy, 16*z, 8*z, 8*z, '#7B6B4B', '#5B4B2B', '#6B5B3B');
      ctx.fillStyle = '#5B4B2B';
      ctx.fillRect(cx - 4*z, cy - 16*z, 8*z, 6*z);
      break;

    case 'greenscreen':
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(cx - 14*z, cy - 42*z, 28*z, 34*z);
      ctx.fillStyle = '#66BB6A';
      ctx.fillRect(cx - 12*z, cy - 40*z, 24*z, 30*z);
      break;

    case 'camera':
      drawBox(cx, cy, 18*z, 10*z, 24*z, '#222', '#1a1a1a', '#333');
      ctx.fillStyle = '#88f';
      ctx.beginPath(); ctx.arc(cx + 7*z, cy - 22*z, 3*z, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2*z;
      ctx.beginPath();
      ctx.moveTo(cx, cy-4*z); ctx.lineTo(cx-8*z, cy+4*z);
      ctx.moveTo(cx, cy-4*z); ctx.lineTo(cx+8*z, cy+4*z);
      ctx.moveTo(cx, cy-4*z); ctx.lineTo(cx, cy+6*z);
      ctx.stroke();
      if (Math.sin(tick * 0.06) > 0) {
        ctx.fillStyle = '#f00';
        ctx.beginPath(); ctx.arc(cx+10*z, cy-28*z, 2*z, 0, Math.PI*2); ctx.fill();
      }
      break;

    case 'softbox':
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.moveTo(cx, cy+4*z); ctx.lineTo(cx, cy-28*z); ctx.stroke();
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(cx-10*z, cy-36*z, 20*z, 14*z);
      { const sbg = ctx.createRadialGradient(cx, cy-28*z, 3*z, cx, cy-28*z, 35*z);
        sbg.addColorStop(0, 'rgba(255,248,200,0.12)'); sbg.addColorStop(1, 'transparent');
        ctx.fillStyle = sbg; ctx.fillRect(cx-40*z, cy-50*z, 80*z, 60*z); }
      break;

    case 'ringlight':
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.moveTo(cx, cy+4*z); ctx.lineTo(cx, cy-22*z); ctx.stroke();
      ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = 3*z;
      ctx.beginPath(); ctx.arc(cx, cy-30*z, 7*z, 0, Math.PI*2); ctx.stroke();
      break;

    case 'coffeemachine':
      drawBox(cx, cy, 18*z, 10*z, 20*z, '#444', '#333', '#3a3a3a');
      ctx.fillStyle = '#3a2010'; ctx.fillRect(cx-3*z, cy-16*z, 6*z, 5*z);
      if (Math.sin(tick * 0.08) > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (let si = 0; si < 3; si++) {
          ctx.beginPath();
          ctx.arc(cx + Math.sin(tick*0.03+si)*3*z, cy-22*z - si*4*z, 2*z, 0, Math.PI*2);
          ctx.fill();
        }
      }
      break;

    case 'table':
      drawBox(cx, cy, 40*z, 20*z, 12*z, '#7B6B5B', '#5B4B3B', '#6B5B4B');
      break;

    case 'couch':
      drawBox(cx, cy, 36*z, 16*z, 10*z, '#6B4040', '#4B2020', '#5B3030');
      ctx.fillStyle = '#5B3030';
      ctx.fillRect(cx-14*z, cy-18*z, 28*z, 5*z);
      break;

    case 'bigtv':
      ctx.fillStyle = '#111'; ctx.fillRect(cx-20*z, cy-34*z, 40*z, 26*z);
      { const tvHue = (tick * 0.3) % 360;
        ctx.fillStyle = `hsl(${tvHue},30%,15%)`;
        ctx.fillRect(cx-18*z, cy-32*z, 36*z, 22*z);
        ctx.fillStyle = '#e07030';
        ctx.fillRect(cx-16*z, cy-12*z, 32*z * ((tick%300)/300), 2*z); }
      ctx.fillStyle = '#333'; ctx.fillRect(cx-2*z, cy-8*z, 4*z, 4*z);
      break;

    case 'shelf': case 'bookshelf':
      drawBox(cx, cy, 28*z, 12*z, 28*z, '#6B5B4B', '#4B3B2B', '#5B4B3B');
      { const isBook = f.type === 'bookshelf';
        const colors = isBook ? ['#a06040','#6060a0','#40a060','#a04060'] : ['#a08060','#8060a0','#60a080'];
        for (let bi = 0; bi < (isBook ? 4 : 3); bi++) {
          ctx.fillStyle = colors[bi];
          ctx.fillRect(cx - 8*z + bi * 5*z, cy - (isBook ? 26 : 27)*z, 4*z, (isBook ? 8 : 4)*z);
        } }
      break;

    case 'whiteboard':
      ctx.fillStyle = '#ddd'; ctx.fillRect(cx-14*z, cy-38*z, 28*z, 22*z);
      ctx.fillStyle = '#f8f8f0'; ctx.fillRect(cx-12*z, cy-36*z, 24*z, 18*z);
      ctx.strokeStyle = '#4060c0'; ctx.lineWidth = z;
      ctx.beginPath();
      ctx.moveTo(cx-8*z, cy-30*z); ctx.lineTo(cx+6*z, cy-30*z);
      ctx.moveTo(cx-8*z, cy-26*z); ctx.lineTo(cx+3*z, cy-26*z);
      ctx.stroke();
      ctx.fillStyle = '#c04040'; ctx.fillRect(cx+4*z, cy-34*z, 6*z, 6*z);
      break;

    case 'plant': {
      ctx.fillStyle = '#8B6B4B';
      ctx.beginPath();
      ctx.moveTo(cx-5*z, cy); ctx.lineTo(cx-7*z, cy-7*z);
      ctx.lineTo(cx+7*z, cy-7*z); ctx.lineTo(cx+5*z, cy);
      ctx.closePath(); ctx.fill();
      const lb = Math.sin(tick * 0.02) * z;
      ctx.fillStyle = '#4a8050';
      ctx.beginPath(); ctx.ellipse(cx-3*z, cy-14*z+lb, 5*z, 3.5*z, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a9060';
      ctx.beginPath(); ctx.ellipse(cx+3*z, cy-16*z-lb, 4.5*z, 3*z, 0.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a7040';
      ctx.beginPath(); ctx.ellipse(cx, cy-18*z, 3.5*z, 2.5*z, 0, 0, Math.PI*2); ctx.fill();
      break;
    }

    case 'server':
      drawBox(cx, cy, 20*z, 10*z, 32*z, '#2a2a30', '#1a1a20', '#222228');
      for (let li = 0; li < 4; li++) {
        const on = Math.sin(tick * 0.1 + li * 1.5) > 0;
        ctx.fillStyle = on ? '#0f0' : '#030';
        ctx.fillRect(cx - 4*z, cy - 28*z + li * 4*z, 2*z, 2*z);
        ctx.fillStyle = on ? '#f80' : '#320';
        ctx.fillRect(cx + 2*z, cy - 28*z + li * 4*z, 2*z, 2*z);
      }
      break;

    case 'tablet':
      drawBox(cx, cy, 30*z, 14*z, 4*z, '#333', '#222', '#2a2a2a');
      ctx.fillStyle = '#1a1a30'; ctx.fillRect(cx-12*z, cy-10*z, 24*z, 8*z);
      ctx.strokeStyle = '#d058a0'; ctx.lineWidth = z;
      ctx.beginPath();
      ctx.moveTo(cx-6*z, cy-6*z);
      ctx.quadraticCurveTo(cx, cy-9*z, cx+6*z, cy-5*z);
      ctx.stroke();
      break;

    case 'crate':
      drawBox(cx, cy, 22*z, 11*z, 14*z, '#9B8B6B', '#7B6B4B', '#8B7B5B');
      break;

    case 'colorwall':
      ctx.fillStyle = '#f0f0e8'; ctx.fillRect(cx-12*z, cy-36*z, 24*z, 28*z);
      { const swatches = ['#e05050','#e09030','#e0d030','#50b050','#3080e0','#8040c0','#e050a0','#40c0c0','#f08060'];
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = swatches[i];
          ctx.fillRect(cx - 10*z + (i%3)*7*z, cy - 34*z + Math.floor(i/3)*8*z, 6*z, 6*z);
        } }
      break;

    case 'ticketboard':
      ctx.fillStyle = '#c4a882'; ctx.fillRect(cx-14*z, cy-36*z, 28*z, 28*z);
      { const ticketColors = ['#ffd','#dff','#fdf','#dfd','#fdd'];
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = ticketColors[i];
          const tx = cx - 10*z + (i%3)*9*z;
          const ty = cy - 32*z + Math.floor(i/3)*12*z;
          ctx.fillRect(tx, ty, 7*z, 9*z);
        } }
      break;

    case 'mixer':
      drawBox(cx, cy, 36*z, 18*z, 8*z, '#333', '#222', '#2a2a2a');
      for (let i = 0; i < 5; i++) {
        const sh = 2 + Math.sin(tick * 0.05 + i) * 2;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(cx-10*z+i*5*z, cy-8*z-sh*z, 2*z, sh*z);
      }
      break;

    case 'acousticpanel':
      ctx.fillStyle = '#3a3040'; ctx.fillRect(cx-10*z, cy-32*z, 20*z, 24*z);
      for (let py = 0; py < 4; py++) for (let px = 0; px < 3; px++) {
        ctx.fillStyle = (px+py)%2===0 ? '#4a3a50' : '#3a3040';
        ctx.fillRect(cx-8*z+px*6*z, cy-30*z+py*6*z, 5*z, 5*z);
      }
      break;

    case 'microphone':
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.moveTo(cx, cy+2*z); ctx.lineTo(cx, cy-32*z); ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(cx, cy-35*z, 4*z, 0, Math.PI*2); ctx.fill();
      break;

    case 'mannequin': {
      // Base stand
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 8*z, 4*z, 0, 0, Math.PI*2);
      ctx.fill();
      // Pole
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy-18*z); ctx.stroke();
      // Torso form
      ctx.fillStyle = '#d4b896';
      ctx.beginPath();
      ctx.moveTo(cx-8*z, cy-18*z);
      ctx.lineTo(cx-10*z, cy-30*z);
      ctx.lineTo(cx-6*z, cy-38*z);
      ctx.lineTo(cx+6*z, cy-38*z);
      ctx.lineTo(cx+10*z, cy-30*z);
      ctx.lineTo(cx+8*z, cy-18*z);
      ctx.closePath(); ctx.fill();
      // Head
      ctx.fillStyle = '#d4b896';
      ctx.beginPath(); ctx.ellipse(cx, cy-41*z, 4*z, 5*z, 0, 0, Math.PI*2); ctx.fill();
      break;
    }

    case 'clothingrack': {
      // Two uprights
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2*z;
      ctx.beginPath(); ctx.moveTo(cx-14*z, cy+2*z); ctx.lineTo(cx-14*z, cy-28*z); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+14*z, cy+2*z); ctx.lineTo(cx+14*z, cy-28*z); ctx.stroke();
      // Horizontal bar
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3*z;
      ctx.beginPath(); ctx.moveTo(cx-14*z, cy-28*z); ctx.lineTo(cx+14*z, cy-28*z); ctx.stroke();
      // Hanging clothes
      const colors = ['#e068a0','#6090d0','#50b868','#e0a030','#9068d0'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        const hx = cx - 12*z + i * 6*z;
        ctx.fillRect(hx, cy-27*z, 5*z, 14*z);
      }
      break;
    }

    case 'register': {
      // Counter base
      drawBox(cx, cy, 40*z, 20*z, 16*z, '#8B7355', '#6B5335', '#7B6345');
      // Register box
      drawBox(cx-2*z, cy-16*z, 24*z, 14*z, 10*z, '#444', '#333', '#3a3a3a');
      // Screen
      ctx.fillStyle = '#4a9'; ctx.fillRect(cx-8*z, cy-26*z, 12*z, 6*z);
      break;
    }
  }

  // Restore alpha if construction fade was applied
  if (furnitureAlpha < 1) ctx.restore();
}
