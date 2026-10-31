import { describe, it, expect } from 'vitest';
import FiveMinutesBrain, { FIVE_DEFAULTS } from '../src/core/FiveMinutesBrain.js';

function step(brain, ms, input, dt = 10) {
  const actions = [];
  for (let t = 0; t < ms; t += dt) actions.push(...brain.update(dt, typeof input === 'function' ? input(t) : input));
  return actions;
}

describe('FiveMinutesBrain', () => {
  it('says "Ehi..." at 6 tiles and steps out at 3 tiles', () => {
    const b = new FiveMinutesBrain({});
    expect(step(b, 50, { distTiles: 7, touching: false })).toEqual([]);
    expect(step(b, 20, { distTiles: 6, touching: false }).map((a) => a.type)).toEqual(['notice']);
    expect(step(b, 20, { distTiles: 3, touching: false }).map((a) => a.type)).toEqual(['stepOut']);
    expect(b.isOut).toBe(true);
  });

  it('goes back in after standMs when nobody touches him', () => {
    const b = new FiveMinutesBrain({});
    step(b, 20, { distTiles: 2, touching: false });
    step(b, 20, { distTiles: 2, touching: false });
    const a = step(b, FIVE_DEFAULTS.stepOutMs + FIVE_DEFAULTS.standMs + 50, { distTiles: 10, touching: false });
    expect(a.map((x) => x.type)).toContain('goBack');
    expect(b.isOut).toBe(false);
  });

  it('a touch hooks the player for exactly hookMs', () => {
    const b = new FiveMinutesBrain({});
    step(b, 20, { distTiles: 2, touching: false });
    step(b, 20, { distTiles: 2, touching: false });
    const hook = step(b, 10, { distTiles: 0, touching: true });
    expect(hook).toEqual([{ type: 'hook', cost: 0.5 }]);
    const before = step(b, FIVE_DEFAULTS.hookMs - 20, { distTiles: 0, touching: true });
    expect(before.some((a) => a.type === 'release')).toBe(false);
    const after = step(b, 30, { distTiles: 0, touching: true });
    expect(after.map((a) => a.type)).toEqual(['release', 'goBack']);
  });

  it('a runner covers 3 tiles in ~370 ms: the colleague is out first (fair but mean)', () => {
    const b = new FiveMinutesBrain({});
    // player runs at 260 px/s towards the door from 7 tiles away
    const run = (t) => ({ distTiles: Math.max(0, 7 - (260 * t) / 1000 / 32), touching: false });
    step(b, 1000, run);
    expect(['stepping', 'out']).toContain(b.state);
  });

  it('pivoted: touching offers a shortcut instead of hooking', () => {
    const b = new FiveMinutesBrain({}, 'pivoted');
    step(b, 20, { distTiles: 2, touching: false });
    step(b, 20, { distTiles: 2, touching: false });
    const a = step(b, 100, { distTiles: 0, touching: true });
    expect(a.map((x) => x.type)).toEqual(['shortcutOffer']);
    expect(b.state).not.toBe('hooked');
  });
});
