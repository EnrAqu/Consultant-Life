import BaseTrap from './BaseTrap.js';
import VpnBrain from '../../core/VpnBrain.js';
import { TILE, DEPTH, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';

const CAUSE_WINDOW_MS = 3000;

// IT: a VPN platform (docs/IT_HR_EXTERNAL.md §2.2), level 3 slot with cause `it`. Fixed cycle on the level clock
// (connected 2 s, disconnected 1.2 s, phase per platform); three dots go out in the last 600 ms. Disconnected it has no
// body. One-way (solid from above only), so reconnecting never pushes the player. Pivoted ("split tunneling"): always on.
export default class VpnPlatform extends BaseTrap {
  static type = 'vpn';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.brain = new VpnBrain({ onMs: p.onMs, offMs: p.offMs, phaseMs: p.phaseMs }, this.pivoted);
    this.plat = this.addPlatform(this.tx, this.ty, p.width, 1, 'vpnTile');
    const b = this.plat.body;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    b.checkCollision.down = false;
    const style = (size, color) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION * 2, backgroundColor: '#0f172a', padding: { x: 3, y: 1 } });
    this.label = scene.add.text((this.tx + p.width / 2) * TILE, (this.ty + 1) * TILE + 3, '', style(9, '#4ade80')).setOrigin(0.5, 0).setDepth(DEPTH.traps + 1);
    if (p.pitRect) {
      const r = p.pitRect;
      const zone = scene.add.zone((this.tx + r.dx) * TILE + (r.w * TILE) / 2, (this.ty + r.dy) * TILE + (r.h * TILE) / 2, r.w * TILE, r.h * TILE);
      scene.physics.add.existing(zone, true);
      this.killZones.push({ zone, check: () => (this.clock - this.offAt <= CAUSE_WINDOW_MS ? 'it' : null) });
    }
    // the cycle runs on the level clock (not reset on respawn): it is the same rhythm every life
    this.clock = 0;
    this.offAt = -Infinity;
    this.on = null;
    this.apply();
  }

  apply() {
    const on = this.brain.isOn(this.clock);
    if (on !== this.on) {
      // the death is IT's only if it dropped you (review IT_HR #3)
      if (this.on && !on && this.riding()) this.offAt = this.clock;
      this.on = on;
      this.plat.body.enable = on;
      this.plat.setAlpha(on ? 1 : 0.25);
    }
    const dots = this.brain.dots(this.clock);
    const text = this.pivoted ? 'VPN ● split tunneling' : on ? `VPN ${'●'.repeat(dots)}${'○'.repeat(3 - dots)}` : 'VPN disconnessa';
    if (this.label.text !== text) this.label.setText(text).setColor(on ? '#4ade80' : '#f87171');
  }

  riding() {
    const pb = this.scene.player?.body;
    const b = this.plat.body;
    return Boolean(pb && Math.abs(pb.bottom - b.top) <= 3 && pb.right > b.left && pb.left < b.right);
  }

  update(dt) {
    this.clock += dt;
    this.apply();
  }
}
