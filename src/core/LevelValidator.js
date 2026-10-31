import { TILE_SOLID, TILE_ONEWAY } from './LevelParser.js';

// Max gap (empty columns between take-off and landing cell) by rise in tiles (+ = up). Table §14.3.
// 'hard' = everything the physics allows; 'normal' = what a mandatory path may require.
export function maxGap(rise, table = 'hard') {
  if (rise >= 4) return -1;
  const hard = table === 'hard';
  if (rise === 3) return hard ? 2 : 1;
  if (rise === 2) return hard ? 4 : 3;
  if (rise <= -2) return hard ? 6 : 5;
  return hard ? 5 : 4;
}

// Solid cells created by pivoted (or static) trap parts, in tile coordinates.
export function trapSurfaces(entity) {
  const { type, mode, params: p, x, y } = entity;
  const cells = [];
  const rect = (cx, cy, w, h) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells.push({ x: cx + i, y: cy + j });
  };
  if (type === 'scopeCreep') {
    const len = mode === 'pivoted' ? p.maxLength : p.baseLength;
    const start = p.direction === 'left' ? x - len + 1 : x;
    rect(start, y + (p.dy ?? 0), len, 1);
  }
  if (type === 'replyAll' && (mode === 'pivoted' || p.landing === 'solid')) {
    const perColumn = {};
    for (let i = 0; i < p.count; i++) {
      const dx = p.columns[i % p.columns.length];
      perColumn[dx] = (perColumn[dx] ?? 0) + 1;
    }
    for (const [dx, n] of Object.entries(perColumn)) {
      const h = Math.floor(n / 2);
      rect(x + Number(dx), p.restRow - h + 1, 1, h);
    }
  }
  if (mode !== 'pivoted') return cells;
  if (type === 'deckCollapse') {
    for (const t of p.targets) rect(x + t.dx, t.row, 2, 1);
  }
  if (type === 'fakeKT') {
    for (const h of p.hiddenPlatforms ?? []) rect(x + h.dx, y + h.dy, h.w, h.h);
  }
  return cells;
}

export function validateLevel(parsed, { table = 'hard' } = {}) {
  const errors = [];
  const { width, height } = parsed;
  const solid = parsed.tiles.map((row) => row.map((t) => t === TILE_SOLID));
  const oneway = parsed.tiles.map((row) => row.map((t) => t === TILE_ONEWAY));
  const spike = parsed.tiles.map((row) => row.map(() => false));
  for (const s of parsed.spikes) spike[s.y][s.x] = true;

  for (const e of parsed.entities) {
    if (e.x < 0 || e.x >= width || e.y < 2 || e.y >= height) errors.push(`entity ${e.id} out of bounds or in HUD rows`);
    for (const c of trapSurfaces(e)) {
      if (c.x < 0 || c.x >= width || c.y < 2 || c.y >= height) errors.push(`entity ${e.id} surface out of bounds`);
      else solid[c.y][c.x] = true;
    }
  }

  const blocked = (x, y) => y >= 0 && y < height && x >= 0 && x < width && solid[y][x];
  const standable = (x, y) =>
    y >= 1 && y < height - 1 && !solid[y][x] && !spike[y][x] && (solid[y + 1][x] || oneway[y + 1][x]);

  // Approximate arc: the player crosses intermediate columns at the higher end's height
  // (two free rows), and needs free headroom above the take-off cell.
  const clearArc = (x1, y1, x2, y2) => {
    const top = Math.min(y1, y2) - 1;
    for (let y = top; y < y1; y++) if (blocked(x1, y)) return false;
    if (x1 === x2) return true;
    const step = x2 > x1 ? 1 : -1;
    for (let x = x1 + step; x !== x2; x += step) {
      if (blocked(x, top) || blocked(x, top + 1)) return false;
    }
    return true;
  };

  const key = (x, y) => `${x}:${y}`;
  const start = parsed.spawn;
  const goal = parsed.goal;
  if (!standable(start.x, start.y)) errors.push(`spawn ${key(start.x, start.y)} is not standable`);
  if (!standable(goal.x, goal.y)) errors.push(`goal ${key(goal.x, goal.y)} is not standable`);

  const seen = new Set([key(start.x, start.y)]);
  const queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (let dx = -7; dx <= 7; dx++) {
      const x2 = x + dx;
      if (x2 < 0 || x2 >= width) continue;
      for (let y2 = 1; y2 < height - 1; y2++) {
        if (seen.has(key(x2, y2)) || !standable(x2, y2)) continue;
        const rise = y - y2;
        const gap = Math.max(0, Math.abs(dx) - 1);
        if (gap > maxGap(rise, table)) continue;
        if (!clearArc(x, y, x2, y2)) continue;
        seen.add(key(x2, y2));
        queue.push({ x: x2, y: y2 });
      }
    }
  }
  if (!seen.has(key(goal.x, goal.y))) errors.push('goal not reachable from spawn');
  for (const cp of parsed.checkpoints) {
    if (!seen.has(key(cp.x, cp.y))) errors.push(`checkpoint ${cp.id} not reachable`);
  }
  return { ok: errors.length === 0, errors, reachable: seen };
}
