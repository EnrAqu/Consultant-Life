import { describe, it, expect } from 'vitest';
import Leaderboard, { LEADERBOARD_KEY } from '../src/core/Leaderboard.js';
import { createStorage } from '../src/core/Storage.js';

function memStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return createStorage({ getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) });
}

const run = (timeMs, deaths, levelId = 'level1') => ({ levelId, timeMs, deaths, guLeft: 10, at: '2026-10-31' });

describe('Leaderboard', () => {
  it('ranks by time (ties: fewer deaths) and by deaths for the Hall of Shame', () => {
    const lb = new Leaderboard(memStorage());
    expect(lb.record(run(50000, 3))).toEqual({ timeRank: 1, shameRank: 1 });
    expect(lb.record(run(40000, 9))).toEqual({ timeRank: 1, shameRank: 1 });
    expect(lb.record(run(40000, 2))).toEqual({ timeRank: 1, shameRank: 3 });
    expect(lb.topTime('level1').map((e) => e.deaths)).toEqual([2, 9, 3]);
    expect(lb.topShame('level1').map((e) => e.deaths)).toEqual([9, 3, 2]);
  });

  it('returns null outside the top 5 and keeps levels apart', () => {
    const lb = new Leaderboard(memStorage());
    for (let i = 1; i <= 5; i++) lb.record(run(i * 1000, 5));
    expect(lb.record(run(9000, 0)).timeRank).toBe(null);
    lb.record(run(1, 1, 'level2'));
    expect(lb.topTime('level1')).toHaveLength(5);
    expect(lb.topTime('level2')).toHaveLength(1);
  });

  it('caps stored entries per level (best 25 by time + best 25 by deaths)', () => {
    const lb = new Leaderboard(memStorage());
    for (let i = 0; i < 80; i++) lb.record(run(1000 + i, i % 40));
    expect(lb.forLevel('level1').length).toBeLessThanOrEqual(50);
    expect(lb.topTime('level1')[0].timeMs).toBe(1000);
    expect(lb.topShame('level1')[0].deaths).toBe(39);
  });

  it('persists, recovers from garbage and survives a throwing storage', () => {
    const storage = memStorage();
    new Leaderboard(storage).record(run(1234, 1));
    expect(new Leaderboard(storage).topTime('level1')[0].timeMs).toBe(1234);
    expect(new Leaderboard(memStorage({ [LEADERBOARD_KEY]: '{bad' })).topTime('level1')).toEqual([]);
    const boom = () => {
      throw new Error('blocked');
    };
    const lb = new Leaderboard(createStorage({ getItem: boom, setItem: boom, removeItem: boom }));
    expect(lb.record(run(1, 1)).timeRank).toBe(1);
  });
});
