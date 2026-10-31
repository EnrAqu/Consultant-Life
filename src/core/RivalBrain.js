// Pure logic of the "arrivista" (ITERATION_4 §5): a colleague who starts running when you pass him and races
// you to the goal, a bit slower than your top speed — so he only catches you when you stop.
// Positions in px, time in ms; no Phaser.
const T = 32;

export const RIVAL_DEFAULTS = {
  speed: 240,
  startCol: 0,
  triggerCol: 0,
  stopCol: 0,
  stealDist: 14,
};

export default class RivalBrain {
  constructor(params) {
    this.p = { ...RIVAL_DEFAULTS, ...params };
    this.reset();
  }

  reset() {
    this.state = 'waiting';
    this.x = this.p.startCol * T + 16;
    this.stoleJunior = false;
    this.bouncedAt = -Infinity;
    this.t = 0;
    this.reachedGoal = false;
  }

  // player: { x, onHead, overlapping }, coffees: [{ x, taken }], firstFollowerX (or null)
  update(dt, { player, coffees = [], firstFollowerX = null }) {
    const actions = [];
    this.t += dt;
    if (this.state === 'waiting') {
      if (player.x >= this.p.triggerCol * T) {
        this.state = 'running';
        actions.push({ type: 'start' });
      }
      return actions;
    }
    if (this.state !== 'running') return actions;

    const stopX = this.p.stopCol * T + 16;
    this.x = Math.min(stopX, this.x + (this.p.speed * dt) / 1000);

    for (const c of coffees) {
      if (!c.taken && Math.abs(c.x - this.x) < 10) actions.push({ type: 'takeCoffee', coffee: c });
    }
    if (!this.stoleJunior && firstFollowerX !== null && Math.abs(firstFollowerX - this.x) < this.p.stealDist) {
      this.stoleJunior = true;
      actions.push({ type: 'stealJunior' });
    }
    // you can use his head as a platform; he jumps on yours when he catches you (both: a bounce, never a death)
    if (player.onHead) actions.push({ type: 'headBounce' });
    else if (player.overlapping && this.t - this.bouncedAt > 800) {
      this.bouncedAt = this.t;
      actions.push({ type: 'leapfrog' });
    }
    if (this.x >= stopX) {
      this.state = 'arrived';
      this.reachedGoal = true;
      actions.push({ type: 'arrived' });
    }
    return actions;
  }
}
