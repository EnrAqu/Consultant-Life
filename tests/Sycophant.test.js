import { describe, it, expect } from 'vitest';
import SycophantBrain, { SYCOPHANT_DEFAULTS } from '../src/core/SycophantBrain.js';

const FLOOR = 480;
const player = (over = {}) => ({ x: 300, feetY: FLOOR, facing: 1, vy: 0, grounded: true, ...over });

function run(brain, ms, input, step = 10) {
  const actions = [];
  for (let t = 0; t < ms; t += step) actions.push(...brain.update(step, typeof input === 'function' ? input(t) : input));
  return actions;
}

describe('SycophantBrain', () => {
  it('follows 1.5 tiles behind you, on the side you are not looking at', () => {
    const b = new SycophantBrain();
    b.placeAt(100, FLOOR);
    run(b, 2000, { player: player() });
    expect(b.x).toBe(300 - SYCOPHANT_DEFAULTS.followDist);
    run(b, 2000, { player: player({ facing: -1 }) });
    expect(b.x).toBe(300 + SYCOPHANT_DEFAULTS.followDist);
  });

  it('flatters every 6 s and never blocks', () => {
    const b = new SycophantBrain();
    const a = run(b, 12100, { player: player() });
    expect(a.filter((x) => x.type === 'flatter')).toHaveLength(2);
    expect(a.every((x) => x.type === 'flatter')).toBe(true);
  });

  it('runs to a mat near you and bows', () => {
    const b = new SycophantBrain();
    b.placeAt(250, FLOOR);
    const mats = [{ x: 340, feetY: FLOOR }];
    const a = run(b, 1000, { player: player(), mats });
    expect(a.map((x) => x.type)).toContain('bow');
    expect(b.state).toBe('bowing');
    expect(b.x).toBe(340);
  });

  it('bounces you only when you land on his back while bowing', () => {
    const b = new SycophantBrain();
    b.placeAt(340, FLOOR);
    const mats = [{ x: 340, feetY: FLOOR }];
    run(b, 500, { player: player(), mats });
    const falling = player({ x: 342, feetY: FLOOR - 20, vy: 200, grounded: false });
    expect(b.update(10, { player: falling, mats }).map((x) => x.type)).toEqual(['bounce']);
    // going up through him: nothing
    expect(b.update(10, { player: { ...falling, vy: -300 }, mats })).toEqual([]);
  });

  it('far from mats he is no trampoline', () => {
    const b = new SycophantBrain();
    b.placeAt(250, FLOOR);
    const a = run(b, 1000, { player: player({ x: b.x + 2, feetY: FLOOR - 20, vy: 200, grounded: false }) });
    expect(a.some((x) => x.type === 'bounce')).toBe(false);
  });

  it('stands up and follows once you land on the floor above', () => {
    const b = new SycophantBrain();
    b.placeAt(340, FLOOR);
    const mats = [{ x: 340, feetY: FLOOR }];
    run(b, 500, { player: player(), mats });
    const a = run(b, 1500, { player: player({ x: 360, feetY: FLOOR - 160 }), mats });
    expect(a.map((x) => x.type)).toContain('stand');
    expect(b.feetY).toBe(FLOOR - 160);
  });
});
