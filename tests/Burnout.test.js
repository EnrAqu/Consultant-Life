import { describe, it, expect } from 'vitest';
import Burnout, { nextStart } from '../src/core/Burnout.js';

const MIN = [0, 15, 30, 45, 60];

describe('Burnout', () => {
  it('starts at 0 and clamps the initial value', () => {
    expect(new Burnout().value).toBe(0);
    expect(new Burnout(-5).value).toBe(0);
    expect(new Burnout(130).value).toBe(100);
  });

  it('add sums and saturates at 100; over is true exactly at 100', () => {
    const b = new Burnout(98);
    expect(b.add('death', 1)).toEqual({ delta: 1, value: 99, over: false });
    expect(b.isOver).toBe(false);
    expect(b.add('death', 5)).toEqual({ delta: 1, value: 100, over: true });
    expect(b.isOver).toBe(true);
  });

  it('add ignores non-positive amounts', () => {
    const b = new Burnout(10);
    expect(b.add('death', 0).delta).toBe(0);
    expect(b.add('death', -3).delta).toBe(0);
    expect(b.value).toBe(10);
  });

  it('relieve never goes below 0', () => {
    const b = new Burnout(3);
    expect(b.relieve('coffee', 2)).toEqual({ delta: -2, value: 1 });
    expect(b.relieve('realKT', 3)).toEqual({ delta: -1, value: 0 });
  });

  it('startLevel raises to the level minimum and never lowers a higher value', () => {
    const b = new Burnout(4);
    expect(b.startLevel(1, MIN)).toEqual({ value: 15, raisedBy: 11 });
    b.add('death', 30);
    expect(b.startLevel(2, MIN)).toEqual({ value: 45, raisedBy: 0 });
  });

  it('startLevel beyond the table uses the last minimum', () => {
    expect(new Burnout().startLevel(9, MIN).value).toBe(60);
    expect(new Burnout().startLevel(-1, MIN).value).toBe(0);
  });

  it('tier: 0 below 50, 1 from 50, 2 from 80', () => {
    expect(new Burnout(49).tier).toBe(0);
    expect(new Burnout(50).tier).toBe(1);
    expect(new Burnout(79).tier).toBe(1);
    expect(new Burnout(80).tier).toBe(2);
  });

  it('quarter steps (deaths) add up without drift', () => {
    const b = new Burnout();
    for (let i = 0; i < 7; i++) b.add('death', 0.25);
    expect(b.value).toBe(1.75);
    b.relieve('coffee', 0.1);
    expect(b.value).toBe(1.65);
  });

  it('nextStart explains where the next level starts', () => {
    expect(nextStart(23, 2, MIN)).toEqual({ value: 30, reason: 'minimum' });
    expect(nextStart(41, 2, MIN)).toEqual({ value: 41, reason: 'carried' });
    expect(nextStart(8, 1, MIN, 5)).toEqual({ value: 10, reason: 'clean' });
    expect(nextStart(2, 0, MIN, 5)).toEqual({ value: 0, reason: 'clean' });
  });
});
