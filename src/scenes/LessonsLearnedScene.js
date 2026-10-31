import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from '../config/constants.js';
import { CAUSES } from '../data/causes.js';
import { formatGu, formatDuration } from '../core/format.js';

const style = (size, color = '#111827') => ({ fontFamily: 'Arial, sans-serif', fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION, wordWrap: { width: 780 } });

export default class LessonsLearnedScene extends Phaser.Scene {
  constructor() {
    super('LessonsLearnedScene');
  }

  create({ run, dominant, gu, guMax }) {
    this.cameras.main.setBackgroundColor('#0b0d12');
    const x = 60;
    this.add.rectangle(40, 30, GAME_WIDTH - 80, GAME_HEIGHT - 60, 0xffffff).setOrigin(0, 0);
    this.add.rectangle(40, 30, GAME_WIDTH - 80, 64, 0x1d4ed8).setOrigin(0, 0);
    this.add.text(x, 46, 'Lessons Learned — Progetto 1', style(30, '#ffffff'));

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

    let y = 130;
    for (const b of bullets) {
      const t = this.add.text(x + 24, y, b, style(20));
      this.add.circle(x + 8, y + 12, 4, 0x1d4ed8);
      y += t.height + 22;
    }

    this.add.text(x, GAME_HEIGHT - 70, 'deck_FINAL_v7_DEF_ok.pptx   |   Confidenziale   |   Slide 1 di 1', style(12, '#6b7280'));
    const prompt = this.add.text(GAME_WIDTH - 60, GAME_HEIGHT - 74, '', style(16, '#1d4ed8')).setOrigin(1, 0);

    this.time.delayedCall(1000, () => {
      prompt.setText('Premi Spazio per passare al Progetto 2');
      const next = () => this.scene.start('GameScene', { levelId: 'level2', pivotCause: dominant.cause });
      this.input.keyboard.once('keydown-SPACE', next);
      this.input.keyboard.once('keydown-ENTER', next);
    });
  }
}
