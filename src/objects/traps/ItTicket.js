import BaseTrap from './BaseTrap.js';
import TicketBrain from '../../core/TicketBrain.js';
import { TILE, DEPTH, TEXTURE_SCALE, TEXT_RESOLUTION, UI_FONT } from '../../config/constants.js';

const HEIGHT = 4; // tiles: too tall to jump, like the approval gate
const BASE = 1 / TEXTURE_SCALE;

// IT: "Accesso negato: apri un ticket" (docs/IT_HR_EXTERNAL.md §2.3), level 3 slot with cause `it`. Touch the IT kiosk
// (kioskDx columns before the barrier): "Ticket in lavorazione — priorità bassa", after 4 s the barrier opens for 2.5 s,
// then closes and the kiosk re-arms. A delegated junior (E) opens the ticket for you and waits at the kiosk.
// The `it` incident counts when it closes again with you still in front of it. Pivoted (P1): opens at once, stays open.
export default class ItTicket extends BaseTrap {
  static type = 'itTicket';

  build() {
    const scene = this.scene;
    const p = this.p;
    this.brain = new TicketBrain({ workMs: p.workMs, openMs: p.openMs }, this.pivoted);
    this.kioskCol = this.tx + (p.kioskDx ?? -5);
    this.floorY = (this.ty + 1) * TILE;
    this.barrier = this.addPlatform(this.tx, this.ty - HEIGHT + 1, 1, HEIGHT, 'gateTile');
    scene.add.image(this.kioskCol * TILE + 16, this.floorY, 'itKiosk').setOrigin(0.5, 1).setScale(BASE).setDepth(DEPTH.objects);
    this.addTrigger(this.kioskCol - this.tx, 1, this.ty - 1, this.ty);
    const style = (size, color, bg) => ({ fontFamily: UI_FONT, fontStyle: 'bold', fontSize: `${size}px`, color, backgroundColor: bg, padding: { x: 4, y: 2 }, resolution: TEXT_RESOLUTION * 2 });
    this.label = scene.add.text(this.tx * TILE + 16, (this.ty - HEIGHT) * TILE - 4, '', style(9, '#ffffff', '#1d4ed8')).setOrigin(0.5, 1).setDepth(DEPTH.traps);
    this.kioskText = scene.add.text(this.kioskCol * TILE + 16, this.floorY - 46, '', style(8, '#0f172a', '#e0f2fe')).setOrigin(0.5, 1).setDepth(DEPTH.traps);
    this.bar = scene.add.graphics().setDepth(DEPTH.fx);
    this.reset();
  }

  setOpen(open) {
    this.barrier.body.enable = !open;
    this.barrier.setAlpha(open ? 0.2 : 1);
  }

  reset() {
    this.brain.reset();
    this.setOpen(false);
    this.refresh();
  }

  refresh() {
    const b = this.brain;
    this.label.setText(b.open ? (this.pivoted ? 'Priorità P1: accesso consentito' : 'Risolto. Chiudiamo il ticket.') : 'Accesso negato: apri un ticket');
    this.label.setBackgroundColor(b.open ? '#15803d' : '#1d4ed8');
    const kiosk = b.state === 'working' ? (this.pivoted ? 'Ticket P1: arrivo!' : 'Ticket in lavorazione — priorità bassa') : b.open ? '' : 'Help desk IT: tocca per aprire un ticket';
    // an empty text would still draw its background box
    this.kioskText.setText(kiosk).setVisible(kiosk !== '');
  }

  onTrigger() {
    if (this.brain.touch()) this.refresh();
  }

  delegateTarget() {
    return this.brain.state === 'idle' ? { x: this.kioskCol * TILE + 16 } : null;
  }

  onDelegate() {
    this.brain.touch();
    this.refresh();
    return { stay: true, staySeconds: (this.brain.workMs + this.brain.openMs) / 1000 };
  }

  update(dt) {
    const ev = this.brain.update(dt);
    if (ev === 'open') this.setOpen(true);
    if (ev === 'close') {
      this.setOpen(false);
      const px = this.scene.player.body.center.x;
      if (px < this.tx * TILE && px > (this.tx - 6) * TILE) this.scene.stats.recordIncident('it');
    }
    if (ev) this.refresh();
    this.bar.clear();
    if (this.brain.state === 'working') {
      const x = this.kioskCol * TILE + 16;
      const y = this.floorY - 42;
      this.bar.fillStyle(0x0f172a, 0.9).fillRect(x - 21, y, 42, 5);
      this.bar.fillStyle(0x38bdf8, 1).fillRect(x - 20, y + 1, 40 * this.brain.progress, 3);
    }
  }
}
