import BaseTrap from './BaseTrap.js';
import RestartBrain from '../../core/RestartBrain.js';
import { bus, EV } from '../../events/EventBus.js';

const INCIDENT_WINDOW_MS = 2000;

// IT: "Il PC si riavvierà tra 3…" (docs/IT_HR_EXTERNAL.md §2.1). Step on its column: a 3 s countdown on the HUD, then
// you are frozen for 1.2 s ("Aggiornamento 1 di 47…") while the world goes on — never mid-air (it waits for the landing).
// Tell: the countdown. Counter: be on a safe spot at zero. The `it` incident counts only if you die within 2 s of the
// freeze (review A: an incident must do damage). Not a slot (level 2).
export default class ForcedRestart extends BaseTrap {
  static type = 'forcedRestart';

  build() {
    this.brain = new RestartBrain({ countdownMs: this.p.countdownMs, freezeMs: this.p.freezeMs });
    this.addTrigger(0, 1);
    this.clock = 0;
    this.reset();
  }

  release() {
    this.scene.player?.lockInput('it', false);
  }

  reset() {
    this.release();
    this.brain.reset();
    this.frozenAt = -Infinity;
    this.lastSecond = 0;
  }

  onTrigger() {
    if (this.brain.trigger()) this.toast(3);
  }

  toast(n) {
    this.lastSecond = n;
    bus.emit(EV.TOAST, { text: `[IT] Il PC si riavvierà tra ${n}…`, durationMs: 1500, color: '#93c5fd' });
  }

  // a death right after the freeze is the restart's fault
  cancelCall() {
    if (this.scene.player?.isDead && this.clock - this.frozenAt <= INCIDENT_WINDOW_MS) this.scene.stats.recordIncident('it');
    this.frozenAt = -Infinity;
    this.release();
  }

  update(dt) {
    this.clock += dt;
    const player = this.scene.player;
    const ev = this.brain.update(dt, player.grounded);
    const n = this.brain.secondsLeft;
    if (n && n !== this.lastSecond) this.toast(n);
    if (ev === 'freeze') {
      this.frozenAt = this.clock;
      player.lockInput('it', true);
      player.stopMotion();
      bus.emit(EV.TOAST, { text: 'Aggiornamento 1 di 47… Non spegnere il computer.', durationMs: this.brain.freezeMs, color: '#93c5fd' });
      this.scene.narrate('itRestart');
    }
    if (ev === 'unfreeze') this.release();
  }
}
