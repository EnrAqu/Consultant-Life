import { createStorage } from './core/Storage.js';
import StatsTracker, { STATS_KEY } from './core/StatsTracker.js';
import Narrator from './core/Narrator.js';
import Leaderboard, { LEADERBOARD_KEY } from './core/Leaderboard.js';
import { NARRATOR_LINES } from './data/narratorLines.js';
import { DEBUG } from './config/debug.js';
import { createLeaderboardApi, resolveApiUrl, normalizeName, NAME_KEY } from './services/leaderboardApi.js';

// Page-lifetime singletons shared by all scenes.
export const storage = createStorage();
if (DEBUG.resetStats) {
  storage.remove(STATS_KEY);
  storage.remove(LEADERBOARD_KEY);
}
export const stats = new StatsTracker(storage);
export const narrator = new Narrator(NARRATOR_LINES);
export const leaderboard = new Leaderboard(storage);
// shared online leaderboard (docs/LEADERBOARD.md); disabled on a local host unless VITE_LEADERBOARD_API_URL or ?lbApi=
const where = (() => {
  try {
    return { hostname: globalThis.location?.hostname ?? '', override: new URLSearchParams(globalThis.location?.search ?? '').get('lbApi') };
  } catch {
    return { hostname: '', override: null };
  }
})();
export const leaderboardApi = createLeaderboardApi({ baseUrl: resolveApiUrl({ envUrl: import.meta.env?.VITE_LEADERBOARD_API_URL, ...where }) });
// the player's name for the online leaderboard: null until asked (first completed level), '' = Anonimo
export const playerName = {
  get: () => {
    const v = storage.load(NAME_KEY, null);
    return typeof v === 'string' ? normalizeName(v) : null;
  },
  set: (name) => storage.save(NAME_KEY, normalizeName(name)),
};
// team: juniors carried over between levels (ITERATION_4 §4.1); null until the first team level
// outfitOverride: set by the Partner ending, the next campaign is played dressed as a Partner
// burnout: carried between levels (docs/BURNOUT.md); null until the first level; burnoutCleanBonus: -5% owed to the next level
export const session = { titleShown: false, team: null, outfitOverride: null, burnout: null, burnoutCleanBonus: false };
