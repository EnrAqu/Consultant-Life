// Shared online leaderboard (docs/LEADERBOARD.md): the only module that talks to the network.
// API: Azure Functions in the Consultant-Life-Leaderboard repo (api/openapi.yaml). No keys in the client.
// Every call fails soft: on any error the game goes on and the score stays in the local leaderboard.

export const PROD_API_URL = 'https://conslife-func-oeuiuzlliqsio.azurewebsites.net/api';
// levels the API accepts (app setting `Levels`); the farm is not a race
export const ONLINE_LEVELS = ['level1', 'level2', 'level3', 'level4', 'level5'];
export const NAME_KEY = 'ragebait.playerName.v1';
export const NAME_MAX = 16;
export const DEFAULT_NAME = 'Anonimo';
export const OFFLINE_MESSAGE = 'Classifica online non raggiungibile';
const TIMEOUT_MS = 5000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '']);

// Where the API lives. An explicit VITE_LEADERBOARD_API_URL wins; otherwise production, except on a local host
// (dev server, `vite preview`, smoke tests): there the CORS of production refuses us anyway, so we stay local-only.
// `override` (the ?lbApi= URL param) only works on a local host: it points a local build at `func start` or a mock.
export function resolveApiUrl({ envUrl, hostname, override } = {}) {
  const clean = (u) => (typeof u === 'string' ? u.trim().replace(/\/+$/, '') : '');
  const local = LOCAL_HOSTS.has(hostname ?? '');
  if (local && clean(override)) return clean(override);
  if (clean(envUrl)) return clean(envUrl);
  return local ? '' : PROD_API_URL;
}

// --- names: same rule as the server (1-16 of [A-Za-z0-9 _-] after trim and space folding; empty = Anonimo) ---
export function filterNameInput(raw) {
  return String(raw ?? '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .slice(0, NAME_MAX);
}

export function normalizeName(raw) {
  return filterNameInput(raw).replace(/\s+/g, ' ').trim();
}

export function isValidName(name) {
  return typeof name === 'string' && (name === '' || /^[A-Za-z0-9 _-]{1,16}$/.test(name)) && name === name.trim() && !/\s{2}/.test(name);
}

// guLeft: 0..20 in steps of 0.5
export function roundGu(gu) {
  const v = Number.isFinite(gu) ? gu : 0;
  return Math.min(20, Math.max(0, Math.round(v * 2) / 2));
}

// A failed response → { kind, error, message }. Client errors carry the server's Italian message, shown as is;
// network errors, timeouts and 5xx are "offline".
export async function describeFailure(res) {
  if (!res || res.status >= 500) return { kind: 'offline', error: 'offline', message: OFFLINE_MESSAGE };
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const error = typeof body?.error === 'string' ? body.error : `http_${res.status}`;
  const message = typeof body?.message === 'string' && body.message ? body.message : OFFLINE_MESSAGE;
  return { kind: 'rejected', error, message };
}

export function createLeaderboardApi({ baseUrl = '', fetchImpl = globalThis.fetch?.bind(globalThis), timeoutMs = TIMEOUT_MS } = {}) {
  const enabled = Boolean(baseUrl) && typeof fetchImpl === 'function';

  async function call(path, init = {}) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      return await fetchImpl(`${baseUrl}${path}`, { ...init, signal: ctrl?.signal });
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  return {
    enabled,

    // → runToken string, or null (offline, refused, disabled)
    async startRun(levelId) {
      if (!enabled || !ONLINE_LEVELS.includes(levelId)) return null;
      const res = await post('/runs/start', { levelId });
      if (!res?.ok) return null;
      try {
        const body = await res.json();
        return typeof body?.runToken === 'string' ? body.runToken : null;
      } catch {
        return null;
      }
    },

    // → { ok: true, rankTime, rankShame } | { ok: false, kind: 'offline' | 'rejected', error, message }
    // Never retried: the token is single-use (409 on a replay) and the anti-cheat must not be worked around.
    async submit({ runToken, levelId, timeMs, deaths, guLeft, name }) {
      if (!enabled || !runToken) return { ok: false, kind: 'offline', error: 'offline', message: OFFLINE_MESSAGE };
      const clean = normalizeName(name);
      const res = await post('/scores', {
        runToken,
        levelId,
        timeMs: Math.max(1, Math.round(timeMs)),
        deaths: Math.min(9999, Math.max(0, Math.round(deaths))),
        guLeft: roundGu(guLeft),
        name: clean || null,
      });
      if (res?.status === 201) {
        try {
          const body = await res.json();
          return { ok: true, rankTime: body.rankTime, rankShame: body.rankShame };
        } catch {
          return { ok: true, rankTime: null, rankShame: null };
        }
      }
      return { ok: false, ...(await describeFailure(res)) };
    },

    // → [{ name, timeMs, deaths, guLeft, at }] (already sorted), or null when offline
    async top(levelId, type = 'time', n = 10, { fresh = false } = {}) {
      if (!enabled) return null;
      const res = await call(`/leaderboard/${encodeURIComponent(levelId)}?type=${type === 'shame' ? 'shame' : 'time'}&top=${Math.min(50, Math.max(1, n))}`, fresh ? { cache: 'no-cache' } : {});
      if (!res?.ok) return null;
      try {
        const body = await res.json();
        if (!Array.isArray(body)) return null;
        return body
          .filter((e) => e && Number.isFinite(e.timeMs) && Number.isFinite(e.deaths))
          .map((e) => ({ name: typeof e.name === 'string' && e.name ? e.name : DEFAULT_NAME, timeMs: e.timeMs, deaths: e.deaths, guLeft: e.guLeft, at: e.at }));
      } catch {
        return null;
      }
    },
  };
}

// One online attempt at a level: the token is asked for when the level starts (never blocking the game) and the
// score is sent once, at the end, with the player's name. A new attempt (new GameScene) is a new token.
export function startOnlineRun(api, levelId) {
  if (!api?.enabled || !ONLINE_LEVELS.includes(levelId)) return null;
  const tokenPromise = api.startRun(levelId);
  let sent = null;
  return {
    levelId,
    submit(result, name) {
      sent ??= tokenPromise.then((runToken) =>
        runToken ? api.submit({ runToken, levelId, ...result, name }) : { ok: false, kind: 'offline', error: 'offline', message: OFFLINE_MESSAGE },
      );
      return sent;
    },
  };
}
