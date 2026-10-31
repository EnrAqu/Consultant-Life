import { describe, it, expect } from 'vitest';
import { parseLevel, TILE_SOLID, TILE_ONEWAY } from '../src/core/LevelParser.js';
import { resolveLevel, resolveMode } from '../src/core/pivot.js';
import { validateLevel, maxGap, longestQuietStretch } from '../src/core/LevelValidator.js';
import { LEVELS } from '../src/levels/index.js';

const rows = (body) => [...Array(17 - body.length).fill('.'.repeat(body[0].length)), ...body];

describe('LevelParser', () => {
  it('parses tiles and objects', () => {
    const p = parseLevel({ id: 't', map: rows(['P.o=.^C.G', '#########']) });
    expect(p.width).toBe(9);
    expect(p.spawn).toEqual({ x: 0, y: 15 });
    expect(p.tiles[16][0]).toBe(TILE_SOLID);
    expect(p.tiles[15][3]).toBe(TILE_ONEWAY);
    expect(p.spikes).toEqual([{ x: 5, y: 15 }]);
    expect(p.checkpoints[0].id).toBe('cp0');
    expect(p.pickups).toHaveLength(1);
  });

  it('rejects malformed maps', () => {
    expect(() => parseLevel({ id: 't', map: ['P.G'] })).toThrow(/17 rows/);
    expect(() => parseLevel({ id: 't', map: rows(['P.G', '##']) })).toThrow(/length/);
    expect(() => parseLevel({ id: 't', map: rows(['..G', '###']) })).toThrow(/1 P/);
    expect(() => parseLevel({ id: 't', map: rows(['PPG', '###']) })).toThrow(/1 P/);
    expect(() => parseLevel({ id: 't', map: rows(['P.x', '###']) })).toThrow(/unknown/);
  });
});

describe('pivot', () => {
  it('resolves slot modes', () => {
    expect(resolveMode({ type: 'replyAll' }, 'replyAll')).toBe('normal');
    expect(resolveMode({ type: 'replyAll', mode: 'pivoted' }, null)).toBe('pivoted');
    expect(resolveMode({ type: 'replyAll', slot: true }, 'replyAll')).toBe('pivoted');
    expect(resolveMode({ type: 'replyAll', slot: true }, 'fakeKT')).toBe('normal');
  });

  it('applies tile overrides only for the active mode', () => {
    const normal = resolveLevel(LEVELS.level2, null);
    const pivoted = resolveLevel(LEVELS.level2, 'deckCollapse');
    expect(normal.map[15][62]).toBe('#');
    expect(pivoted.map[15][62]).toBe('.');
  });
});

describe('LevelValidator', () => {
  it('jump tables', () => {
    expect(maxGap(0)).toBe(5);
    expect(maxGap(3)).toBe(2);
    expect(maxGap(4)).toBe(-1);
    expect(maxGap(0, 'normal')).toBe(4);
    expect(maxGap(2, 'normal')).toBe(3);
    expect(maxGap(-2, 'normal')).toBe(5);
  });

  it('a gap of 5 is "hard" but not "normal"', () => {
    const p = parseLevel({ id: 't', map: rows(['P.....G', '#.....#']) });
    expect(validateLevel(p).ok).toBe(true);
    expect(validateLevel(p, { table: 'normal' }).ok).toBe(false);
  });

  it('levels 1 and 3 need only "normal" jumps on their mandatory path', () => {
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level1, null)), { table: 'normal' }).errors).toEqual([]);
    for (const pivot of [null, 'replyAll', 'scopeCreep', 'deckCollapse', 'fakeKT', 'micromanager', 'fiveMinutes']) {
      expect(validateLevel(parseLevel(resolveLevel(LEVELS.level3, pivot)), { table: 'normal' }).errors, String(pivot)).toEqual([]);
    }
  });

  it('pacing: no mandatory stretch longer than 12 quiet columns', () => {
    for (const id of Object.keys(LEVELS)) {
      expect(longestQuietStretch(parseLevel(resolveLevel(LEVELS[id], null))), id).toBeLessThanOrEqual(12);
    }
  });

  it('betraying goals: the client side and the carried position are reachable', () => {
    // level 2 is validated with the 'hard' table (slot B keeps its 5-tile jump, see DECISIONS)
    const r = validateLevel(parseLevel(resolveLevel(LEVELS.level2, null)));
    expect(r.reachable.has('107:14')).toBe(true);
    expect(r.reachable.has('120:14')).toBe(true);
  });

  it('level 2 checkpoint is reachable', () => {
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2, null))).reachable.has('52:14')).toBe(true);
  });

  it('a gap of 7 is not reachable', () => {
    const p = parseLevel({ id: 't', map: rows(['P.......G', '#.......#']) });
    expect(validateLevel(p).ok).toBe(false);
  });

  it('level1 can only be completed thanks to the email bridge', () => {
    const withoutBridge = { ...LEVELS.level1, entities: LEVELS.level1.entities.filter((e) => e.id !== 'ra2') };
    expect(validateLevel(parseLevel(resolveLevel(withoutBridge, null))).ok).toBe(false);
  });

  it('level1 is completable', () => {
    const r = validateLevel(parseLevel(resolveLevel(LEVELS.level1, null)));
    expect(r.errors).toEqual([]);
  });

  for (const pivot of [null, 'replyAll', 'scopeCreep', 'deckCollapse', 'fakeKT']) {
    it(`level2 is completable with pivot=${pivot}`, () => {
      const r = validateLevel(parseLevel(resolveLevel(LEVELS.level2, pivot)));
      expect(r.errors).toEqual([]);
    });
  }

  for (const pivot of [null, 'replyAll', 'scopeCreep', 'deckCollapse', 'fakeKT', 'micromanager', 'fiveMinutes']) {
    it(`level3 is completable with pivot=${pivot}`, () => {
      const r = validateLevel(parseLevel(resolveLevel(LEVELS.level3, pivot)));
      expect(r.errors).toEqual([]);
    });
  }

  it('plants are parsed and are not solid', () => {
    const p = parseLevel(resolveLevel(LEVELS.level2, null));
    expect(p.plants).toEqual([{ x: 57, y: 14 }]);
    expect(p.tiles[14][57]).toBe(-1);
  });

  it('level2 slotA ledge is reachable only when replyAll is pivoted', () => {
    const ledge = '23:9';
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2, null))).reachable.has(ledge)).toBe(false);
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2, 'replyAll'))).reachable.has(ledge)).toBe(true);
  });
});
