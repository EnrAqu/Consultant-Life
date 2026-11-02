import { describe, it, expect } from 'vitest';
import { CAUSES } from '../src/data/causes.js';
import { LEVELS } from '../src/levels/index.js';
import { parseLevel } from '../src/core/LevelParser.js';
import { resolveLevel } from '../src/core/pivot.js';
import { trapSurfaces, validateLevel } from '../src/core/LevelValidator.js';
import Narrator from '../src/core/Narrator.js';
import { NARRATOR_LINES } from '../src/data/narratorLines.js';

// The client's pranks in level 1 (docs/LEVELS.md, 2026-11-02)
describe("the client's pranks", () => {
  const rs1 = LEVELS.level1.entities.find((e) => e.id === 'rs1');

  it('the validator sees the requirement platform where it lands (28–29 slid back 2 → 26–27)', () => {
    expect(trapSurfaces(rs1)).toEqual([{ x: 26, y: 15 }, { x: 27, y: 15 }]);
  });

  it('level 1 stays completable with "normal" jumps, and not without the requirement platform', () => {
    expect(validateLevel(parseLevel(resolveLevel(LEVELS.level1, null)), { table: 'normal' }).errors).toEqual([]);
    const without = { ...LEVELS.level1, entities: LEVELS.level1.entities.filter((e) => e.id !== 'rs1') };
    expect(validateLevel(parseLevel(resolveLevel(without, null))).ok).toBe(false);
    // and with the platform still at home (27–29: whoever does not trigger it)
    const still = { ...LEVELS.level1, entities: LEVELS.level1.entities.map((e) => (e.id === 'rs1' ? { ...e, params: { ...e.params, shift: 0 } } : e)) };
    expect(validateLevel(parseLevel(resolveLevel(still, null)), { table: 'normal' }).errors).toEqual([]);
  });

  it('their causes are not pivotable: the lesson chain to level 2 does not change', () => {
    expect(CAUSES.hiddenClient.pivotable).toBe(false);
    expect(CAUSES.requirementChange.pivotable).toBe(false);
  });

  it('the first hidden-mail death says it is not the controls, even on the first death of the run', () => {
    const n = new Narrator(NARRATOR_LINES, () => 0);
    expect(n.pick('death', { cause: 'hiddenClient', causeDeaths: 1, runDeaths: 1, levelId: 'level1' }).id).toBe('death_hiddenclient_first');
    expect(n.pick('death', { cause: 'hiddenClient', causeDeaths: 2, runDeaths: 2 }).id).toMatch(/^death_hiddenclient_\d/);
    expect(n.pick('death', { cause: 'requirementChange', causeDeaths: 1 }).id).toMatch(/^death_reqchange_/);
  });
});
