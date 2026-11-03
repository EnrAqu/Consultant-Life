// IT: "Il PC si riavvierà tra 3…" (docs/IT_HR_EXTERNAL.md §2.1). Triggered once per life; after `countdownMs` the
// player is frozen for `freezeMs` while the world goes on — but never mid-air: at zero it waits for the landing.
export default class RestartBrain {
  constructor({ countdownMs = 3000, freezeMs = 1200 } = {}) {
    this.countdownMs = countdownMs;
    this.freezeMs = freezeMs;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
  }

  trigger() {
    if (this.state !== 'idle') return false;
    this.state = 'countdown';
    this.timer = 0;
    return true;
  }

  // whole seconds left on the countdown (3, 2, 1), or 0
  get secondsLeft() {
    return this.state === 'countdown' ? Math.max(1, Math.ceil((this.countdownMs - this.timer) / 1000)) : 0;
  }

  // Returns 'freeze' | 'unfreeze' | null.
  update(dt, grounded) {
    if (this.state === 'countdown') {
      this.timer += dt;
      if (this.timer >= this.countdownMs) this.state = 'waitLand';
    }
    if (this.state === 'waitLand' && grounded) {
      this.state = 'frozen';
      this.timer = 0;
      return 'freeze';
    }
    if (this.state === 'frozen') {
      this.timer += dt;
      if (this.timer >= this.freezeMs) {
        this.state = 'done';
        return 'unfreeze';
      }
    }
    return null;
  }
}
