import { describe, it, expect } from 'vitest';
import Budget from '../src/core/Budget.js';
import { formatGu, formatClock, formatDuration, parseClock } from '../src/core/format.js';

describe('Budget', () => {
  it('spends, gains with clamp and detects overrun', () => {
    const b = new Budget(20);
    expect(b.spend(0.5)).toBe(-0.5);
    expect(b.gu).toBe(19.5);
    expect(b.gain(3)).toBe(0.5);
    expect(b.gu).toBe(20);
    b.spend(19.5);
    expect(b.isOver()).toBe(false);
    b.spend(3);
    expect(b.isOver()).toBe(true);
    expect(b.gu).toBe(0);
  });

  it('avoids floating point drift', () => {
    const b = new Budget(20);
    for (let i = 0; i < 7; i++) b.spend(0.5);
    expect(b.gu).toBe(16.5);
  });
});

describe('format', () => {
  it('formats italian numbers, clock and durations', () => {
    expect(formatGu(12.5)).toBe('12,5');
    expect(formatGu(-1)).toBe('0,0');
    expect(formatClock(570)).toBe('09:30');
    expect(formatDuration(83000)).toBe('1:23');
    expect(parseClock('09:29')).toBe(569);
    expect(parseClock('bad')).toBe(null);
  });
});
