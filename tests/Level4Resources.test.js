import { describe, it, expect } from 'vitest';
import StaffingBrain from '../src/core/StaffingBrain.js';
import RecruiterBrain from '../src/core/RecruiterBrain.js';

describe('StaffingBrain — "Mi presti una risorsa?"', () => {
  const pm = (mode) => new StaffingBrain({ reach: [142, 144] }, mode);

  it('takes a junior when you step on his area on the floor, once per life', () => {
    const b = pm();
    expect(b.update({ col: 141, onFloor: true, teamCount: 3 })).toBe(null);
    expect(b.update({ col: 143, onFloor: false, teamCount: 3 })).toBe(null);
    expect(b.update({ col: 142, onFloor: true, teamCount: 3 })).toBe('take');
    expect(b.update({ col: 144, onFloor: true, teamCount: 2 })).toBe(null);
    b.reset();
    expect(b.update({ col: 144, onFloor: true, teamCount: 3 })).toBe('take');
  });

  it('with nobody left he just complains; pivoted he lends you one', () => {
    expect(pm().update({ col: 142, onFloor: true, teamCount: 0 })).toBe('empty');
    expect(pm('pivoted').update({ col: 142, onFloor: true, teamCount: 3 })).toBe('gift');
  });
});

describe('RecruiterBrain — #OpenToWork', () => {
  it('a junior who stays 1.5 s in a row in the zone resigns; leaving resets the clock', () => {
    const r = new RecruiterBrain({ poachMs: 1500 });
    expect(r.update(1000, { members: [{ key: 'a', inZone: true }, { key: 'b', inZone: true }] }).poached).toEqual([]);
    expect(r.update(100, { members: [{ key: 'a', inZone: true }, { key: 'b', inZone: false }] }).poached).toEqual([]);
    expect(r.danger()).toEqual({ key: 'a', ratio: 1100 / 1500 });
    expect(r.update(400, { members: [{ key: 'a', inZone: true }, { key: 'b', inZone: true }] }).poached).toEqual(['a']);
    expect(r.update(1000, { members: [{ key: 'b', inZone: true }] }).poached).toEqual([]);
    expect(r.update(100, { members: [{ key: 'b', inZone: true }] }).poached).toEqual(['b']);
    expect(r.danger()).toBe(null);
  });

  it('running through (about 1 s per junior) costs nothing', () => {
    const r = new RecruiterBrain({ poachMs: 1500 });
    let lost = 0;
    for (let t = 0; t < 1000; t += 16) lost += r.update(16, { members: [{ key: 'a', inZone: true }] }).poached.length;
    r.update(16, { members: [{ key: 'a', inZone: false }] });
    expect(lost).toBe(0);
    expect(r.danger()).toBe(null);
  });

  it('pivoted: hires one for you the first time you walk in, never poaches', () => {
    const r = new RecruiterBrain({ poachMs: 1500 }, 'pivoted');
    expect(r.update(5000, { playerInZone: false, members: [{ key: 'a', inZone: true }] })).toEqual({ poached: [], gift: false });
    expect(r.update(16, { playerInZone: true, members: [] }).gift).toBe(true);
    expect(r.update(16, { playerInZone: true, members: [] }).gift).toBe(false);
    r.reset();
    expect(r.update(16, { playerInZone: true, members: [] }).gift).toBe(true);
  });
});

import { LEVELS } from '../src/levels/index.js';
import { resolveLevel, resolveMode } from '../src/core/pivot.js';
import { parseLevel } from '../src/core/LevelParser.js';
import { BURNOUT } from '../src/config/constants.js';

describe('level 4: the PM and the recruiter as lessons', () => {
  it('slots switch by their cause (pm, linkedin), not by their type', () => {
    expect(resolveMode({ type: 'recruiter', cause: 'linkedin', slot: true }, 'linkedin')).toBe('pivoted');
    expect(resolveMode({ type: 'recruiter', cause: 'linkedin', slot: true }, 'recruiter')).toBe('normal');
    const pm = resolveLevel(LEVELS.level4, 'pm').entities;
    expect(pm.find((e) => e.id === 'slotPMR').mode).toBe('pivoted');
    expect(pm.find((e) => e.id === 'slotRec').mode).toBe('normal');
    expect(resolveLevel(LEVELS.level4, 'linkedin').entities.find((e) => e.id === 'slotRec').mode).toBe('pivoted');
  });

  it("the PM's desk is a 1-tile block between his two carpet tiles, before the intern and the gate", () => {
    const lv = parseLevel(resolveLevel(LEVELS.level4));
    expect([lv.tiles[14][142], lv.tiles[14][143], lv.tiles[14][144]]).toEqual([-1, 0, -1]);
    expect(lv.tiles[13][143]).toBe(-1);
    const intern = LEVELS.level4.entities.find((e) => e.id === 'intern2');
    expect(intern.x).toBeGreaterThan(144);
  });

  it('the PM costs +6% burnout (the user asked for it: 10% → 6%)', () => {
    expect(BURNOUT.gain.pmResource).toBe(6);
  });
});
