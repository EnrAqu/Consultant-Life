// Pure logic of a junior building part of the path (ITERATION_5 §3): one platform every buildMs,
// only while the Partner is NOT looking at him. Watched: he stops ("Volevi un aggiornamento?") and
// resumes resumeMs after you look away. He gets to work only once the Partner shows up on his floor (near),
// otherwise he would be done long before you arrive. Work done stays done (no reset on death). Times in ms; no Phaser.
export const WORKER_DEFAULTS = { buildMs: 450, resumeMs: 800 };

export default class WorkerBrain {
  constructor(params) {
    this.p = { ...WORKER_DEFAULTS, ...params };
    this.total = this.p.cells.length;
    this.built = 0;
    this.timer = 0;
    this.state = 'idle';
    this.quietMs = 0;
  }

  get done() {
    return this.built >= this.total;
  }

  // 0..1, for the progress bar
  get progress() {
    if (this.done) return 1;
    return (this.built + Math.min(1, this.timer / this.p.buildMs)) / this.total;
  }

  // watched: he is in the Partner's torch; blocked: the next platform's cell is occupied (wait, never trap anyone)
  update(dt, { watched, blocked = false, near = true }) {
    const actions = [];
    if (this.done) return actions;
    if (this.state === 'idle') {
      if (!near) return actions;
      this.state = 'working';
      actions.push({ type: 'wake' });
    }
    if (watched) {
      if (this.state !== 'watched') actions.push({ type: 'noticed' });
      this.state = 'watched';
      this.quietMs = 0;
      return actions;
    }
    if (this.state === 'watched') {
      this.quietMs += dt;
      if (this.quietMs < this.p.resumeMs) return actions;
      this.state = 'working';
      actions.push({ type: 'resume' });
    }
    if (this.timer < this.p.buildMs) this.timer = Math.min(this.p.buildMs, this.timer + dt);
    if (this.timer >= this.p.buildMs && !blocked) {
      this.timer = 0;
      actions.push({ type: 'build', index: this.built });
      this.built += 1;
      if (this.done) actions.push({ type: 'done' });
    }
    return actions;
  }
}
