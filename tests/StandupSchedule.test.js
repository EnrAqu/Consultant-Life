import { describe, it, expect } from 'vitest';
import StandupSchedule from '../src/core/StandupSchedule.js';
import { STANDUP } from '../src/config/constants.js';

function run(schedule, ms, step = 100) {
  const events = [];
  for (let t = 0; t < ms; t += step) events.push(...schedule.update(step));
  return events;
}

describe('StandupSchedule', () => {
  it('starts at 09:00, warns 3 minutes before, freezes at 09:20 for 3s', () => {
    const s = new StandupSchedule(STANDUP);
    expect(s.clockLabel).toBe('09:00');
    let ev = run(s, 17000);
    expect(s.clockLabel).toBe('09:17');
    expect(ev.find((e) => e.type === 'warning')).toMatchObject({ at: '09:20', overrun: false });
    expect(s.isWarning).toBe(true);
    ev = run(s, 3000);
    expect(ev.find((e) => e.type === 'start')).toMatchObject({ durationMs: 3000 });
    expect(s.isFrozen).toBe(true);
    ev = run(s, 3000);
    expect(ev.some((e) => e.type === 'end')).toBe(true);
    expect(s.isFrozen).toBe(false);
  });

  it('every third standup overruns (6s) and the next one stays on schedule', () => {
    const s = new StandupSchedule(STANDUP);
    const ev = run(s, 85000);
    const starts = ev.filter((e) => e.type === 'start');
    expect(starts.map((e) => e.durationMs)).toEqual([3000, 3000, 6000, 3000]);
    // 4th standup at 10:20 → 80s of game time
    expect(s.clockLabel).toBe('10:25');
  });

  it('clock keeps running during standup and reset restores start', () => {
    const s = new StandupSchedule(STANDUP);
    run(s, 21000);
    expect(s.isFrozen).toBe(true);
    expect(s.clockLabel).toBe('09:21');
    s.reset();
    expect(s.clockLabel).toBe('09:00');
    expect(s.isFrozen).toBe(false);
  });

  it('can be disabled and can start late', () => {
    const off = new StandupSchedule(STANDUP, { enabled: false });
    expect(run(off, 30000).some((e) => e.type === 'start')).toBe(false);
    const late = new StandupSchedule(STANDUP, { startMinutes: 9 * 60 + 19 });
    const ev = run(late, 1500);
    expect(ev.some((e) => e.type === 'start')).toBe(true);
  });
});
