import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, PLAYER, TEXT_RESOLUTION, TEXTURE_SCALE, UI_FONT } from '../../config/constants.js';

const CONTACT_WINDOW_MS = 2000;
const GAP_ABOVE_HEAD = 12;
const POP_MS = 120;
const LABEL = 'Il Cliente: E chi è mo questo?';

// The client's prank (level 1, user 2026-11-02): "Il Cliente: E chi è mo questo?".
// Normal: invisible and bodiless, with NO tell (registered exception to "crudele ma giusto": deterministic, always here).
// A jump taken off from takeoffPx (centre x, coyote jumps included) makes a mail block appear right above your head,
// in the jump's own frame and at a fixed height over the take-off floor (frame-rate independent): you bonk and fall.
// It stays until respawn and fires once. No pivoted mode.
export default class HiddenMail extends BaseTrap {
  static type = 'hiddenMail';

  build() {
    const scene = this.scene;
    const p = this.p;
    // the solid: full size, still, invisible; the "pop" is a bodiless image on top
    this.solid = this.addPlatform(this.tx, this.ty, 1, 1, 'mailBlock', false);
    this.view = scene.add.image(0, 0, 'mailBlock').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.traps).setVisible(false);
    this.label = scene.add
      .text(0, 0, LABEL, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '12px', color: '#facc15', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.traps)
      .setVisible(false);
    if (p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone((this.tx + r.dx) * TILE + (r.w * TILE) / 2, (this.ty + r.dy) * TILE + (r.h * TILE) / 2, r.w * TILE, r.h * TILE);
      scene.physics.add.existing(zone, true);
      this.killZones.push({ zone, check: () => (this.shown && this.clock - this.lastContactAt <= CONTACT_WINDOW_MS ? 'hiddenClient' : null) });
    }
    this.clock = 0;
    this.reset();
  }

  reset() {
    this.shown = false;
    this.popMs = 0;
    this.lastContactAt = -Infinity;
    this.solid.body.enable = false;
    this.view.setVisible(false);
    this.label.setVisible(false);
    this.seenJumps = this.scene.player?.jumpCount ?? 0;
  }

  onSolidContact() {
    this.lastContactAt = this.clock;
  }

  show(jump) {
    const left = jump.x - TILE / 2;
    const top = jump.bottom - PLAYER.bodyHeight - GAP_ABOVE_HEAD - TILE;
    this.shown = true;
    this.popMs = 0;
    this.solid.body.enable = true;
    this.solid.body.reset(left, top);
    this.view.setPosition(left + TILE / 2, top + TILE / 2).setScale(0.6 / TEXTURE_SCALE).setVisible(true);
    this.label.setPosition(left + TILE / 2, top - 4).setVisible(true);
    this.scene.cameras.main.shake(80, 0.003);
  }

  update(dt) {
    this.clock += dt;
    const player = this.scene.player;
    if (player && player.jumpCount !== this.seenJumps) {
      this.seenJumps = player.jumpCount;
      const j = player.lastJump;
      const [from, to] = this.p.takeoffPx;
      if (!this.shown && j && j.x >= from && j.x < to && player.body.velocity.x >= 0) this.show(j);
    }
    if (this.shown && this.popMs < POP_MS) {
      this.popMs = Math.min(POP_MS, this.popMs + dt);
      this.view.setScale((0.6 + 0.4 * (this.popMs / POP_MS)) / TEXTURE_SCALE);
    }
  }
}
