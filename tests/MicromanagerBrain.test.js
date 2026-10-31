import { describe, it, expect } from 'vitest';
import MicromanagerBrain, { MM_DEFAULTS } from '../src/core/MicromanagerBrain.js';

const T = 32;
// zone cols 10–30, floor row 14 (feet y = 15 * 32)
const base = { zoneFrom: 10, zoneTo: 30, demoJump: { fromCol: 18, toCol: 22 }, plants: [] };
const FEET = 15 * T;

function make(over = {}, mode = 'normal') {
  return new MicromanagerBrain({ ...MM_DEFAULTS, ...base, ...over }, mode);
}

function run(brain, ms, player, step = 20) {
  const actions = [];
  for (let t = 0; t < ms; t += step) actions.push(...brain.update(step, typeof player === 'function' ? player(t) : player));
  return actions;
}

const still = (col) => ({ x: col * T + 16, y: FEET, vx: 0 });

describe('MicromanagerBrain', () => {
  it('catches a player standing still in sight after checkEveryMs + tellMs', () => {
    const b = make();
    const early = run(b, MM_DEFAULTS.checkEveryMs - 100, still(15));
    expect(early.some((a) => a.type === 'catch')).toBe(false);
    expect(early.some((a) => a.type === 'tell')).toBe(false);
    const later = run(b, 1500, still(15));
    expect(later.some((a) => a.type === 'tell')).toBe(true);
    expect(later.some((a) => a.type === 'catch')).toBe(true);
  });

  it('never catches a running player', () => {
    const b = make();
    const actions = run(b, 20000, (t) => ({ x: (12 + ((t / 1000) % 15)) * T, y: FEET, vx: 260 }));
    expect(actions.some((a) => a.type === 'catch')).toBe(false);
  });

  it('does not catch a player hidden behind a plant', () => {
    const b = make({ plants: [{ col: 14, row: 14 }] });
    b.x = 11 * T;
    const actions = run(b, 20000, still(17));
    expect(actions.some((a) => a.type === 'catch')).toBe(false);
  });

  it('ignores players outside the zone', () => {
    const b = make();
    expect(run(b, 20000, still(40)).some((a) => a.type === 'catch')).toBe(false);
  });

  it('releases after explainMs and alternates demo success / failure', () => {
    const b = make();
    const actions = run(b, 60000, still(15));
    const catches = actions.filter((a) => a.type === 'catch').length;
    const releases = actions.filter((a) => a.type === 'release').length;
    expect(catches).toBeGreaterThanOrEqual(2);
    expect(releases).toBeGreaterThanOrEqual(catches - 1);
    const demos = actions.filter((a) => a.type === 'demoStart').map((a) => a.success);
    expect(demos.slice(0, 4)).toEqual([true, false, true, false].slice(0, demos.length));
  });

  it('a zone without a pit always succeeds the demo ("I would have waited better")', () => {
    const b = make({ demoJump: null });
    const demos = run(b, 40000, still(15)).filter((a) => a.type === 'demoStart');
    expect(demos.length).toBeGreaterThanOrEqual(2);
    expect(demos.every((a) => a.success && a.kind === 'sit')).toBe(true);
  });

  it('pivoted: never catches, guides ahead of the player', () => {
    const b = make({}, 'pivoted');
    const actions = run(b, 20000, still(15));
    expect(actions.some((a) => a.type === 'catch')).toBe(false);
    expect(actions.filter((a) => a.type === 'guideStart')).toHaveLength(1);
    expect(b.x).toBeGreaterThan(15 * T);
  });

  it('reset restores the initial state', () => {
    const b = make();
    run(b, 7000, still(15));
    b.reset();
    expect(b.state).toBe('idle');
    expect(b.x).toBe(10 * T + 16);
  });
});
