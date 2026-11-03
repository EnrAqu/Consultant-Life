// IT: "Accesso negato: apri un ticket" (docs/IT_HR_EXTERNAL.md §2.3). Touch the kiosk: after `workMs` the barrier opens
// for `openMs`, then closes and the kiosk re-arms. Pivoted (P1): opens after `p1Ms` and stays open.
export default class TicketBrain {
  constructor({ workMs = 4000, openMs = 2500, p1Ms = 300 } = {}, pivoted = false) {
    this.workMs = pivoted ? p1Ms : workMs;
    this.openMs = openMs;
    this.pivoted = pivoted;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
  }

  get open() {
    return this.state === 'open';
  }

  // 0..1 while the ticket is being worked on
  get progress() {
    return this.state === 'working' ? Math.min(1, this.timer / this.workMs) : 0;
  }

  touch() {
    if (this.state !== 'idle') return false;
    this.state = 'working';
    this.timer = 0;
    return true;
  }

  // Returns 'open' | 'close' | null.
  update(dt) {
    if (this.state === 'working') {
      this.timer += dt;
      if (this.timer >= this.workMs) {
        this.state = 'open';
        this.timer = 0;
        return 'open';
      }
    } else if (this.state === 'open' && !this.pivoted) {
      this.timer += dt;
      if (this.timer >= this.openMs) {
        this.reset();
        return 'close';
      }
    }
    return null;
  }
}
