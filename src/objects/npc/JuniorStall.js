import { TILE, DEPTH, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import StallBrain from '../../core/StallBrain.js';
import { JUNIOR_QUESTIONS } from '../../data/juniorQuestions.js';
import { bus, EV } from '../../events/EventBus.js';

const COST = 0.5;
// one question per stop, in a fixed order for the whole page (deterministic, never random)
let questionIndex = 0;

// The junior who stops (docs/JUNIOR_QUESTION.md, user 2026-11-03). Levels 3 and 5: when the last junior in line reaches
// the stall point he stops, with a big "?" over his head. Go back to him and he asks a stupid question: you explain it
// standing still for 1.8 s and lose 0.5 GU, then he rejoins at the end of the line. Leave him and he is a lost junior
// (the usual burnout at the checkpoint or at the end of the level). Once per life.
export default class JuniorStall {
  static type = 'juniorStall';

  constructor(scene, def, mode) {
    this.scene = scene;
    this.def = def;
    this.mode = mode;
    this.brain = new StallBrain({ col: def.x, row: def.y, explainMs: def.params?.explainMs ?? 1800 });
  }

  build() {
    const style = (size, color, bg) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, backgroundColor: bg, padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 170 }, align: 'center' });
    this.mark = this.scene.add.text(0, 0, '?', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '22px', color: '#facc15', stroke: '#111827', strokeThickness: 4, resolution: TEXT_RESOLUTION * 2 }).setOrigin(0.5, 1).setDepth(DEPTH.fx).setVisible(false);
    this.bubble = this.scene.add.text(0, 0, '', style(9, '#111827', '#fef9c3')).setOrigin(0.5, 1).setDepth(DEPTH.fx).setVisible(false);
    this.reset();
  }

  release() {
    this.scene.player?.lockInput('junior', false);
  }

  reset() {
    this.release();
    this.brain.reset();
    this.member = null;
    this.leftHim = false;
    this.mark.setVisible(false);
    this.bubble.setVisible(false);
  }

  cancelCall() {
    this.release();
  }

  delegateTarget() {
    return null;
  }

  update(dt) {
    const scene = this.scene;
    const team = scene.team;
    if (!team || scene.player.isDead) return;
    const f = team.followers;
    const lastM = f[f.length - 1];
    const last = lastM ? { key: lastM, col: Math.floor(lastM.sprite.x / TILE), row: Math.round(lastM.sprite.y / TILE) - 1 } : null;
    const m = this.member;
    const pb = scene.player.body;
    const dx = m ? Math.abs(pb.center.x - m.sprite.x) : Infinity;
    // he asks when you come back for him, not if you were standing next to him when he stopped (review JUNIOR_STALL)
    if (m && dx > 2 * TILE) this.leftHim = true;
    const playerNear = Boolean(m && this.leftHim && dx < 24 && Math.abs(pb.bottom - m.sprite.y) < 20);
    const ev = this.brain.update(dt, { last, playerNear });
    if (ev === 'stall') {
      this.member = this.brain.key;
      team.stall(this.member);
      // his question while he waits; when you come back he answers it himself (user, 2026-11-04)
      this.question = JUNIOR_QUESTIONS[questionIndex % JUNIOR_QUESTIONS.length];
      questionIndex += 1;
      this.say(this.question.ask);
      bus.emit(EV.TOAST, { text: 'Un junior si è fermato: torna a prenderlo', durationMs: 2200, color: '#fde68a' });
    }
    if (ev === 'ask') {
      scene.player.lockInput('junior', true);
      scene.player.stopMotion();
      this.say(this.question.answer);
      scene.floatText(`-${COST.toString().replace('.', ',')} GU`, pb.center.x, pb.top - 10);
      if (scene.spendGu(COST, 'juniorQuestion')) return;
      scene.narrate('juniorQuestion');
    }
    if (ev === 'resume') {
      this.release();
      team.resumeStalled(this.member);
      this.member = null;
      this.mark.setVisible(false);
      this.bubble.setVisible(false);
    }
    if (this.member) {
      const x = this.member.sprite.x;
      const y = this.member.sprite.y;
      this.mark.setPosition(x, y - 30).setVisible(this.brain.state === 'stalled');
      this.bubble.setPosition(x, y - (this.brain.state === 'stalled' ? 56 : 34));
    }
  }

  say(text) {
    this.bubble.setText(text).setVisible(true);
  }
}
