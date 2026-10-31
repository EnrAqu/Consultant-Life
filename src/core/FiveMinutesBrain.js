// Pure state machine of the "Hai 5 minuti?" colleague (ITERATION_3 §2). Pixels and ms; no Phaser.
const T = 32;

export const FIVE_DEFAULTS = {
  noticeDist: 6,
  stepOutDist: 3,
  stepOutMs: 250,
  standMs: 1800,
  hookMs: 3000,
  hookCost: 0.5,
  rearmMs: 1500,
};

export default class FiveMinutesBrain {
  constructor(params, mode = 'normal') {
    this.p = { ...FIVE_DEFAULTS, ...params };
    this.mode = mode;
    this.reset();
  }

  reset() {
    this.state = 'closed';
    this.timer = 0;
    this.offered = false;
  }

  // Colleague blocks the corridor (and can be touched) while stepping out or standing.
  get isOut() {
    return this.state === 'stepping' || this.state === 'out' || this.state === 'hooked';
  }

  // 0..1 how far out of the door the colleague is (for the view)
  get outAmount() {
    if (this.state === 'stepping') return Math.min(1, this.timer / this.p.stepOutMs);
    return this.isOut ? 1 : 0;
  }

  // distTiles: |player - door| in tiles; touching: player overlaps the colleague; locked: player already frozen.
  update(dt, { distTiles, touching, locked = false }) {
    const actions = [];
    this.timer += dt;
    switch (this.state) {
      case 'closed':
        if (distTiles <= this.p.noticeDist) this.enter('notice', actions, { type: 'notice' });
        break;
      case 'notice':
        if (distTiles <= this.p.stepOutDist) this.enter('stepping', actions, { type: 'stepOut' });
        else if (distTiles > this.p.noticeDist) this.enter('closed', actions, { type: 'quiet' });
        break;
      case 'stepping':
      case 'out':
        if (touching && !locked) {
          if (this.mode === 'pivoted') {
            if (!this.offered) {
              this.offered = true;
              actions.push({ type: 'shortcutOffer' });
            }
          } else {
            this.enter('hooked', actions, { type: 'hook', cost: this.p.hookCost });
            break;
          }
        }
        if (this.state === 'stepping' && this.timer >= this.p.stepOutMs) this.enter('out', actions);
        else if (this.state === 'out' && this.timer >= this.p.standMs) this.enter('back', actions, { type: 'goBack' });
        break;
      case 'hooked':
        if (this.timer >= this.p.hookMs) this.enter('done', actions, { type: 'release' }, { type: 'goBack' });
        break;
      case 'done':
        // after a conversation he waits until you have walked away before trying again
        if (distTiles > this.p.noticeDist) this.enter('closed', actions);
        break;
      case 'back':
        if (this.timer >= this.p.rearmMs) this.enter('closed', actions);
        break;
      default:
        break;
    }
    return actions;
  }

  // Delegation (ITERATION_4 §4.2): a junior keeps him busy until the next respawn.
  occupy() {
    this.state = 'occupied';
    this.timer = 0;
  }

  enter(state, actions, ...events) {
    this.state = state;
    this.timer = 0;
    actions.push(...events);
  }
}

export const tilesBetween = (ax, bx) => Math.abs(ax - bx) / T;
