// Pure state machine of the micromanager "with the flashlight" (ITERATION_4 §0b). Pixels and ms; no Phaser.
// He patrols his zone and turns around on a fixed rhythm; if you stand in his light, he stops you.
const T = 32;

export const MM_DEFAULTS = {
  walkSpeed: 60,
  turnEveryMs: 3000,
  turnTellMs: 400,
  sightRange: 5,
  sightRows: 2,
  approachSpeed: 400,
  explainMs: 2000,
  explainCost: 0.5,
  demoMs: 1200,
  cooldownMs: 3000,
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
    this.floorY = (this.p.floorRow + 1) * T;
    // walkable floor spans of the zone (pits listed in p.gaps as [fromCol, toCol]); he never walks over a pit
    this.gaps = (this.p.gaps ?? []).map(([a, b]) => [a * T, (b + 1) * T]);
    this.spans = this.computeSpans(this.p.gaps ?? []);
    this.reset();
  }

  reset() {
    this.state = 'patrol';
    this.x = this.minX;
    this.facing = 1;
    this.timer = 0;
    this.turnTimer = 0;
    this.demos = 0;
    this.demoSuccess = true;
    this.guided = false;
    this.told = false;
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
  }

  get lightOn() {
    return this.mode === 'normal' && this.state === 'patrol';
  }

  // The "…" before he turns around.
  get turning() {
    return this.lightOn && this.turnTimer >= this.p.turnEveryMs - this.p.turnTellMs;
  }

  // How far the light reaches in front of him (px): stops at the first plant or pit.
  lightReach() {
    let reach = this.p.sightRange * T;
    const f = this.facing;
    for (const pl of this.p.plants ?? []) {
      const d = (pl.col * T + 16 - this.x) * f;
      if (d > 0) reach = Math.min(reach, d - 12);
    }
    for (const [a, b] of this.gaps) {
      const edge = f > 0 ? a - this.x : this.x - b;
      if (edge > 0) reach = Math.min(reach, edge);
    }
    return Math.max(0, reach);
  }

  // Standing at a plant: hidden, even when he walks right past you.
  atPlant(player) {
    return (this.p.plants ?? []).some((pl) => Math.abs(pl.col * T + 16 - player.x) <= 16);
  }

  // Player standing (feet on his floor) inside the light.
  inLight(player) {
    if (!this.lightOn || !player.grounded || player.locked) return false;
    if (Math.abs(player.y - this.floorY) > 8) return false;
    if (this.atPlant(player)) return false;
    const d = (player.x - this.x) * this.facing;
    return d >= -8 && d <= this.lightReach();
  }

  // player: { x, y (feet), vx, grounded, locked }. Returns actions for the view.
  update(dt, player) {
    const actions = [];
    const present = this.inZone(player.x);
    if (this.mode === 'pivoted') return this.updateGuide(dt, player, present, actions);

    switch (this.state) {
      case 'patrol': {
        this.moveToward(this.facing > 0 ? this.maxX : this.minX, this.p.walkSpeed, dt);
        this.turnTimer += dt;
        if (this.turning && !this.told) {
          this.told = true;
          actions.push({ type: 'tell' });
        }
        if (this.turnTimer >= this.p.turnEveryMs) {
          this.facing = -this.facing;
          this.turnTimer = 0;
          this.told = false;
        }
        if (present && this.inLight(player)) {
          this.enter('explain');
          actions.push({ type: 'catch', cost: this.p.explainCost });
        }
        break;
      }
      case 'explain':
        this.timer += dt;
        // walk up to the player while he explains (never over a pit)
        if (Math.abs(player.x - this.x) > 20) this.moveToward(player.x - Math.sign(player.x - this.x) * 18, this.p.approachSpeed, dt);
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
          this.enter(this.demoSuccess ? 'cooldown' : 'away');
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
        // light off: the window to slip past him
        this.timer += dt;
        if (this.timer >= this.p.cooldownMs) {
          // after a successful jump demo he hops back to his side of the pit
          if (this.p.demoJump && this.x === this.p.demoJump.toCol * T + 16) this.x = this.p.demoJump.fromCol * T + 16;
          this.turnTimer = 0;
          this.told = false;
          this.enter('patrol');
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
    this.facing = 1;
    this.moveToward(player.x + this.p.guideAhead * T, this.p.guideSpeed, dt);
    return actions;
  }

  enter(state) {
    this.state = state;
    this.timer = 0;
  }

  // Delegation (ITERATION_4 §4.2): a junior lets him explain to them instead; light off for `ms`.
  occupy(ms = 8000) {
    this.enter('cooldown');
    this.timer = this.p.cooldownMs - ms;
  }

  // 0..1 progress of the current demo (for the view)
  get demoProgress() {
    return this.state === 'demo' ? Math.min(1, this.timer / this.p.demoMs) : 0;
  }
}
