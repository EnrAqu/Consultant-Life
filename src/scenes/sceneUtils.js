import { RENDER_SCALE, FADE_MS } from '../config/constants.js';

// Screen-space scenes (HUD, slides): zoom in and anchor at the top-left, so layouts stay in 960×540.
export function setupScreenCamera(scene) {
  scene.cameras.main.setZoom(RENDER_SCALE).setOrigin(0, 0);
}

export function fadeIn(scene) {
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}

// Fade out, then start another scene (cosmetic only, never used for trap logic).
export function fadeTo(scene, key, data) {
  // guard: two keys pressed together must not start the next scene twice
  if (scene.leaving) return;
  scene.leaving = true;
  scene.events.once('shutdown', () => {
    scene.leaving = false;
  });
  const cam = scene.cameras.main;
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  cam.fadeOut(FADE_MS, 0, 0, 0);
}
