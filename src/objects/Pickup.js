import { TILE, DEPTH, TEXTURE_SCALE } from '../config/constants.js';

// Coffee: +GU once per level (it does not come back on respawn).
export default class Pickup {
  constructor(scene, tx, ty) {
    this.baseY = (ty + 1) * TILE - 6;
    this.glow = scene.add.image(tx * TILE + 16, this.baseY - 10, 'glow').setTint(0xf59e0b).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects);
    this.sprite = scene.physics.add.staticImage(tx * TILE + 16, this.baseY - 10, 'coffee').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects).refreshBody();
    this.collected = false;
    this.t = 0;
  }

  update(dt) {
    if (this.collected) return;
    this.t += dt;
    const phase = (this.t % 1000) / 1000;
    this.sprite.y = this.baseY - 10 + Math.sin(phase * Math.PI * 2) * 3;
    this.glow.y = this.sprite.y;
    this.glow.setAlpha(0.3 + 0.3 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)));
  }

  collect() {
    if (this.collected) return false;
    this.collected = true;
    this.sprite.disableBody(true, true);
    this.glow.setVisible(false);
    return true;
  }
}
