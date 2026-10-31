import { describe, it, expect } from 'vitest';
import { parseLevel, TILE_SOLID, TILE_ONEWAY } from '../src/core/LevelParser.js';
import { resolveLevel, resolveMode } from '../src/core/pivot.js';
import { validateLevel, maxGap } from '../src/core/LevelValidator.js';
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
  it('jump table', () => {
    expect(maxGap(0)).toBe(5);
    expect(maxGap(3)).toBe(2);
    expect(maxGap(4)).toBe(-1);
  });

  it('a gap of 7 is not reachable', () => {
    const p = parseLevel({ id: 't', map: rows(['P.......G', '#.......#']) });
    expect(validateLevel(p).ok).toBe(false);
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

  it('level2 slotA ledge is reachable only when replyAll is pivoted', () => {
    const ledge = '23:9';
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2, null))).reachable.has(ledge)).toBe(false);
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level2, 'replyAll'))).reachable.has(ledge)).toBe(true);
  });
});
