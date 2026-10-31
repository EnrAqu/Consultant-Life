import { describe, it, expect } from 'vitest';
import StatsTracker, { STATS_KEY } from '../src/core/StatsTracker.js';
import { createStorage } from '../src/core/Storage.js';

function memStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return createStorage({
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  });
}

describe('StatsTracker', () => {
  it('counts deaths in run and persistent stats', () => {
    const storage = memStorage();
    const s = new StatsTracker(storage);
    s.startRun('level1');
    const r = s.recordDeath({ cause: 'spike', x: 100, y: 100 });
    expect(r).toMatchObject({ spotKey: '1:1', spotCount: 1, deathsThisRun: 1, totalDeaths: 1, causeDeaths: 1 });
    s.recordDeath({ cause: 'spike', x: 120, y: 110 });
    const r3 = s.recordDeath({ cause: 'pit', x: 127, y: 127 });
    expect(r3.spotCount).toBe(3);
    const reloaded = new StatsTracker(storage);
    expect(reloaded.getPersistent().totalDeaths).toBe(3);
    expect(reloaded.getPersistent().levels.level1.deathsByCause.spike).toBe(2);
  });

  it('recovers from corrupted JSON and wrong version', () => {
    expect(new StatsTracker(memStorage({ [STATS_KEY]: '{oops' })).getPersistent().totalDeaths).toBe(0);
    expect(new StatsTracker(memStorage({ [STATS_KEY]: '{"version":9}' })).getPersistent().version).toBe(1);
  });

  it('dominant cause is measured in incidents (death=1, fakeKT=2)', () => {
    const s = new StatsTracker(memStorage());
    s.startRun('level1');
    s.recordFakeKT();
    for (let i = 0; i < 3; i++) s.recordDeath({ cause: 'replyAll', x: 0, y: 0 });
    const d = s.dominantPivotCause();
    expect(d.cause).toBe('replyAll');
    expect(d.incidents).toBe(3);
    expect(d.isDefault).toBe(false);
  });

  it('ties go to the most recent cause', () => {
    const s = new StatsTracker(memStorage());
    s.startRun('level1');
    s.recordDeath({ cause: 'scopeCreep', x: 0, y: 0 });
    s.recordDeath({ cause: 'deckCollapse', x: 0, y: 0 });
    expect(s.dominantPivotCause().cause).toBe('deckCollapse');
  });

  it('falls back to default and reports a non-pivotable real cause', () => {
    const s = new StatsTracker(memStorage());
    s.startRun('level1');
    expect(s.dominantPivotCause()).toMatchObject({ cause: 'replyAll', isDefault: true, realCause: null });
    for (let i = 0; i < 5; i++) s.recordDeath({ cause: 'pit', x: 0, y: 0 });
    s.recordDeath({ cause: 'scopeCreep', x: 0, y: 0 });
    expect(s.dominantPivotCause()).toMatchObject({ cause: 'scopeCreep', realCause: 'pit' });
  });
});

describe('Storage', () => {
  it('never throws when the backend throws', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    const storage = createStorage({ getItem: boom, setItem: boom, removeItem: boom });
    expect(storage.load('x', 42)).toBe(42);
    expect(storage.save('x', 1)).toBe(false);
    const s = new StatsTracker(storage);
    s.startRun('level1');
    expect(() => s.recordDeath({ cause: 'pit', x: 0, y: 0 })).not.toThrow();
  });
});

describe('StatsTracker incidents', () => {
  it('non-lethal incidents can win the Lessons Learned', () => {
    const s = new StatsTracker(memStorage());
    s.startRun('level2');
    s.recordIncident('micromanager');
    s.recordIncident('micromanager');
    s.recordDeath({ cause: 'replyAll', x: 0, y: 0 });
    expect(s.dominantPivotCause()).toMatchObject({ cause: 'micromanager', incidents: 2, deaths: 0 });
  });
});
