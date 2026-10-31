import { describe, it, expect } from 'vitest';
import Narrator, { fillTemplate } from '../src/core/Narrator.js';
import { NARRATOR_LINES } from '../src/data/narratorLines.js';

const lines = [
  { id: 'g1', event: 'death', text: 'generic' },
  { id: 'g2', event: 'death', text: 'generic2' },
  { id: 'spike', event: 'death', when: { cause: 'spike' }, text: 'spike' },
  { id: 'spot', event: 'death', when: { minSpot: 3 }, text: '{spotCount} qui' },
  { id: 'ms5', event: 'death', when: { runDeathsExact: 5 }, text: 'cinque' },
  { id: 'end', event: 'levelComplete', text: 'fine' },
];

describe('Narrator', () => {
  it('picks the most specific line and returns priority', () => {
    const n = new Narrator(lines, () => 0);
    expect(n.pick('death', { cause: 'spike' })).toEqual({ id: 'spike', text: 'spike', priority: 1 });
    expect(n.pick('levelComplete', {}).priority).toBe(3);
  });

  it('spot line always beats cause line, milestone beats both', () => {
    for (let i = 0; i < 10; i++) {
      const n = new Narrator(lines, Math.random);
      expect(n.pick('death', { cause: 'spike', spotCount: 3 })).toMatchObject({ id: 'spot', text: '3 qui', priority: 2 });
      expect(n.pick('death', { cause: 'spike', spotCount: 3, runDeaths: 5 }).id).toBe('ms5');
    }
  });

  it('avoids repeating recent lines when possible', () => {
    const n = new Narrator(lines, () => 0);
    const a = n.pick('death', {}).id;
    const b = n.pick('death', {}).id;
    expect(a).not.toBe(b);
  });

  it('returns null without candidates and never prints undefined', () => {
    const n = new Narrator(lines);
    expect(n.pick('nothing', {})).toBe(null);
    expect(fillTemplate('a {missing} b', {})).toBe('a  b');
  });

  it('real lines cover every cause and event', () => {
    const n = new Narrator(NARRATOR_LINES, () => 0);
    for (const cause of ['pit', 'spike', 'replyAll', 'scopeCreep', 'deckCollapse', 'selfRestart']) {
      expect(n.pick('death', { cause }).id).toContain('death_');
    }
    for (const ev of ['levelStart', 'levelStartPivot', 'ktFake', 'ktReal', 'standupStart', 'standupOverrun', 'budgetLow', 'checkpoint', 'idle', 'budgetOver', 'levelComplete']) {
      expect(n.pick(ev, {})).not.toBe(null);
    }
    expect(NARRATOR_LINES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(NARRATOR_LINES.map((l) => l.id)).size).toBe(NARRATOR_LINES.length);
  });
});
