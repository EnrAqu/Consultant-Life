import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { formatGu } from '../core/format.js';
import { bus, EV, listen } from '../events/EventBus.js';
import { stats, session } from '../state.js';
import { setupScreenCamera } from './sceneUtils.js';
import { touch } from '../input/TouchControls.js';

const NARR_Y = 96;
const KT_LINES = [
  'Mi sentite?',
  'Condivido lo schermo... ah no, aspettate.',
  'Allora, il file è sul drive. Quale drive? Bella domanda.',
  "C'è un'eccezione, ma non mi ricordo quale.",
  'Per il resto è tutto nel README. Non c’è un README.',
];

const text = (scene, x, y, str, style = {}) =>
  scene.add.text(x, y, str, { fontFamily: UI_FONT, fontSize: '15px', color: '#e5e7eb', resolution: TEXT_RESOLUTION, ...style });

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    setupScreenCamera(this);
    this.hud = this.add.container(0, 0);

    // GU bar
    this.guBarBg = this.add.rectangle(16, 16, 200, 14, 0x111827).setOrigin(0, 0).setStrokeStyle(1, 0x6b7280);
    this.guBar = this.add.rectangle(16, 16, 200, 14, 0x22c55e).setOrigin(0, 0);
    this.guText = text(this, 16, 34, '');
    // clock
    this.clockText = text(this, GAME_WIDTH / 2, 10, '09:00', { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    // deaths
    this.deathsText = text(this, GAME_WIDTH - 16, 12, '', { align: 'right' }).setOrigin(1, 0);
    // narrator
    // narrator at the top, so it never covers the floor where the action is
    this.narrBox = this.add.rectangle(GAME_WIDTH / 2, NARR_Y, 560, 40, 0x000000, 0.75).setOrigin(0.5, 0).setVisible(false);
    this.narrText = text(this, GAME_WIDTH / 2, NARR_Y + 10, '', { wordWrap: { width: 532 }, fontSize: '15px', align: 'center' }).setOrigin(0.5, 0).setVisible(false);
    // toast
    this.toastText = text(this, GAME_WIDTH / 2, 44, '', { fontSize: '16px', backgroundColor: '#111827', padding: { x: 8, y: 4 } })
      .setOrigin(0.5, 0)
      .setVisible(false);
    // level name
    this.levelText = text(this, 16, 54, '', { fontSize: '14px', color: '#9ca3af' });
    this.teamText = text(this, 16, 74, '', { fontSize: '14px', color: '#fde68a' });
    this.dealsText = text(this, 16, 94, '', { fontSize: '14px', color: '#fbbf24' });
    // level 5: the escalation tide comes from below, so its line sits at the bottom
    this.escalationText = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 34, '', { fontSize: '16px', fontStyle: 'bold', color: '#fca5a5', backgroundColor: '#111827', padding: { x: 8, y: 3 } }).setOrigin(0.5, 0).setVisible(false);

    this.hud.add([this.guBarBg, this.guBar, this.guText, this.clockText, this.deathsText, this.narrBox, this.narrText, this.toastText, this.levelText, this.teamText, this.dealsText, this.escalationText]);
    // above the escalation line (bottom centre)
    this.debugText = text(this, 16, GAME_HEIGHT - 84, '', { fontFamily: 'monospace', fontSize: '12px', color: '#a3e635' });

    // warning border, standup overlay, KT overlay, title
    this.border = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0).setStrokeStyle(8, 0xf97316).setVisible(false);
    this.standup = this.add.container(0, 0).setVisible(false);
    this.standup.add([
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a, 0.55).setOrigin(0, 0),
      text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'DAILY STANDUP', { fontSize: '44px', fontStyle: 'bold', color: '#f97316' }).setOrigin(0.5),
      text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, '"Allora, giro veloce..."', { fontSize: '18px' }).setOrigin(0.5),
    ]);
    this.standupCount = text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', { fontSize: '18px', color: '#fbbf24' }).setOrigin(0.5);
    this.standup.add(this.standupCount);

    this.kt = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40).setVisible(false);
    this.ktTitle = text(this, 0, -50, '', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    this.ktLine = text(this, 0, 0, '', { fontSize: '16px', wordWrap: { width: 460 }, align: 'center' }).setOrigin(0.5);
    this.kt.add([this.add.rectangle(0, 0, 520, 150, 0x1f2937, 0.95).setStrokeStyle(2, 0x4b5563), this.add.rectangle(0, -50, 520, 30, 0x4338ca), this.ktTitle, this.ktLine]);

    this.title = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60).setVisible(false);
    this.title.add([
      text(this, 0, 0, 'CONSULTANT LIFE', { fontSize: '56px', fontStyle: 'bold', color: '#fbbf24' }).setOrigin(0.5),
      text(this, 0, 50, touch.enabled ? '◀ ▶ muoviti   SALTA salta   ↺ ricomincia' : '← → / A D muoviti   Spazio salta   R ricomincia', { fontSize: '16px' }).setOrigin(0.5),
      text(this, 0, 78, 'Un rage game sulla consulenza. Il cliente ha sempre ragione.', { fontSize: '14px', color: '#9ca3af' }).setOrigin(0.5),
    ]);

    this.warning = false;
    this.standupLeft = 0;
    this.toastLeft = 0;
    this.narrLeft = 0;
    this.narrPriority = 0;
    this.lastDeathLineAt = -Infinity;
    this.ktLeft = 0;
    this.ktIndex = 0;
    this.blink = 0;
    this.refreshDeaths(0);

    listen(this, {
      [EV.LEVEL_START]: this.onLevelStart,
      [EV.GU_CHANGED]: this.onGu,
      [EV.CLOCK_TICK]: this.onClock,
      [EV.PLAYER_DIED]: (e) => this.refreshDeaths(e.deathsThisRun),
      [EV.NARRATE]: this.onNarrate,
      [EV.TOAST]: this.onToast,
      [EV.STANDUP_WARNING]: () => {
        this.warning = true;
      },
      [EV.STANDUP_START]: (e) => {
        this.warning = false;
        this.border.setVisible(false);
        this.standupLeft = e.durationMs;
        this.standup.setVisible(true);
      },
      [EV.STANDUP_END]: () => this.standup.setVisible(false),
      [EV.KT_CALL_START]: this.onKtStart,
      [EV.KT_CALL_END]: () => {
        this.ktLeft = 0;
        this.kt.setVisible(false);
      },
      [EV.LEVEL_COMPLETE]: () => this.hideAll(),
      [EV.BUDGET_OVER]: () => this.hideAll(),
      [EV.FIRST_MOVE]: () => this.hideTitle(),
      [EV.DEBUG]: (s) => this.debugText.setText(s),
      [EV.TEAM_CHANGED]: ({ count, canDelegate }) => this.showTeam(count, canDelegate),
      [EV.ESCALATION]: ({ text: str, danger }) => {
        this.escalationText.setText(str).setVisible(str !== '');
        this.escalationDanger = danger;
      },
      [EV.DEALS_CHANGED]: ({ count, required }) => this.dealsText.setText(required ? `Pipeline: ${count}/${required}` : ''),
    });
    bus.emit(EV.UI_READY);
  }

  hideAll() {
    this.time.delayedCall(700, () => {
      this.hud.setVisible(false);
      this.standup.setVisible(false);
      this.kt.setVisible(false);
      this.border.setVisible(false);
      this.title.setVisible(false);
    });
  }

  onLevelStart(e) {
    this.hud.setVisible(true);
    this.warning = false;
    this.standup.setVisible(false);
    this.kt.setVisible(false);
    this.levelText.setText(e.career ? `${e.career} — ${e.name}` : e.name ?? '');
    this.showTeam(e.team);
    this.dealsText.setText('');
    this.escalationText.setVisible(false);
    this.refreshDeaths(stats.getRun().deaths);
    if (e.levelId === 'level1' && !session.titleShown) {
      session.titleShown = true;
      this.title.setVisible(true).setAlpha(1);
      this.time.delayedCall(5000, () => this.hideTitle());
    }
  }

  showTeam(count, canDelegate = false) {
    if (count === null || count === undefined) {
      this.teamText.setText('');
      return;
    }
    this.teamText.setText(`Team: ${'● '.repeat(count)}${count === 0 ? 'nessuno' : ''}   [E] delega${canDelegate ? ' ◀' : ''}`);
    this.teamText.setColor(canDelegate ? '#fbbf24' : '#fde68a');
  }

  hideTitle() {
    if (!this.title.visible || this.titleFading) return;
    this.titleFading = true;
    this.tweens.add({ targets: this.title, alpha: 0, duration: 400, onComplete: () => this.title.setVisible(false) });
  }

  onGu({ gu, max }) {
    const ratio = Math.max(0, gu / max);
    this.guBar.width = 200 * ratio;
    this.guBar.fillColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xfacc15 : 0xef4444;
    this.guText.setText(`GU residue: ${formatGu(gu)} / ${max}`);
  }

  onClock({ label, warning }) {
    this.clockText.setText(label);
    if (!warning) this.clockText.setColor('#e5e7eb');
  }

  refreshDeaths(runDeaths) {
    this.deathsText.setText(`Ore non fatturabili: ${stats.getPersistent().totalDeaths}\nQuesto progetto: ${runDeaths}`);
  }

  onNarrate(line) {
    if (line.event === 'death' && line.priority < 2) {
      if (this.time.now - this.lastDeathLineAt < 1200) return;
      this.lastDeathLineAt = this.time.now;
    }
    if (this.narrLeft > 0 && line.priority < this.narrPriority) return;
    this.narrPriority = line.priority;
    this.narrLeft = line.durationMs ?? 3000;
    this.narrText.setText(`Partner: ${line.text}`).setVisible(true);
    this.narrBox.setSize(560, this.narrText.height + 20);
    this.narrBox.setVisible(true);
  }

  onToast({ text: str, durationMs = 2500, color = '#e5e7eb' }) {
    this.toastText.setText(str).setColor(color).setVisible(true);
    this.toastLeft = durationMs;
  }

  onKtStart({ pivoted, durationMs }) {
    this.ktLeft = durationMs;
    this.ktIndex = 0;
    this.ktElapsed = 0;
    this.ktPivoted = pivoted;
    this.ktTitle.setText(pivoted ? 'KT — Passaggio di consegne (vero!)' : 'KT — Passaggio di consegne (durata: 1h)');
    this.ktLine.setText(pivoted ? 'Ecco la lista delle trappole. Prego.' : KT_LINES[0]);
    this.kt.setVisible(true);
  }

  update(_, delta) {
    this.blink += delta;
    if (this.warning) {
      const on = Math.floor(this.blink / 250) % 2 === 0;
      this.clockText.setColor(on ? '#f97316' : '#e5e7eb');
      this.border.setVisible(on);
    }
    if (this.escalationText.visible) {
      const on = !this.escalationDanger || Math.floor(this.blink / 200) % 2 === 0;
      this.escalationText.setColor(on ? '#fca5a5' : '#ffffff');
    }
    if (this.standupLeft > 0) {
      this.standupLeft -= delta;
      this.standupCount.setText(`${Math.max(0, Math.ceil(this.standupLeft / 1000))}`);
    }
    if (this.toastLeft > 0) {
      this.toastLeft -= delta;
      if (this.toastLeft <= 0) this.toastText.setVisible(false);
    }
    if (this.narrLeft > 0) {
      this.narrLeft -= delta;
      if (this.narrLeft <= 0) {
        this.narrText.setVisible(false);
        this.narrBox.setVisible(false);
      }
    }
    if (this.ktLeft > 0 && !this.ktPivoted) {
      this.ktElapsed += delta;
      const i = Math.floor(this.ktElapsed / 1000) % KT_LINES.length;
      if (i !== this.ktIndex) {
        this.ktIndex = i;
        this.ktLine.setText(KT_LINES[i]);
      }
    }
  }
}
