import { GAME_WIDTH, TEXT_RESOLUTION, UI_FONT } from '../config/constants.js';
import { formatDuration } from '../core/format.js';
import { playerName, leaderboardApi } from '../state.js';
import { filterNameInput, normalizeName, DEFAULT_NAME, NAME_MAX } from '../services/leaderboardApi.js';
import { touch } from '../input/TouchControls.js';

// The online part of an end screen (docs/LEADERBOARD.md): the name (asked once, at the first completed level),
// the submission and its outcome. Names are always drawn as Phaser text, never as HTML.
const style = (size, color, wrap) => ({ fontFamily: UI_FONT, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION, wordWrap: wrap ? { width: wrap } : undefined });

export const rankLine = (r) => `Classifica online: #${r.rankTime} per tempo, #${r.rankShame} nella classifica della vergogna`;

// A DOM <input> laid over the canvas at game coordinates (x, y), width w. Its keys never reach Phaser
// (stopPropagation), so Space and Enter typed here do not skip the screen.
function createNameInput(scene, { x, y, w, value, onConfirm }) {
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = NAME_MAX;
  el.value = value;
  el.placeholder = DEFAULT_NAME;
  el.autocomplete = 'off';
  el.spellcheck = false;
  el.setAttribute('autocapitalize', 'off');
  el.setAttribute('aria-label', 'Il tuo nome per la classifica online');
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '20',
    boxSizing: 'border-box',
    font: `600 16px ${UI_FONT}`,
    padding: '4px 8px',
    border: '2px solid #1d4ed8',
    borderRadius: '4px',
    background: '#ffffff',
    color: '#111827',
    userSelect: 'text',
    webkitUserSelect: 'text',
    touchAction: 'manipulation',
    outline: 'none',
  });
  const place = () => {
    const rect = scene.game.canvas.getBoundingClientRect();
    const k = rect.width / GAME_WIDTH;
    Object.assign(el.style, { left: `${rect.left + x * k}px`, top: `${rect.top + y * k}px`, width: `${w * k}px`, fontSize: `${Math.max(12, 16 * k)}px` });
  };
  place();
  el.addEventListener('input', () => {
    const v = filterNameInput(el.value);
    if (v !== el.value) el.value = v;
  });
  for (const type of ['keydown', 'keyup', 'keypress']) {
    el.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type === 'keydown' && e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    });
  }
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  globalThis.addEventListener?.('resize', place);
  document.body.appendChild(el);
  // on touch the virtual keyboard opens only on a tap; on desktop we can focus right away
  if (!touch.enabled) setTimeout(() => el.focus(), 0);
  return {
    el,
    remove() {
      globalThis.removeEventListener?.('resize', place);
      el.remove();
    },
  };
}

// Mounts the name prompt + submission at (x, y). `online` is the payload from GameScene.completeLevel
// ({ attempt, result }) or null. Returns { finish(), hits(objects), done } :
//  - finish(): call before leaving the screen; an open name field is confirmed as typed (empty = Anonimo);
//  - hits(currentlyOver): true when a tap landed on "cambia nome" (the screen must not be skipped);
//  - done: promise of the submission outcome (or null when there is nothing to send).
export function mountOnlineScore(scene, online, { x, y, wrap = 520, color = '#111827', accent = '#1d4ed8', muted = '#6b7280', inputWidth = 220 }) {
  if (!online) return { finish() {}, hits: () => false, done: Promise.resolve(null) };
  const status = scene.add.text(x, y, '', style(15, color, wrap));
  const change = scene.add.text(x, y, '', style(13, accent)).setVisible(false);
  let input = null;
  let resolveDone;
  const done = new Promise((r) => {
    resolveDone = r;
  });
  const alive = () => status.active && scene.sys.isActive();

  const showName = () => {
    const n = playerName.get();
    change.setText(`come ${n || DEFAULT_NAME} — cambia nome`).setPosition(x, status.y + status.height + 4).setVisible(true);
  };

  const submit = () => {
    status.setText('Invio alla classifica online…').setColor(muted);
    online.attempt.submit(online.result, playerName.get() ?? '').then((r) => {
      if (alive()) {
        status.setText(r.ok ? rankLine(r) : r.message).setColor(r.ok ? accent : muted);
        if (!input) showName();
      }
      resolveDone(r);
    });
  };

  const openInput = (afterConfirm) => {
    if (input) return;
    change.setVisible(false);
    const label = scene.add.text(x, status.y + status.height + 6, 'Il tuo nome per la classifica online (Invio per confermare, vuoto = Anonimo):', style(13, muted, wrap));
    input = createNameInput(scene, {
      x,
      y: label.y + label.height + 4,
      w: inputWidth,
      value: playerName.get() ?? '',
      onConfirm: () => confirm(),
    });
    const confirm = () => {
      if (!input) return;
      playerName.set(normalizeName(input.el.value));
      input.remove();
      input = null;
      if (label.active) label.destroy();
      afterConfirm?.();
      if (alive() && status.text && !status.text.startsWith('Invio')) showName();
    };
    input.confirm = confirm;
  };

  change.setInteractive({ useHandCursor: true }).on('pointerdown', () => openInput(null));
  scene.events.once('shutdown', () => {
    input?.confirm();
  });

  if (playerName.get() === null) {
    status.setText('Prima volta in classifica: come ti chiami?').setColor(accent);
    openInput(submit);
  } else {
    submit();
  }

  return {
    finish: () => input?.confirm(),
    hits: (over) => Array.isArray(over) && over.includes(change),
    done,
  };
}

// Top N of a level, online: two columns (fastest, shame) at (x, y). Falls back to `localTop` (the browser's own
// leaderboard) with an "offline" note when the API does not answer.
export async function drawLevelTop(scene, levelId, { x, y, colW = 130, n = 5, color = '#111827', accent = '#1d4ed8', shame = '#b91c1c', muted = '#6b7280', localTop, fresh = false }) {
  const loading = scene.add.text(x, y, 'Classifica online: caricamento…', style(13, muted));
  const [times, worst] = await Promise.all([leaderboardApi.top(levelId, 'time', n, { fresh }), leaderboardApi.top(levelId, 'shame', n, { fresh })]);
  if (!loading.active) return;
  loading.destroy();
  const offline = !times || !worst;
  const t = offline ? localTop.time : times;
  const s = offline ? localTop.shame : worst;
  scene.add.text(x, y, offline ? 'Classifica (offline: solo questo browser)' : 'Classifica online', style(14, offline ? muted : accent));
  const cols = [
    { title: 'Più veloci', list: t, c: accent, line: (e) => `${formatDuration(e.timeMs)} ${e.name ?? ''}` },
    { title: 'Vergogna (morti)', list: s, c: shame, line: (e) => `${e.deaths} ${e.name ?? ''}` },
  ];
  cols.forEach((col, i) => {
    const cx = x + i * colW;
    scene.add.text(cx, y + 20, col.title, style(13, col.c));
    if (col.list.length === 0) scene.add.text(cx, y + 38, 'Ancora nessun punteggio', style(12, muted));
    col.list.slice(0, n).forEach((e, k) => scene.add.text(cx, y + 38 + k * 16, `${k + 1}. ${col.line(e)}`.trim(), style(12, color, colW - 6)));
  });
}
