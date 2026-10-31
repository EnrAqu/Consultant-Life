import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXT_RESOLUTION } from '../../config/constants.js';

// Normal: entering the trigger drops "reply all" emails along the corridor, timed on a running player.
// Tell: inbox counter goes up first, a shadow marks each landing spot.
// Pivoted: green-bordered emails pile up into a 1/2/3 stair, then vanish after stayMs.
export default class ReplyAllAvalanche extends BaseTrap {
  static type = 'replyAll';

  build() {
    const p = this.p;
    const scene = this.scene;
    this.floorY = (p.restRow + 1) * TILE;
    this.spawnY = this.floorY - p.spawnHeight * TILE;

    const badgeX = (this.tx + p.triggerDx) * TILE + 16;
    const badgeY = (p.restRow - 4) * TILE;
    scene.add.image(badgeX, badgeY, 'inboxBadge').setDepth(DEPTH.traps);
    this.badgeText = scene.add
      .text(badgeX + 10, badgeY - 12, '0', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', resolution: TEXT_RESOLUTION })
      .setOrigin(0.5)
      .setDepth(DEPTH.traps + 1);

    this.addTrigger(p.triggerDx, p.triggerWidth);

    const heights = {};
    this.emails = [];
    for (let i = 0; i < p.count; i++) {
      const dx = p.columns[i % p.columns.length];
      const stackIndex = heights[dx] ?? 0;
      heights[dx] = stackIndex + 1;
      const x = (this.tx + dx) * TILE + 16;
      const email = this.objectGroup.create(x, this.spawnY, this.pivoted ? 'emailGreen' : 'email');
      email.setOrigin(0.5, 1).setDepth(DEPTH.traps);
      if (this.pivoted) {
        email.setDisplaySize(32, 16);
        email.body.setSize(email.width, email.height);
      } else {
        email.body.setSize(20, 12);
      }
      email.setData({ state: 'idle', lethal: !this.pivoted, targetBottom: this.floorY - (this.pivoted ? stackIndex * 16 : 0) });
      const shadow = scene.add.image(x, this.floorY - 2, 'emailShadow').setDepth(DEPTH.objects).setVisible(false);
      this.emails.push({ email, shadow, goneAt: 0 });
    }
    this.reset();
  }

  reset() {
    this.armed = true;
    this.active = false;
    this.elapsed = 0;
    this.spawned = 0;
    this.stayTimer = 0;
    this.badgeText.setText('0');
    for (const e of this.emails) {
      e.email.disableBody(true, true);
      e.email.setData('state', 'idle').setAlpha(1);
      e.shadow.setVisible(false);
    }
  }

  onTrigger() {
    if (!this.armed) return;
    this.armed = false;
    this.active = true;
    this.elapsed = 0;
    this.spawned = 0;
    if (this.scene.debugMode) this.logImpacts();
  }

  logImpacts() {
    const p = this.p;
    const fallMs = (p.spawnHeight / p.fallSpeed) * 1000;
    const lines = this.emails.map((_, i) => `col ${p.columns[i % p.columns.length]}: ${Math.round(p.startDelayMs + i * p.intervalMs + fallMs)}ms`);
    console.log(`[${this.def.id}] t_impatto`, lines.join(', '));
  }

  update(dt) {
    if (!this.active) return;
    const p = this.p;
    this.elapsed += dt;
    while (this.spawned < this.emails.length && this.elapsed >= p.startDelayMs + this.spawned * p.intervalMs) {
      this.spawn(this.emails[this.spawned]);
      this.spawned += 1;
      this.badgeText.setText(String(this.spawned));
    }

    let allDone = this.spawned === this.emails.length;
    for (const e of this.emails) {
      const { email } = e;
      const state = email.getData('state');
      if (state === 'falling' && email.y >= email.getData('targetBottom')) {
        email.body.reset(email.x, email.getData('targetBottom'));
        e.shadow.setVisible(false);
        if (this.pivoted) {
          email.setData('state', 'settling');
        } else {
          email.setData('state', 'gone');
          e.goneAt = this.elapsed + 150;
        }
      }
      if (email.getData('state') === 'settling' && !this.scene.physics.overlap(this.scene.player, email)) {
        email.setData('state', 'landed');
      }
      if (email.getData('state') === 'gone' && email.visible && this.elapsed >= e.goneAt) {
        email.disableBody(true, true);
      }
      const s = email.getData('state');
      if (s === 'falling' || s === 'settling' || s === 'idle') allDone = false;
    }

    if (this.pivoted && allDone) {
      this.stayTimer += dt;
      const left = p.stayMs - this.stayTimer;
      const blink = left < 600 && Math.floor(left / 100) % 2 === 0;
      for (const e of this.emails) e.email.setAlpha(blink ? 0.3 : 1);
      if (left <= 0) this.reset();
    }
  }

  spawn(e) {
    const { email, shadow } = e;
    email.enableBody(true, email.x, this.spawnY, true, true);
    email.setData('state', 'falling');
    email.body.setVelocityY(this.p.fallSpeed * TILE);
    shadow.setVisible(true);
  }
}
