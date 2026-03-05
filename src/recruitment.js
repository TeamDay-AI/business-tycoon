// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Recruitment Candidate Generator
// ═══════════════════════════════════════════════════════════════

import { AGENT_SALARY, CHARACTER_NAMES, HIRE_COST, TEAMDAY_CHARACTERS, SENIORITY_LEVELS } from './config.js';
import { G } from './game.js';
import { getHRSigningDiscount } from './economy.js';
import { countRoomsByType } from './map.js';

let nextCandidateId = 1;
const cacheByRole = new Map();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueNames(count) {
  const pool = [...CHARACTER_NAMES];
  const out = [];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) {
      out.push(`Candidate ${nextCandidateId + i}`);
      continue;
    }
    const idx = randInt(0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function pickCharacter(roleKey) {
  const pool = TEAMDAY_CHARACTERS[roleKey];
  if (!pool || pool.length === 0) return null;
  // Find names already used by hired agents of this role
  const usedNames = new Set(
    (G.agents || []).filter(a => a.roleKey === roleKey).map(a => a.name)
  );
  // Prefer unused characters
  const available = pool.filter(c => !usedNames.has(c.name));
  return available.length > 0 ? pick(available) : pick(pool);
}

function rollSeniority() {
  // HR bonus: high-skill + high-seniority HR shifts weights toward senior candidates
  const hrAgent = (G.agents || []).find(a => a.roleKey === 'hr_manager');
  const hrSkill = hrAgent ? hrAgent.skill : 0;
  const hrSeniority = hrAgent ? hrAgent.seniority : 0;

  // Build weighted pool
  const entries = Object.entries(SENIORITY_LEVELS);
  let totalWeight = 0;
  const weights = entries.map(([lvl, def]) => {
    let w = def.spawnWeight;
    const level = parseInt(lvl);
    if (level >= 4) {
      // HR seniority: senior HR managers have better recruitment networks
      if (hrSeniority >= 4) w *= 2.5;
      else if (hrSeniority >= 3) w *= 1.5;
      // HR skill: experienced recruiters find better candidates
      if (hrSkill > 0.7) w *= 2;
      else if (hrSkill > 0.5) w *= 1.5;
    }
    totalWeight += w;
    return w;
  });

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < entries.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return parseInt(entries[i][0]);
  }
  return 2; // fallback
}

function makeCandidate(roleKey, name) {
  const baseSalary = AGENT_SALARY[roleKey] || 70;
  const salaryDelta = randInt(-12, 15);
  const signingDelta = randInt(-160, 240);

  // HR bonus: better candidate base stats
  const hrDiscount = getHRSigningDiscount();
  const hrQualityBoost = hrDiscount > 0 ? 0.1 : 0;

  // Roll seniority tier (HR skill affects weights)
  const seniority = rollSeniority();
  const tier = SENIORITY_LEVELS[seniority];

  const mood = Math.max(0.45, Math.min(0.95, rand(0.5 + hrQualityBoost, 0.9)));
  const skill = Math.max(tier.skillRange[0], Math.min(tier.skillRange[1], rand(tier.skillRange[0], tier.skillRange[1])));

  // Roll IQ (0.5-1.5) — HR quality boost shifts range up slightly
  const iq = Math.max(0.5, Math.min(1.5, rand(0.5 + hrQualityBoost * 0.5, 1.5)));
  // Roll motivation (0.6-0.9)
  const motivation = Math.max(0.5, Math.min(1.0, rand(0.6, 0.9)));

  const motivMult = 0.7 + motivation * 0.3;
  const efficiency = (0.7 + mood * 0.5) * (0.8 + skill * 0.4) * motivMult;

  // Assign a TeamDay character identity
  const character = pickCharacter(roleKey);
  const charName = character ? character.name : name;
  const charAvatar = character ? character.image : null;

  return {
    id: `cand_${nextCandidateId++}`,
    name: charName,
    avatar: charAvatar,
    roleKey,
    seniority,
    mood,
    skill,
    iq,
    motivation,
    salary: Math.max(40, Math.round((baseSalary + salaryDelta) * tier.salaryMult)),
    signingCost: Math.max(250, Math.round((HIRE_COST + signingDelta) * (1 - hrDiscount))),
    efficiency: Math.round(efficiency * 100) / 100,
    skinTone: pick(['#f5d0a9', '#e8c090', '#d4a878', '#c09060', '#a87848']),
    hairColor: pick(['#2a1a0a', '#4a2a10', '#7a5a30', '#1a1020', '#a07040']),
    hairStyle: randInt(0, 2),
  };
}

export function rollCandidatesForRole(roleKey, count = 3) {
  // HR bonus: +1 candidate per roll
  const hrBonus = getHRSigningDiscount() > 0 ? 1 : 0;
  const actualCount = count + hrBonus;
  const names = uniqueNames(actualCount);
  const pool = TEAMDAY_CHARACTERS[roleKey] ? [...TEAMDAY_CHARACTERS[roleKey]] : [];
  const usedNames = new Set(
    (G.agents || []).filter(a => a.roleKey === roleKey).map(a => a.name)
  );
  // Remove already-hired characters from pool
  const availablePool = pool.filter(c => !usedNames.has(c.name));
  const fallbackPool = pool.length > 0 ? pool : [];

  const candidates = names.map((name, i) => {
    // Pick a unique character for each candidate in this batch
    let character = null;
    if (availablePool.length > i) {
      character = availablePool[i];
    } else if (fallbackPool.length > 0) {
      character = fallbackPool[i % fallbackPool.length];
    }
    const c = makeCandidate(roleKey, name);
    if (character) {
      c.name = character.name;
      c.avatar = character.image;
    }
    return c;
  });
  cacheByRole.set(roleKey, candidates);
  return candidates;
}

export function getCandidatesForRole(roleKey) {
  return cacheByRole.get(roleKey) || [];
}

export function consumeCandidate(roleKey, candidateId) {
  const candidates = cacheByRole.get(roleKey) || [];
  const idx = candidates.findIndex(c => c.id === candidateId);
  if (idx < 0) return null;
  const [candidate] = candidates.splice(idx, 1);
  cacheByRole.set(roleKey, candidates);
  return candidate;
}

export function clearCandidatesForRole(roleKey) {
  cacheByRole.delete(roleKey);
}

// ─── HR office utilities ─────────────────────────────────

export function hasHRStaff() {
  return countRoomsByType('hr') > 0 &&
    G.agents.some(a => a.roleKey === 'hr_manager');
}


