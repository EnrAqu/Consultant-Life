import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, COLORS } from './config/constants.js';
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
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: DEBUG.debug } },
  scene: [BootScene, GameScene, UIScene, LessonsLearnedScene, BudgetOverScene, MvpEndScene],
});

// Exposed only in debug mode, for automated smoke tests.
if (DEBUG.debug) globalThis.__game = game;
