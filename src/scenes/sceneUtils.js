import { RENDER_SCALE, FADE_MS, TILE, TEXTURE_SCALE, DEPTH } from '../config/constants.js';
import { TILE_ONEWAY } from '../core/LevelParser.js';

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

// The level's tiles: an invisible collision layer on the logical grid, plus an HD visual layer drawn with big frames
// of `hdKey` and scaled down. `frameOf(tile, x, y, tiles)` picks the frame index of each cell (-1 = nothing).
// Returns the collision layer.
export function buildTileLayers(scene, tiles, hdKey, frameOf) {
  const map = scene.make.tilemap({ data: tiles, tileWidth: TILE, tileHeight: TILE });
  const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
  const layer = map.createLayer(0, tileset, 0, 0).setVisible(false);
  layer.setCollision([0, TILE_ONEWAY]);
  layer.forEachTile((tile) => {
    if (tile.index === TILE_ONEWAY) tile.setCollision(false, false, true, false);
  });
  const visual = tiles.map((row, y) => row.map((t, x) => frameOf(t, x, y, tiles)));
  const hd = TILE * TEXTURE_SCALE;
  const vmap = scene.make.tilemap({ data: visual, tileWidth: hd, tileHeight: hd });
  const vset = vmap.addTilesetImage(hdKey, hdKey, hd, hd, 0, 0);
  vmap.createLayer(0, vset, 0, 0).setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.tiles);
  return layer;
}
