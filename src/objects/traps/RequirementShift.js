import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';

const CAUSE_WINDOW_MS = 3000;
const CAPTION_MS = 2500;
const CAPTION = 'Il cliente ha cambiato il requisito, è un problema?';

// The client's prank (level 1, user 2026-11-02): the landing platform moves while you are in the air.
// Normal: a jump taken off from takeoffPx (centre x, rightwards) slides it by `shift` columns (fixed direction per
// platform, negative = back towards you) at `speed` columns/s, once, until respawn. Tell: the movement itself and the
// caption, both visible mid-jump; a short hop or an air brake still lands on it. No pivoted mode.
// camouflage (user, 2026-11-02): it looks like the floor (top tile + fill down to the bottom of the map) until it moves.
// The validator sees it at its final position (trapSurfaces), where it is when you land.
export default class RequirementShift extends BaseTrap {
  static type = 'requirementShift';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.homeX = this.tx * TILE;
    this.targetX = (this.tx + p.shift) * TILE;
    this.y = this.ty * TILE;
    if (p.camouflage) {
      this.plat = this.addPlatform(this.tx, this.ty, p.width, 1, 'tilesHD', true, 'top');
      const rows = scene.def.map.length - this.ty - 1;
      this.fill = rows > 0 ? this.addPlatform(this.tx, this.ty + 1, p.width, rows, 'tilesHD', true, 'solid') : null;
    } else {
      this.plat = this.addPlatform(this.tx, this.ty, p.width, 1, 'reqPlatform');
      this.fill = null;
    }
    this.caption = scene.add
      .text(0, 0, CAPTION, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '12px', color: '#facc15', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.traps)
      .setVisible(false);
    if (p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone((this.tx + r.dx) * TILE + (r.w * TILE) / 2, (this.ty + r.dy) * TILE + (r.h * TILE) / 2, r.w * TILE, r.h * TILE);
      scene.physics.add.existing(zone, true);
      this.killZones.push({ zone, check: () => (this.state !== 'idle' && this.clock - this.movedAt <= CAUSE_WINDOW_MS ? 'requirementChange' : null) });
    }
    this.clock = 0;
    this.reset();
  }

  setX(x) {
    this.x = x;
    this.plat.body.reset(x, this.y);
    this.fill?.body.reset(x, this.y + TILE);
    this.caption.setPosition(x + (this.p.width * TILE) / 2, this.y - 40);
  }

  reset() {
    this.state = 'idle';
    this.movedAt = -Infinity;
    this.captionMs = 0;
    this.caption.setVisible(false);
    this.setX(this.homeX);
    this.seenJumps = this.scene.player?.jumpCount ?? 0;
  }

  update(dt) {
    this.clock += dt;
    const player = this.scene.player;
    if (player && player.jumpCount !== this.seenJumps) {
      this.seenJumps = player.jumpCount;
      const j = player.lastJump;
      const [from, to] = this.p.takeoffPx;
      if (this.state === 'idle' && j && j.x >= from && j.x < to && player.body.velocity.x > 0) {
        this.state = 'moving';
        this.movedAt = this.clock;
        this.captionMs = CAPTION_MS;
        this.caption.setVisible(true);
      }
    }
    if (this.state === 'moving') {
      const dir = Math.sign(this.targetX - this.homeX);
      const next = this.x + dir * this.p.speed * TILE * (dt / 1000);
      if ((dir > 0 && next >= this.targetX) || (dir < 0 && next <= this.targetX) || dir === 0) {
        this.setX(this.targetX);
        this.state = 'done';
      } else {
        this.setX(next);
      }
    }
    if (this.captionMs > 0) {
      this.captionMs -= dt;
      if (this.captionMs <= 0) this.caption.setVisible(false);
    }
  }
}
