import { describe, it, expect } from 'vitest';
import { OUTFITS, OUTFIT_IDS, PLAYER_FRAMES } from '../src/data/outfits.js';
import { LEVELS } from '../src/levels/index.js';

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
  });
});
