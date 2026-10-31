import { describe, it, expect } from 'vitest';
import RivalBrain from '../src/core/RivalBrain.js';

const T = 32;
const make = () => new RivalBrain({ startCol: 5, triggerCol: 8, stopCol: 40 });
const step = (b, ms, input) => {
  const out = [];
  for (let t = 0; t < ms; t += 20) out.push(...b.update(20, typeof input === 'function' ? input(t) : input));
  return out;
};
const player = (x, extra = {}) => ({ player: { x, onHead: false, overlapping: false, ...extra } });

describe('RivalBrain (arrivista)', () => {
  it('waits until you pass him, then runs to the goal at 240 px/s', () => {
    const b = make();
    expect(step(b, 1000, player(6 * T))).toEqual([]);
    const a = step(b, 20, player(9 * T));
    expect(a.map((x) => x.type)).toEqual(['start']);
    step(b, 1000, player(30 * T));
    expect(b.x).toBeCloseTo(5 * T + 16 + 240, 0);
  });

  it('a player running at full speed (260) stays ahead', () => {
    const b = make();
    let px = 9 * T;
    for (let t = 0; t < 4000; t += 20) {
      px += 260 * 0.02;
      b.update(20, player(px));
      expect(b.x).toBeLessThan(px);
    }
  });

  it('takes the coffees he reaches first', () => {
    const b = make();
    step(b, 20, player(9 * T));
    const coffee = { x: 10 * T + 16, taken: false };
    const a = step(b, 2000, { ...player(30 * T), coffees: [coffee] });
    expect(a.some((x) => x.type === 'takeCoffee')).toBe(true);
  });

  it('steals one junior, once', () => {
    const b = make();
    step(b, 20, player(9 * T));
    const a = step(b, 4000, (t) => ({ ...player(30 * T), firstFollowerX: b.x }));
    expect(a.filter((x) => x.type === 'stealJunior')).toHaveLength(1);
  });

  it('bounces, never kills: head bounce for you, leapfrog for him (at most every 800 ms)', () => {
    const b = make();
    step(b, 20, player(9 * T));
    expect(step(b, 20, player(10 * T, { onHead: true })).map((x) => x.type)).toContain('headBounce');
    const leaps = step(b, 1000, player(10 * T, { overlapping: true })).filter((x) => x.type === 'leapfrog');
    expect(leaps.length).toBe(2);
  });

  it('arrives at the goal and stops there', () => {
    const b = make();
    step(b, 20, player(9 * T));
    const a = step(b, 10000, player(9 * T));
    expect(a.filter((x) => x.type === 'arrived')).toHaveLength(1);
    expect(b.x).toBe(40 * T + 16);
  });
});
