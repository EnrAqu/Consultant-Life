import { describe, it, expect } from 'vitest';
import MicromanagerBrain, { MM_DEFAULTS } from '../src/core/MicromanagerBrain.js';

const T = 32;
// zone cols 10–30, floor row 14 (feet y = 15 * 32), pit at cols 18–20
const base = { zoneFrom: 10, zoneTo: 30, floorRow: 14, demoJump: { fromCol: 17, toCol: 21 }, plants: [], gaps: [[18, 20]] };
const FEET = 15 * T;

function make(over = {}, mode = 'normal') {
  return new MicromanagerBrain({ ...MM_DEFAULTS, ...base, ...over }, mode);
}

function run(brain, ms, player, step = 20) {
  const actions = [];
  for (let t = 0; t < ms; t += step) {
    const p = typeof player === 'function' ? player(t) : player;
    actions.push(...brain.update(step, { grounded: true, locked: false, ...p }));
  }
  return actions;
}

const still = (col) => ({ x: col * T + 16, y: FEET, vx: 0 });
const caught = (actions) => actions.some((a) => a.type === 'catch');

describe('MicromanagerBrain', () => {
  it('catches a player standing still in sight after checkEveryMs + tellMs', () => {
    const b = make();
    const early = run(b, MM_DEFAULTS.checkEveryMs - 100, still(14));
    expect(caught(early)).toBe(false);
    const later = run(b, 1500, still(14));
    expect(later.some((a) => a.type === 'tell')).toBe(true);
    expect(caught(later)).toBe(true);
  });

  it('never catches a player really running back and forth at 260 px/s', () => {
    const b = make({ gaps: [] });
    // ping-pong across the zone at full speed
    const runner = (t) => {
      const span = 20 * T;
      const d = (260 * t) / 1000;
      const k = d % (2 * span);
      return { x: 10 * T + (k < span ? k : 2 * span - k), y: FEET, vx: k < span ? 260 : -260 };
    };
    expect(caught(run(b, 40000, runner))).toBe(false);
  });

  it('does not catch a player standing at a plant, from either side', () => {
    const left = make({ gaps: [], plants: [{ col: 15, row: 14 }] });
    expect(caught(run(left, 20000, still(15)))).toBe(false);
    const right = make({ gaps: [], plants: [{ col: 15, row: 14 }] });
    right.x = 29 * T + 16; // patrolling the right end when you arrive
    right.facing = -1;
    expect(caught(run(right, 20000, still(15)))).toBe(false);
  });

  it('a plant between him and you hides you', () => {
    const b = make({ gaps: [], plants: [{ col: 14, row: 14 }] });
    expect(caught(run(b, 20000, still(16)))).toBe(false);
  });

  it('only sees forward, within sightRange', () => {
    const b = make({ gaps: [] });
    b.facing = 1;
    expect(b.sees({ x: 12 * T, y: FEET })).toBe(true);
    expect(b.sees({ x: (10 + MM_DEFAULTS.sightRange + 1) * T + 16, y: FEET })).toBe(false);
    b.x = 20 * T;
    expect(b.sees({ x: 15 * T, y: FEET })).toBe(false);
  });

  it('never catches a player in the air, nor one already frozen (KT call)', () => {
    const air = make({ gaps: [] });
    expect(caught(run(air, 20000, { ...still(14), grounded: false, y: FEET - 40 }))).toBe(false);
    const frozen = make({ gaps: [] });
    expect(caught(run(frozen, 20000, { ...still(14), locked: true }))).toBe(false);
  });

  it('never walks over a pit', () => {
    const b = make();
    let maxX = 0;
    for (let t = 0; t < 30000; t += 20) {
      b.update(20, { ...still(25), grounded: true, locked: false });
      if (b.state !== 'demo' && b.state !== 'away') {
        expect(b.x < 18 * T || b.x > 21 * T).toBe(true);
        maxX = Math.max(maxX, b.x);
      }
    }
    expect(maxX).toBeLessThan(18 * T);
  });

  it('releases after explainMs and alternates demo success / failure from the pit edge', () => {
    const b = make();
    const actions = run(b, 60000, still(13));
    expect(actions.filter((a) => a.type === 'catch').length).toBeGreaterThanOrEqual(2);
    const demos = actions.filter((a) => a.type === 'demoStart').map((a) => a.success);
    expect(demos.slice(0, 2)).toEqual([true, false]);
    expect(b.demoFrom).toBe(17 * T + 16);
  });

  it('a zone without a pit always succeeds the demo ("I would have waited better")', () => {
    const b = make({ demoJump: null, gaps: [] });
    const demos = run(b, 40000, still(15)).filter((a) => a.type === 'demoStart');
    expect(demos.length).toBeGreaterThanOrEqual(2);
    expect(demos.every((a) => a.success && a.kind === 'sit')).toBe(true);
  });

  it('pivoted: never catches, walks ahead of a running player', () => {
    const b = make({ gaps: [] }, 'pivoted');
    const actions = run(b, 2000, (t) => ({ x: 11 * T + (260 * t) / 1000, y: FEET, vx: 260 }));
    expect(caught(actions)).toBe(false);
    expect(actions.filter((a) => a.type === 'guideStart')).toHaveLength(1);
    expect(b.x).toBeGreaterThan(11 * T + 260 * 2); // ahead of the runner
  });

  it('check rhythm restarts when you re-enter the zone', () => {
    const b = make({ gaps: [] });
    run(b, 5500, still(14));
    run(b, 1000, still(40)); // leave
    expect(caught(run(b, 3000, still(14)))).toBe(false);
  });

  it('reset restores the initial state', () => {
    const b = make();
    run(b, 7000, still(14));
    b.reset();
    expect(b.state).toBe('idle');
    expect(b.x).toBe(10 * T + 16);
  });
});
