// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Agent Class (states, mood, skill, efficiency)
// ═══════════════════════════════════════════════════════════════

import {
  AGENT_ROLES, CHARACTER_NAMES, MAP_W, MAP_H, AGENT_SALARY,
  SPEECH_WORKING, SPEECH_THINKING, SPEECH_IDLE, SPEECH_DONE,
  SPEECH_BREAK, SPEECH_COLLAB, SPEECH_EXHAUSTED, SPEECH_SKILL_CAP,
  SPEECH_MISALIGNED,
  ENERGY_DRAIN, ENERGY_RECOVERY_RATE, ENERGY_PASSIVE_RECOVERY,
  ENERGY_EXHAUSTION_THRESHOLD, ENERGY_LOW_THRESHOLD,
  SENIORITY_LEVELS, ALIGNMENT,
} from './config.js';
import { findPath } from './pathfinding.js';
import { getWalkable, getRoomInstances } from './map.js';
import { G } from './game.js';
import { getTechEfficiencyBonus } from './events.js';

let nextCharId = 0;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export class Agent {
  constructor(roleKey, x, y, profile = null) {
    this.id = nextCharId++;
    this.roleKey = roleKey;
    this.role = AGENT_ROLES[roleKey];
    this.name = profile?.name || CHARACTER_NAMES[this.id % CHARACTER_NAMES.length];
    this.avatar = profile?.avatar || null;
    this.x = x; this.y = y;
    this.path = []; this.pathIdx = 0;
    this.speed = 0.028;
    this.state = 'idle'; // idle, walking, working, thinking, break
    this.task = null;
    this.frame = Math.random() * 100;
    this.dir = 2; // 0=NE 1=SE 2=SW 3=NW
    this.bobY = 0;
    this.idleTimer = 0;
    this.workTimer = 0;
    this.thinkTimer = 0;
    this.thinkDuration = 0;
    this.breakTimer = 0;
    this.tasksCompleted = 0;
    this.totalRevenue = 0;
    this.workHistory = []; // last 10: { name, pay, quality, day }

    // Core dynamics
    this.mood = profile?.mood ?? (0.7 + Math.random() * 0.2);   // 0.3 - 1.0
    this.skill = profile?.skill ?? (0.3 + Math.random() * 0.2);  // 0.3 - 1.0
    this.energy = profile?.energy ?? (0.85 + Math.random() * 0.15); // 0.0 - 1.0
    this.salary = profile?.salary ?? null;
    this.seniority = profile?.seniority ?? 2; // 1-5, permanent tier
    this.daysSinceBreak = 0;
    this.energyDrainRate = ENERGY_DRAIN[roleKey] || 0.00010;

    // IQ & Motivation (progression system)
    this.iq = profile?.iq ?? (0.5 + Math.random() * 1.0);        // 0.5 - 1.5
    this.motivation = profile?.motivation ?? (0.6 + Math.random() * 0.3); // 0.3 - 1.0

    // Alignment: how well this agent understands & shares team vision
    // New hires start low — they don't know the culture yet
    this.alignment = profile?.alignment ?? (ALIGNMENT.new_hire_min + Math.random() * (ALIGNMENT.new_hire_max - ALIGNMENT.new_hire_min));
    this.inMeeting = false; // true when attending a meeting/team building

    // Salary negotiation
    this.wantsRaise = false;
    this.raiseDeadline = 0; // game day when raise must be given
    this._skillCapNotified = false; // track if we showed the cap speech

    // Speech bubble
    this.speech = null;
    this.speechTimer = 0;

    // Visual
    this.skinTone = profile?.skinTone || pick(['#f5d0a9','#e8c090','#d4a878','#c09060','#a87848']);
    this.hairColor = profile?.hairColor || pick(['#2a1a0a','#4a2a10','#7a5a30','#1a1020','#a07040']);
    this.hairStyle = profile?.hairStyle ?? Math.floor(Math.random() * 3);
  }

  get energyMultiplier() {
    // Full efficiency above low threshold, scales down below it
    if (this.energy >= ENERGY_LOW_THRESHOLD) return 1.0;
    // At 0 energy → 0.3x, at threshold → 1.0x
    return 0.3 + 0.7 * (this.energy / ENERGY_LOW_THRESHOLD);
  }

  get seniorityMultiplier() {
    // Permanent seniority bonus: Junior 0.91× → Expert 1.15×
    return 0.85 + this.seniority * 0.06;
  }

  get maxSkill() {
    // IQ-derived skill cap: IQ 0.5 → 0.66, IQ 1.0 → 0.83, IQ 1.5 → 1.0
    return Math.min(1.0, 0.5 + this.iq * 0.33);
  }

  get motivationMultiplier() {
    return 0.7 + this.motivation * 0.3;
  }

  get alignmentMultiplier() {
    // High alignment → up to +15% efficiency; Low alignment → up to -30% penalty
    if (this.alignment >= 0.6) {
      return 1.0 + (this.alignment - 0.6) / 0.4 * ALIGNMENT.efficiency_bonus_max;
    }
    // Below 0.6: penalty scales from 0 to -30%
    return 1.0 - (1 - this.alignment / 0.6) * ALIGNMENT.efficiency_penalty_max;
  }

  get expectedSalary() {
    const baseSalary = this.salary ?? AGENT_SALARY[this.roleKey] ?? 70;
    return Math.round(baseSalary * (1 + this.skill * 0.5 + this.seniority * 0.1));
  }

  get efficiency() {
    if (this.inMeeting) return 0; // in meeting = no work output
    return (0.7 + this.mood * 0.5) * (0.8 + this.skill * 0.4)
      * this.energyMultiplier * this.seniorityMultiplier * this.motivationMultiplier
      * this.alignmentMultiplier
      * (1 + G.dataLabBonus + (G.itBonus || 0) + getTechEfficiencyBonus());
  }

  get isCEO() { return this.roleKey === 'ceo'; }

  get quality() {
    const alignQuality = this.alignment >= 0.5
      ? 1.0 + (this.alignment - 0.5) * ALIGNMENT.quality_bonus_max / 0.5
      : 0.8 + this.alignment * 0.4; // low alignment = building wrong thing
    return (0.4 + this.mood * 0.6) * (0.3 + this.skill * 0.7)
      * (0.6 + this.energy * 0.4) * this.seniorityMultiplier * this.motivationMultiplier
      * alignQuality;
  }

  say(text, duration = 120) {
    this.speech = text;
    this.speechTimer = duration;
  }

  moveTo(tx, ty) {
    const walkable = getWalkable();
    const path = findPath(walkable, Math.round(this.x), Math.round(this.y), tx, ty);
    if (path && path.length > 1) {
      this.path = path; this.pathIdx = 1; this.state = 'walking';
      return true;
    }
    return false;
  }

  moveToRoom(roomId) {
    const rooms = getRoomInstances();
    const room = rooms[roomId];
    if (!room) return false;
    const walkable = getWalkable();

    for (const pos of room.workPositions) {
      if (walkable[pos.y]?.[pos.x] && this.moveTo(pos.x, pos.y)) return true;
    }
    // Fallback: try tiles near center
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    for (let r = 0; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && walkable[ty][tx]) {
            if (this.moveTo(tx, ty)) return true;
          }
        }
      }
    }
    return false;
  }

  startThinking() {
    this.state = 'thinking';
    this.thinkTimer = 0;
    this.thinkDuration = 60 + Math.random() * 120;
    this.say(pick(SPEECH_THINKING), this.thinkDuration);
  }

  startBreak() {
    this.state = 'break';
    this.breakTimer = 0;
    this.say(pick(SPEECH_BREAK));
    this.daysSinceBreak = 0;
    // Go to break room
    const rooms = getRoomInstances();
    const br = rooms.find(r => r.typeKey === 'breakroom');
    if (br) this.moveToRoom(br.id);
  }

  update(dt) {
    this.frame += dt;

    // Speech bubble countdown
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) this.speech = null;
    }

    // Workspace quality modifiers
    const wsq = G.equipmentConfig?.workspace_quality || 'basic';
    const energyDrainMult = wsq === 'premium' ? 0.85 : wsq === 'ergonomic' ? 0.90 : 1.0;
    const motivDecayMult = wsq === 'premium' ? 0.80 : 1.0;

    // Mood decay while working
    if (this.state === 'working') {
      this.mood = Math.max(0.3, this.mood - 0.0001 * dt);
      // Energy drain while working (role-specific rate, reduced by workspace quality)
      this.energy = Math.max(0, this.energy - this.energyDrainRate * dt * energyDrainMult);
      // Motivation decay while working
      let motivDecay = 0.0003;
      if (this.energy < 0.3) motivDecay = 0.0005; // overworked
      const currentSalary = this.salary ?? AGENT_SALARY[this.roleKey] ?? 70;
      if (currentSalary < this.expectedSalary * 0.85) motivDecay += 0.0002; // underpaid
      this.motivation = Math.max(0.1, this.motivation - motivDecay * dt * motivDecayMult);
    }
    // Mood + energy recovery during break
    if (this.state === 'break') {
      // Coffee quality multiplier affects both mood and energy recovery
      const coffeeMultiplier = { instant: 1.0, drip: 1.3, espresso: 1.6 }[G.equipmentConfig?.coffee_quality] || 1.0;
      // Elite perks: +15% energy recovery
      const perksEnergyBonus = G.equipmentConfig?.perks_package === 'elite' ? 1.15 : 1.0;
      this.mood = Math.min(1.0, this.mood + 0.0005 * dt * coffeeMultiplier);
      this.energy = Math.min(1.0, this.energy + ENERGY_RECOVERY_RATE * dt * coffeeMultiplier * perksEnergyBonus);
      // Motivation recovers slowly during break
      this.motivation = Math.min(1.0, this.motivation + 0.0001 * dt);
    }
    // Slow passive energy recovery when idle (much slower than break)
    if (this.state === 'idle') {
      this.energy = Math.min(1.0, this.energy + ENERGY_PASSIVE_RECOVERY * dt);
    }

    // Exhaustion: force break if energy critically low while working
    if (this.energy <= ENERGY_EXHAUSTION_THRESHOLD && (this.state === 'working' || this.state === 'thinking')) {
      this.say(pick(SPEECH_EXHAUSTED));
      // Release task so it can be reassigned
      if (this.task) {
        this.task.state = 'waiting';
        this.task.assignedAgents = this.task.assignedAgents.filter(a => a !== this);
        this.task = null;
      }
      this.startBreak();
      return; // skip normal state update this tick
    }

    switch (this.state) {
      case 'walking': {
        if (this.pathIdx < this.path.length) {
          const tgt = this.path[this.pathIdx];
          const dx = tgt.x - this.x, dy = tgt.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.speed * dt) {
            this.x = tgt.x; this.y = tgt.y; this.pathIdx++;
          } else {
            const s = this.speed * dt;
            this.x += (dx / dist) * s;
            this.y += (dy / dist) * s;
            if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 1 : 3;
            else this.dir = dy > 0 ? 2 : 0;
          }
          this.bobY = Math.sin(this.frame * 0.4) * 2;
        } else {
          this.bobY = 0;
          if (this.task) {
            if (Math.random() < 0.3) { this.startThinking(); }
            else { this.state = 'working'; this.workTimer = 0; }
          } else if (this.state === 'walking' && this.breakTimer > 0) {
            // Arriving at break room
            this.state = 'break';
          } else {
            this.state = 'idle';
          }
        }
        break;
      }

      case 'thinking': {
        this.thinkTimer += dt;
        this.bobY = Math.sin(this.frame * 0.08) * 1;
        if (this.thinkTimer >= this.thinkDuration) {
          this.state = 'working';
          this.workTimer = 0;
          const office = this.task?.targetOffice || this.role.office;
          const msgs = SPEECH_WORKING[office] || SPEECH_WORKING.ceo;
          this.say(pick(msgs));
        }
        break;
      }

      case 'working': {
        this.workTimer += dt;
        this.bobY = Math.sin(this.frame * 0.12) * 0.5;

        // Misaligned agents waste time — they work on wrong things or get confused
        if (this.alignment < ALIGNMENT.misalignment_waste_threshold) {
          const wasteChance = (ALIGNMENT.misalignment_waste_threshold - this.alignment) * 0.003;
          if (Math.random() < wasteChance * dt) {
            this.say(pick(SPEECH_MISALIGNED), 150);
            // Wasted tick — go back to thinking (redoing work)
            this.startThinking();
            break;
          }
        }

        if (Math.random() < 0.002 * dt) {
          // Happily misaligned: working hard on the wrong thing
          if (this.alignment < 0.3 && this.mood > 0.6) {
            this.say('Making great progress! 🎵', 100); // ironic — they're building wrong thing
          } else {
            const office = this.task?.targetOffice || this.role.office;
            const msgs = SPEECH_WORKING[office] || SPEECH_WORKING.ceo;
            this.say(pick(msgs));
          }
        }
        if (Math.random() < 0.001 * dt) {
          this.startThinking();
        }
        break;
      }

      case 'break': {
        this.breakTimer += dt;
        this.bobY = 0;
        // Break ends when energy is sufficiently recovered (min 200 ticks)
        const energyReady = this.energy >= 0.7;
        if (this.breakTimer > 200 && energyReady) {
          this.state = 'idle';
          this.breakTimer = 0;
          this.mood = Math.min(1.0, this.mood + 0.1);
          this.say('Feeling refreshed! 💪');
        } else if (this.breakTimer > 400) {
          // Max break duration cap to prevent infinite breaks
          this.state = 'idle';
          this.breakTimer = 0;
          this.mood = Math.min(1.0, this.mood + 0.1);
          this.say(this.energy > 0.4 ? 'Back to work!' : 'Still tired but let\'s go...');
        }
        break;
      }

      case 'idle': {
        // If in meeting, just stay put and wait
        if (this.inMeeting) {
          this.bobY = Math.sin(this.frame * 0.05) * 0.5;
          break;
        }
        this.idleTimer += dt;
        this.bobY = 0;
        if (this.idleTimer > 180 + Math.random() * 250) {
          this.idleTimer = 0;
          // Need a break? Check both mood AND energy
          const needsEnergyBreak = this.energy < 0.4 && Math.random() < 0.7;
          if (needsEnergyBreak || (this.mood < 0.5 && Math.random() < 0.5)) {
            this.startBreak();
          } else if (Math.random() < 0.3) {
            const rooms = getRoomInstances();
            const br = rooms.find(r => r.typeKey === 'breakroom');
            if (br) this.moveToRoom(br.id);
            if (Math.random() < 0.5) this.say(pick(SPEECH_IDLE));
          } else {
            // Wander near current pos
            const rx = Math.round(this.x) + Math.floor(Math.random() * 7) - 3;
            const ry = Math.round(this.y) + Math.floor(Math.random() * 7) - 3;
            const walkable = getWalkable();
            if (rx >= 0 && rx < MAP_W && ry >= 0 && ry < MAP_H && walkable[ry]?.[rx]) {
              this.moveTo(rx, ry);
            }
          }
        }
        break;
      }
    }
  }

  onTaskComplete(taskDifficulty = 1.0) {
    // Small alignment gain from completing work (shared experience)
    this.alignment = Math.min(1.0, this.alignment + 0.01);
    this.task = null;
    this.state = 'idle';
    this.workTimer = 0;
    this.tasksCompleted++;

    // IQ-scaled skill gain, capped by maxSkill
    const skillGain = 0.005 * this.iq * (1 + 0.1 * taskDifficulty);
    const prevSkill = this.skill;
    this.skill = Math.min(this.maxSkill, this.skill + skillGain);

    // Notify when hitting skill cap
    if (this.skill >= this.maxSkill - 0.01 && prevSkill < this.maxSkill - 0.01 && !this._skillCapNotified) {
      this._skillCapNotified = true;
      this.say(pick(SPEECH_SKILL_CAP), 200);
    } else {
      this.say(pick(SPEECH_DONE));
    }

    this.mood = Math.min(1.0, this.mood + 0.05);
    this.motivation = Math.min(1.0, this.motivation + 0.02); // small motivation boost from completing work
  }

  onMeetingBoost() {
    this.mood = Math.min(1.0, this.mood + 0.1);
    this.motivation = Math.min(1.0, this.motivation + 0.05);
    this.alignment = Math.min(1.0, this.alignment + ALIGNMENT.standup_boost);
    this.say(pick(SPEECH_COLLAB));
  }

  onTeamBuilding() {
    this.alignment = Math.min(1.0, this.alignment + ALIGNMENT.team_building_boost);
    this.mood = Math.min(1.0, this.mood + 0.05);
    this.motivation = Math.min(1.0, this.motivation + 0.03);
  }

  giveRaise() {
    this.salary = this.expectedSalary;
    this.motivation = Math.min(1.0, this.motivation + 0.15);
    this.wantsRaise = false;
    this.raiseDeadline = 0;
  }

  denyRaise() {
    this.motivation = Math.max(0.1, this.motivation - 0.1);
  }
}
