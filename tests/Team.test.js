import { describe, it, expect } from 'vitest';
import TeamTrail from '../src/core/TeamTrail.js';
import { pickDelegateTarget } from '../src/core/DelegateTargeting.js';

describe('TeamTrail', () => {
  it('follower i is where the player was (i + 1) × 300 ms ago', () => {
    const trail = new TeamTrail({ delayMs: 300 });
    trail.reset({ x: 0, y: 0 });
    for (let t = 1; t <= 100; t++) trail.push(10, { x: t * 10, y: 0 }); // 1000 px/s for 1 s
    expect(trail.positionFor(0).x).toBe(700);
    expect(trail.positionFor(1).x).toBe(400);
    expect(trail.positionFor(2).x).toBe(100);
  });

  it('before enough history, followers wait at the start', () => {
    const trail = new TeamTrail();
    trail.reset({ x: 50, y: 0 });
    trail.push(100, { x: 200, y: 0 });
    expect(trail.positionFor(0).x).toBe(50);
  });

  it('does not grow forever', () => {
    const trail = new TeamTrail({ delayMs: 300, maxMembers: 3 });
    for (let t = 0; t < 10000; t++) trail.push(16, { x: t, y: 0 });
    expect(trail.samples.length).toBeLessThan(200);
  });

  it('reset moves the whole team to a checkpoint', () => {
    const trail = new TeamTrail();
    trail.push(500, { x: 999, y: 0 });
    trail.reset({ x: 10, y: 20 });
    expect(trail.positionFor(2)).toMatchObject({ x: 10, y: 20 });
  });
});

describe('pickDelegateTarget', () => {
  const targets = [
    { x: 100, kind: 'behind' },
    { x: 400, kind: 'near' },
    { x: 600, kind: 'far' },
    { x: 300, kind: 'used', available: false },
    { x: 900, kind: 'out of range' },
  ];

  it('picks the nearest available target in front, within 10 columns', () => {
    expect(pickDelegateTarget(250, 1, targets).kind).toBe('near');
  });

  it('respects the facing direction', () => {
    expect(pickDelegateTarget(250, -1, targets).kind).toBe('behind');
  });

  it('returns null when nothing is in range', () => {
    expect(pickDelegateTarget(1300, 1, targets)).toBe(null);
  });
});

import MicromanagerBrain from '../src/core/MicromanagerBrain.js';
import FiveMinutesBrain from '../src/core/FiveMinutesBrain.js';

describe('delegation hooks', () => {
  it('a micromanager busy with a junior keeps his light off for 8 s', () => {
    const b = new MicromanagerBrain({ zoneFrom: 0, zoneTo: 20, plants: [], gaps: [] });
    b.occupy(8000);
    for (let t = 0; t < 7900; t += 20) {
      expect(b.update(20, { x: 3 * 32 + 16, y: 15 * 32, vx: 0, grounded: true, locked: false }).some((a) => a.type === 'catch')).toBe(false);
    }
    b.update(200, { x: 40 * 32, y: 15 * 32, vx: 0, grounded: true, locked: false });
    expect(b.lightOn).toBe(true);
  });

  it('a colleague busy with a junior never steps out', () => {
    const b = new FiveMinutesBrain({});
    b.occupy();
    for (let t = 0; t < 5000; t += 10) expect(b.update(10, { distTiles: 0, touching: true }).length).toBe(0);
    expect(b.isOut).toBe(false);
  });
});
