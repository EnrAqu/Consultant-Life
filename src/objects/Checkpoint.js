import { TILE, DEPTH } from '../config/constants.js';

export default class Checkpoint {
  constructor(scene, { id, x, y }) {
    this.id = id;
    this.spawn = { x: x * TILE + 16, y: (y + 1) * TILE - 16 };
    this.sprite = scene.physics.add.staticImage(x * TILE + 16, (y + 1) * TILE - 20, 'checkpoint').setDepth(DEPTH.objects);
    this.active = false;
  }

  activate() {
    if (this.active) return false;
    this.active = true;
    this.sprite.setTexture('checkpointOn');
    return true;
  }
}
