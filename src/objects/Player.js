import Phaser from 'phaser';
import { PLAYER } from '../config/constants.js';

const approach = (value, target, step) => (value < target ? Math.min(value + step, target) : Math.max(value - step, target));

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'playerBody');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Physics only: the visible character is PlayerView.
    this.setVisible(false);
    this.body.setSize(PLAYER.bodyWidth, PLAYER.bodyHeight);
    this.body.setOffset((PLAYER.width - PLAYER.bodyWidth) / 2, PLAYER.height - PLAYER.bodyHeight);
    this.body.setMaxVelocityY(PLAYER.maxFallSpeed);
    this.setCollideWorldBounds(true);
    this.isDead = false;
    this.inputLocked = false;
    this.resetTimers();
  }

  resetTimers() {
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpCutApplied = true;
  }

  get grounded() {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(dt, input) {
    const body = this.body;
    const ctl = this.inputLocked ? { left: false, right: false, jumpPressed: false, jumpHeld: false } : input;
    const grounded = this.grounded;

    this.coyoteTimer = grounded ? PLAYER.coyoteTimeMs : this.coyoteTimer - dt;
    this.jumpBufferTimer = ctl.jumpPressed ? PLAYER.jumpBufferMs : this.jumpBufferTimer - dt;

    const dir = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0);
    const s = dt / 1000;
    let vx = body.velocity.x;
    if (dir !== 0) {
      let accel = grounded ? PLAYER.groundAccel : PLAYER.airAccel;
      if (vx !== 0 && Math.sign(vx) !== dir) accel *= PLAYER.turnMultiplier;
      vx = approach(vx, dir * PLAYER.maxRunSpeed, accel * s);
      this.setFlipX(dir < 0);
    } else {
      vx = approach(vx, 0, (grounded ? PLAYER.groundDecel : PLAYER.airDecel) * s);
    }
    body.setVelocityX(vx);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCutApplied = false;
    }
    if (!ctl.jumpHeld && body.velocity.y < 0 && !this.jumpCutApplied) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCutApplied = true;
    }
    body.setGravityY(body.velocity.y > 0 ? PLAYER.fallGravityExtra : 0);
  }

  lockInput(locked) {
    this.inputLocked = locked;
  }

  // Used by the standup and the KT call: stop dead, fall from still afterwards.
  stopMotion() {
    this.body.setVelocity(0, 0);
    this.resetTimers();
  }

  respawnAt(x, y) {
    this.body.reset(x, y);
    this.body.setAllowGravity(true);
    this.setFlipX(false);
    this.isDead = false;
    this.inputLocked = false;
    this.resetTimers();
  }
}
