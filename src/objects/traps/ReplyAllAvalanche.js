import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXT_RESOLUTION, TEXTURE_SCALE, UI_FONT } from '../../config/constants.js';
import { EMAIL_KEYS } from '../../gfx/TextureFactory.js';

const BASE = 1 / TEXTURE_SCALE;
const DEBRIS_MS = 600;
const SHAKE_GAP_MS = 100;

// Normal: entering the trigger drops "reply all" emails along the corridor, timed on a running player.
// Tell: inbox counter pops up first, a growing shadow marks each landing spot.
// Pivoted: green-bordered emails pile up into a 1/2/3 stair, then vanish after stayMs.
// landing: 'solid' (normal mode): lethal while falling, then they stay as a bridge until respawn.
export default class ReplyAllAvalanche extends BaseTrap {
  static type = 'replyAll';

  build() {
    const p = this.p;
    const scene = this.scene;
    this.floorY = (p.restRow + 1) * TILE;
    this.spawnY = this.floorY - p.spawnHeight * TILE;
    this.fallMs = (p.spawnHeight / p.fallSpeed) * 1000;
    this.solidLanding = this.pivoted || p.landing === 'solid';

    const badgeX = (this.tx + p.triggerDx) * TILE + 16;
    const badgeY = (p.restRow - 4) * TILE;
    this.badge = scene.add.image(badgeX, badgeY, 'inboxBadge').setScale(BASE).setDepth(DEPTH.traps);
    this.badgeText = scene.add
      .text(badgeX + 12, badgeY - 7, '0', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '10px', color: '#ffffff', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5)
      .setDepth(DEPTH.traps + 1);
    if (p.landing === 'solid') {
      scene.add
        .text(badgeX, badgeY + 14, 'ESCALATION', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '8px', color: '#fca5a5', resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.traps + 1);
    }

    this.addTrigger(p.triggerDx, p.triggerWidth);

    const heights = {};
    this.emails = [];
    for (let i = 0; i < p.count; i++) {
      const dx = p.columns[i % p.columns.length];
      const stackIndex = heights[dx] ?? 0;
      heights[dx] = stackIndex + 1;
      const x = (this.tx + dx) * TILE + 16;
      const email = this.objectGroup.create(x, this.spawnY, this.pivoted ? 'emailGreen' : EMAIL_KEYS[i % EMAIL_KEYS.length]);
      email.setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.traps);
      email.setData({ state: 'idle', lethal: !this.pivoted, targetBottom: this.floorY - (this.solidLanding ? stackIndex * 16 : 0) });
      const shadow = scene.add.image(x, this.floorY - 2, 'emailShadow').setScale(BASE).setDepth(DEPTH.objects).setVisible(false);
      this.emails.push({ email, shadow, landedAt: 0, spawnedAt: 0 });
    }
    this.reset();
  }

  reset() {
    this.armed = true;
    this.active = false;
    this.elapsed = 0;
    this.spawned = 0;
    this.stayTimer = 0;
    this.pop = 0;
    this.lastShakeAt = -Infinity;
    this.badgeText.setText('0').setColor('#ffffff');
    this.badge.setScale(BASE);
    this.bridgeSaid = false;
    for (const e of this.emails) {
      e.email.disableBody(true, true);
      e.email.setData('state', 'idle').setAlpha(1).setAngle(0).setScale(BASE);
      this.setHitbox(e.email, this.pivoted ? 'solid' : 'lethal');
      e.shadow.setVisible(false);
    }
  }

  // Body sizes/offsets are in texture pixels (scaled by the sprite scale); bottom-aligned with the card.
  setHitbox(email, kind) {
    const [w, h] = kind === 'solid' ? [32, 16] : [36, 20];
    const fw = email.frame.realWidth;
    const fh = email.frame.realHeight;
    email.body.setSize(w * TEXTURE_SCALE, h * TEXTURE_SCALE, false);
    email.body.setOffset((fw - w * TEXTURE_SCALE) / 2, fh - h * TEXTURE_SCALE);
  }

  onTrigger() {
    if (!this.armed) return;
    this.armed = false;
    this.active = true;
    this.elapsed = 0;
    this.spawned = 0;
    if (this.scene.debugMode) this.logImpacts();
  }

  dangerCols() {
    if (this.pivoted) return null;
    const cols = this.p.columns;
    return [this.tx + Math.min(...cols) - 1, this.tx + Math.max(...cols) + 1];
  }

  delegateTarget() {
    if (!this.armed || this.pivoted) return null;
    return { x: (this.tx + this.p.triggerDx + 1) * TILE, kind: 'replyAll' };
  }

  onDelegate() {
    this.onTrigger();
    return {};
  }

  logImpacts() {
    const p = this.p;
    const lines = this.emails.map((_, i) => `col ${p.columns[i % p.columns.length]}: ${Math.round(p.startDelayMs + i * p.intervalMs + this.fallMs)}ms`);
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
      if (this.spawned >= 5) this.badgeText.setColor('#fecaca');
      this.pop = 1;
    }
    this.pop = Math.max(0, this.pop - dt / 120);
    this.badge.setScale(BASE * (1 + 0.3 * this.pop));

    let allDone = this.spawned === this.emails.length;
    for (const e of this.emails) {
      const { email } = e;
      const state = email.getData('state');
      if (state === 'falling') {
        const progress = Math.min(1, (this.elapsed - e.spawnedAt) / this.fallMs);
        e.shadow.setScale(BASE * (0.4 + 0.6 * progress));
        if (!this.pivoted) email.setAngle(8 * Math.sin((this.elapsed - e.spawnedAt) / 90));
      }
      if (state === 'falling' && email.y >= email.getData('targetBottom')) {
        email.body.reset(email.x, email.getData('targetBottom'));
        email.setAngle(0);
        // squash only lethal debris: solid emails must keep their body size
        if (!this.solidLanding) email.setScale(BASE, BASE * 0.8);
        if (this.solidLanding && !this.pivoted) this.setHitbox(email, 'solid');
        e.shadow.setVisible(false);
        e.landedAt = this.elapsed;
        if (this.elapsed - this.lastShakeAt >= SHAKE_GAP_MS) {
          this.scene.cameras.main.shake(40, 0.002);
          this.lastShakeAt = this.elapsed;
        }
        email.setData('state', this.solidLanding ? 'settling' : 'gone');
        if (this.solidLanding) email.setData('lethal', false);
      }
      const since = this.elapsed - e.landedAt;
      const s = email.getData('state');
      if (s === 'gone') email.setScale(BASE, BASE * Math.min(1, 0.8 + since / 500));
      if (s === 'settling' && !this.scene.physics.overlap(this.scene.player, email)) {
        email.setData('state', 'landed');
      }
      if (s === 'gone' && email.visible) {
        email.setAlpha(Math.max(0, 1 - Math.max(0, since - DEBRIS_MS / 2) / (DEBRIS_MS / 2)));
        if (since >= DEBRIS_MS) email.disableBody(true, true);
      }
      if (s === 'falling' || s === 'settling' || s === 'idle') allDone = false;
    }

    if (allDone && this.solidLanding && !this.pivoted && !this.bridgeSaid) {
      this.bridgeSaid = true;
      this.scene.narrate('emailBridge');
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
    if (!this.pivoted) this.setHitbox(email, 'lethal');
    email.setData('state', 'falling').setData('lethal', !this.pivoted);
    email.body.setVelocityY(this.p.fallSpeed * TILE);
    e.spawnedAt = this.elapsed;
    shadow.setVisible(true).setScale(BASE * 0.4);
  }
}
