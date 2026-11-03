import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { causeLabel, causeLesson } from '../data/causes.js';
import { formatGu, formatDuration } from '../core/format.js';
import { LEVELS, projectNumber, LEVEL_ORDER } from '../levels/index.js';
import { nextStart } from '../core/Burnout.js';
import { BURNOUT } from '../config/constants.js';
import { pressLabel } from '../input/TouchControls.js';
import { leaderboard } from '../state.js';
import { mountOnlineScore, drawLevelTop } from './onlineScore.js';

const style = (size, color = '#111827', wrap = 780) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION, wordWrap: { width: wrap } });
// with the online leaderboard the slide splits: bullets on the left, the leaderboard on the right (docs/LEADERBOARD.md)
const PANEL_X = 640;

export default class LessonsLearnedScene extends Phaser.Scene {
  constructor() {
    super('LessonsLearnedScene');
  }

  create({ levelId, next, run, ranks, online = null, team, dominant, gu, guMax, burnout = 0, clean = false }) {
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const x = 60;
    this.add.rectangle(40, 30, GAME_WIDTH - 80, GAME_HEIGHT - 60, 0xffffff).setOrigin(0, 0);
    this.add.rectangle(40, 30, GAME_WIDTH - 80, 64, 0x1d4ed8).setOrigin(0, 0);
    this.add.text(x, 46, `Lessons Learned — Progetto ${projectNumber(levelId)}`, style(30, '#ffffff'));

    const skin = LEVELS[levelId]?.skin ?? null;
    const bullets = [];
    if (dominant.isDefault) {
      bullets.push('Nessun incidente rilevante. Sospetto. Abbiamo comunque preparato una lesson learned.');
    } else {
      bullets.push(`Causa principale: ${causeLabel(dominant.cause, skin)} (${dominant.incidents} incidenti, ${formatGu(dominant.guLost)} GU bruciate)`);
    }
    if (dominant.realCause) {
      bullets.push(`Causa reale: ${causeLabel(dominant.realCause, skin)} (non pivotabile. Il cliente ha scelto un'altra lesson.)`);
    }
    bullets.push(`Azione correttiva: ${causeLesson(dominant.cause, skin)}`);
    bullets.push(`Morti totali nel progetto: ${run.deaths} — Tempo: ${formatDuration(run.timeMs)} — GU residue: ${formatGu(gu)} / ${guMax}`);
    if (team) bullets.push(`Team arrivato alla consegna: ${team.count}/${team.size}${team.count < team.size ? ' (gli altri sono stati "valorizzati" altrove)' : ''}`);
    // where the next project starts, and why (docs/BURNOUT.md §6)
    const start = nextStart(burnout, LEVEL_ORDER.indexOf(next), BURNOUT.levelMin, clean ? BURNOUT.relief.cleanLevel : 0);
    const why = { minimum: ' (minimo del progetto)', carried: '', clean: ` (−${BURNOUT.relief.cleanLevel}%: progetto senza morti)` }[start.reason];
    bullets.push(`Burnout: ${Math.floor(burnout)}% → il Progetto ${projectNumber(next)} parte dal ${Math.floor(start.value)}%${why}`);
    if (ranks?.timeRank) bullets.push(`Record personale: #${ranks.timeRank} per tempo.`);
    if (ranks?.shameRank === 1 && run.deaths > 0) bullets.push('Hall of Shame: nuovo record di morti. Complimenti, credo.');

    const split = Boolean(online);
    const size = split ? 17 : 20;
    let y = split ? 116 : 130;
    for (const b of bullets) {
      const t = this.add.text(x + 24, y, b, style(size, '#111827', split ? PANEL_X - x - 54 : 780));
      this.add.circle(x + 8, y + size * 0.6, 4, 0x1d4ed8);
      y += t.height + (split ? 14 : 22);
    }
    let onlineUi = null;
    if (split) {
      this.add.rectangle(PANEL_X - 16, 110, 1, GAME_HEIGHT - 200, 0xd1d5db).setOrigin(0, 0);
      onlineUi = mountOnlineScore(this, online, { x: PANEL_X, y: 112, wrap: GAME_WIDTH - 60 - PANEL_X, inputWidth: 220 });
      const localTop = { time: leaderboard.topTime(levelId), shame: leaderboard.topShame(levelId) };
      // after the submission (whatever its outcome), so your own score is already in it
      onlineUi.done.then(() => this.sys.isActive() && drawLevelTop(this, levelId, { x: PANEL_X, y: 250, colW: 130, localTop, fresh: true }));
    }

    this.add.text(x, GAME_HEIGHT - 70, 'deck_FINAL_v7_DEF_ok.pptx   |   Confidenziale   |   Slide 1 di 1', style(12, '#6b7280'));
    const prompt = this.add.text(GAME_WIDTH - 60, GAME_HEIGHT - 74, '', style(16, '#1d4ed8')).setOrigin(1, 0);

    this.time.delayedCall(1000, () => {
      prompt.setText(`${pressLabel()} per passare al Progetto ${projectNumber(next)}`);
      let gone = false;
      const go = (pointer, over) => {
        if (gone || onlineUi?.hits(over)) return;
        gone = true;
        onlineUi?.finish();
        fadeTo(this, 'GameScene', { levelId: next, pivotCause: dominant.cause });
      };
      this.input.keyboard.once('keydown-SPACE', () => go());
      this.input.keyboard.once('keydown-ENTER', () => go());
      this.input.on('pointerdown', go);
    });
  }
}
