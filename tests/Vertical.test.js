import { describe, it, expect } from 'vitest';
import { parseLevel } from '../src/core/LevelParser.js';
import { validateLevel, longestQuietClimb } from '../src/core/LevelValidator.js';
import { pickDelegateTarget } from '../src/core/DelegateTargeting.js';
import { createGrid } from '../src/levels/builder.js';

// A small tower (12 × 20): spawn at the bottom, goal at the top.
function tower({ mat = true, worker = false } = {}) {
  const g = createGrid(12, 20);
  g.fill(0, 0, 0, 19, '#').fill(11, 11, 0, 19, '#').ground(1, 10, 19);
  g.put(2, 18, 'P').put(9, 18, 'C');
  if (mat) g.put(5, 18, 'b');
  // rise 5 from the floor: only the mat gets you here
  g.fill(4, 6, 14, 14, '=').put(6, 13, '$');
  // then normal steps up to the goal (rise 3, gap 1)
  g.fill(8, 9, 11, 11, '=').fill(4, 6, 8, 8, '=').put(5, 7, 'C');
  g.fill(1, 10, 5, 5, '#').fill(5, 9, 5, 5, '=').put(9, 4, 'G');
  const entities = worker ? [{ id: 'w1', type: 'worker', x: 2, y: 18, params: { cells: [{ dx: 1, dy: -2, w: 2 }] } }] : [];
  return { id: 'tower', rows: 20, vertical: true, map: g.toMap(), entities };
}

describe('vertical levels', () => {
  it('parses a taller map with deals, mats and checkpoints in climbing order', () => {
    const p = parseLevel(tower());
    expect(p.height).toBe(20);
    expect(p.vertical).toBe(true);
    expect(p.deals).toEqual([{ x: 6, y: 13 }]);
    expect(p.mats).toEqual([{ x: 5, y: 18 }]);
    // bottom first: cp0 is the floor one, cp1 the higher one
    expect(p.checkpoints.map((c) => [c.id, c.y])).toEqual([
      ['cp0', 18],
      ['cp1', 7],
    ]);
  });

  it('rejects a map with the wrong number of rows', () => {
    expect(() => parseLevel({ ...tower(), rows: 21 })).toThrow(/21 rows/);
  });

  it('the mat bounce is what makes the tower climbable', () => {
    const p = parseLevel(tower());
    expect(validateLevel(p, { table: 'normal' }).ok).toBe(true);
    expect(validateLevel(p, { table: 'normal', bounces: false }).ok).toBe(false);
  });

  it('worker platforms count only when asked', () => {
    const p = parseLevel(tower({ mat: false, worker: true }));
    expect(validateLevel(p, { table: 'normal' }).ok).toBe(true);
    expect(validateLevel(p, { table: 'normal', workers: false }).ok).toBe(false);
  });

  it('reports the minimum number of jumps', () => {
    const r = validateLevel(parseLevel(tower()), { table: 'normal' });
    expect(r.dist.get('2:18')).toBe(0);
    expect(r.dist.get('9:4')).toBeGreaterThanOrEqual(4);
  });

  it('measures quiet rows on the way up', () => {
    const p = parseLevel(tower());
    const r = validateLevel(p, { table: 'normal' });
    expect(longestQuietClimb(p, r.reachable)).toBeLessThanOrEqual(2);
  });
});

describe('pickDelegateTarget in a tower', () => {
  it('ignores targets on another floor', () => {
    const near = { x: 5 * 32, y: 15 * 32, id: 'near' };
    const upstairs = { x: 3 * 32, y: 5 * 32, id: 'up' };
    expect(pickDelegateTarget(64, 1, [upstairs, near], 10, { playerY: 15 * 32 }).id).toBe('near');
    expect(pickDelegateTarget(64, 1, [upstairs], 10, { playerY: 15 * 32 })).toBe(null);
    // without a height (horizontal levels) nothing changes
    expect(pickDelegateTarget(64, 1, [upstairs], 10).id).toBe('up');
  });
});
