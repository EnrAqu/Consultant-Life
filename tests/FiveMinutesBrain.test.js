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

  it('a runner reaching the door is already in contact with a colleague who is out (fair but mean)', () => {
    const b = new FiveMinutesBrain({});
    // player runs at 260 px/s towards the door from 7 tiles away; touching = within 10 px of the door while he is out
    let hookedAt = null;
    for (let t = 0; t < 1500; t += 10) {
      const dist = Math.max(0, 7 * 32 - (260 * t) / 1000);
      const a = b.update(10, { distTiles: dist / 32, touching: b.isOut && dist <= 19 });
      if (a.some((x) => x.type === 'hook')) hookedAt = t;
    }
    expect(hookedAt).not.toBe(null);
    // the "Ehi…" warning came at 6 tiles: ~120 ms after the start, i.e. > 600 ms before contact
    expect(hookedAt).toBeGreaterThan(700);
  });

  it('does not hook a player who is already frozen', () => {
    const b = new FiveMinutesBrain({});
    step(b, 40, { distTiles: 2, touching: false });
    expect(step(b, 200, { distTiles: 0, touching: true, locked: true }).some((a) => a.type === 'hook')).toBe(false);
  });

  it('after a conversation he waits until you walk away', () => {
    const b = new FiveMinutesBrain({});
    step(b, 40, { distTiles: 2, touching: false });
    step(b, 10, { distTiles: 0, touching: true });
    step(b, FIVE_DEFAULTS.hookMs + 50, { distTiles: 0, touching: true });
    const stay = step(b, 20000, { distTiles: 1, touching: false });
    expect(stay.some((a) => a.type === 'stepOut')).toBe(false);
    step(b, 50, { distTiles: 10, touching: false });
    expect(step(b, 50, { distTiles: 2, touching: false }).some((a) => a.type === 'notice')).toBe(true);
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
