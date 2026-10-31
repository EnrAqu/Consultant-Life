const WEIGHTS = { runDeathsExact: 3, minSpot: 2 };
const HISTORY_SIZE = 6;

const MATCHERS = {
  cause: (v, ctx) => ctx.cause === v,
  levelId: (v, ctx) => ctx.levelId === v,
  minSpot: (v, ctx) => (ctx.spotCount ?? 0) >= v,
  minRunDeaths: (v, ctx) => (ctx.runDeaths ?? 0) >= v,
  maxRunDeaths: (v, ctx) => (ctx.runDeaths ?? 0) <= v,
  runDeathsExact: (v, ctx) => ctx.runDeaths === v,
  minTotalDeaths: (v, ctx) => (ctx.totalDeaths ?? 0) >= v,
  minCauseDeaths: (v, ctx) => (ctx.causeDeaths ?? 0) >= v,
};

function specificity(when) {
  return Object.keys(when).reduce((sum, k) => sum + (WEIGHTS[k] ?? 1), 0);
}

function defaultPriority(line) {
  if (line.event === 'budgetOver' || line.event === 'levelComplete') return 3;
  if (line.when.minSpot !== undefined || line.when.runDeathsExact !== undefined) return 2;
  return 1;
}

export function fillTemplate(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (_, key) => (ctx[key] === undefined || ctx[key] === null ? '' : String(ctx[key])));
}

export default class Narrator {
  constructor(lines, rng = Math.random) {
    this.lines = lines.map((l) => ({ ...l, when: l.when ?? {} }));
    this.rng = rng;
    this.history = [];
  }

  matches(line, ctx) {
    return Object.entries(line.when).every(([k, v]) => MATCHERS[k]?.(v, ctx) ?? false);
  }

  pick(event, ctx = {}) {
    const candidates = this.lines.filter((l) => l.event === event && this.matches(l, ctx));
    if (candidates.length === 0) return null;
    const best = Math.max(...candidates.map((l) => specificity(l.when)));
    let pool = candidates.filter((l) => specificity(l.when) === best);
    const fresh = pool.filter((l) => !this.history.includes(l.id));
    if (fresh.length > 0) pool = fresh;
    const line = pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
    this.history.push(line.id);
    if (this.history.length > HISTORY_SIZE) this.history.shift();
    return { id: line.id, text: fillTemplate(line.text, ctx), priority: line.priority ?? defaultPriority(line) };
  }
}
