import { formatClock } from './format.js';

export default class StandupSchedule {
  constructor(cfg, { startMinutes = cfg.clockStart, speed = 1, enabled = true } = {}) {
    this.cfg = cfg;
    this.startMinutes = startMinutes;
    this.speed = speed;
    this.enabled = enabled;
    this.reset();
  }

  reset() {
    this.minutes = this.startMinutes;
    this.phase = 'idle';
    this.remainingMs = 0;
    // skip standups already in the past (debug ?clock=)
    this.index = 0;
    while (this.nextAt() <= this.minutes) this.index += 1;
  }

  nextAt() {
    return this.cfg.firstAt + this.index * this.cfg.interval;
  }

  isOverrun(index = this.index) {
    return (index + 1) % this.cfg.overrunEvery === 0;
  }

  update(dtMs) {
    const events = [];
    const before = Math.floor(this.minutes);
    this.minutes += (dtMs / 1000) * this.cfg.minutesPerRealSecond * this.speed;
    if (Math.floor(this.minutes) !== before) {
      events.push({ type: 'tick', minutes: Math.floor(this.minutes), label: this.clockLabel, warning: this.isWarning });
    }
    if (!this.enabled) return events;

    if (this.phase === 'standup') {
      this.remainingMs -= dtMs;
      if (this.remainingMs <= 0) {
        events.push({ type: 'end', overrun: this.isOverrun() });
        this.phase = 'idle';
        this.index += 1;
      }
    }
    const at = this.nextAt();
    if (this.phase === 'idle' && this.minutes >= at - this.cfg.warningLeadMinutes) {
      this.phase = 'warning';
      events.push({ type: 'warning', at: formatClock(at), overrun: this.isOverrun() });
    }
    if (this.phase === 'warning' && this.minutes >= at) {
      const overrun = this.isOverrun();
      this.phase = 'standup';
      this.remainingMs = this.cfg.durationMs * (overrun ? 2 : 1);
      events.push({ type: 'start', durationMs: this.remainingMs, overrun });
    }
    return events;
  }

  get clockLabel() {
    return formatClock(this.minutes);
  }

  get isFrozen() {
    return this.phase === 'standup';
  }

  get isWarning() {
    return this.phase === 'warning';
  }
}
