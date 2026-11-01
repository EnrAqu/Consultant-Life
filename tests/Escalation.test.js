import { describe, it, expect } from 'vitest';
import EscalationBrain, { ESCALATION_DEFAULTS } from '../src/core/EscalationBrain.js';

const T = 32;
const make = () => new EscalationBrain({ startRow: 86, stopRow: 13, floorRow: 97 });
const feet = (row) => (row + 1) * T;

function run(brain, ms, feetY, step = 10) {
  const actions = [];
  for (let t = 0; t < ms; t += step) actions.push(...brain.update(step, { feetY: typeof feetY === 'function' ? feetY(t) : feetY }));
  return actions;
}

describe('EscalationBrain', () => {
  it('waits in the lobby, starts when you climb out of it', () => {
    const b = make();
    expect(run(b, 5000, feet(96))).toEqual([]);
    expect(b.active).toBe(false);
    expect(run(b, 10, feet(85)).map((a) => a.type)).toEqual(['start']);
    expect(b.chainLabel).toBe('Manager');
  });

  it('stays on a leash: never more than 8 rows below your feet', () => {
    const b = make();
    run(b, 10, feet(70));
    expect(b.distanceRows(feet(70))).toBeLessThanOrEqual(ESCALATION_DEFAULTS.leashRows);
  });

  it('rises at 50 px/s in stage 1 and adds the Director, VP and CEO higher up', () => {
    const b = make();
    run(b, 10, feet(70));
    const y0 = b.surfaceY;
    run(b, 1000, feet(70));
    expect(y0 - b.surfaceY).toBeCloseTo(50, 0);
    const stages = [];
    for (let t = 0; t < 60000 && b.stageIndex < 3; t += 10) stages.push(...b.update(10, { feetY: b.surfaceY - 6 * T }).filter((a) => a.type === 'stage'));
    expect(stages.map((s) => s.label)).toEqual(['Director', 'VP', 'CEO']);
    expect(b.chainLabel).toBe('Manager, Director, VP, CEO');
  });

  it('catches you if you stand still, then drops back and pauses', () => {
    const b = make();
    run(b, 10, feet(80));
    const a = run(b, 7000, feet(80));
    expect(a.filter((x) => x.type === 'catch')).toHaveLength(1);
    expect(b.state).toBe('paused');
    expect(b.distanceRows(feet(80))).toBe(ESCALATION_DEFAULTS.leashRows);
    // the call lasts 1.2 s: no second catch during it, nor during the pause after
    expect(a.findIndex((x) => x.type === 'released')).toBeGreaterThan(-1);
  });

  it('a climber faster than the tide is never caught', () => {
    const b = make();
    // 85 px/s, from the lobby ceiling up to the Board
    const a = run(b, 30000, (t) => feet(85) - (85 * t) / 1000);
    expect(a.some((x) => x.type === 'catch')).toBe(false);
    expect(a.some((x) => x.type === 'stop')).toBe(true);
  });

  it('stops for good at the Board', () => {
    const b = make();
    run(b, 10, feet(80));
    expect(run(b, 10, feet(12)).map((a) => a.type)).toEqual(['stop']);
    expect(run(b, 5000, feet(12))).toEqual([]);
    expect(b.active).toBe(false);
  });

  it('after a respawn it waits below the checkpoint', () => {
    const b = make();
    run(b, 10, feet(80));
    run(b, 3000, feet(80));
    b.resetBelow(feet(60));
    expect(b.state).toBe('paused');
    expect(b.distanceRows(feet(60))).toBeGreaterThanOrEqual(ESCALATION_DEFAULTS.leashRows);
  });
});
