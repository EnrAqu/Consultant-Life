export const LEADERBOARD_KEY = 'ragebait.leaderboard.v1';
const KEEP = 25;
const TOP = 5;

const byTime = (a, b) => a.timeMs - b.timeMs || a.deaths - b.deaths;
const byShame = (a, b) => b.deaths - a.deaths || a.timeMs - b.timeMs;

function sanitize(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) return { version: 1, entries: [] };
  return { version: 1, entries: raw.entries.filter((e) => e && typeof e.levelId === 'string' && Number.isFinite(e.timeMs) && Number.isFinite(e.deaths)) };
}

// Local "temporary" leaderboard (ITERATION_2 §8): best times + Hall of Shame (most deaths), per level.
export default class Leaderboard {
  constructor(storage) {
    this.storage = storage;
    this.data = sanitize(storage.load(LEADERBOARD_KEY, null));
  }

  forLevel(levelId) {
    return this.data.entries.filter((e) => e.levelId === levelId);
  }

  topTime(levelId, n = TOP) {
    return this.forLevel(levelId).sort(byTime).slice(0, n);
  }

  topShame(levelId, n = TOP) {
    return this.forLevel(levelId).sort(byShame).slice(0, n);
  }

  // Returns 1-based ranks, or null when the entry is outside the top 5.
  record({ levelId, timeMs, deaths, guLeft, at = new Date().toISOString() }) {
    const entry = { levelId, timeMs, deaths, guLeft, at };
    this.data.entries.push(entry);
    const level = this.forLevel(levelId);
    const keep = new Set([...[...level].sort(byTime).slice(0, KEEP), ...[...level].sort(byShame).slice(0, KEEP)]);
    this.data.entries = this.data.entries.filter((e) => e.levelId !== levelId || keep.has(e));
    this.storage.save(LEADERBOARD_KEY, this.data);
    const rank = (list) => {
      const i = list.indexOf(entry);
      return i >= 0 ? i + 1 : null;
    };
    return { timeRank: rank(this.topTime(levelId)), shameRank: rank(this.topShame(levelId)) };
  }
}
