import { LEVEL_ROWS } from '../config/constants.js';

export const TILE_EMPTY = -1;
export const TILE_SOLID = 0;
export const TILE_ONEWAY = 2;

const KNOWN = new Set(['.', '#', '=', '^', 'P', 'C', 'G', 'o', 'p', '$', 'b']);

export function parseLevel(def) {
  const { map } = def;
  const rows = def.rows ?? LEVEL_ROWS;
  if (!Array.isArray(map) || map.length !== rows) {
    throw new Error(`${def.id}: map must have ${rows} rows, got ${map?.length}`);
  }
  const width = map[0].length;
  const out = {
    width,
    height: map.length,
    tiles: [],
    spikes: [],
    spawn: null,
    checkpoints: [],
    goal: null,
    pickups: [],
    plants: [],
    deals: [],
    mats: [],
    vertical: Boolean(def.vertical),
    entities: def.entities ?? [],
  };
  let spawns = 0;
  let goals = 0;

  map.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${def.id}: row ${y} has length ${row.length}, expected ${width}`);
    const tileRow = [];
    [...row].forEach((ch, x) => {
      if (!KNOWN.has(ch)) throw new Error(`${def.id}: unknown char "${ch}" at ${x},${y}`);
      tileRow.push(ch === '#' ? TILE_SOLID : ch === '=' ? TILE_ONEWAY : TILE_EMPTY);
      if (ch === '^') out.spikes.push({ x, y });
      if (ch === 'P') {
        spawns += 1;
        out.spawn = { x, y };
      }
      if (ch === 'C') out.checkpoints.push({ x, y });
      if (ch === 'G') {
        goals += 1;
        out.goal = { x, y };
      }
      if (ch === 'o') out.pickups.push({ x, y });
      if (ch === 'p') out.plants.push({ x, y });
      if (ch === '$') out.deals.push({ x, y });
      if (ch === 'b') out.mats.push({ x, y });
    });
    out.tiles.push(tileRow);
  });

  if (spawns !== 1) throw new Error(`${def.id}: expected exactly 1 P, got ${spawns}`);
  if (goals !== 1) throw new Error(`${def.id}: expected exactly 1 G, got ${goals}`);
  // in order of progress: left to right, or bottom to top in a vertical level
  out.checkpoints.sort((a, b) => (out.vertical ? b.y - a.y : a.x - b.x));
  out.checkpoints = out.checkpoints.map((c, i) => ({ ...c, id: `cp${i}` }));
  return out;
}
