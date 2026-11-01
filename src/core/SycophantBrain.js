// Pure logic of the sycophant (ITERATION_5 §4): the old arrivista, now reporting to you. He follows 1.5 tiles
// behind you, flatters you every 6 s (never blocks you), and on a bow mat he bows: his back is a trampoline.
// Pixels and ms (y grows downwards); no Phaser.
const T = 32;

export const SYCOPHANT_DEFAULTS = {
  followDist: 48,
  speed: 300,
  matEnter: 2 * T,
  matLeave: 4 * T,
  flatterEveryMs: 6000,
  backHeight: 20,
  // bounce speed: 5 rows above the floor from his back (ITERATION_5 §4, review #2)
  bounceVelocity: 759,
};

export const FLATTERY = [
  'Che visione, Partner.',
  'Lo dicevo io che era la scelta giusta.',
  'Ho messo like al suo post. Due volte.',
  "Le ho tenuto la porta. E l'ascensore. E la sedia.",
  'Che eleganza, anche nelle cadute.',
];

export default class SycophantBrain {
  constructor(params = {}) {
    this.p = { ...SYCOPHANT_DEFAULTS, ...params };
    this.placeAt(0, 0);
  }

  placeAt(x, feetY) {
    this.state = 'follow';
    this.x = x;
    this.feetY = feetY;
    this.mat = null;
    this.prevFeetY = null;
    this.flatterTimer = 0;
    this.flatterIndex = 0;
  }

  get backY() {
    return this.feetY - this.p.backHeight;
  }

  sameFloor(player, feetY) {
    return Math.abs(player.feetY - feetY) <= 8;
  }

  moveToward(target, dt) {
    const step = (this.p.speed * dt) / 1000;
    const dx = target - this.x;
    this.x = Math.abs(dx) <= step ? target : this.x + Math.sign(dx) * step;
    return Math.abs(dx) <= step;
  }

  // player: { x, feetY, facing, vy, grounded }; mats: [{ x, feetY }] (centre of the mat, its floor).
  update(dt, { player, mats = [] }) {
    const actions = [];
    this.flatterTimer += dt;
    if (this.flatterTimer >= this.p.flatterEveryMs) {
      this.flatterTimer = 0;
      actions.push({ type: 'flatter', text: FLATTERY[this.flatterIndex % FLATTERY.length] });
      this.flatterIndex += 1;
    }

    if (this.state === 'follow') {
      const mat = player.grounded ? mats.find((m) => this.sameFloor(player, m.feetY) && Math.abs(player.x - m.x) <= this.p.matEnter) : null;
      if (mat) {
        this.state = 'toMat';
        this.mat = mat;
      } else {
        // he hops to your floor once you land somewhere
        if (player.grounded) this.feetY = player.feetY;
        this.moveToward(player.x - player.facing * this.p.followDist, dt);
        return actions;
      }
    }

    this.prevFeetY = this.state === 'bowing' ? this.prevFeetY : null;
    if (this.state === 'toMat') {
      this.feetY = this.mat.feetY;
      if (this.moveToward(this.mat.x, dt)) {
        this.state = 'bowing';
        actions.push({ type: 'bow' });
      }
      return actions;
    }

    // bowing: his back is a trampoline until you walk away from the mat or land on another floor
    const m = this.mat;
    const away = player.grounded && (!this.sameFloor(player, m.feetY) || Math.abs(player.x - m.x) > this.p.matLeave);
    if (away) {
      this.state = 'follow';
      this.mat = null;
      actions.push({ type: 'stand' });
      return actions;
    }
    // swept test: coming down, the feet crossed his back since the last frame. A big frame at 30 fps may already
    // have landed you on the floor (grounded, vy = 0): that still counts as landing on him.
    const prev = this.prevFeetY ?? player.feetY;
    this.prevFeetY = player.feetY;
    const down = player.vy > 0 || player.grounded;
    const onBack = down && Math.abs(player.x - this.x) < 14 && prev <= this.backY + 10 && player.feetY >= this.backY - 6;
    if (onBack) {
      this.prevFeetY = this.backY;
      actions.push({ type: 'bounce', vy: -this.p.bounceVelocity, feetY: this.backY });
    }
    return actions;
  }
}
