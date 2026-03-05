// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Visitor NPC (clients, candidates, walk-ins)
// ═══════════════════════════════════════════════════════════════

import { findPath } from './pathfinding.js';
import { getWalkable, getRoomInstances, findRoomByType } from './map.js';
import { MAP_W, MAP_H } from './config.js';

let nextVisitorId = 0;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SKIN_TONES = ['#f5d0a9','#e8c090','#d4a878','#c09060','#a87848'];
const HAIR_COLORS = ['#2a1a0a','#4a2a10','#7a5a30','#1a1020','#a07040'];

export class Visitor {
  constructor(type, targetRoomType) {
    this.id = nextVisitorId++;
    this.type = type; // 'client' | 'candidate' | 'walkin'
    this.targetRoomType = targetRoomType; // e.g. 'sales', 'hr', null for walk-in

    // Position & movement
    this.x = 0;
    this.y = 0;
    this.path = [];
    this.pathIdx = 0;
    this.speed = 0.022;
    this.dir = 2;
    this.frame = Math.random() * 100;
    this.bobY = 0;

    // State machine
    this.state = 'entering'; // entering → walking → waiting → being_served → leaving → gone
    this.stateTimer = 0;

    // Gameplay
    this.patience = 1.0; // drains while waiting
    this.satisfaction = 0.5;
    this.assignedAgent = null;
    this.targetRoom = null;
    this.serviceTimer = 0;

    // Visual
    this.skinTone = pick(SKIN_TONES);
    this.hairColor = pick(HAIR_COLORS);
    this.hairStyle = Math.floor(Math.random() * 3);
    this.speech = null;
    this.speechTimer = 0;

    // Walk-in browsing
    this.browseRoomsVisited = 0;
    this.browseTarget = null;
  }

  say(text, duration = 100) {
    this.speech = text;
    this.speechTimer = duration;
  }

  moveTo(tx, ty) {
    const walkable = getWalkable();
    const path = findPath(walkable, Math.round(this.x), Math.round(this.y), tx, ty);
    if (path && path.length > 1) {
      this.path = path;
      this.pathIdx = 1;
      return true;
    }
    return false;
  }

  moveToRoom(roomTypeKey) {
    const room = findRoomByType(roomTypeKey);
    if (!room) return false;

    const walkable = getWalkable();
    // Try work positions first
    for (const pos of room.workPositions) {
      if (walkable[pos.y]?.[pos.x] && this.moveTo(pos.x, pos.y)) {
        this.targetRoom = room;
        return true;
      }
    }
    // Fallback: near center
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    for (let r = 0; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && walkable[ty][tx]) {
            if (this.moveTo(tx, ty)) {
              this.targetRoom = room;
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  moveToLobbyEntrance() {
    const lobby = findRoomByType('lobby');
    if (!lobby) return false;
    // Use the first door as exit point
    if (lobby.doors && lobby.doors.length > 0) {
      const door = lobby.doors[0];
      return this.moveTo(door.x, door.y);
    }
    // Fallback to lobby center
    return this.moveTo(lobby.x + Math.floor(lobby.w / 2), lobby.y + Math.floor(lobby.h / 2));
  }

  spawnAtLobbyEntrance() {
    const lobby = findRoomByType('lobby');
    if (!lobby) return false;
    if (lobby.doors && lobby.doors.length > 0) {
      const door = lobby.doors[0];
      this.x = door.x;
      this.y = door.y;
    } else {
      this.x = lobby.x;
      this.y = lobby.y;
    }
    return true;
  }

  startService(agent) {
    this.assignedAgent = agent;
    this.state = 'being_served';
    this.serviceTimer = 0;
    this.satisfaction += 0.15; // greeting bonus
    // Quick service bonus if patience > 0.7
    if (this.patience > 0.7) this.satisfaction += 0.2;
    this.say('Hello! 👋', 80);
  }

  leave(happy) {
    this.state = 'leaving';
    this.assignedAgent = null;
    if (happy) {
      this.say(pick(['Thanks! 😊', 'Great! 👍', 'Nice office!', 'Impressed! ⭐']), 120);
    } else {
      this.say(pick(['Too slow! 😤', 'Leaving... 😒', 'Not worth it.', 'Bye. 👎']), 120);
    }
    this.moveToLobbyEntrance();
  }

  update(dt) {
    this.frame += dt;

    // Speech countdown
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) this.speech = null;
    }

    // Bob animation
    if (this.state === 'walking' || this.state === 'entering') {
      this.bobY = Math.sin(this.frame * 0.15) * 1.5;
    } else {
      this.bobY *= 0.9;
    }

    switch (this.state) {
      case 'entering':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          this.state = 'walking';
          this._navigateToTarget();
        }
        break;

      case 'walking':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          if (this.type === 'walkin') {
            this.state = 'browsing';
            this.stateTimer = 0;
          } else {
            this.state = 'waiting';
            this.stateTimer = 0;
          }
        }
        break;

      case 'waiting':
        // Patience drains
        this.stateTimer += dt;
        if (this.patience <= 0) {
          this.satisfaction -= 0.15;
          this.leave(false);
        }
        break;

      case 'being_served':
        this.serviceTimer += dt;
        // Service takes ~200 ticks
        if (this.serviceTimer >= 200) {
          this.leave(this.satisfaction > 0.5);
        }
        break;

      case 'browsing':
        // Walk-ins wander and look around
        this.stateTimer += dt;
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          this.browseRoomsVisited++;
          if (this.browseRoomsVisited >= 3 || this.stateTimer > 400) {
            // Done browsing, leave
            this.leave(this.satisfaction > 0.4);
          } else {
            // Pick a random room to visit
            this._browseNextRoom();
          }
        }
        break;

      case 'leaving':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          this.state = 'gone';
        }
        break;

      case 'gone':
        break;
    }
  }

  _navigateToTarget() {
    if (this.type === 'walkin') {
      this._browseNextRoom();
    } else if (this.targetRoomType) {
      if (!this.moveToRoom(this.targetRoomType)) {
        // Target room doesn't exist, wait in lobby
        this.state = 'waiting';
      }
    }
  }

  _browseNextRoom() {
    const rooms = getRoomInstances().filter(r => r.constructionProgress >= 1);
    if (rooms.length === 0) return;
    const room = pick(rooms);
    const walkable = getWalkable();
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    // Try near center
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && walkable[ty]?.[tx]) {
            if (this.moveTo(tx, ty)) return;
          }
        }
      }
    }
  }

  _tickMovement(dt) {
    if (this.pathIdx >= this.path.length) return;

    const target = this.path[this.pathIdx];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      this.x = target.x;
      this.y = target.y;
      this.pathIdx++;
    } else {
      const step = this.speed * dt;
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    // Update facing direction
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      if (dx > 0 && dy > 0) this.dir = 1;      // SE
      else if (dx > 0 && dy <= 0) this.dir = 0; // NE
      else if (dx <= 0 && dy > 0) this.dir = 2; // SW
      else this.dir = 3;                          // NW
    }
  }
}
