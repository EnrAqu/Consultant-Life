// Hiring at a desk (docs/HIRING.md, level 4): the temp agency (free, at once) and the LinkedIn job post (1 GU, the
// junior arrives `delayMs` later). E at the desk: 'hire' once per life; then 'arrive' after the delay. Pure logic.
export default class HireBrain {
  constructor({ delayMs = 0 } = {}) {
    this.delayMs = delayMs;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
  }

  act() {
    if (this.state !== 'idle') return null;
    this.state = 'waiting';
    this.timer = 0;
    return 'hire';
  }

  // Returns 'arrive' once, `delayMs` after the hire.
  update(dt) {
    if (this.state !== 'waiting') return null;
    this.timer += dt;
    if (this.timer < this.delayMs) return null;
    this.state = 'done';
    return 'arrive';
  }
}
