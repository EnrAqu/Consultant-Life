// Pure logic of the escalation (ITERATION_5 §2): a tide of CC emails rising from the bottom of the tower.
// It starts when you leave the lobby, speeds up stage by stage (the client's chain in CC grows), never stays
// more than leashRows below your feet, and catching you costs a call with the client (the view charges GU).
// Pixels and ms (y grows downwards); no Phaser.
const T = 32;

export const ESCALATION_DEFAULTS = {
  leashRows: 10,
  catchLockMs: 1200,
  pauseMs: 1500,
  // stages from the bottom up: active once the surface is at or above fromRow
  // speeds checked against the shortest climb of level 5 (tests/Level5.test.js): a player at a good pace keeps
  // 2.7 rows of margin, a slow one gets caught (review 5 #2)
  stages: [
    { fromRow: Infinity, speed: 42, label: 'Manager' },
    { fromRow: 62, speed: 48, label: 'Director' },
    { fromRow: 38, speed: 54, label: 'VP' },
    { fromRow: 26, speed: 62, label: 'CEO' },
  ],
};

export default class EscalationBrain {
  // startRow: feet above this row start it; stopRow: feet at or above this row stop it for good;
  // floorRow: the lobby floor the tide starts from.
  constructor(params) {
    this.p = { ...ESCALATION_DEFAULTS, ...params };
    this.reset();
  }

  reset() {
    this.state = 'waiting';
    this.surfaceY = (this.p.floorRow + 1) * T;
    this.stageIndex = 0;
    this.timer = 0;
  }

  get active() {
    return this.state !== 'waiting' && this.state !== 'stopped';
  }

  get stage() {
    return this.p.stages[this.stageIndex];
  }

  get chainLabel() {
    return this.p.stages
      .slice(0, this.stageIndex + 1)
      .map((s) => s.label)
      .join(', ');
  }

  distanceRows(feetY) {
    return (this.surfaceY - feetY) / T;
  }

  stageFor(surfaceY) {
    const row = surfaceY / T;
    let index = 0;
    this.p.stages.forEach((s, i) => {
      if (row <= s.fromRow) index = i;
    });
    return index;
  }

  leash(feetY) {
    this.surfaceY = Math.min(this.surfaceY, feetY + this.p.leashRows * T);
  }

  // feetY: the player's feet. Returns actions: start, stage, catch, released, stop.
  update(dt, { feetY }) {
    const actions = [];
    if (this.state === 'stopped') return actions;
    if (this.state === 'waiting') {
      if (feetY > (this.p.startRow + 1) * T) return actions;
      // already at the Board (debug checkpoint): it never starts
      if (feetY <= (this.p.stopRow + 1) * T) {
        this.state = 'stopped';
        return actions;
      }
      this.state = 'rising';
      actions.push({ type: 'start' });
    }
    if (feetY <= (this.p.stopRow + 1) * T && this.state !== 'catching') {
      this.state = 'stopped';
      actions.push({ type: 'stop' });
      return actions;
    }
    if (this.state === 'catching') {
      this.timer -= dt;
      if (this.timer > 0) return actions;
      this.surfaceY = feetY + this.p.leashRows * T;
      this.state = 'paused';
      this.timer = this.p.pauseMs;
      actions.push({ type: 'released' });
      return actions;
    }
    if (this.state === 'paused') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'rising';
    } else {
      this.surfaceY -= (this.stage.speed * dt) / 1000;
    }
    this.leash(feetY);
    const stage = this.stageFor(this.surfaceY);
    if (stage > this.stageIndex) {
      this.stageIndex = stage;
      actions.push({ type: 'stage', stage, label: this.stage.label });
    }
    if (this.surfaceY <= feetY) {
      this.state = 'catching';
      this.timer = this.p.catchLockMs;
      actions.push({ type: 'catch' });
    }
    return actions;
  }

  // After a respawn (death by something else): drop to leashRows below the player and wait a moment.
  resetBelow(feetY) {
    if (!this.active) return;
    this.surfaceY = Math.max(this.surfaceY, feetY + this.p.leashRows * T);
    // back to the stage of where the tide now is (a floor replayed at its own speed), without a banner
    this.stageIndex = this.stageFor(this.surfaceY);
    this.state = 'paused';
    this.timer = this.p.pauseMs;
  }
}
