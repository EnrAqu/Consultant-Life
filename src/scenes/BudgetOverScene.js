import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from '../config/constants.js';
import { CAUSES } from '../data/causes.js';
import { formatDuration } from '../core/format.js';

const style = (size, color = '#fecaca') => ({ fontFamily: '"Courier New", monospace', fontSize: `${size}px`, color, align: 'center', resolution: TEXT_RESOLUTION, wordWrap: { width: 820 } });

export default class BudgetOverScene extends Phaser.Scene {
  constructor() {
    super('BudgetOverScene');
  }

  create({ levelId, pivotCause, runStats }) {
    this.cameras.main.setBackgroundColor('#450a0a');
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 120, 'BUDGET SFORATO', style(56, '#ffffff')).setOrigin(0.5);
    this.add.text(cx, 200, 'Il progetto ha superato le Giornate Uomo previste.\nEscalation in arrivo (prossimamente).', style(18)).setOrigin(0.5);
    const top = Object.entries(runStats.deathsByCause).sort((a, b) => b[1] - a[1])[0];
    this.add
      .text(cx, 290, `Morti: ${runStats.deaths}   Tempo: ${formatDuration(runStats.timeMs)}   Causa principale: ${top ? CAUSES[top[0]].label : '-'}`, style(16))
      .setOrigin(0.5);
    const prompt = this.add.text(cx, GAME_HEIGHT - 120, '', style(20, '#ffffff')).setOrigin(0.5);

    this.time.delayedCall(1000, () => {
      prompt.setText('Premi R o Spazio per riaprire il progetto (nuova SOW)');
      const again = () => this.scene.start('GameScene', { levelId, pivotCause });
      this.input.keyboard.once('keydown-R', again);
      this.input.keyboard.once('keydown-SPACE', again);
    });
  }
}
