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
    actions.push(...brain.update(step, { grounded: true, locked: false, vx: 0, y: FEET, ...p }));
  }
  return actions;
}

const at = (col) => ({ x: col * T + 16 });
const caught = (actions) => actions.some((a) => a.type === 'catch');

describe('MicromanagerBrain (flashlight)', () => {
  it('stepping into his light gets you caught within a frame, even while running', () => {
    const b = make({ gaps: [] });
    expect(caught(run(b, 20, { x: 12 * T + 16, vx: 260 }))).toBe(true);
  });

  it('standing behind him is safe', () => {
    const b = make({ gaps: [] });
    b.x = 15 * T + 16;
    expect(caught(run(b, 1000, at(12)))).toBe(false);
  });

  it('jumping over the light is safe (in the air nothing happens)', () => {
    const b = make({ gaps: [] });
    expect(caught(run(b, 1000, { ...at(12), grounded: false, y: FEET - 80 }))).toBe(false);
  });

  it('a player already frozen (KT call) is left alone', () => {
    const b = make({ gaps: [] });
    expect(caught(run(b, 1000, { ...at(12), locked: true }))).toBe(false);
  });

  it('the light stops at a plant and at a pit', () => {
    const plant = make({ gaps: [], plants: [{ col: 13, row: 14 }] });
    expect(caught(run(plant, 1000, at(14)))).toBe(false);
    const pit = make();
    pit.x = 16 * T + 16;
    expect(caught(run(pit, 500, at(22)))).toBe(false);
  });

  it('the light is 5 tiles long', () => {
    const b = make({ gaps: [] });
    expect(caught(run(b, 20, at(10 + MM_DEFAULTS.sightRange + 1)))).toBe(false);
  });

  it('turns every 3 s, with a "…" 400 ms before', () => {
    const b = make({ gaps: [] });
    const actions = [];
    let firstFlip = null;
    for (let t = 0; t <= 3100; t += 20) {
      const facing = b.facing;
      actions.push(...b.update(20, { x: 40 * T, y: FEET, vx: 0, grounded: true, locked: false }).map((a) => ({ ...a, t })));
      if (b.facing !== facing && firstFlip === null) firstFlip = t;
    }
    const tell = actions.find((a) => a.type === 'tell');
    expect(firstFlip).toBeGreaterThanOrEqual(2960);
    expect(firstFlip - tell.t).toBeGreaterThanOrEqual(380);
  });

  it('after a catch the light stays off for 3 s', () => {
    const b = make({ gaps: [], demoJump: null });
    run(b, 20, at(12));
    run(b, MM_DEFAULTS.explainMs + MM_DEFAULTS.demoMs + 40, at(40));
    expect(b.state).toBe('cooldown');
    expect(b.lightOn).toBe(false);
    expect(caught(run(b, MM_DEFAULTS.cooldownMs - 100, at(12)))).toBe(false);
  });

  it('never walks over a pit', () => {
    const b = make();
    for (let t = 0; t < 30000; t += 20) {
      b.update(20, { x: 40 * T, y: FEET, vx: 0, grounded: true, locked: false });
      if (b.state !== 'demo' && b.state !== 'away') expect(b.x < 18 * T || b.x > 21 * T).toBe(true);
    }
  });

  it('demo jumps start from the pit edge and alternate success / failure', () => {
    const outcomes = [];
    for (let i = 0; i < 2; i++) {
      const b = make();
      b.demos = i;
      run(b, 20, at(12));
      const a = run(b, MM_DEFAULTS.explainMs + 40, at(40));
      outcomes.push(a.find((x) => x.type === 'demoStart').success);
      expect(b.demoFrom).toBe(17 * T + 16);
    }
    expect(outcomes).toEqual([true, false]);
  });

  it('pivoted: never catches, walks ahead of a running player', () => {
    const b = make({ gaps: [] }, 'pivoted');
    const actions = run(b, 2000, (t) => ({ x: 11 * T + (260 * t) / 1000, vx: 260 }));
    expect(caught(actions)).toBe(false);
    expect(actions.filter((a) => a.type === 'guideStart')).toHaveLength(1);
    expect(b.x).toBeGreaterThan(11 * T + 260 * 2);
  });

  it('reset restores the initial state', () => {
    const b = make();
    run(b, 20, at(12));
    b.reset();
    expect(b.state).toBe('patrol');
    expect(b.x).toBe(10 * T + 16);
  });
});
