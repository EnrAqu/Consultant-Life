import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { setupScreenCamera, fadeIn } from './sceneUtils.js';
import { formatDuration } from '../core/format.js';
import { leaderboard, leaderboardApi } from '../state.js';
import { LEVEL_ORDER, projectNumber } from '../levels/index.js';
import { touch } from '../input/TouchControls.js';

// The homepage (docs/LEADERBOARD.md §Homepage, user 2026-11-03): only when the page opens. "Nuova partita" starts
// at once (Space / Enter / tap), "Classifica" shows the online leaderboard of every project. Restarts and retries
// never come back here.
const style = (size, color = '#e5e7eb', extra = {}) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION, ...extra });
const ROWS = 10;
const ACCENT = '#fbbf24';
const SHAME = '#f87171';
const MUTED = '#9ca3af';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    setupScreenCamera(this);
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    this.started = false;
    this.cache = new Map();
    this.menu = this.add.container(0, 0);
    this.board = this.add.container(0, 0).setVisible(false);
    this.buildMenu();
    this.buildBoard();
    this.showMenu();

    // one generic listener, keyed by event.code; the same DOM event is never handled twice (seen in headless
    // Chrome: two keys in one frame could replay an event and start the game from "Classifica")
    const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', NumpadEnter: 'ok', Space: 'space', Escape: 'back', Backspace: 'back', KeyL: 'board' };
    const seen = new WeakSet();
    this.input.keyboard.on('keydown', (event) => {
      if (seen.has(event) || event.repeat) return;
      seen.add(event);
      if (KEYS[event.code]) this.onKey(KEYS[event.code]);
    });
  }

  // --- menu ---
  buildMenu() {
    const cx = GAME_WIDTH / 2;
    this.menu.add(this.add.text(cx, 120, 'Consultant Life', style(56, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5));
    this.menu.add(this.add.text(cx, 178, 'Un platformer sulla consulenza. Ogni morte è un\'ora non fatturabile.', style(18, MUTED)).setOrigin(0.5));
    this.items = [
      { label: 'Nuova partita', action: () => this.newGame() },
      { label: 'Classifica', action: () => this.showBoard() },
    ];
    this.items.forEach((item, i) => {
      const y = 280 + i * 70;
      const bg = this.add.rectangle(cx, y, 320, 54, 0x1f2937).setStrokeStyle(2, 0x374151).setInteractive({ useHandCursor: true });
      const label = this.add.text(cx, y, item.label, style(24)).setOrigin(0.5);
      bg.on('pointerover', () => this.select(i));
      bg.on('pointerdown', () => {
        this.select(i);
        item.action();
      });
      item.bg = bg;
      item.text = label;
      this.menu.add([bg, label]);
    });
    const hint = touch.enabled ? 'Tocca un pulsante' : 'Spazio: nuova partita   ·   ↑ ↓ e Invio per scegliere   ·   L: classifica';
    this.menu.add(this.add.text(cx, GAME_HEIGHT - 50, hint, style(14, MUTED)).setOrigin(0.5));
    this.selected = 0;
  }

  select(i) {
    this.selected = i;
    this.items.forEach((item, k) => {
      const on = k === i;
      item.bg.setFillStyle(on ? 0x1d4ed8 : 0x1f2937).setStrokeStyle(2, on ? 0x60a5fa : 0x374151);
      item.text.setColor(on ? '#ffffff' : '#e5e7eb');
    });
  }

  showMenu() {
    this.view = 'menu';
    this.board.setVisible(false);
    this.menu.setVisible(true);
    this.select(this.selected);
  }

  newGame() {
    if (this.started) return;
    this.started = true;
    // as BootScene used to do: the HUD first, so its listeners exist before GameScene emits the initial state
    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.scene.start('GameScene', { levelId: LEVEL_ORDER[0], pivotCause: null });
  }

  onKey(key) {
    if (this.started) return;
    if (this.view === 'menu') {
      if (key === 'up' || key === 'down') this.select((this.selected + (key === 'up' ? -1 : 1) + this.items.length) % this.items.length);
      // Space always starts a game ("un solo schermo, un tasto"); Enter confirms the selected item
      else if (key === 'space') this.newGame();
      else if (key === 'ok') this.items[this.selected].action();
      else if (key === 'board') this.showBoard();
      return;
    }
    if (key === 'back' || key === 'ok' || key === 'space' || key === 'board') this.showMenu();
    else if (key === 'left' || key === 'up') this.showLevel(this.level - 1);
    else if (key === 'right' || key === 'down') this.showLevel(this.level + 1);
  }

  // --- leaderboard ---
  buildBoard() {
    const cx = GAME_WIDTH / 2;
    this.boardTitle = this.add.text(cx, 48, '', style(30, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
    this.boardNote = this.add.text(cx, 84, '', style(14, MUTED)).setOrigin(0.5);
    const prev = this.add.text(cx - 260, 48, '◀', style(30, ACCENT)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const next = this.add.text(cx + 260, 48, '▶', style(30, ACCENT)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    prev.on('pointerdown', () => this.showLevel(this.level - 1));
    next.on('pointerdown', () => this.showLevel(this.level + 1));
    this.colX = [90, GAME_WIDTH / 2 + 30];
    const heads = [
      this.add.text(this.colX[0], 116, 'I più veloci', style(20, ACCENT)),
      this.add.text(this.colX[1], 116, 'Classifica della vergogna', style(20, SHAME)),
    ];
    this.rows = [[], []];
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < ROWS; r++) this.rows[c].push(this.add.text(this.colX[c], 152 + r * 28, '', style(17)));
    }
    this.status = this.add.text(cx, 290, '', style(18, MUTED)).setOrigin(0.5);
    const back = this.add.text(cx, GAME_HEIGHT - 50, '', style(16, ACCENT)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.setText(touch.enabled ? '◀ ▶ cambia progetto   ·   Tocca qui per tornare indietro' : '← → cambia progetto   ·   Esc per tornare indietro');
    back.on('pointerdown', () => this.showMenu());
    this.board.add([this.boardTitle, this.boardNote, prev, next, ...heads, ...this.rows[0], ...this.rows[1], this.status, back]);
    this.level = 0;
  }

  showBoard() {
    this.view = 'board';
    this.menu.setVisible(false);
    this.board.setVisible(true);
    this.showLevel(this.level);
  }

  async showLevel(i) {
    this.level = (i + LEVEL_ORDER.length) % LEVEL_ORDER.length;
    const levelId = LEVEL_ORDER[this.level];
    this.boardTitle.setText(`Progetto ${projectNumber(levelId)}`);
    for (const col of this.rows) for (const t of col) t.setText('');
    let data = this.cache.get(levelId);
    if (!data) {
      this.status.setText(leaderboardApi.enabled ? 'Caricamento…' : '');
      this.boardNote.setText('');
      const [times, shame] = leaderboardApi.enabled ? await Promise.all([leaderboardApi.top(levelId, 'time', ROWS), leaderboardApi.top(levelId, 'shame', ROWS)]) : [null, null];
      const online = Boolean(times && shame);
      data = online ? { online, times, shame } : { online, times: leaderboard.topTime(levelId, ROWS), shame: leaderboard.topShame(levelId, ROWS) };
      if (online) this.cache.set(levelId, data);
      if (!this.scene.isActive() || LEVEL_ORDER[this.level] !== levelId) return;
    }
    this.boardNote.setText(data.online ? 'Classifica online' : leaderboardApi.enabled ? 'Classifica online non raggiungibile: questi sono i tuoi tempi, solo in questo browser' : 'I tuoi tempi, solo in questo browser');
    const who = (e) => e.name ?? 'tu';
    const lines = [
      data.times.map((e, k) => `${k + 1}.  ${who(e)}   ${formatDuration(e.timeMs)}  (${e.deaths} morti)`),
      data.shame.map((e, k) => `${k + 1}.  ${who(e)}   ${e.deaths} morti  (${formatDuration(e.timeMs)})`),
    ];
    lines.forEach((col, c) => col.forEach((line, r) => this.rows[c][r].setText(line)));
    this.status.setText(data.times.length === 0 ? 'Ancora nessun punteggio' : '');
  }
}
