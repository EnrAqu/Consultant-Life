import { describe, it, expect } from 'vitest';
import { LEVELS, nextLevel } from '../src/levels/index.js';
import { parseLevel } from '../src/core/LevelParser.js';
import { resolveLevel } from '../src/core/pivot.js';
import { validateLevel, longestQuietClimb } from '../src/core/LevelValidator.js';
import EscalationBrain from '../src/core/EscalationBrain.js';
import { WORKER_DEFAULTS } from '../src/core/WorkerBrain.js';

const T = 32;
const def = LEVELS.level5;
const PIVOTS = [null, 'replyAll', 'fiveMinutes', 'deckCollapse', 'scopeCreep'];
const parse = (d, pivot = null) => parseLevel(resolveLevel(d, pivot));
const without = (id) => ({ ...def, entities: def.entities.filter((e) => e.id !== id) });
// the slabs of the four floors and of the Board, as standing rows (ITERATION_5 §7)
const FLOORS = [85, 61, 37, 13];

describe('level 5 "La Partnership"', () => {
  it('comes after level 4 and is the last one', () => {
    expect(nextLevel('level4')).toBe('level5');
    expect(nextLevel('level5')).toBe(null);
  });

  it.each(PIVOTS)('the Board, every deal and checkpoint are reachable with "normal" jumps (pivot: %s)', (pivot) => {
    const r = validateLevel(parse(def, pivot), { table: 'normal' });
    expect(r.errors).toEqual([]);
  });

  it.each(PIVOTS)('the workers and the sycophant are mandatory (pivot: %s)', (pivot) => {
    expect(validateLevel(parse(def, pivot), { table: 'normal', workers: false }).ok).toBe(false);
    expect(validateLevel(parse(def, pivot), { table: 'normal', bounces: false }).ok).toBe(false);
  });

  it('each worker is needed on its own (no pivot), and so is the third floor mat', () => {
    for (const id of ['worker1', 'worker2', 'worker3']) expect(validateLevel(parse(without(id)), { table: 'normal' }).ok).toBe(false);
    const noMat3 = { ...def, map: def.map.map((row, y) => (y === 37 ? row.replace('b', '.') : row)) };
    expect(validateLevel(parse(noMat3), { table: 'normal' }).ok).toBe(false);
  });

  it('has three deals and a checkpoint on every floor', () => {
    const p = parse(def);
    expect(p.deals).toHaveLength(3);
    expect(p.checkpoints.map((c) => c.y)).toEqual([67, 52, 37, 13]);
    expect(def.goal.requiresDeals).toBe(3);
  });

  it('never leaves more than 6 quiet rows on the way up', () => {
    const p = parse(def);
    expect(longestQuietClimb(p, validateLevel(p, { table: 'normal' }).reachable)).toBeLessThanOrEqual(6);
  });

  // ITERATION_5 §2: analytic check of the tide against the shortest climb (review #13: no recorded run).
  describe('escalation timing', () => {
    const p = parse(def);
    const { dist } = validateLevel(p, { table: 'normal' });
    const minDist = (row) => Math.min(...[...dist].filter(([k]) => Number(k.split(':')[1]) === row).map(([, d]) => d));
    const workers = def.entities.filter((e) => e.type === 'worker');
    // waypoints: each floor slab, plus each worker's row (you wait for him there); waits: the worker's build time
    const waypoints = [...FLOORS.map((row) => ({ row, waitMs: 0 })), ...workers.map((w) => ({ row: w.y, waitMs: w.params.cells.length * WORKER_DEFAULTS.buildMs + WORKER_DEFAULTS.resumeMs }))]
      .sort((a, b) => b.row - a.row)
      .reduce((list, wp) => {
        const same = list.find((x) => x.row === wp.row);
        if (same) same.waitMs += wp.waitMs;
        else list.push({ ...wp });
        return list;
      }, []);
    // a tolerance at the bottom of every floor, then wait for the workers and climb at a steady pace
    const climb = (jumpMs, toleranceMs) =>
      waypoints.slice(0, -1).map((wp, i) => {
        const to = waypoints[i + 1].row;
        return { from: wp.row, to, waitMs: wp.waitMs + (FLOORS.includes(wp.row) ? toleranceMs : 0), climbMs: (minDist(to) - minDist(wp.row)) * jumpMs };
      });
    const simulate = (legs) => {
      const brain = new EscalationBrain(def.escalation);
      let catches = 0;
      for (const leg of legs) {
        const steps = [
          [leg.waitMs, () => (leg.from + 1) * T],
          [leg.climbMs, (t) => (leg.from + 1) * T - ((leg.from - leg.to) * T * t) / leg.climbMs],
        ];
        for (const [ms, feet] of steps) {
          for (let t = 0; t < ms; t += 10) catches += brain.update(10, { feetY: feet(t) }).filter((a) => a.type === 'catch').length;
        }
      }
      return catches;
    };

    it('a player climbing at a good pace is never caught', () => {
      expect(simulate(climb(750, 2000))).toBe(0);
    });

    it('a slow player gets caught at least once', () => {
      expect(simulate(climb(1100, 3000))).toBeGreaterThan(0);
    });
  });
});
