import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn, fadeTo } from './sceneUtils.js';
import { CAUSES } from '../data/causes.js';
import { formatGu, formatDuration } from '../core/format.js';
import { projectNumber } from '../levels/index.js';

const style = (size, color = '#111827') => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION, wordWrap: { width: 780 } });

export default class LessonsLearnedScene extends Phaser.Scene {
  constructor() {
    super('LessonsLearnedScene');
  }

  create({ levelId, next, run, ranks, team, dominant, gu, guMax }) {
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    const x = 60;
    this.add.rectangle(40, 30, GAME_WIDTH - 80, GAME_HEIGHT - 60, 0xffffff).setOrigin(0, 0);
    this.add.rectangle(40, 30, GAME_WIDTH - 80, 64, 0x1d4ed8).setOrigin(0, 0);
    this.add.text(x, 46, `Lessons Learned — Progetto ${projectNumber(levelId)}`, style(30, '#ffffff'));

    const cause = CAUSES[dominant.cause];
    const bullets = [];
    if (dominant.isDefault) {
      bullets.push('Nessun incidente rilevante. Sospetto. Abbiamo comunque preparato una lesson learned.');
    } else {
      bullets.push(`Causa principale: ${cause.label} (${dominant.incidents} incidenti, ${formatGu(dominant.guLost)} GU bruciate)`);
    }
    if (dominant.realCause) {
      bullets.push(`Causa reale: ${CAUSES[dominant.realCause].label} (non pivotabile. Il cliente ha scelto un'altra lesson.)`);
    }
    bullets.push(`Azione correttiva: ${cause.lesson}`);
    bullets.push(`Morti totali nel progetto: ${run.deaths} — Tempo: ${formatDuration(run.timeMs)} — GU residue: ${formatGu(gu)} / ${guMax}`);
    if (team) bullets.push(`Team arrivato alla consegna: ${team.count}/${team.size}${team.count < team.size ? ' (gli altri sono stati "valorizzati" altrove)' : ''}`);
    if (ranks?.timeRank) bullets.push(`Record personale: #${ranks.timeRank} per tempo.`);
    if (ranks?.shameRank === 1 && run.deaths > 0) bullets.push('Hall of Shame: nuovo record di morti. Complimenti, credo.');

    let y = 130;
    for (const b of bullets) {
      const t = this.add.text(x + 24, y, b, style(20));
      this.add.circle(x + 8, y + 12, 4, 0x1d4ed8);
      y += t.height + 22;
    }

    this.add.text(x, GAME_HEIGHT - 70, 'deck_FINAL_v7_DEF_ok.pptx   |   Confidenziale   |   Slide 1 di 1', style(12, '#6b7280'));
    const prompt = this.add.text(GAME_WIDTH - 60, GAME_HEIGHT - 74, '', style(16, '#1d4ed8')).setOrigin(1, 0);

    this.time.delayedCall(1000, () => {
      prompt.setText(`Premi Spazio per passare al Progetto ${projectNumber(next)}`);
      let gone = false;
      const go = () => {
        if (gone) return;
        gone = true;
        fadeTo(this, 'GameScene', { levelId: next, pivotCause: dominant.cause });
      };
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    });
  }
}
