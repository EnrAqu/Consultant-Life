import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import EscalationBrain from '../core/EscalationBrain.js';
import { EMAIL_KEYS, EMAIL_W } from '../gfx/TextureFactory.js';
import { bus, EV } from '../events/EventBus.js';

const BASE = 1 / TEXTURE_SCALE;
export const ESCALATION_COST = 3;

// View + side effects of the escalation tide (ITERATION_5 §2); the rules live in EscalationBrain (pure, tested).
// A catch is not a death: a call with the client to explain everything (-3 GU, 1.2 s frozen).
export default class Escalation {
  constructor(scene, params) {
    this.scene = scene;
    this.brain = new EscalationBrain(params);
    this.body = scene.add.rectangle(0, 0, scene.worldW, 10, 0x7f1d1d, 0.78).setOrigin(0, 0).setDepth(DEPTH.fx - 2);
    this.edge = scene.add.rectangle(0, 0, scene.worldW, 6, 0xef4444, 0.9).setOrigin(0, 0.5).setDepth(DEPTH.fx - 1);
    const n = Math.ceil(scene.worldW / (EMAIL_W - 10)) + 1;
    this.emails = Array.from({ length: n }, (_, i) =>
      scene.add.image(i * (EMAIL_W - 10), 0, EMAIL_KEYS[i % EMAIL_KEYS.length]).setScale(BASE * 0.85).setDepth(DEPTH.fx - 1).setAngle(((i * 37) % 21) - 10),
    );
    this.label = scene.add
      .text(scene.worldW / 2, 0, '', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '11px', color: '#fecaca', resolution: TEXT_RESOLUTION * 2 })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.fx);
    this.t = 0;
    this.lastHud = '';
    this.draw();
  }

  get feetY() {
    return this.scene.player.body.bottom;
  }

  update(dt) {
    const scene = this.scene;
    const player = scene.player;
    this.t += dt;
    for (const a of this.brain.update(dt, { feetY: this.feetY })) {
      if (a.type === 'start') {
        scene.cameras.main.flash(250, 220, 38, 38);
        bus.emit(EV.TOAST, { text: 'ESCALATION: il cliente ha messo in CC il suo capo.', durationMs: 2600, color: '#f87171' });
        scene.narrate('escalationStart');
      }
      if (a.type === 'stage') {
        bus.emit(EV.TOAST, { text: `Ora c'è in CC anche il ${a.label}.`, durationMs: 2200, color: '#f87171' });
        scene.narrate('escalationStage', { chainLabel: a.label });
      }
      if (a.type === 'catch') {
        player.lockInput('escalation', true);
        player.stopMotion();
        scene.cameras.main.shake(160, 0.006);
        scene.floatText(`-${ESCALATION_COST} GU`, player.x, player.y - 24, '#f87171');
        scene.stats.recordIncident('escalation');
        if (scene.spendGu(ESCALATION_COST, 'escalation')) return;
        scene.narrate('escalationCatch');
      }
      if (a.type === 'released') {
        player.lockInput('escalation', false);
        scene.input.keyboard.resetKeys();
      }
      if (a.type === 'stop') {
        bus.emit(EV.TOAST, { text: 'Il CEO del cliente è in ferie fino a lunedì.', durationMs: 2600, color: '#86efac' });
        scene.narrate('escalationStop');
      }
    }
    this.draw();
    this.emitHud();
  }

  draw() {
    const scene = this.scene;
    const visible = this.brain.state !== 'waiting';
    const y = this.brain.surfaceY;
    this.body.setVisible(visible).setY(y).setSize(scene.worldW, Math.max(0, scene.worldH - y));
    this.edge.setVisible(visible).setY(y);
    this.emails.forEach((e, i) => e.setVisible(visible).setY(y - 2 + Math.sin(this.t / 180 + i) * 3));
    this.label.setVisible(visible).setY(y + 10).setText(`CC: ${this.brain.chainLabel}`);
  }

  emitHud() {
    const b = this.brain;
    const rows = Math.max(0, Math.round(b.distanceRows(this.feetY)));
    const text = b.active ? `ESCALATION · CC: ${b.chainLabel} · ${rows} ${rows === 1 ? 'riga' : 'righe'} sotto` : '';
    if (text === this.lastHud) return;
    this.lastHud = text;
    bus.emit(EV.ESCALATION, { text, danger: b.active && rows <= 3 });
  }

  // a death while frozen by the call must not leave the player locked
  cancelCall() {
    this.scene.player.lockInput('escalation', false);
  }

  onRespawn() {
    this.brain.resetBelow(this.feetY);
    this.draw();
  }
}
