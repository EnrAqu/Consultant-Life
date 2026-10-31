import { describe, it, expect } from 'vitest';
import { OUTFITS, OUTFIT_IDS, PLAYER_FRAMES } from '../src/data/outfits.js';
import { LEVELS, LEVEL_ORDER, nextLevel, projectNumber } from '../src/levels/index.js';

describe('outfits', () => {
  it('every outfit has a title and a full palette', () => {
    expect(OUTFIT_IDS).toEqual(['junior', 'consultant', 'manager', 'seniorManager', 'partner', 'farmer']);
    for (const o of Object.values(OUTFITS)) {
      for (const key of ['title', 'skin', 'hair', 'top', 'topDark', 'sleeves', 'pants', 'legs', 'shoes']) {
        expect(o[key], key).toBeDefined();
      }
    }
    expect(PLAYER_FRAMES).toContain('freeze');
  });

  it('levels use the expected career outfit', () => {
    expect(LEVELS.level1.career).toBe('junior');
    expect(LEVELS.level2.career).toBe('consultant');
    expect(LEVELS.level3.career).toBe('manager');
    expect(LEVELS.level4.career).toBe('seniorManager');
  });

  it('campaign order: level1 → level2 → level3 → end', () => {
    expect(LEVEL_ORDER).toEqual(['level1', 'level2', 'level3', 'level4']);
    expect(nextLevel('level1')).toBe('level2');
    expect(nextLevel('level2')).toBe('level3');
    expect(nextLevel('level3')).toBe('level4');
    expect(nextLevel('level4')).toBe(null);
    expect(projectNumber('level3')).toBe(3);
  });
});
