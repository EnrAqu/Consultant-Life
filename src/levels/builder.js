import { LEVEL_ROWS } from '../config/constants.js';

// Tiny helper to author ASCII maps with code instead of 17 hand-typed rows.
export function createGrid(width, rows = LEVEL_ROWS) {
  const cells = Array.from({ length: rows }, () => Array(width).fill('.'));
  const api = {
    fill(x1, x2, y1, y2, ch) {
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) cells[y][x] = ch;
      return api;
    },
    // solid ground from row `top` down to the bottom of the map
    ground(x1, x2, top = 15) {
      return api.fill(x1, x2, top, rows - 1, '#');
    },
    put(x, y, ch) {
      cells[y][x] = ch;
      return api;
    },
    toMap() {
      return cells.map((row) => row.join(''));
    },
  };
  return api;
}
