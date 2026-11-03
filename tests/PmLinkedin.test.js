import { describe, it, expect } from 'vitest';
import GanttBrain from '../src/core/GanttBrain.js';
import PostBrain, { MAX_SHOWN_LIKES } from '../src/core/PostBrain.js';
import { LEVELS } from '../src/levels/index.js';
import { parseLevel } from '../src/core/LevelParser.js';
import { resolveLevel } from '../src/core/pivot.js';
import { validateLevel, trapSurfaces } from '../src/core/LevelValidator.js';
import { CAUSES, causeLesson } from '../src/data/causes.js';

describe('GanttBrain — the PM reschedules', () => {
  const bar = () => new GanttBrain({ shift: -3, speed: 6, delayMs: 500, returnDelayMs: 1200 });

  it('waits until you land, then slides after the delay, by exactly `shift`', () => {
    const b = bar();
    expect(b.update(5000, false)).toBe(null);
    b.land();
    expect(b.update(499, true)).toBe(null);
    expect(b.update(1, true)).toBe('move');
    expect(b.update(250, true)).toBe(null);
    expect(b.offset).toBeCloseTo(-1.5);
    expect(b.update(250, true)).toBe('stop');
    expect(b.offset).toBe(-3);
  });

  it('stays put while you ride it, then goes home and arms again', () => {
    const b = bar();
    b.land();
    b.update(500, true);
    b.update(1000, true);
    expect(b.update(5000, true)).toBe(null);
    expect(b.state).toBe('done');
    b.update(1200, false);
    expect(b.state).toBe('returning');
    expect(b.update(1000, false)).toBe('home');
    expect([b.state, b.offset]).toEqual(['idle', 0]);
    b.land();
    expect(b.state).toBe('armed');
  });

  it('landing again while it moves changes nothing; reset puts it home', () => {
    const b = bar();
    b.land();
    b.update(500, true);
    b.land();
    expect(b.state).toBe('moving');
    b.reset();
    expect([b.state, b.offset]).toEqual(['idle', 0]);
  });
});

describe('PostBrain — a LinkedIn post', () => {
  it('collapses at the third like, 3 × likeMs after the first touch, then comes back', () => {
    const p = new PostBrain({ likes: 3, likeMs: 350, respawnMs: 2500 });
    expect(p.update(10000)).toBe(null);
    p.touch();
    expect(p.update(349)).toBe(null);
    expect(p.update(1)).toBe('like');
    expect(p.update(350)).toBe('like');
    expect(p.solid).toBe(true);
    expect(p.update(350)).toBe('collapse');
    expect([p.solid, p.likes]).toEqual([false, 3]);
    p.touch();
    expect(p.update(2499)).toBe(null);
    expect(p.update(1)).toBe('restore');
    expect([p.solid, p.likes, p.state]).toEqual([true, 0, 'idle']);
  });

  it('a sponsored post goes at the first like', () => {
    const p = new PostBrain({ likes: 1, likeMs: 300 });
    p.touch();
    expect(p.update(300)).toBe('collapse');
  });

  it('pivoted: the likes keep coming, it never collapses', () => {
    const p = new PostBrain({ likes: 3, likeMs: 100, pivoted: true });
    p.touch();
    for (let i = 0; i < 2000; i++) expect(p.update(100)).not.toBe('collapse');
    expect(p.solid).toBe(true);
    expect(p.likes).toBe(MAX_SHOWN_LIKES);
  });
});

describe('PM and LinkedIn in the levels', () => {
  const without = (def, ids) => ({ ...def, entities: def.entities.filter((e) => !ids.includes(e.id)) });

  it('level 2 needs the Gantt bar and the LinkedIn posts to be completed', () => {
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2))).ok).toBe(true);
    expect(validateLevel(parseLevel(resolveLevel(without(LEVELS.level2, ['pm1'])))).ok).toBe(false);
    expect(validateLevel(parseLevel(resolveLevel(without(LEVELS.level2, ['li1', 'li2'])))).ok).toBe(false);
  });

  it('level 3 needs its PM and LinkedIn slots', () => {
    expect(validateLevel(parseLevel(resolveLevel(without(LEVELS.level3, ['slotPM']))), { table: 'normal' }).ok).toBe(false);
    expect(validateLevel(parseLevel(resolveLevel(without(LEVELS.level3, ['slotLI']))), { table: 'normal' }).ok).toBe(false);
  });

  it('level 3 slots switch mode with the lesson', () => {
    const pm = resolveLevel(LEVELS.level3, 'pm').entities.find((e) => e.id === 'slotPM');
    const li = resolveLevel(LEVELS.level3, 'linkedin').entities.find((e) => e.id === 'slotLI');
    expect([pm.mode, li.mode]).toEqual(['pivoted', 'pivoted']);
    // the pivoted bar carries you forward: the validator sees the whole ride
    expect(trapSurfaces(pm).map((c) => c.x)).toEqual([42, 43, 44, 45]);
    expect(resolveLevel(LEVELS.level3, 'replyAll').entities.find((e) => e.id === 'slotPM').mode).toBe('normal');
  });

  it('both are pivotable causes, with the user\'s LinkedIn lesson', () => {
    expect(CAUSES.pm.pivotable && CAUSES.linkedin.pivotable).toBe(true);
    expect(causeLesson('linkedin')).toBe("LinkedIn: hai evitato un'opportunità, errore.");
  });
});

describe('PM and LinkedIn — validator and danger columns (review #11)', () => {
  it('trapSurfaces: bar at home in normal, the whole ride when pivoted; posts where they stand', () => {
    const l2 = resolveLevel(LEVELS.level2);
    const bar = l2.entities.find((e) => e.id === 'pm1');
    expect(trapSurfaces(bar).map((c) => `${c.x}:${c.y}`)).toEqual(['68:14', '69:14', '70:14']);
    const post = l2.entities.find((e) => e.id === 'li1');
    expect(trapSurfaces(post).map((c) => `${c.x}:${c.y}`)).toEqual(['98:13', '99:13']);
  });

  it('level 2: two-tile landings after the bar (73–74) and before the posts (95–96)', () => {
    const lv = parseLevel(resolveLevel(LEVELS.level2));
    const solid = (x, y) => lv.tiles[y][x] === 0;
    expect([solid(73, 15), solid(74, 15), solid(95, 15), solid(96, 15)]).toEqual([true, true, true, true]);
    expect(lv.spikes.filter((s) => s.x >= 73 && s.x <= 76).map((s) => s.x)).toEqual([75, 76]);
  });

  it('level 3: the PM pit is 6 wide (no full jump clears it) and the first door is 4+ tiles past it', () => {
    const lv = parseLevel(resolveLevel(LEVELS.level3));
    const pit = [];
    for (let x = 36; x < 56; x++) if (lv.tiles[15][x] !== 0) pit.push(x);
    expect(pit).toEqual([41, 42, 43, 44, 45, 46]);
    expect(LEVELS.level3.entities.find((e) => e.id === 'five1').x - 46).toBeGreaterThanOrEqual(4);
    // the normal reply-all trigger (wait-there counter) sits on the floor after the LinkedIn pit 58–62, not over it
    const slotA = LEVELS.level3.entities.find((e) => e.id === 'slotA');
    const from = slotA.x + slotA.params.normal.triggerDx;
    for (let x = from; x < from + slotA.params.normal.triggerWidth; x++) expect(lv.tiles[15][x], `col ${x}`).toBe(0);
  });
});
