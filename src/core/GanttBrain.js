// The PM's Gantt bar (docs/PM_LINKEDIN.md §2): land on it and, after `delayMs`, "abbiamo ripianificato": the bar slides
// `shift` columns (sign = direction, shown by the arrow) at `speed` columns/s. Once it has stopped and nobody rides it,
// after `returnDelayMs` it goes back home and arms again (never a soft-lock). Pure logic: offsets in columns.
export default class GanttBrain {
  constructor({ shift, speed, delayMs, returnDelayMs = 1200 }) {
    this.shift = shift;
    this.speed = speed;
    this.delayMs = delayMs;
    this.returnDelayMs = returnDelayMs;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.offset = 0;
    this.timer = 0;
  }

  get dir() {
    return Math.sign(this.shift);
  }

  // the player landed on it from above
  land() {
    if (this.state !== 'idle') return;
    this.state = 'armed';
    this.timer = 0;
  }

  // Returns 'move' | 'stop' | 'home' | null. `riding`: the player stands on the bar.
  update(dt, riding) {
    const step = (this.speed * dt) / 1000;
    switch (this.state) {
      case 'armed':
        this.timer += dt;
        if (this.timer >= this.delayMs) {
          this.state = 'moving';
          return 'move';
        }
        return null;
      case 'moving':
        this.offset += this.dir * step;
        if (Math.abs(this.offset) >= Math.abs(this.shift)) {
          this.offset = this.shift;
          this.state = 'done';
          this.timer = 0;
          return 'stop';
        }
        return null;
      case 'done':
        this.timer = riding ? 0 : this.timer + dt;
        if (this.timer >= this.returnDelayMs) this.state = 'returning';
        return null;
      case 'returning':
        this.offset -= this.dir * step;
        if (this.dir === 0 || Math.sign(this.offset) !== this.dir) {
          this.reset();
          return 'home';
        }
        return null;
      default:
        return null;
    }
  }
}
