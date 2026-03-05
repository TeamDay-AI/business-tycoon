// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — A* Pathfinding
// ═══════════════════════════════════════════════════════════════

import { MAP_W, MAP_H } from './config.js';

export function findPath(walkable, sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
  if (!walkable[ey]?.[ex]) return null;

  const open = [];
  const closed = new Set();
  const g = {}, f = {}, parent = {};
  const key = (x, y) => (x << 8) | y;
  const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);

  const sk = key(sx, sy);
  g[sk] = 0; f[sk] = h(sx, sy);
  open.push({ x: sx, y: sy, f: f[sk] });

  const dirs = [
    {dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0},
    {dx:1,dy:-1},{dx:1,dy:1},{dx:-1,dy:1},{dx:-1,dy:-1}
  ];

  let iter = 0;
  while (open.length > 0 && iter++ < 3000) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    const ck = key(cur.x, cur.y);

    if (cur.x === ex && cur.y === ey) {
      const path = [];
      let k = ck;
      while (k !== undefined) {
        path.unshift({ x: k >> 8, y: k & 0xFF });
        k = parent[k];
      }
      return path;
    }

    closed.add(ck);

    for (const { dx, dy } of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
      if (!walkable[ny][nx]) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;

      // Prevent diagonal cutting through corners
      if (dx !== 0 && dy !== 0) {
        if (!walkable[cur.y + dy]?.[cur.x] || !walkable[cur.y]?.[cur.x + dx]) continue;
      }

      const cost = (dx !== 0 && dy !== 0) ? 1.41 : 1;
      const ng = g[ck] + cost;
      if (g[nk] === undefined || ng < g[nk]) {
        parent[nk] = ck;
        g[nk] = ng;
        f[nk] = ng + h(nx, ny);
        if (!open.find(o => o.x === nx && o.y === ny)) {
          open.push({ x: nx, y: ny, f: f[nk] });
        }
      }
    }
  }
  return null;
}
