import { describe, it, expect } from 'vitest';
import WorkerBrain, { WORKER_DEFAULTS } from '../src/core/WorkerBrain.js';
import { inTorch } from '../src/core/torch.js';

const cells = [{ dx: 0, dy: -2 }, { dx: 2, dy: -5 }, { dx: 0, dy: -8 }];

function run(brain, ms, input, step = 10) {
  const actions = [];
  for (let t = 0; t < ms; t += step) actions.push(...brain.update(step, typeof input === 'function' ? input(t) : input));
  return actions;
}

describe('WorkerBrain', () => {
  it('builds one platform every 450 ms while nobody looks', () => {
    const b = new WorkerBrain({ cells });
    const a = run(b, 3 * WORKER_DEFAULTS.buildMs + 20, { watched: false });
    expect(a.filter((x) => x.type === 'build').map((x) => x.index)).toEqual([0, 1, 2]);
    expect(a.some((x) => x.type === 'done')).toBe(true);
    expect(b.done).toBe(true);
  });

  it('stops while watched and resumes 800 ms after you look away', () => {
    const b = new WorkerBrain({ cells });
    const watched = run(b, 3000, { watched: true });
    expect(watched.filter((x) => x.type === 'noticed')).toHaveLength(1);
    expect(b.built).toBe(0);
    const away = run(b, WORKER_DEFAULTS.resumeMs - 20, { watched: false });
    expect(away).toEqual([]);
    const later = run(b, WORKER_DEFAULTS.buildMs + 60, { watched: false });
    expect(later.map((x) => x.type)).toEqual(['resume', 'build']);
  });

  it('hopping in front of him does not help: a glance resets the wait', () => {
    const b = new WorkerBrain({ cells });
    // watched 200 ms out of every 700 (a jump-and-land rhythm)
    run(b, 7000, (t) => ({ watched: t % 700 < 200 }));
    expect(b.built).toBe(0);
  });

  it('waits while the next cell is occupied', () => {
    const b = new WorkerBrain({ cells });
    run(b, 2000, { watched: false, blocked: true });
    expect(b.built).toBe(0);
    const a = run(b, 20, { watched: false, blocked: false });
    expect(a.map((x) => x.type)).toEqual(['build']);
  });
});

describe('inTorch', () => {
  const viewer = { x: 100, feetY: 480, facing: 1, grounded: false };
  it('sees in front, within reach and height, also in the air', () => {
    expect(inTorch(viewer, { x: 300, feetY: 480 }, { reach: 320, above: 96, below: 96 })).toBe(true);
    expect(inTorch(viewer, { x: 300, feetY: 360 }, { reach: 320, above: 96, below: 96 })).toBe(false);
    expect(inTorch(viewer, { x: 500, feetY: 480 }, { reach: 320, above: 96, below: 96 })).toBe(false);
  });
  it('turning around is enough', () => {
    expect(inTorch({ ...viewer, facing: -1 }, { x: 300, feetY: 480 }, { reach: 320, above: 96, below: 96 })).toBe(false);
  });
  it('requireGround switches it off in the air', () => {
    expect(inTorch(viewer, { x: 200, feetY: 480 }, { reach: 320, requireGround: true })).toBe(false);
  });
});
