import { createStorage } from './core/Storage.js';
import StatsTracker, { STATS_KEY } from './core/StatsTracker.js';
import Narrator from './core/Narrator.js';
import Leaderboard, { LEADERBOARD_KEY } from './core/Leaderboard.js';
import { NARRATOR_LINES } from './data/narratorLines.js';
import { DEBUG } from './config/debug.js';

// Page-lifetime singletons shared by all scenes.
export const storage = createStorage();
if (DEBUG.resetStats) {
  storage.remove(STATS_KEY);
  storage.remove(LEADERBOARD_KEY);
}
export const stats = new StatsTracker(storage);
export const narrator = new Narrator(NARRATOR_LINES);
export const leaderboard = new Leaderboard(storage);
// team: juniors carried over between levels (ITERATION_4 §4.1); null until the first team level
export const session = { titleShown: false, team: null };
