import { TILE, DEPTH, TEXTURE_SCALE } from '../config/constants.js';

// Business Development (ITERATION_5 §5): an opportunity for the pipeline. Collected once per level,
// it stays collected after a death.
export default class Deal {
  constructor(scene, tx, ty) {
    this.baseY = (ty + 1) * TILE - 16;
    this.glow = scene.add.image(tx * TILE + 16, this.baseY, 'glow').setTint(0xfbbf24).setScale(1.4 / TEXTURE_SCALE).setDepth(DEPTH.objects);
    this.sprite = scene.physics.add.staticImage(tx * TILE + 16, this.baseY, 'deal').setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.objects).refreshBody();
    this.collected = false;
    this.t = 0;
  }

  update(dt) {
    if (this.collected) return;
    this.t += dt;
    const phase = (this.t % 1400) / 1400;
    this.sprite.y = this.baseY + Math.sin(phase * Math.PI * 2) * 3;
    this.glow.y = this.sprite.y;
    this.glow.setAlpha(0.35 + 0.3 * Math.sin(phase * Math.PI * 2));
  }

  collect() {
    if (this.collected) return false;
    this.collected = true;
    this.sprite.disableBody(true, true);
    this.glow.setVisible(false);
    return true;
  }
}
