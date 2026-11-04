import BaseTrap from './BaseTrap.js';
import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';
import { bus, EV } from '../../events/EventBus.js';

const HEIGHT = 4;
const BASE = 1 / TEXTURE_SCALE;

// HR: the mandatory course (docs/IT_HR_EXTERNAL.md §3.2), level 4 slot with cause `hr`. A barrier with the HR rep:
// walk up to it and the course starts — "Sicurezza sul lavoro, modulo 7 di 12": frozen `courseMs`, burnout +6%
// (user), incident `hr`, then it opens. With the certificate (pickup at certX/certY, on the contractor's stairs) it opens
// at once. Course and certificate hold for the whole level (review A): the +6% is paid at most once.
// Pivoted: the certificate is already on Workday, the barrier is open.
export default class HrCourse extends BaseTrap {
  static type = 'hrCourse';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.courseMs = p.courseMs ?? 2000;
    this.floorY = (this.ty + 1) * TILE;
    this.barrier = this.addPlatform(this.tx, this.ty - HEIGHT + 1, 1, HEIGHT, 'gateTile');
    this.barrier.setTint(0xf9a8d4);
    scene.add.image((this.tx - 1) * TILE + 16, this.floorY, 'npc_hr', 'idle0').setOrigin(0.5, 1).setScale(BASE).setFlipX(true).setDepth(DEPTH.objects);
    this.addTrigger(-2, 2, this.ty - 1, this.ty);
    const style = (size, color, bg) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, backgroundColor: bg, padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2, wordWrap: { width: 170 } });
    this.label = scene.add.text(this.tx * TILE + 16, (this.ty - HEIGHT) * TILE - 4, '', style(9, '#ffffff', '#be185d')).setOrigin(0.5, 1).setDepth(DEPTH.traps);
    // the HR rep's question before the barrier (user, 2026-11-04)
    this.repBubble = scene.add
      .text((this.tx - 1) * TILE + 16, this.floorY - 46, '', style(9, '#111827', '#fce7f3'))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.traps);
    if (!this.pivoted && p.certX !== undefined) {
      this.cert = scene.add.image(p.certX * TILE + 16, p.certY * TILE + 16, 'certificate').setScale(BASE * 1.4).setDepth(DEPTH.objects);
      scene.add.text(p.certX * TILE + 16, p.certY * TILE - 4, 'Attestato sicurezza', style(7, '#78350f', '#fef3c7')).setOrigin(0.5, 1).setDepth(DEPTH.objects);
    }
    // level-scoped state: not reset on respawn
    this.state = this.pivoted ? 'open' : 'closed';
    this.hasCert = false;
    this.apply();
  }

  apply() {
    const open = this.state === 'open';
    const rep = this.state !== 'closed' ? '' : this.hasCert ? 'Attestato di sicurezza? Ah, ce l\'hai. Prego.' : 'Hai l\'attestato di sicurezza?';
    this.repBubble?.setText(rep).setVisible(rep !== '');
    this.barrier.body.enable = !open;
    this.barrier.setAlpha(open ? 0.2 : 1);
    this.label.setText(this.pivoted ? 'Attestato caricato su Workday' : open ? 'Formazione completata' : this.state === 'course' ? 'Modulo 7 di 12…' : 'Formazione obbligatoria: sicurezza sul lavoro');
    this.label.setBackgroundColor(open ? '#15803d' : '#be185d');
  }

  release() {
    this.scene.player?.lockInput('hr', false);
  }

  reset() {
    this.release();
    // a death during the course: it was paid for, the barrier opens
    if (this.state === 'course') this.state = 'open';
    this.apply();
  }

  cancelCall() {
    this.release();
  }

  onTrigger() {
    // never frozen mid-air (review IT_HR #8)
    if (this.state !== 'closed' || !this.scene.player.grounded) return;
    const scene = this.scene;
    if (this.hasCert) {
      this.state = 'open';
      bus.emit(EV.TOAST, { text: 'HR: "Attestato valido. Prego."', durationMs: 1600, color: '#f9a8d4' });
      this.apply();
      return;
    }
    this.state = 'course';
    this.timer = 0;
    scene.player.lockInput('hr', true);
    scene.player.stopMotion();
    scene.stats.recordIncident('hr');
    bus.emit(EV.TOAST, { text: 'HR: "Sicurezza sul lavoro, modulo 7 di 12. Ci vuole un attimo."', durationMs: this.courseMs, color: '#f9a8d4' });
    this.apply();
    if (scene.addBurnout('hrCourse')) return;
    scene.narrate('hrCourse');
  }

  update(dt) {
    if (this.cert?.visible) {
      const b = this.scene.player.body;
      const c = this.cert;
      if (b.right > c.x - 8 && b.left < c.x + 8 && b.bottom > c.y - 8 && b.top < c.y + 8) {
        this.hasCert = true;
        c.setVisible(false);
        this.apply();
        bus.emit(EV.TOAST, { text: this.state === 'closed' ? 'Attestato preso: il corso HR è saltato' : "Attestato preso. Il corso l'avevi già fatto.", durationMs: 1800, color: '#fde68a' });
      }
    }
    if (this.state === 'course') {
      this.timer += dt;
      if (this.timer >= this.courseMs) {
        this.state = 'open';
        this.release();
        this.apply();
      }
    }
  }
}
