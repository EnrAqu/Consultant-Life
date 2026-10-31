import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { formatDuration, formatGu } from '../core/format.js';
import { stats, leaderboard } from '../state.js';
import { LEVEL_ORDER, projectNumber } from '../levels/index.js';

const style = (size, color = '#e5e7eb', align = 'center') => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, align, resolution: TEXT_RESOLUTION, wordWrap: { width: 820 } });

export default class MvpEndScene extends Phaser.Scene {
  constructor() {
    super('MvpEndScene');
  }

  create({ levelId, run, gu, guMax }) {
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 56, 'Progetto consegnato.', style(36, '#22c55e')).setOrigin(0.5);
    this.add.text(cx, 100, 'Fine della demo. Il cliente chiederà di rifare tutto da capo.', style(16)).setOrigin(0.5);
    this.add
      .text(
        cx,
        140,
        `Progetto ${projectNumber(levelId)} — morti: ${run.deaths}   tempo: ${formatDuration(run.timeMs)}   GU residue: ${formatGu(gu)} / ${guMax}   ` +
          `Ore non fatturabili (totale): ${stats.getPersistent().totalDeaths}`,
        style(14, '#9ca3af'),
      )
      .setOrigin(0.5);

    // Leaderboard: best times and Hall of Shame, per project
    const colX = [cx - 220, cx + 220];
    this.add.text(colX[0], 180, 'I tuoi tempi migliori', style(18, '#fbbf24')).setOrigin(0.5, 0);
    this.add.text(colX[1], 180, 'Hall of Shame (morti)', style(18, '#f87171')).setOrigin(0.5, 0);
    let y = 212;
    for (const id of LEVEL_ORDER) {
      const times = leaderboard.topTime(id, 3);
      const shame = leaderboard.topShame(id, 3);
      if (times.length === 0) continue;
      this.add.text(colX[0], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0);
      this.add.text(colX[1], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0);
      times.forEach((e, i) => this.add.text(colX[0], y + 18 + i * 18, `${i + 1}. ${formatDuration(e.timeMs)}  (${e.deaths} morti)`, style(14)).setOrigin(0.5, 0));
      shame.forEach((e, i) => this.add.text(colX[1], y + 18 + i * 18, `${i + 1}. ${e.deaths} morti  (${formatDuration(e.timeMs)})`, style(14)).setOrigin(0.5, 0));
      y += 18 + 3 * 18 + 12;
    }

    const prompt = this.add.text(cx, GAME_HEIGHT - 50, '', style(18, '#fbbf24')).setOrigin(0.5);
    this.time.delayedCall(1000, () => {
      prompt.setText('Premi Spazio per ricominciare dal Progetto 1');
      this.input.keyboard.once('keydown-SPACE', () => fadeTo(this, 'GameScene', { levelId: LEVEL_ORDER[0], pivotCause: null }));
    });
  }
}
