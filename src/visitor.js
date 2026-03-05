// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Visitor NPC (clients, candidates, walk-ins)
// ═══════════════════════════════════════════════════════════════

import { findPath } from './pathfinding.js';
import { getWalkable, getRoomInstances, findRoomByType, findAllRoomsByType } from './map.js';
import {
  MAP_W, MAP_H,
  VISITOR_ARRIVAL_SPEECH, VISITOR_QUEUE_SPEECH, VISITOR_DIALOGUES,
} from './config.js';

let nextVisitorId = 0;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SKIN_TONES = ['#f5d0a9','#e8c090','#d4a878','#c09060','#a87848'];
const HAIR_COLORS = ['#2a1a0a','#4a2a10','#7a5a30','#1a1020','#a07040'];

// ─── Chair Claiming ─────────────────────────────────────
const _claimedChairs = new Set();

export function findAvailableChair(room) {
  if (!room || !room.furnitureList) return null;
  const chairs = room.furnitureList.filter(f => f.type === 'chair' && !_claimedChairs.has(f));
  if (chairs.length === 0) return null;
  return chairs[Math.floor(Math.random() * chairs.length)];
}

function claimChair(chair) {
  if (chair) _claimedChairs.add(chair);
}

function releaseChair(chair) {
  if (chair) _claimedChairs.delete(chair);
}

// ─── Room Occupancy Check ───────────────────────────────
const _occupiedStates = new Set([
  'entering_room', 'seated_waiting', 'agent_arriving', 'in_conversation',
]);

export function isRoomOccupiedByVisitor(room, visitors) {
  return visitors.some(v =>
    v.targetRoom === room && _occupiedStates.has(v.state)
  );
}

export class Visitor {
  constructor(type, targetRoomType) {
    this.id = nextVisitorId++;
    this.type = type; // 'client' | 'candidate' | 'walkin' | 'customer'
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
    // entering → walking_to_door → [queuing_outside] → entering_room → seated_waiting
    // → agent_arriving → in_conversation → wrapping_up → leaving → gone
    this.state = 'entering';
    this.stateTimer = 0;

    // Gameplay
    this.patience = 1.0;
    this.satisfaction = 0.5;
    this.assignedAgent = null;
    this.targetRoom = null;
    this.serviceTimer = 0;

    // Chair system
    this.claimedChair = null;
    this.seated = false;

    // Agent dispatch
    this.needsAgent = false;
    this.requestedRole = null; // 'sales' | 'hr' | 'shopfront' | null

    // Dialogue system
    this.conversationStep = 0;
    this.conversationTimer = 0;
    this._dialogueSeq = null;
    this._linePause = 0;

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

  _moveToRoomDoor(room) {
    if (!room) return false;
    if (room.doors && room.doors.length > 0) {
      const door = room.doors[0];
      if (this.moveTo(door.x, door.y)) {
        this.targetRoom = room;
        return true;
      }
    }
    // Fallback: room edge
    const walkable = getWalkable();
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    for (let r = 0; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && walkable[ty]?.[tx]) {
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

  moveToRoom(roomTypeKey) {
    const room = findRoomByType(roomTypeKey);
    if (!room) return false;
    return this._moveToRoomDoor(room);
  }

  moveToLobbyEntrance() {
    const lobby = findRoomByType('lobby');
    if (!lobby) return false;
    if (lobby.doors && lobby.doors.length > 0) {
      const door = lobby.doors[0];
      return this.moveTo(door.x, door.y);
    }
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

  _enterRoom() {
    if (!this.targetRoom) { this.leave(false); return; }

    // Try to claim a chair
    const chair = findAvailableChair(this.targetRoom);
    if (chair) {
      this.claimedChair = chair;
      claimChair(chair);
      this.moveTo(chair.x, chair.y);
    } else {
      // No chair — use workPosition or room center
      const room = this.targetRoom;
      const walkable = getWalkable();
      let found = false;
      for (const pos of room.workPositions) {
        if (walkable[pos.y]?.[pos.x] && this.moveTo(pos.x, pos.y)) { found = true; break; }
      }
      if (!found) {
        const cx = room.x + Math.floor(room.w / 2);
        const cy = room.y + Math.floor(room.h / 2);
        for (let r = 0; r <= 2; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const tx = cx + dx, ty = cy + dy;
              if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && walkable[ty]?.[tx]) {
                if (this.moveTo(tx, ty)) { found = true; break; }
              }
              if (found) break;
            }
            if (found) break;
          }
        }
      }
    }
    this.state = 'entering_room';
  }

  startConversation(agent) {
    this.assignedAgent = agent;
    this.state = 'in_conversation';
    this.conversationStep = 0;
    this.conversationTimer = 0;
    this.needsAgent = false;
    this.satisfaction += 0.15;
    if (this.patience > 0.7) this.satisfaction += 0.2;

    // Pick a dialogue sequence
    const seqs = VISITOR_DIALOGUES[this.type];
    this._dialogueSeq = seqs ? pick(seqs) : null;
    this._linePause = 0;
  }

  leave(happy) {
    this.state = 'leaving';
    this.converted = happy && (this.type === 'customer' || this.type === 'client');
    // Release chair
    if (this.claimedChair) {
      releaseChair(this.claimedChair);
      this.claimedChair = null;
    }
    this.seated = false;
    this.needsAgent = false;
    // Clear agent reference
    if (this.assignedAgent && this.assignedAgent._servingVisitor === this) {
      this.assignedAgent._servingVisitor = null;
    }
    this.assignedAgent = null;
    if (happy) {
      const happySpeech = this.type === 'customer'
        ? pick(['Great find! 🛍️', 'Love it! 👗', 'I\'ll be back!', 'Amazing style! ⭐'])
        : pick(['Thanks! 😊', 'Great! 👍', 'Nice office!', 'Impressed! ⭐']);
      this.say(happySpeech, 120);
    } else {
      this.say(pick(['Too slow! 😤', 'Leaving... 😒', 'Not worth it.', 'Bye. 👎']), 120);
    }
    this.moveToLobbyEntrance();
  }

  update(dt, visitors) {
    Visitor._allVisitors = visitors || [];
    this.frame += dt;

    // Speech countdown
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) this.speech = null;
    }

    // Bob animation for walking states
    const isMoving = this.state === 'entering' || this.state === 'walking_to_door'
      || this.state === 'entering_room' || this.state === 'leaving' || this.state === 'browsing';
    if (isMoving) {
      this.bobY = Math.sin(this.frame * 0.15) * 1.5;
    } else {
      this.bobY *= 0.9;
    }

    switch (this.state) {
      case 'entering':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          this.say(pick(VISITOR_ARRIVAL_SPEECH[this.type] || VISITOR_ARRIVAL_SPEECH.walkin), 80);
          if (this.type === 'walkin' && !this.targetRoomType) {
            this.state = 'browsing';
            this.stateTimer = 0;
            this._browseNextRoom();
          } else {
            this.state = 'walking_to_door';
            this._navigateToTarget();
          }
        }
        break;

      case 'walking_to_door':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          if (!this.targetRoom) {
            // No target room — wait in lobby
            this.state = 'seated_waiting';
            this.needsAgent = true;
            this.requestedRole = this.type === 'client' ? 'sales' : this.type === 'candidate' ? 'hr' : this.type === 'customer' ? 'shopfront' : null;
            break;
          }
          // Check if room is occupied — try alternate rooms first
          if (isRoomOccupiedByVisitor(this.targetRoom, visitors || [])) {
            const altRooms = this.targetRoomType
              ? findAllRoomsByType(this.targetRoomType).filter(r => r !== this.targetRoom && !isRoomOccupiedByVisitor(r, visitors || []))
              : [];
            if (altRooms.length > 0) {
              this._moveToRoomDoor(altRooms[0]);
              break; // Re-walk to alternate room
            }
            this.state = 'queuing_outside';
            this.stateTimer = 0;
            this.say(pick(VISITOR_QUEUE_SPEECH[this.type] || VISITOR_QUEUE_SPEECH.walkin), 80);
          } else {
            this._enterRoom();
          }
        }
        break;

      case 'queuing_outside':
        this.stateTimer += dt;
        // Patience drains at half rate while queuing
        if (this.patience <= 0) {
          this.satisfaction -= 0.15;
          this.leave(false);
          break;
        }
        // Re-check every ~30 ticks
        if (this.stateTimer >= 30) {
          this.stateTimer = 0;
          if (!this.targetRoom || !isRoomOccupiedByVisitor(this.targetRoom, visitors || [])) {
            this._enterRoom();
          } else if (this.targetRoomType) {
            // Try an alternate room of the same type
            const altRooms = findAllRoomsByType(this.targetRoomType)
              .filter(r => r !== this.targetRoom && !isRoomOccupiedByVisitor(r, visitors || []));
            if (altRooms.length > 0) {
              this._moveToRoomDoor(altRooms[0]);
              this.state = 'walking_to_door';
            }
          }
        }
        break;

      case 'entering_room':
        this._tickMovement(dt);
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          // Arrived at chair/position
          if (this.claimedChair) {
            this.seated = true;
          }
          this.state = 'seated_waiting';
          this.stateTimer = 0;
          this.needsAgent = true;
          this.requestedRole = this.type === 'client' ? 'sales' : this.type === 'candidate' ? 'hr' : this.type === 'customer' ? 'shopfront' : null;
        }
        break;

      case 'seated_waiting':
        this.stateTimer += dt;
        if (this.patience <= 0) {
          this.satisfaction -= 0.15;
          this.leave(false);
        }
        break;

      case 'agent_arriving':
        this.stateTimer += dt;
        // Check if assigned agent arrived in room
        if (this.assignedAgent) {
          const a = this.assignedAgent;
          // Agent broke or got reassigned?
          if (!a._servingVisitor || a._servingVisitor !== this) {
            this.assignedAgent = null;
            this.state = 'seated_waiting';
            this.needsAgent = true;
            break;
          }
          // Agent arrived? Check if in same room or close enough
          if (this.targetRoom) {
            const r = this.targetRoom;
            const inRoom = a.x >= r.x && a.x < r.x + r.w && a.y >= r.y && a.y < r.y + r.h;
            if (inRoom && (a.state === 'idle' || a.state === 'working')) {
              this.startConversation(a);
            }
          } else {
            // No target room — just check proximity
            if (Math.abs(a.x - this.x) < 3 && Math.abs(a.y - this.y) < 3
              && (a.state === 'idle' || a.state === 'working')) {
              this.startConversation(a);
            }
          }
        }
        if (this.patience <= 0) {
          this.satisfaction -= 0.15;
          this.leave(false);
        }
        break;

      case 'in_conversation':
        this.conversationTimer += dt;
        this._tickDialogue(dt);
        break;

      case 'wrapping_up':
        this.stateTimer += dt;
        if (this.stateTimer >= 30) {
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
            this.leave(this.satisfaction > 0.4);
          } else {
            // Sit briefly in a chair if available
            const rooms = getRoomInstances().filter(r => r.constructionProgress >= 1);
            const room = rooms.length > 0 ? pick(rooms) : null;
            if (room) {
              const chair = findAvailableChair(room);
              if (chair && Math.random() < 0.4) {
                this.claimedChair = chair;
                claimChair(chair);
                this.targetRoom = room;
                this.moveTo(chair.x, chair.y);
                // Will release after arriving and sitting briefly
                this._browseSitTimer = 60 + Math.random() * 60;
              } else {
                this._browseNextRoom();
              }
            } else {
              this._browseNextRoom();
            }
          }
        }
        // Handle brief sitting during browsing
        if (this.claimedChair && this._browseSitTimer !== undefined) {
          if (this.path.length === 0 || this.pathIdx >= this.path.length) {
            this.seated = true;
            this._browseSitTimer -= dt;
            if (this._browseSitTimer <= 0) {
              this.seated = false;
              releaseChair(this.claimedChair);
              this.claimedChair = null;
              this.targetRoom = null;
              delete this._browseSitTimer;
              this._browseNextRoom();
            }
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

  _tickDialogue(dt) {
    if (!this._dialogueSeq || this.conversationStep >= this._dialogueSeq.length) {
      // Conversation done
      this.state = 'wrapping_up';
      this.stateTimer = 0;
      this.seated = false;
      this.say(pick(['Goodbye!', 'Thanks for your time!', 'See you soon!']), 60);
      return;
    }

    this._linePause -= dt;
    if (this._linePause > 0) return;

    const line = this._dialogueSeq[this.conversationStep];
    const [speaker, text, pause] = line;

    if (speaker === 'visitor') {
      this.say(text, pause + 10);
    } else if (speaker === 'agent' && this.assignedAgent) {
      this.assignedAgent.say(text, pause + 10);
    }

    this._linePause = pause;
    this.conversationStep++;
  }

  _navigateToTarget() {
    if (this.targetRoomType) {
      // Pick the least-occupied room of this type to distribute visitors
      const allRooms = findAllRoomsByType(this.targetRoomType);
      let room = null;
      if (allRooms.length > 1) {
        // Count visitors targeting each room, prefer unoccupied
        let best = null, bestCount = Infinity;
        for (const r of allRooms) {
          const count = (this.constructor._allVisitors || [])
            .filter(v => v !== this && v.targetRoom === r && v.state !== 'gone' && v.state !== 'leaving').length;
          if (count < bestCount) { bestCount = count; best = r; }
        }
        room = best;
      } else {
        room = allRooms[0] || null;
      }
      if (room) {
        this._moveToRoomDoor(room);
      } else {
        // Target room doesn't exist, request agent in lobby
        this.state = 'seated_waiting';
        this.needsAgent = true;
        this.requestedRole = this.type === 'client' ? 'sales' : this.type === 'candidate' ? 'hr' : this.type === 'customer' ? 'shopfront' : null;
      }
    }
  }

  _browseNextRoom() {
    const rooms = getRoomInstances().filter(r => r.constructionProgress >= 1);
    if (rooms.length === 0) return;
    // Prefer shopfront on first visit if available
    let room;
    if (this.browseRoomsVisited === 0) {
      const shopfront = rooms.find(r => r.type === 'shopfront');
      room = shopfront || pick(rooms);
    } else {
      room = pick(rooms);
    }
    const walkable = getWalkable();
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
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
