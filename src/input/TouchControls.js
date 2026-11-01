// On-screen controls for phones (docs/MOBILE.md): plain DOM over the canvas, no Phaser.
// GameScene reads `state` and the one-shot queues alongside the keyboard. Pointer events per finger
// (pointerId), so running and jumping work together.
const STYLE = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; display: none; }
#touch.on { display: block; }
#touch .btn { position: absolute; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
  display: flex; align-items: center; justify-content: center; color: #f8fafc; font: 700 22px system-ui, sans-serif;
  background: rgba(15, 23, 42, 0.38); border: 2px solid rgba(248, 250, 252, 0.45); border-radius: 18px; }
#touch .btn.down { background: rgba(251, 191, 36, 0.45); }
#touch .pad { left: max(16px, env(safe-area-inset-left)); bottom: 18px; width: 210px; height: 96px; justify-content: space-around; font-size: 34px; }
#touch .pad span { flex: 1; text-align: center; }
#touch .pad.left span:first-child, #touch .pad.right span:last-child { color: #fbbf24; }
#touch .jump { right: max(16px, env(safe-area-inset-right)); bottom: 18px; width: 108px; height: 108px; border-radius: 50%; font-size: 17px; }
#touch .small { width: 58px; height: 58px; border-radius: 50%; font-size: 15px; bottom: 140px; }
#touch .delegate { right: max(78px, calc(env(safe-area-inset-right) + 62px)); }
#touch .delegate.ready { border-color: #fbbf24; color: #fbbf24; }
#touch .restart { right: max(10px, env(safe-area-inset-right)); }
#rotate { position: fixed; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center; text-align: center;
  background: #0b0d12; color: #fbbf24; font: 700 22px system-ui, sans-serif; padding: 24px; }
@media (orientation: portrait) and (pointer: coarse) { #rotate { display: flex; } }
`;

// keep receiving a finger's events after it slides off the button (fails harmlessly for synthetic events)
function capture(el, pointerId) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // not an active pointer
  }
}

function isTouchDevice() {
  try {
    if (new URLSearchParams(globalThis.location?.search ?? '').get('touch') === '1') return true;
    return Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches);
  } catch {
    return false;
  }
}

class TouchControls {
  constructor() {
    this.enabled = typeof document !== 'undefined' && isTouchDevice();
    this.state = { left: false, right: false, jumpHeld: false };
    this.queued = { jump: false, delegate: false, restart: false };
    if (this.enabled) this.build();
  }

  build() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.append(style);
    const rotate = document.createElement('div');
    rotate.id = 'rotate';
    rotate.textContent = 'Ruota il telefono in orizzontale. Il cliente vuole il formato 16:9.';
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.innerHTML = `
      <div class="btn pad"><span>◀</span><span>▶</span></div>
      <div class="btn jump">SALTA</div>
      <div class="btn small delegate">E</div>
      <div class="btn small restart">↺</div>`;
    document.body.append(rotate, this.root);
    // no context menu, no double-tap zoom, no scrolling the page with a swipe
    for (const ev of ['contextmenu', 'touchstart', 'touchmove', 'gesturestart']) {
      this.root.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    }
    this.pad = this.root.querySelector('.pad');
    this.delegateBtn = this.root.querySelector('.delegate');
    this.bindPad();
    this.bindButton(this.root.querySelector('.jump'), (down) => {
      this.state.jumpHeld = down;
      if (down) this.queued.jump = true;
    });
    this.bindButton(this.delegateBtn, (down) => down && (this.queued.delegate = true));
    this.bindButton(this.root.querySelector('.restart'), (down) => down && (this.queued.restart = true));
    // first touch anywhere: try fullscreen and landscape (not supported everywhere: never mind)
    document.addEventListener('pointerdown', () => this.goFullscreen(), { once: true });
  }

  goFullscreen() {
    try {
      const p = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      p?.then?.(() => globalThis.screen?.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    } catch {
      // no fullscreen on this browser
    }
  }

  // ◀ ▶ as one area: the half under each finger counts, so a finger can slide from one side to the other
  bindPad() {
    const fingers = new Map();
    const refresh = () => {
      const sides = [...fingers.values()];
      this.state.left = sides.includes('left');
      this.state.right = sides.includes('right');
      this.pad.classList.toggle('down', sides.length > 0);
      this.pad.classList.toggle('left', this.state.left);
      this.pad.classList.toggle('right', this.state.right);
    };
    const side = (e) => {
      const r = this.pad.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2 ? 'left' : 'right';
    };
    this.pad.addEventListener('pointerdown', (e) => {
      capture(this.pad, e.pointerId);
      fingers.set(e.pointerId, side(e));
      refresh();
    });
    this.pad.addEventListener('pointermove', (e) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, side(e));
      refresh();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.pad.addEventListener(ev, (e) => {
        fingers.delete(e.pointerId);
        refresh();
      });
    }
  }

  bindButton(el, onChange) {
    const fingers = new Set();
    el.addEventListener('pointerdown', (e) => {
      capture(el, e.pointerId);
      fingers.add(e.pointerId);
      el.classList.add('down');
      onChange(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      el.addEventListener(ev, (e) => {
        if (!fingers.delete(e.pointerId)) return;
        if (fingers.size > 0) return;
        el.classList.remove('down');
        onChange(false);
      });
    }
  }

  // read-and-clear for the one-shot actions
  take(name) {
    const v = this.queued[name];
    this.queued[name] = false;
    return v;
  }

  setVisible(on) {
    if (!this.enabled) return;
    this.root.classList.toggle('on', on);
    if (!on) {
      this.state = { left: false, right: false, jumpHeld: false };
      this.queued = { jump: false, delegate: false, restart: false };
    }
  }

  setDelegateReady(ready) {
    this.delegateBtn?.classList.toggle('ready', ready);
  }
}

export const touch = new TouchControls();

// "Premi Spazio" on a keyboard, "Tocca lo schermo" on a phone.
export const pressLabel = (keys = 'Premi Spazio') => (touch.enabled ? 'Tocca lo schermo' : keys);
