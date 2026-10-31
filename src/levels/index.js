import level1 from './level1.js';
import level2 from './level2.js';

export const LEVELS = { level1, level2 };

// Campaign order; the next level gets a Lessons Learned slide in between.
export const LEVEL_ORDER = Object.keys(LEVELS);
export const nextLevel = (id) => LEVEL_ORDER[LEVEL_ORDER.indexOf(id) + 1] ?? null;
export const projectNumber = (id) => LEVEL_ORDER.indexOf(id) + 1;
