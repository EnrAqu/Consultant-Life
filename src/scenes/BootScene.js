import Phaser from 'phaser';
import { generateAll } from '../gfx/TextureFactory.js';
import { DEBUG } from '../config/debug.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    generateAll(this);
    // UIScene first, so its listeners exist before GameScene emits the initial state.
    this.scene.launch('UIScene');
    if (DEBUG.ending) {
      // debug: straight to an ending screen
      this.scene.start('EndingScene', { ending: DEBUG.ending, levelId: 'level5', run: { deaths: 0, timeMs: 0 }, gu: 15, guMax: 15 });
      return;
    }
    this.scene.start('GameScene', { levelId: DEBUG.level ?? 'level1', pivotCause: DEBUG.pivot });
  }
}
