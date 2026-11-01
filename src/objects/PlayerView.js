import { DEPTH, TEXTURE_SCALE } from '../config/constants.js';

const BASE = 1 / TEXTURE_SCALE;
const SQUASH_MS = 40;
const RESPAWN_FADE_MS = 150;

// Visual-only twin of the Player body: animation, squash & stretch, particles.
// Never touches the physics body, so hitboxes never change.
export default class PlayerView {
  constructor(scene, player, outfit) {
    this.scene = scene;
    this.player = player;
    this.baseKey = `player_${outfit}`;
    this.key = this.baseKey;
    this.tier = 0;
    this.sprite = scene.add.image(player.x, player.body.bottom, this.key, 'idle0').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.player);
    this.anim = 'idle';
    this.frameTime = 0;
    this.frameIndex = 0;
    this.sx = 1;
    this.sy = 1;
    this.tilt = 0;
    this.fade = 1;
    this.prevGrounded = true;
    this.prevVy = 0;
    this.prevDir = 0;
    this.runDustMs = 0;
    this.dust = scene.add.particles(0, 0, 'dust', {
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      lifespan: 320,
      scale: { start: BASE, end: 0 },
      alpha: { start: 0.7, end: 0 },
      gravityY: 150,
      emitting: false,
    }).setDepth(DEPTH.fx);
    this.paper = scene.add.particles(0, 0, 'paper', {
      speed: { min: 120, max: 260 },
      angle: { min: 200, max: 340 },
      rotate: { min: -180, max: 180 },
      lifespan: 800,
      scale: BASE,
      gravityY: 700,
      emitting: false,
    }).setDepth(DEPTH.fx);
  }

  // burnout tier (docs/BURNOUT.md §6): 1 = eye bags, 2 = darker, hunched and shaking. Visual only.
  setTier(tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.key = tier > 0 ? `${this.baseKey}_t${tier}` : this.baseKey;
    this.sprite.setTexture(this.key, this.frameName());
  }

  setAnim(name) {
    if (this.anim === name) return;
    this.anim = name;
    this.frameTime = 0;
    this.frameIndex = 0;
  }

  frameName() {
    switch (this.anim) {
      case 'idle':
        return `idle${this.frameIndex % 2}`;
      case 'run':
        return `run${this.frameIndex % 4}`;
      default:
        return this.anim;
    }
  }

  onDeath() {
    this.paper.explode(10, this.player.x, this.player.y);
    this.sprite.setTint(0xff4444);
  }

  onRespawn() {
    this.sprite.clearTint();
    this.fade = 0;
    this.sx = 1;
    this.sy = 1;
    this.prevGrounded = true;
    this.prevVy = 0;
  }

  // Called after the physics step; `frozen` = standup / KT call / death freeze.
  update(dt, frozen) {
    const player = this.player;
    const body = player.body;
    this.sprite.setPosition(body.center.x, body.bottom);
    this.sprite.setFlipX(player.flipX);
    if (frozen) {
      if (player.inputLocked && !player.isDead) this.setAnim('freeze');
      this.sprite.setFrame(this.frameName());
      return;
    }

    const grounded = player.grounded;
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    if (player.inputLocked) this.setAnim('freeze');
    else if (!grounded) this.setAnim(vy < 0 ? 'jump' : 'fall');
    else this.setAnim(Math.abs(vx) >= 10 ? 'run' : 'idle');

    const frameMs = this.anim === 'run' ? 70 * (260 / Math.max(120, Math.abs(vx))) : 400;
    this.frameTime += dt;
    if (this.frameTime >= frameMs) {
      this.frameTime -= frameMs;
      this.frameIndex += 1;
    }

    // jump take-off and landing
    if (this.prevGrounded && !grounded && vy < -300) {
      this.sx = 0.85;
      this.sy = 1.18;
      this.dust.explode(4, body.center.x, body.bottom);
    }
    if (!this.prevGrounded && grounded && this.prevVy > 300) {
      this.sx = 1.2;
      this.sy = 0.82;
      this.dust.explode(6, body.center.x, body.bottom);
    }
    const dir = Math.sign(vx);
    if (grounded && dir !== 0 && this.prevDir !== 0 && dir !== this.prevDir) this.tilt = 4 * dir;
    if (grounded && this.anim === 'run') {
      this.runDustMs += dt;
      if (this.runDustMs >= 120) {
        this.runDustMs = 0;
        this.dust.explode(1, body.center.x, body.bottom);
      }
    }

    // at 80%+ burnout, standing still you slump: a little shorter, leaning forward
    const slump = this.tier >= 2 && grounded && this.anim === 'idle';
    const restSy = slump ? 0.95 : 1;
    const restTilt = slump ? (player.flipX ? -4 : 4) : 0;
    const k = 1 - Math.exp(-dt / SQUASH_MS);
    this.sx += (1 - this.sx) * k;
    this.sy += (restSy - this.sy) * k;
    this.tilt += (restTilt - this.tilt) * k;
    this.fade = Math.min(1, this.fade + dt / RESPAWN_FADE_MS);

    this.sprite.setFrame(this.frameName());
    this.sprite.setScale(BASE * this.sx, BASE * this.sy);
    this.sprite.setAngle(this.tilt);
    this.sprite.setAlpha(this.fade);
    // ...and your hands shake (deterministic, after the interpolation)
    if (slump) {
      this.shakeMs = (this.shakeMs ?? 0) + dt;
      this.sprite.x += Math.sin(this.shakeMs / 35) * 0.5;
    }

    this.prevGrounded = grounded;
    this.prevVy = vy;
    if (dir !== 0) this.prevDir = dir;
  }
}
