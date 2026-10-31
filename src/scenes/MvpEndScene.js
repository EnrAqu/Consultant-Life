import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { formatDuration, formatGu } from '../core/format.js';
import { stats } from '../state.js';

const style = (size, color = '#e5e7eb') => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, align: 'center', resolution: TEXT_RESOLUTION, wordWrap: { width: 820 } });

export default class MvpEndScene extends Phaser.Scene {
  constructor() {
    super('MvpEndScene');
  }

  create({ run, gu, guMax }) {
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 110, 'Progetto consegnato.', style(40, '#22c55e')).setOrigin(0.5);
    this.add.text(cx, 170, 'Fine della demo. Il cliente chiederà di rifare tutto da capo.', style(18)).setOrigin(0.5);
    this.add
      .text(
        cx,
        260,
        `Progetto 2 — morti: ${run.deaths}   tempo: ${formatDuration(run.timeMs)}   GU residue: ${formatGu(gu)} / ${guMax}\n` +
          `Ore non fatturabili (totale): ${stats.getPersistent().totalDeaths}`,
        style(16),
      )
      .setOrigin(0.5);
    const prompt = this.add.text(cx, GAME_HEIGHT - 120, '', style(20, '#fbbf24')).setOrigin(0.5);
    this.time.delayedCall(1000, () => {
      prompt.setText('Premi Spazio per ricominciare dal Progetto 1');
      this.input.keyboard.once('keydown-SPACE', () => fadeTo(this, 'GameScene', { levelId: 'level1', pivotCause: null }));
    });
  }
}
