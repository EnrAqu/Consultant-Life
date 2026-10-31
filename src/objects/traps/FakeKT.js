import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, BUDGET, COLORS } from '../../config/constants.js';
import { EV, bus } from '../../events/EventBus.js';

// Normal: a shiny "KT" pickup. Taking it starts an endless call: you are frozen and burn GU.
// Tell: pulses at 1300 ms (coffee pulses at 1000 ms) and has a tiny calendar in the corner.
// Pivoted: a real KT (green, no calendar) gives GU and reveals hidden platforms.
export default class FakeKT extends BaseTrap {
  static type = 'fakeKT';

  build() {
    const scene = this.scene;
    this.period = this.pivoted ? 1000 : 1300;
    this.baseX = this.tx * TILE + 16;
    this.baseY = (this.ty + 1) * TILE - 16;
    this.glow = scene.add.image(this.baseX, this.baseY, 'glow').setTint(this.pivoted ? COLORS.green : COLORS.gold).setDepth(DEPTH.objects);
    this.sprite = scene.physics.add.staticImage(this.baseX, this.baseY, this.pivoted ? 'ktReal' : 'kt').setDepth(DEPTH.traps);
    this.triggers.push(this.sprite);
    this.hidden = (this.p.hiddenPlatforms ?? []).map((h) => this.addPlatform(this.tx + h.dx, this.ty + h.dy, h.w, h.h, 'tiles', false));
    for (const h of this.hidden) h.setTint(COLORS.green);
    this.reset();
  }

  reset() {
    this.cancelCall();
    this.collected = false;
    this.t = 0;
    this.sprite.enableBody(false, 0, 0, true, true);
    this.glow.setVisible(true);
    for (const h of this.hidden) {
      h.setVisible(false);
      h.body.enable = false;
    }
  }

  onTrigger(player) {
    if (this.collected) return;
    this.collected = true;
    this.sprite.disableBody(true, true);
    this.glow.setVisible(false);
    const scene = this.scene;

    if (this.pivoted) {
      scene.stats.recordPickup('realKT');
      scene.gainGu(BUDGET.realKtBonus, 'realKT');
      for (const h of this.hidden) {
        h.setVisible(true);
        h.body.enable = true;
      }
      scene.narrate('ktReal');
    } else {
      scene.stats.recordFakeKT();
      if (scene.spendGu(BUDGET.fakeKtCost, 'fakeKT')) return;
      scene.narrate('ktFake');
    }
    this.inCall = true;
    this.callLeft = this.p.callMs;
    this.player = player;
    player.lockInput(true);
    player.stopMotion();
    player.body.setAllowGravity(false);
    bus.emit(EV.KT_CALL_START, { pivoted: this.pivoted, durationMs: this.p.callMs });
  }

  cancelCall() {
    if (!this.inCall) return;
    this.inCall = false;
    this.player.lockInput(false);
    this.player.body.setAllowGravity(true);
    this.scene.input.keyboard.resetKeys();
    bus.emit(EV.KT_CALL_END, { pivoted: this.pivoted });
  }

  update(dt) {
    this.t += dt;
    if (!this.collected) {
      const wave = Math.sin(((this.t % this.period) / this.period) * Math.PI * 2);
      this.sprite.y = this.baseY + wave * 4;
      this.glow.y = this.sprite.y;
      this.glow.setAlpha(0.3 + 0.15 * (1 + wave));
    }
    if (this.inCall) {
      this.callLeft -= dt;
      if (this.callLeft <= 0) this.cancelCall();
    }
  }
}
