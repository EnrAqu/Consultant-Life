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
    // going up past him: nothing
    expect(b.update(10, { player: { ...falling, feetY: FLOOR - 10, vy: -300 }, mats })).toEqual([]);
    expect(b.update(10, { player: { ...falling, feetY: FLOOR - 40, vy: -100 }, mats })).toEqual([]);
    expect(b.update(10, { player: falling, mats }).map((x) => x.type)).toEqual(['bounce']);
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

  it('a fast fall at 30 fps still bounces (the back is checked between frames)', () => {
    const b = new SycophantBrain();
    b.placeAt(340, FLOOR);
    const mats = [{ x: 340, feetY: FLOOR }];
    run(b, 500, { player: player(), mats });
    // 900 px/s, 33 ms frames: 30 px per frame, larger than the back's window
    // the last frame has already landed you on the floor
    const frames = [{ feetY: FLOOR - 60, vy: 900, grounded: false }, { feetY: FLOOR - 31, vy: 900, grounded: false }, { feetY: FLOOR, vy: 0, grounded: true }];
    const actions = frames.flatMap((f) => b.update(33, { player: player({ x: 340, ...f }), mats }));
    const bounce = actions.find((a) => a.type === 'bounce');
    expect(bounce).toBeDefined();
    expect(bounce.feetY).toBe(FLOOR - SYCOPHANT_DEFAULTS.backHeight);
  });
});
