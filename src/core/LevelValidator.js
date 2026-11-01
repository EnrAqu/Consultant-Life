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

// One-way platforms a worker builds (ITERATION_5 §3), all of them.
export function workerSurfaces(entity) {
  if (entity.type !== 'worker') return [];
  const cells = [];
  for (const c of entity.params.cells) for (let i = 0; i < (c.w ?? 2); i++) cells.push({ x: entity.x + c.dx + i, y: entity.y + c.dy });
  return cells;
}

// Sycophant bounce from a mat (ITERATION_5 §4): up to 5 rows, gap up to 2.
export const BOUNCE = { maxRise: 5, maxGap: 2 };

// gatesClosed: treat 'Approvazione richiesta' barriers as walls (nobody delegated to their plate).
// workers: count the platforms workers build; bounces: allow the sycophant's bounce from the mats.
export function validateLevel(parsed, { table = 'hard', gatesClosed = false, workers = true, bounces = true } = {}) {
  const errors = [];
  const { width, height } = parsed;
  const solid = parsed.tiles.map((row) => row.map((t) => t === TILE_SOLID));
  const oneway = parsed.tiles.map((row) => row.map((t) => t === TILE_ONEWAY));
  const spike = parsed.tiles.map((row) => row.map(() => false));
  for (const s of parsed.spikes) spike[s.y][s.x] = true;
  // rows 0–1 sit under the HUD in a horizontal level; a vertical level scrolls under it
  const minRow = parsed.vertical ? 0 : 2;

  for (const e of parsed.entities) {
    if (e.x < 0 || e.x >= width || e.y < minRow || e.y >= height) errors.push(`entity ${e.id} out of bounds or in HUD rows`);
    if (workers) {
      for (const c of workerSurfaces(e)) {
        if (c.x < 0 || c.x >= width || c.y < minRow || c.y >= height) errors.push(`entity ${e.id} surface out of bounds`);
        else oneway[c.y][c.x] = true;
      }
    }
    const cells = trapSurfaces(e);
    if (gatesClosed && e.type === 'approvalGate' && e.mode !== 'pivoted') for (let r = 0; r < 4; r++) cells.push({ x: e.x, y: e.y - r });
    for (const c of cells) {
      if (c.x < 0 || c.x >= width || c.y < minRow || c.y >= height) errors.push(`entity ${e.id} surface out of bounds`);
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

  const mats = new Set(bounces ? (parsed.mats ?? []).map((m) => key(m.x, m.y)) : []);
  const seen = new Set([key(start.x, start.y)]);
  // minimum number of jumps to reach each cell (breadth-first order)
  const dist = new Map([[key(start.x, start.y), 0]]);
  const queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    const onMat = mats.has(key(x, y));
    const d = dist.get(key(x, y));
    for (let dx = -7; dx <= 7; dx++) {
      const x2 = x + dx;
      if (x2 < 0 || x2 >= width) continue;
      // nothing higher than 6 rows is reachable; longer falls pass through intermediate cells
      for (let y2 = Math.max(1, y - 6); y2 < Math.min(height - 1, y + 9); y2++) {
        if (seen.has(key(x2, y2)) || !standable(x2, y2)) continue;
        const rise = y - y2;
        const gap = Math.max(0, Math.abs(dx) - 1);
        const bounce = onMat && rise <= BOUNCE.maxRise && gap <= BOUNCE.maxGap;
        if (gap > maxGap(rise, table) && !bounce) continue;
        if (!clearArc(x, y, x2, y2)) continue;
        seen.add(key(x2, y2));
        dist.set(key(x2, y2), d + 1);
        queue.push({ x: x2, y: y2 });
      }
    }
  }
  if (!seen.has(key(goal.x, goal.y))) errors.push('goal not reachable from spawn');
  for (const cp of parsed.checkpoints) {
    if (!seen.has(key(cp.x, cp.y))) errors.push(`checkpoint ${cp.id} not reachable`);
  }
  for (const dl of parsed.deals ?? []) {
    if (!seen.has(key(dl.x, dl.y))) errors.push(`deal ${key(dl.x, dl.y)} not reachable`);
  }
  return { ok: errors.length === 0, errors, reachable: seen, dist };
}

// Columns an entity makes "active" (something to do or to watch out for).
function entityColumns(e) {
  const p = e.params ?? {};
  switch (e.type) {
    case 'replyAll':
      return [e.x + (p.triggerDx ?? 0), e.x + Math.max(...(p.columns ?? [0]))];
    case 'deckCollapse':
      return [e.x + Math.min(0, p.triggerDx ?? 0), e.x + 6];
    case 'scopeCreep':
      return p.direction === 'left' ? [e.x - (p.maxLength ?? 1), e.x] : [e.x, e.x + (p.maxLength ?? 1)];
    case 'fakeKT':
      return [e.x - 1, e.x + 1];
    case 'micromanager':
      return [p.zoneFrom, p.zoneTo];
    case 'fiveMinutes':
      return [e.x - 6, e.x + 1];
    case 'approvalGate':
      return [e.x + (p.plateDx ?? -4), e.x];
    case 'intern':
      return [e.x - 1, e.x + 1];
    case 'aiDraft':
      return [e.x - 1, e.x + Math.max(0, ...(p.platforms ?? []).map((pl) => pl.dx + pl.w))];
    case 'rival':
      return [p.startCol, p.triggerCol];
    default:
      return null;
  }
}

// Longest run of consecutive "quiet" columns between spawn and goal (ITERATION_4 §1): no trap, NPC, pickup,
// checkpoint, spike, pit or step. The pacing rule asks for at most 12.
export function longestQuietStretch(parsed) {
  const { width, height, tiles } = parsed;
  const active = new Array(width).fill(false);
  const mark = (a, b) => {
    for (let x = Math.max(0, a); x <= Math.min(width - 1, b); x++) active[x] = true;
  };
  for (const e of parsed.entities) {
    const cols = entityColumns(e);
    if (cols) mark(cols[0], cols[1]);
  }
  for (const o of [...parsed.spikes, ...parsed.pickups, ...parsed.checkpoints]) mark(o.x - 1, o.x + 1);
  const floorTop = (x) => {
    for (let y = 2; y < height; y++) if (tiles[y][x] !== -1) return y;
    return null;
  };
  for (let x = 0; x < width; x++) {
    const top = floorTop(x);
    if (top === null) mark(x - 1, x + 1); // pit
    else if (x > 0 && floorTop(x - 1) !== null && floorTop(x - 1) !== top) mark(x - 1, x); // step
  }
  let longest = 0;
  let run = 0;
  for (let x = parsed.spawn.x + 4; x < parsed.goal.x - 2; x++) {
    run = active[x] ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

// Rows an entity makes "active" in a vertical level.
function entityRows(e) {
  const rows = [e.y - 2, e.y + 2];
  for (const c of workerSurfaces(e)) rows.push(c.y - 1);
  return [Math.min(...rows), Math.max(...rows)];
}

// Vertical pacing rule (ITERATION_5 §1): longest run of consecutive rows between spawn and goal with
// nothing on them — no entity, deal, checkpoint, spike, mat, nor a reachable landing spot. At most 6.
export function longestQuietClimb(parsed, reachable) {
  const { height } = parsed;
  const active = new Array(height).fill(false);
  const mark = (a, b) => {
    for (let y = Math.max(0, a); y <= Math.min(height - 1, b); y++) active[y] = true;
  };
  for (const e of parsed.entities) {
    const [a, b] = entityRows(e);
    mark(a, b);
  }
  for (const o of [...parsed.spikes, ...(parsed.deals ?? []), ...parsed.checkpoints, ...(parsed.mats ?? [])]) mark(o.y - 1, o.y + 1);
  for (const k of reachable) mark(Number(k.split(':')[1]), Number(k.split(':')[1]));
  let longest = 0;
  let run = 0;
  for (let y = parsed.spawn.y; y > parsed.goal.y; y--) {
    run = active[y] ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return longest;
}
