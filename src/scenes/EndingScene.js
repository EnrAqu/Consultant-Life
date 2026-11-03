import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { formatDuration, formatGu } from '../core/format.js';
import { stats, leaderboard, leaderboardApi, session } from '../state.js';
import { mountOnlineScore } from './onlineScore.js';
import { LEVEL_ORDER, projectNumber } from '../levels/index.js';
import { pressLabel } from '../input/TouchControls.js';
import { farmEndingText } from '../core/FarmDay.js';

const style = (size, color = '#e5e7eb', align = 'center') => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, align, resolution: TEXT_RESOLUTION, wordWrap: { width: 820 } });

// The endings (ITERATION_5 §6). Partner (the Board) and burnout (docs/BURNOUT.md §5: you quit and become a farmer;
// it comes after the farm level, docs/FARM.md, and its texts come from the farm's summary); the product company comes later.
const ENDINGS = {
  partner: {
    title: 'Benvenuto nella partnership.',
    color: '#fbbf24',
    after: 'Il cliente vuole rifare tutto da capo.',
    restart: 'per ricominciare dal Progetto 1 (vestito da Partner)',
    outfit: 'partner',
  },
  burnout: {
    title: 'Burnout.',
    color: '#86efac',
    // `after` and the farm line come from farmEndingText (core/FarmDay.js)
    restart: 'per ricominciare dal Progetto 1 (da junior, riposato)',
    outfit: null,
    burnoutLine: true,
  },
};

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create({ ending = 'partner', levelId, run, gu, guMax, farm, online = null }) {
    const base = ENDINGS[ending] ?? ENDINGS.partner;
    const farmText = base.burnoutLine ? farmEndingText(farm) : null;
    const e = farmText ? { ...base, after: farmText.after } : base;
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 56, e.title, style(36, e.color)).setOrigin(0.5);
    const after = this.add.text(cx, e.burnoutLine ? 96 : 100, e.after, style(e.burnoutLine ? 16 : 18)).setOrigin(0.5).setAlpha(0);
    this.time.delayedCall(1500, () => this.tweens.add({ targets: after, alpha: 1, duration: 400 }));
    this.add
      .text(
        cx,
        e.burnoutLine ? 146 : 140,
        `${e.burnoutLine ? `Burnout: 100% al Progetto ${projectNumber(levelId)}${farmText.stats ? ` — ${farmText.stats}` : ''}\n` : ''}Progetto ${projectNumber(levelId)} — morti: ${run.deaths}   tempo: ${formatDuration(run.timeMs)}   GU residue: ${formatGu(gu)} / ${guMax}   ` +
          `Ore non fatturabili (totale): ${stats.getPersistent().totalDeaths}`,
        style(14, '#9ca3af'),
      )
      .setOrigin(0.5);

    // the last project's score goes online here (docs/LEADERBOARD.md); the name field sits under the stats line
    const onlineUi = mountOnlineScore(this, online, { x: cx - 300, y: 158, wrap: 600, color: '#e5e7eb', accent: '#fbbf24', muted: '#9ca3af', inputWidth: 200 });

    // Leaderboard: best times and Hall of Shame, per project (top 2 each: five projects must fit).
    // Online when the API answers (after our own submission), otherwise this browser's records.
    const top = online ? 192 : 180;
    const colX = [cx - 220, cx + 220];
    const board = [];
    const drawBoard = (data, isOnline) => {
      for (const o of board.splice(0)) o.destroy();
      const add = (o) => board.push(o) && o;
      add(this.add.text(colX[0], top, isOnline ? 'I più veloci (online)' : 'I tuoi tempi migliori', style(18, '#fbbf24')).setOrigin(0.5, 0));
      add(this.add.text(colX[1], top, isOnline ? 'Hall of Shame (online)' : 'Hall of Shame (morti)', style(18, '#f87171')).setOrigin(0.5, 0));
      let y = top + 32;
      for (const id of LEVEL_ORDER) {
        const { times, shame } = data[id];
        if (times.length === 0) continue;
        const who = (e) => (e.name ? ` ${e.name}` : '');
        add(this.add.text(colX[0], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0));
        add(this.add.text(colX[1], y, `Progetto ${projectNumber(id)}`, style(13, '#9ca3af')).setOrigin(0.5, 0));
        times.forEach((e, i) => add(this.add.text(colX[0], y + 16 + i * 16, `${i + 1}.${who(e)} ${formatDuration(e.timeMs)}  (${e.deaths} morti)`, style(13)).setOrigin(0.5, 0)));
        shame.forEach((e, i) => add(this.add.text(colX[1], y + 16 + i * 16, `${i + 1}.${who(e)} ${e.deaths} morti  (${formatDuration(e.timeMs)})`, style(13)).setOrigin(0.5, 0)));
        y += 16 + 2 * 16 + (online ? 2 : 6);
      }
    };
    const local = Object.fromEntries(LEVEL_ORDER.map((id) => [id, { times: leaderboard.topTime(id, 2), shame: leaderboard.topShame(id, 2) }]));
    drawBoard(local, false);
    if (leaderboardApi.enabled) {
      onlineUi.done.then(async () => {
        const lists = await Promise.all(LEVEL_ORDER.map((id) => Promise.all([leaderboardApi.top(id, 'time', 2, { fresh: true }), leaderboardApi.top(id, 'shame', 2, { fresh: true })])));
        if (!this.sys.isActive() || lists.some(([t, sh]) => !t || !sh)) return;
        drawBoard(Object.fromEntries(LEVEL_ORDER.map((id, i) => [id, { times: lists[i][0], shame: lists[i][1] }])), true);
      });
    }

    const prompt = this.add.text(cx, GAME_HEIGHT - 50, '', style(18, '#fbbf24')).setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      prompt.setText(`${pressLabel()} ${e.restart}`);
      let gone = false;
      const restart = (pointer, over) => {
        if (gone || onlineUi.hits(over)) return;
        gone = true;
        onlineUi.finish();
        // the new campaign is played in the clothes of the ending (until the page is reloaded)
        session.outfitOverride = e.outfit;
        fadeTo(this, 'GameScene', { levelId: LEVEL_ORDER[0], pivotCause: null });
      };
      this.input.keyboard.once('keydown-SPACE', () => restart());
      this.input.on('pointerdown', restart);
    });
  }
}
