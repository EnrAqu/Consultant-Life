import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, COLORS, TEXT_RESOLUTION, TEXTURE_SCALE, UI_FONT } from '../../config/constants.js';

const CONTACT_WINDOW_MS = 2000;

// Normal: standing on the trigger arms the post-it block, which then extends and pushes you into the pit.
// Tell: dashed outline of the final size, "CR #47" note, vibration while arming.
// Pivoted: the block extends over the pit as a bridge (green outline).
export default class ScopeCreepPlatform extends BaseTrap {
  static type = 'scopeCreep';

  build() {
    const p = this.p;
    const scene = this.scene;
    this.dir = p.direction === 'left' ? -1 : 1;
    this.row = this.ty + (p.dy ?? 0);
    this.rootCol = this.tx;
    this.y = this.row * TILE;
    this.startHeadCol = this.rootCol + this.dir * (p.baseLength - 1);
    this.endHeadCol = this.rootCol + this.dir * (p.maxLength - 1);

    const left = Math.min(this.rootCol, this.endHeadCol) * TILE;
    const outline = scene.add.graphics().setDepth(DEPTH.traps - 1);
    outline.lineStyle(2, this.pivoted ? COLORS.green : COLORS.postit, this.pivoted ? 0.5 : 0.25);
    const w = p.maxLength * TILE;
    for (let x = 0; x < w; x += 12) {
      outline.lineBetween(left + x, this.y, left + Math.min(x + 6, w), this.y);
      outline.lineBetween(left + x, this.y + TILE, left + Math.min(x + 6, w), this.y + TILE);
    }
    outline.lineBetween(left, this.y, left, this.y + TILE).lineBetween(left + w, this.y, left + w, this.y + TILE);

    if (!this.pivoted) {
      scene.add
        .text(this.rootCol * TILE + 16, this.y - 14, 'CR #47', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '12px', color: '#facc15', resolution: TEXT_RESOLUTION * 2 })
        .setOrigin(0.5)
        .setDepth(DEPTH.traps);
    }

    this.trail = this.addPlatform(this.rootCol, this.row, 1, 1, 'scopeBlock');
    this.head = scene.physics.add.image(0, 0, 'scopeBlock').setOrigin(0, 0).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.traps);
    this.head.body.setAllowGravity(false);
    this.head.body.setImmovable(true);
    this.solids.push(this.head);

    const triggerTop = this.row - 2;
    this.addTrigger(p.triggerDx, p.triggerWidth, triggerTop, this.row + (this.pivoted ? 0 : 0));

    if (!this.pivoted && p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone(
        (this.tx + r.dx) * TILE + (r.w * TILE) / 2,
        (this.ty + r.dy) * TILE + (r.h * TILE) / 2,
        r.w * TILE,
        r.h * TILE,
      );
      scene.physics.add.existing(zone, true);
      this.killZones.push({
        zone,
        check: () => (scene.time.now - this.lastContactAt <= CONTACT_WINDOW_MS ? 'scopeCreep' : null),
      });
    }
    this.reset();
  }

  setHead(col) {
    this.head.body.reset(col * TILE, this.y);
    this.head.body.setVelocity(0, 0);
    this.updateTrail();
  }

  updateTrail() {
    const headLeft = this.head.x;
    const rootLeft = this.rootCol * TILE;
    const from = this.dir > 0 ? rootLeft : headLeft + TILE;
    const to = this.dir > 0 ? headLeft : rootLeft + TILE;
    const width = Math.max(0, to - from);
    this.trail.setVisible(width > 0);
    this.trail.body.enable = width > 0;
    if (width > 0) {
      this.trail.setPosition(from, this.y);
      this.trail.setSize(width, TILE);
      this.trail.body.setSize(width, TILE);
      this.trail.body.reset(from, this.y);
    }
  }

  reset() {
    this.state = 'idle';
    this.armedMs = 0;
    this.playerOnTrigger = false;
    this.lastContactAt = -Infinity;
    this.forceArm = false;
    this.setHead(this.startHeadCol);
  }

  onTrigger() {
    this.playerOnTrigger = true;
  }

  delegateTarget() {
    if (this.state !== 'idle' || this.pivoted) return null;
    return { x: (this.tx + this.p.triggerDx + 1) * TILE + 16, kind: 'scopeCreep' };
  }

  // The junior stands on the trigger: the CR fires right away and pushes them off.
  onDelegate() {
    this.armedMs = this.p.armDelayMs;
    this.state = 'idle';
    this.playerOnTrigger = false;
    this.forceArm = true;
    return {};
  }

  onSolidContact() {
    this.lastContactAt = this.scene.time.now;
  }

  update(dt) {
    const p = this.p;
    if (this.state === 'idle') {
      if ((this.playerOnTrigger && this.scene.player.grounded) || this.forceArm) this.armedMs += dt;
      if (this.armedMs > 0) {
        const jitter = Math.floor(this.armedMs / 50) % 2 === 0 ? 1 : -1;
        this.head.body.reset(this.startHeadCol * TILE + jitter, this.y);
      }
      if (this.armedMs >= p.armDelayMs) {
        this.state = 'extending';
        this.head.body.reset(this.startHeadCol * TILE, this.y);
        this.head.body.setVelocityX(this.dir * p.extendSpeed * TILE);
      }
    } else if (this.state === 'extending') {
      const target = this.endHeadCol * TILE;
      if ((this.dir > 0 && this.head.x >= target) || (this.dir < 0 && this.head.x <= target)) {
        this.setHead(this.endHeadCol);
        this.state = 'done';
      } else {
        this.updateTrail();
      }
    }
    this.playerOnTrigger = false;
  }
}
