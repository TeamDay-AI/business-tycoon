// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Sound Effects (procedural, Web Audio API)
//  All sounds synthesized at runtime — no external files needed.
// ═══════════════════════════════════════════════════════════════

let ctx = null;
let masterGain = null;
let sfxEnabled = true;
let sfxVolume = 0.4;

function ensureCtx() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = sfxVolume;
    masterGain.connect(ctx.destination);
    return true;
  } catch { return false; }
}

// Resume on user gesture (browser autoplay policy)
export function resumeAudioCtx() {
  if (ctx?.state === 'suspended') ctx.resume();
}

export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = sfxVolume;
}

export function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function isSfxEnabled() { return sfxEnabled; }

// ─── Primitives ──────────────────────────────────────────────

function osc(type, freq, start, dur, gainVal = 0.3) {
  if (!ensureCtx() || !sfxEnabled) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gainVal, t + 0.01);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.01);
}

function noise(start, dur, gainVal = 0.1) {
  if (!ensureCtx() || !sfxEnabled) return;
  const t = ctx.currentTime + start;
  const bufSize = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gainVal, t + 0.005);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 2000;
  filt.Q.value = 1;
  src.connect(filt);
  filt.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + dur + 0.01);
}

// ─── Game Sound Effects ──────────────────────────────────────

// Cash register / coin — project complete, money earned
export function sfxMoney() {
  osc('sine', 1200, 0, 0.08, 0.2);
  osc('sine', 1600, 0.06, 0.08, 0.2);
  osc('sine', 2000, 0.12, 0.12, 0.15);
  noise(0, 0.06, 0.08);
}

// Celebratory chime — high-quality project completion
export function sfxProjectComplete() {
  osc('sine', 523, 0, 0.15, 0.25);      // C5
  osc('sine', 659, 0.1, 0.15, 0.25);    // E5
  osc('sine', 784, 0.2, 0.2, 0.2);      // G5
  osc('sine', 1047, 0.3, 0.3, 0.15);    // C6
}

// Construction thud — room built
export function sfxBuild() {
  osc('sine', 150, 0, 0.12, 0.3);
  osc('sine', 120, 0.04, 0.1, 0.25);
  noise(0, 0.15, 0.15);
  osc('triangle', 400, 0.12, 0.1, 0.1);
}

// Positive ding — agent hired
export function sfxHire() {
  osc('sine', 880, 0, 0.1, 0.2);
  osc('sine', 1100, 0.08, 0.15, 0.2);
  osc('triangle', 1320, 0.16, 0.2, 0.12);
}

// Soft click — UI button press
export function sfxClick() {
  osc('sine', 800, 0, 0.04, 0.15);
  osc('sine', 600, 0.02, 0.04, 0.1);
}

// Synergy chime — cross-office bonus
export function sfxSynergy() {
  osc('sine', 660, 0, 0.12, 0.2);      // E5
  osc('sine', 880, 0.08, 0.12, 0.2);   // A5
  osc('sine', 1100, 0.16, 0.12, 0.18); // C#6
  osc('triangle', 1320, 0.24, 0.2, 0.12); // E6
}

// Level up fanfare — tech tree unlock
export function sfxUnlock() {
  osc('sine', 392, 0, 0.12, 0.2);       // G4
  osc('sine', 523, 0.1, 0.12, 0.2);     // C5
  osc('sine', 659, 0.2, 0.12, 0.2);     // E5
  osc('sine', 784, 0.3, 0.15, 0.2);     // G5
  osc('triangle', 1047, 0.4, 0.25, 0.15); // C6
}

// Victory fanfare — game won
export function sfxWin() {
  osc('sine', 523, 0, 0.2, 0.25);       // C5
  osc('sine', 659, 0.15, 0.2, 0.25);    // E5
  osc('sine', 784, 0.3, 0.2, 0.25);     // G5
  osc('sine', 1047, 0.45, 0.3, 0.2);    // C6
  osc('triangle', 1047, 0.45, 0.3, 0.1);
  osc('sine', 1319, 0.65, 0.2, 0.2);    // E6
  osc('sine', 1568, 0.8, 0.4, 0.2);     // G6
}

// Game over buzz — bankrupt
export function sfxGameOver() {
  osc('sawtooth', 200, 0, 0.3, 0.15);
  osc('sawtooth', 150, 0.2, 0.3, 0.15);
  osc('sawtooth', 100, 0.4, 0.5, 0.12);
  osc('sine', 80, 0.4, 0.5, 0.1);
}

// Warning tone — negative event (reputation decay, stalled)
export function sfxWarning() {
  osc('triangle', 440, 0, 0.1, 0.15);
  osc('triangle', 340, 0.1, 0.15, 0.15);
}

// Notification pip — toast / tutorial hint
export function sfxNotify() {
  osc('sine', 1000, 0, 0.06, 0.12);
  osc('sine', 1200, 0.05, 0.08, 0.1);
}

// New day tick — subtle clock sound
export function sfxDayTick() {
  osc('sine', 600, 0, 0.03, 0.08);
  osc('triangle', 900, 0.02, 0.04, 0.05);
}

// Week start — subtle ascending chime
export function sfxWeekStart() {
  osc('sine', 440, 0, 0.08, 0.15);
  osc('sine', 554, 0.06, 0.08, 0.15);
  osc('sine', 660, 0.12, 0.1, 0.12);
}

// Sales deal closed — ka-ching
export function sfxDeal() {
  osc('sine', 1400, 0, 0.06, 0.2);
  osc('sine', 1800, 0.05, 0.06, 0.2);
  osc('sine', 2200, 0.1, 0.1, 0.15);
  noise(0, 0.08, 0.1);
}

// Error / can't do that
export function sfxError() {
  osc('square', 300, 0, 0.08, 0.1);
  osc('square', 250, 0.08, 0.12, 0.1);
}

// Starter projects arrival
export function sfxFirstClients() {
  osc('sine', 660, 0, 0.1, 0.2);
  osc('sine', 784, 0.08, 0.1, 0.2);
  osc('sine', 880, 0.16, 0.1, 0.2);
  osc('triangle', 1047, 0.24, 0.2, 0.15);
  osc('sine', 1047, 0.24, 0.2, 0.1);
}
