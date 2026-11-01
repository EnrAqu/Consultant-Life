import { describe, it, expect } from 'vitest';
import { CAUSES, causeLabel, causeLesson } from '../src/data/causes.js';
import { LEVELS } from '../src/levels/index.js';

describe('cause texts by level skin', () => {
  it('the junior skin tells AMS tickets, legacy fixes and documentation', () => {
    expect(causeLabel('replyAll', 'junior')).toBe('i ticket AMS in coda');
    expect(causeLabel('scopeCreep', 'junior')).toMatch(/codice di altri/);
    expect(causeLesson('deckCollapse', 'junior')).toMatch(/documentazione/);
  });

  it('without a skin (or for causes it does not cover) the default texts stay', () => {
    expect(causeLabel('replyAll')).toBe(CAUSES.replyAll.label);
    expect(causeLabel('fakeKT', 'junior')).toBe(CAUSES.fakeKT.label);
    expect(causeLesson('fakeKT', 'junior')).toBe(CAUSES.fakeKT.lesson);
  });

  it('only level 1 is a junior project', () => {
    expect(LEVELS.level1.skin).toBe('junior');
    expect(Object.values(LEVELS).filter((l) => l.skin)).toHaveLength(1);
  });
});
