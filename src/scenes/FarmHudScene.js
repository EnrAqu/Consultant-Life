import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn } from './sceneUtils.js';

const text = (scene, x, y, str, style = {}) =>
  scene.add.text(x, y, str, { fontFamily: UI_FONT, fontSize: '15px', color: '#1f2937', resolution: TEXT_RESOLUTION, ...style });

const CARD_W = 300;

// The farm's HUD (docs/FARM.md §2). Pull model: every frame it reads FarmScene (day, notification, prompts),
// so there is no start-up order to get wrong.
export default class FarmHudScene extends Phaser.Scene {
  constructor() {
    super('FarmHudScene');
  }

  create() {
    setupScreenCamera(this);
    fadeIn(this);
    this.farm = this.scene.get('FarmScene');
    this.chores = text(this, 16, 14, '', { fontSize: '16px', fontStyle: 'bold', color: '#fefce8', stroke: '#365314', strokeThickness: 4 });
    this.unread = text(this, 16, 38, '', { fontSize: '14px', color: '#fefce8', stroke: '#365314', strokeThickness: 3 });

    // the phone's notification, top right
    const x = GAME_WIDTH - CARD_W - 16;
    this.card = this.add.container(x, 14).setVisible(false);
    this.cardBg = this.add.rectangle(0, 0, CARD_W, 58, 0xf8fafc, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0x0f172a);
    this.cardIcon = this.add.rectangle(12, 12, 10, 16, 0x111827).setOrigin(0, 0);
    this.cardFrom = text(this, 30, 8, '', { fontSize: '13px', fontStyle: 'bold', color: '#0f172a' });
    this.cardText = text(this, 30, 26, '', { fontSize: '13px', color: '#334155', wordWrap: { width: CARD_W - 40 } });
    this.card.add([this.cardBg, this.cardIcon, this.cardFrom, this.cardText]);
    this.shownMessage = null;

    // opening card: "some weeks later"
    this.intro = text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, 'Qualche settimana dopo.', { fontSize: '30px', fontStyle: 'bold', color: '#fefce8', stroke: '#1f2937', strokeThickness: 5 }).setOrigin(0.5);
    this.introSub = text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 32, 'Il contadino', { fontSize: '18px', color: '#fefce8', stroke: '#1f2937', strokeThickness: 4 }).setOrigin(0.5);
    this.time.delayedCall(2600, () => this.tweens.add({ targets: [this.intro, this.introSub], alpha: 0, duration: 600 }));

    this.endText = text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '', { fontSize: '30px', fontStyle: 'bold', color: '#fefce8', stroke: '#1f2937', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0);
  }

  update(_, delta) {
    const farm = this.farm;
    const day = farm?.day;
    if (!day) return;
    this.chores.setText(`Uova: ${day.eggs}/${day.eggsTotal}   Ortaggi: ${day.veg}/${day.vegTotal}`);
    this.unread.setText(day.phoneThrown ? 'Telefono: nello stagno' : `Notifiche non lette: ${day.received}`);

    const n = farm.notification;
    if (n !== this.shownMessage) {
      this.shownMessage = n;
      if (n) {
        this.cardFrom.setText(n.from);
        this.cardText.setText(n.text);
        // setSize, not .height: in Phaser 3.90 only setSize also resizes the rectangle's outline
        this.cardBg.setSize(CARD_W, Math.max(58, this.cardText.y + this.cardText.height + 10));
        this.card.setVisible(true);
        this.buzzMs = 300;
      } else this.card.setVisible(false);
    }
    // a little shake when it arrives
    this.buzzMs = Math.max(0, (this.buzzMs ?? 0) - delta);
    this.card.x = GAME_WIDTH - CARD_W - 16 + (this.buzzMs > 0 ? Math.sin(this.buzzMs / 12) * 3 : 0);

    if (farm.endLine && this.endText.text !== farm.endLine) {
      this.endText.setText(farm.endLine);
      this.tweens.add({ targets: this.endText, alpha: 1, duration: 700 });
    }
  }
}
