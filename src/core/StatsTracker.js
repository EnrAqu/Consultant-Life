import { CAUSES, DEFAULT_PIVOT_CAUSE, INCIDENT_WEIGHT } from '../data/causes.js';

export const STATS_KEY = 'ragebait.stats.v1';
const SPOT_SIZE = 64;

function emptyLevel() {
  return { runs: 0, completions: 0, budgetOvers: 0, deaths: 0, deathsByCause: {} };
}

function emptyPersistent() {
  return { version: 1, totalDeaths: 0, totalGuBurned: 0, deathsByCause: {}, levels: {} };
}

function emptyRun(levelId) {
  return {
    levelId,
    deaths: 0,
    deathsByCause: {},
    incidentsByCause: {},
    guLostByCause: {},
    lastIncidentAt: {},
    spots: {},
    pickups: { coffee: 0, fakeKT: 0, realKT: 0 },
    timeMs: 0,
  };
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sanitize(raw) {
  const base = emptyPersistent();
  if (!isObject(raw) || raw.version !== 1) return base;
  const merged = { ...base, ...raw };
  if (typeof merged.totalDeaths !== 'number') merged.totalDeaths = 0;
  if (typeof merged.totalGuBurned !== 'number') merged.totalGuBurned = 0;
  if (!isObject(merged.deathsByCause)) merged.deathsByCause = {};
  if (!isObject(merged.levels)) merged.levels = {};
  for (const id of Object.keys(merged.levels)) {
    merged.levels[id] = isObject(merged.levels[id]) ? { ...emptyLevel(), ...merged.levels[id] } : emptyLevel();
  }
  return merged;
}

const inc = (obj, key, by = 1) => {
  obj[key] = (obj[key] ?? 0) + by;
  return obj[key];
};

export default class StatsTracker {
  constructor(storage) {
    this.storage = storage;
    this.persistent = sanitize(storage.load(STATS_KEY, null));
    this.run = emptyRun(null);
    this.seq = 0;
  }

  save() {
    this.storage.save(STATS_KEY, this.persistent);
  }

  level(levelId = this.run.levelId) {
    if (!this.persistent.levels[levelId]) this.persistent.levels[levelId] = emptyLevel();
    return this.persistent.levels[levelId];
  }

  startRun(levelId) {
    this.run = emptyRun(levelId);
    this.level(levelId).runs += 1;
    this.save();
  }

  touchIncident(cause, weight) {
    inc(this.run.incidentsByCause, cause, weight);
    this.run.lastIncidentAt[cause] = ++this.seq;
  }

  recordDeath({ cause, x, y }) {
    const spotKey = `${Math.floor(x / SPOT_SIZE)}:${Math.floor(y / SPOT_SIZE)}`;
    const run = this.run;
    run.deaths += 1;
    const causeDeaths = inc(run.deathsByCause, cause);
    const spotCount = inc(run.spots, spotKey);
    this.touchIncident(cause, INCIDENT_WEIGHT.death);

    const p = this.persistent;
    p.totalDeaths += 1;
    inc(p.deathsByCause, cause);
    const lvl = this.level();
    lvl.deaths += 1;
    inc(lvl.deathsByCause, cause);
    this.save();

    return { spotKey, spotCount, deathsThisRun: run.deaths, totalDeaths: p.totalDeaths, causeDeaths };
  }

  recordGuLoss(cause, amount) {
    inc(this.run.guLostByCause, cause, amount);
    this.persistent.totalGuBurned += amount;
  }

  recordFakeKT() {
    this.run.pickups.fakeKT += 1;
    this.recordIncident('fakeKT');
  }

  // Non-lethal incidents (fake KT, micromanager, colleague) count for the Lessons Learned.
  recordIncident(cause) {
    this.touchIncident(cause, INCIDENT_WEIGHT[cause] ?? 1);
  }

  recordPickup(kind) {
    inc(this.run.pickups, kind);
  }

  addTime(ms) {
    this.run.timeMs += ms;
  }

  completeRun() {
    this.level().completions += 1;
    this.save();
  }

  failRun() {
    this.level().budgetOvers += 1;
    this.save();
  }

  getRun() {
    return this.run;
  }

  getPersistent() {
    return this.persistent;
  }

  dominantPivotCause(run = this.run) {
    const pick = (filter) => {
      let best = null;
      for (const [cause, incidents] of Object.entries(run.incidentsByCause)) {
        if (!CAUSES[cause] || !filter(cause) || incidents <= 0) continue;
        const at = run.lastIncidentAt[cause] ?? 0;
        if (!best || incidents > best.incidents || (incidents === best.incidents && at > best.at)) {
          best = { cause, incidents, at };
        }
      }
      return best;
    };

    const pivot = pick((c) => CAUSES[c].pivotable);
    const top = pick(() => true);
    const realCause =
      top && !CAUSES[top.cause].pivotable && (!pivot || top.incidents > pivot.incidents) ? top.cause : null;

    const cause = pivot ? pivot.cause : DEFAULT_PIVOT_CAUSE;
    return {
      cause,
      incidents: pivot ? pivot.incidents : 0,
      deaths: run.deathsByCause[cause] ?? 0,
      guLost: run.guLostByCause[cause] ?? 0,
      isDefault: !pivot,
      realCause,
    };
  }
}
