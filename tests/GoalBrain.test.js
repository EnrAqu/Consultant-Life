import { describe, it, expect } from 'vitest';
import GoalBrain from '../src/core/GoalBrain.js';

describe('GoalBrain', () => {
  it('an honest sign always wins', () => {
    const g = new GoalBrain();
    expect(g.touch(90, 100)).toBe('win');
    expect(g.touch(110, 100)).toBe('win');
  });

  it('a trolling sign betrays a player coming from the left once, then wins', () => {
    const g = new GoalBrain({ trolls: true });
    expect(g.touch(90, 100)).toBe('troll');
    expect(g.touch(90, 100)).toBe('win');
  });

  it('coming from the right (the client side) wins right away', () => {
    const g = new GoalBrain({ trolls: true });
    expect(g.touch(110, 100)).toBe('winRight');
    expect(g.trolled).toBe(false);
  });

  it('the Board door stays shut until the pipeline is full', () => {
    const b = new GoalBrain({ requiresDeals: 3 });
    expect(b.touch(100, 200, 2)).toBe('locked');
    expect(b.touch(100, 200, 3)).toBe('win');
  });
});
