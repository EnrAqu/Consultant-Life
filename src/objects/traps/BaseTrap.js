import { TILE, DEPTH } from '../../config/constants.js';

/**
 * Common contract (plan §4.5 + §14.1):
 * - `objectGroup`: stable arcade group for pooled objects that switch role.
 *   Each object carries data `state` ('idle' | 'falling' | 'landed' | ...) and `lethal`.
 *   GameScene collides with objects in state 'landed' and kills on 'falling' + lethal.
 * - `solids`: fixed array of extra solid game objects (created in build()).
 * - `triggers`: fixed array of static-body zones; overlap calls onTrigger(player).
 * - `killZones`: fixed array of { zone, check() } where check() returns a cause or null.
 * - Timing only through update(dtMs); never Math.random, tweens or delayedCall.
 */
export default class BaseTrap {
  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.p = def.params;
    this.tx = def.x;
    this.ty = def.y;
    this.objectGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.solids = [];
    this.triggers = [];
    this.killZones = [];
  }

  get type() {
    return this.constructor.type;
  }

  get pivoted() {
    return this.mode === 'pivoted';
  }

  // Zone in tile units relative to the entity: columns [dx, dx + w), rows [rowTop, rowBottom].
  addTrigger(dx, w, rowTop = 2, rowBottom = 16) {
    const x = (this.tx + dx) * TILE;
    const y = rowTop * TILE;
    const zone = this.scene.add.zone(x + (w * TILE) / 2, y + ((rowBottom - rowTop + 1) * TILE) / 2, w * TILE, (rowBottom - rowTop + 1) * TILE);
    this.scene.physics.add.existing(zone, true);
    this.triggers.push(zone);
    return zone;
  }

  addPlatform(col, row, w, h, key, visible = true) {
    const ts = this.scene.add.tileSprite(col * TILE, row * TILE, w * TILE, h * TILE, key).setOrigin(0, 0).setDepth(DEPTH.traps);
    this.scene.physics.add.existing(ts);
    ts.body.setAllowGravity(false);
    ts.body.setImmovable(true);
    ts.setVisible(visible);
    ts.body.enable = visible;
    this.solids.push(ts);
    return ts;
  }

  build() {}
  update() {}
  reset() {}
  onTrigger() {}
  onSolidContact() {}
  cancelCall() {}
}
