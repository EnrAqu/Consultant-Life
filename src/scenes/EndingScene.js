import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { formatDuration, formatGu } from '../core/format.js';
import { stats, leaderboard, session } from '../state.js';
import { LEVEL_ORDER, projectNumber } from '../levels/index.js';

const style = (size, color = '#e5e7eb', align = 'center') => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, align, resolution: TEXT_RESOLUTION, wordWrap: { width: 820 } });

// The endings (ITERATION_5 §6). 5A has the Partner one; product, fields and burnout come later.
const ENDINGS = {
  partner: {
    title: 'Benvenuto nella partnership.',
    color: '#fbbf24',
    after: 'Il cliente vuole rifare tutto da capo.',
    restart: 'Premi Spazio per ricominciare dal Progetto 1 (vestito da Partner)',
    outfit: 'partner',
  },
};

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create({ ending = 'partner', levelId, run, gu, guMax }) {
    const e = ENDINGS[ending] ?? ENDINGS.partner;
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 56, e.title, style(36, e.color)).setOrigin(0.5);
    const after = this.add.text(cx, 100, e.after, style(18)).setOrigin(0.5).setAlpha(0);
    this.time.delayedCall(1500, () => this.tweens.add({ targets: after, alpha: 1, duration: 400 }));
    this.add
      .text(
        cx,
        140,
        `Progetto ${projectNumber(levelId)} — morti: ${run.deaths}   tempo: ${formatDuration(run.timeMs)}   GU residue: ${formatGu(gu)} / ${guMax}   ` +
          `Ore non fatturabili (totale): ${stats.getPersistent().totalDeaths}`,
        style(14, '#9ca3af'),
      )
      .setOrigin(0.5);

    // Leaderboard: best times and Hall of Shame, per project (top 2 each: five projects must fit)
    const colX = [cx - 220, cx + 220];
    this.add.text(colX[0], 180, 'I tuoi tempi migliori', style(18, '#fbbf24')).setOrigin(0.5, 0);
    this.add.text(colX[1], 180, 'Hall of Shame (morti)', style(18, '#f87171')).setOrigin(0.5, 0);
    let y = 212;
    for (const id of LEVEL_ORDER) {
      const times = leaderboard.topTime(id, 2);
      const shame = leaderboard.topShame(id, 2);
      if (times.length === 0) continue;
      this.add.text(colX[0], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0);
      this.add.text(colX[1], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0);
      times.forEach((e, i) => this.add.text(colX[0], y + 16 + i * 16, `${i + 1}. ${formatDuration(e.timeMs)}  (${e.deaths} morti)`, style(13)).setOrigin(0.5, 0));
      shame.forEach((e, i) => this.add.text(colX[1], y + 16 + i * 16, `${i + 1}. ${e.deaths} morti  (${formatDuration(e.timeMs)})`, style(13)).setOrigin(0.5, 0));
      y += 16 + 2 * 16 + 6;
    }

    const prompt = this.add.text(cx, GAME_HEIGHT - 50, '', style(18, '#fbbf24')).setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      prompt.setText(e.restart);
      this.input.keyboard.once('keydown-SPACE', () => {
        // the new campaign is played in the clothes of the ending (until the page is reloaded)
        session.outfitOverride = e.outfit;
        fadeTo(this, 'GameScene', { levelId: LEVEL_ORDER[0], pivotCause: null });
      });
    });
  }
}
