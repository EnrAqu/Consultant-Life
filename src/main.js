import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PHYSICS_FPS } from './config/constants.js';
import { DEBUG } from './config/debug.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import LessonsLearnedScene from './scenes/LessonsLearnedScene.js';
import BudgetOverScene from './scenes/BudgetOverScene.js';
import MvpEndScene from './scenes/MvpEndScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, fps: PHYSICS_FPS, debug: DEBUG.debug } },
  scene: [BootScene, GameScene, UIScene, LessonsLearnedScene, BudgetOverScene, MvpEndScene],
});

// Exposed only in debug mode, for automated smoke tests.
if (DEBUG.debug) globalThis.__game = game;
