// Pure state machine of the micromanager (ITERATION_3 §1). Pixels and ms; no Phaser.
const T = 32;

export const MM_DEFAULTS = {
  walkSpeed: 60,
  followDist: 5,
  checkEveryMs: 6000,
  tellMs: 500,
  sightRange: 7,
  sightRows: 3,
  busySpeed: 200,
  dashSpeed: 400,
  catchDist: 20,
  explainMs: 2000,
  explainCost: 0.5,
  demoMs: 1200,
  cooldownMs: 4000,
  respawnMs: 3000,
  guideAhead: 3,
  guideSpeed: 300,
  floorRow: 14,
};

export default class MicromanagerBrain {
  constructor(params, mode = 'normal') {
    this.p = { ...MM_DEFAULTS, ...params };
    this.mode = mode;
    this.minX = this.p.zoneFrom * T + 16;
    this.maxX = this.p.zoneTo * T + 16;
    // feet of the micromanager: the zone floor (row the player stands on)
    this.floorY = (this.p.floorRow + 1) * T;
    // walkable floor spans of the zone (pits listed in p.gaps as [fromCol, toCol]); he never walks over a pit
    this.spans = this.computeSpans(this.p.gaps ?? []);
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.x = this.minX;
    this.facing = 1;
    this.timer = 0;
    this.checkTimer = 0;
    this.demos = 0;
    this.demoSuccess = true;
    this.guided = false;
  }

  computeSpans(gaps) {
    const spans = [];
    let start = this.p.zoneFrom;
    for (const [from, to] of [...gaps].sort((a, c) => a[0] - c[0])) {
      if (from > start) spans.push([start * T + 16, (from - 1) * T + 16]);
      start = to + 1;
    }
    if (start <= this.p.zoneTo) spans.push([start * T + 16, this.p.zoneTo * T + 16]);
    return spans;
  }

  spanOf(x) {
    return this.spans.find(([a, c]) => x >= a - 1 && x <= c + 1) ?? this.spans[0];
  }

  inZone(px) {
    return px >= this.p.zoneFrom * T && px < (this.p.zoneTo + 1) * T;
  }

  moveToward(target, speed, dt) {
    const step = (speed * dt) / 1000;
    const dx = target - this.x;
    const [lo, hi] = this.spanOf(this.x);
    if (Math.abs(dx) <= step) this.x = target;
    else this.x += Math.sign(dx) * step;
    this.x = Math.min(hi, Math.max(lo, this.x));
    if (dx !== 0) this.facing = Math.sign(dx);
  }

  // Hidden = standing at a plant (either side) or with a plant between him and you, on the same floor.
  hiddenBehindPlant(player) {
    const lo = Math.min(this.x, player.x);
    const hi = Math.max(this.x, player.x);
    return this.p.plants.some((pl) => {
      const px = pl.col * T + 16;
      const sameFloor = Math.abs((pl.row + 1) * T - player.y) <= T;
      return sameFloor && (Math.abs(px - player.x) <= T || (px > lo && px < hi));
    });
  }

  sees(player) {
    const dx = player.x - this.x;
    if (Math.sign(dx) !== this.facing && dx !== 0) return false;
    if (Math.abs(dx) > this.p.sightRange * T) return false;
    if (Math.abs(player.y - this.floorY) > this.p.sightRows * T) return false;
    return !this.hiddenBehindPlant(player);
  }

  // player: { x, y (feet), vx, grounded, locked }. Returns actions for the view.
  update(dt, player) {
    const actions = [];
    const present = this.inZone(player.x);
    if (this.mode === 'pivoted') return this.updateGuide(dt, player, present, actions);

    switch (this.state) {
      case 'idle':
        this.moveToward(this.facing > 0 ? this.maxX : this.minX, this.p.walkSpeed, dt);
        {
          const [lo, hi] = this.spanOf(this.x);
          if (this.x >= hi) this.facing = -1;
          if (this.x <= lo) this.facing = 1;
        }
        if (present) {
          this.checkTimer = 0;
          this.enter('watch');
        }
        break;
      case 'watch': {
        if (!present) {
          this.enter('idle');
          break;
        }
        const dx = player.x - this.x;
        this.facing = Math.sign(dx) || this.facing;
        if (Math.abs(dx) > this.p.followDist * T) this.moveToward(player.x - this.facing * this.p.followDist * T, this.p.walkSpeed, dt);
        this.checkTimer += dt;
        if (this.checkTimer >= this.p.checkEveryMs) {
          this.checkTimer = 0;
          this.enter('tell');
          actions.push({ type: 'tell' });
        }
        break;
      }
      case 'tell':
        this.timer += dt;
        if (this.timer >= this.p.tellMs) {
          // running = "looks busy"; a player already frozen (KT call…) is left alone
          const busy = Math.abs(player.vx) >= this.p.busySpeed || player.locked;
          if (present && !busy && this.sees(player)) this.enter('dash');
          else this.enter('watch');
        }
        break;
      case 'dash': {
        if (!present || player.locked) {
          this.enter('watch');
          break;
        }
        const before = this.x;
        this.moveToward(player.x, this.p.dashSpeed, dt);
        const close = Math.abs(player.x - this.x) <= this.p.catchDist;
        // never stop someone mid-air: wait until they land (a stop over a pit would kill)
        const onFloor = player.grounded && Math.abs(player.y - this.floorY) <= 8;
        if (!close && this.x === before) {
          this.enter('watch'); // a pit is in the way
          break;
        }
        if (close && onFloor) {
          this.enter('explain');
          actions.push({ type: 'catch', cost: this.p.explainCost });
        }
        break;
      }
      case 'explain':
        this.timer += dt;
        if (this.timer >= this.p.explainMs) {
          actions.push({ type: 'release' });
          this.demos += 1;
          const kind = this.p.demoJump ? 'jump' : 'sit';
          this.demoSuccess = kind === 'sit' || this.demos % 2 === 1;
          // the jump demo always starts from the edge of his pit
          if (this.p.demoJump) this.x = this.p.demoJump.fromCol * T + 16;
          this.demoFrom = this.x;
          this.enter('demo');
          actions.push({ type: 'demoStart', success: this.demoSuccess, kind });
        }
        break;
      case 'demo':
        this.timer += dt;
        if (this.timer >= this.p.demoMs) {
          actions.push({ type: 'demoEnd', success: this.demoSuccess });
          if (this.p.demoJump && this.demoSuccess) this.x = this.p.demoJump.toCol * T + 16;
          if (!this.demoSuccess) {
            this.enter('away');
            break;
          }
          this.enter('cooldown');
        }
        break;
      case 'away':
        this.timer += dt;
        if (this.timer >= this.p.respawnMs) {
          this.x = this.minX;
          this.facing = 1;
          actions.push({ type: 'respawn' });
          this.enter('cooldown');
        }
        break;
      case 'cooldown':
        this.timer += dt;
        if (this.timer >= this.p.cooldownMs) {
          // after a successful jump demo he hops back to his side of the pit
          if (this.p.demoJump && this.x === this.p.demoJump.toCol * T + 16) this.x = this.p.demoJump.fromCol * T + 16;
          this.enter(present ? 'watch' : 'idle');
        }
        break;
      default:
        break;
    }
    return actions;
  }

  updateGuide(dt, player, present, actions) {
    if (!present) {
      this.state = 'idle';
      return actions;
    }
    if (!this.guided) {
      this.guided = true;
      actions.push({ type: 'guideStart' });
    }
    this.state = 'guide';
    this.moveToward(player.x + this.p.guideAhead * T, this.p.guideSpeed, dt);
    this.facing = 1;
    return actions;
  }

  enter(state) {
    this.state = state;
    this.timer = 0;
  }

  // 0..1 progress of the current demo (for the view)
  get demoProgress() {
    return this.state === 'demo' ? Math.min(1, this.timer / this.p.demoMs) : 0;
  }
}
