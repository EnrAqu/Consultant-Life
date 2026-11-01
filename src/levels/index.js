import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import level4 from './level4.js';
import level5 from './level5.js';

export const LEVELS = { level1, level2, level3, level4, level5 };

// Campaign order; the next level gets a Lessons Learned slide in between.
export const LEVEL_ORDER = Object.keys(LEVELS);
export const nextLevel = (id) => LEVEL_ORDER[LEVEL_ORDER.indexOf(id) + 1] ?? null;
export const projectNumber = (id) => LEVEL_ORDER.indexOf(id) + 1;
