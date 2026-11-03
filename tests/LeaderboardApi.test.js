import { describe, it, expect, vi } from 'vitest';
import {
  createLeaderboardApi,
  startOnlineRun,
  resolveApiUrl,
  normalizeName,
  filterNameInput,
  isValidName,
  roundGu,
  PROD_API_URL,
  OFFLINE_MESSAGE,
} from '../src/services/leaderboardApi.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const BASE = 'https://api.test/api';

function fakeFetch(routes) {
  const calls = [];
  const fn = vi.fn(async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null, init });
    for (const [match, reply] of routes) if (url.includes(match)) return typeof reply === 'function' ? reply(url, init) : reply;
    throw new TypeError('network');
  });
  fn.calls = calls;
  return fn;
}

describe('resolveApiUrl', () => {
  it('uses production on the real site and nothing on a local host', () => {
    expect(resolveApiUrl({ hostname: 'enraqu.github.io' })).toBe(PROD_API_URL);
    expect(resolveApiUrl({ hostname: 'localhost' })).toBe('');
    expect(resolveApiUrl({ hostname: '127.0.0.1' })).toBe('');
  });
  it('an explicit env URL wins (trailing slash removed); ?lbApi= only works locally', () => {
    expect(resolveApiUrl({ envUrl: 'http://localhost:7071/api/', hostname: 'localhost' })).toBe('http://localhost:7071/api');
    expect(resolveApiUrl({ envUrl: '  ', hostname: 'enraqu.github.io' })).toBe(PROD_API_URL);
    expect(resolveApiUrl({ override: 'http://mock/api', hostname: 'localhost' })).toBe('http://mock/api');
    expect(resolveApiUrl({ override: 'http://evil/api', hostname: 'enraqu.github.io' })).toBe(PROD_API_URL);
  });
});

describe('names (same rule as the server)', () => {
  it('drops forbidden characters and caps at 16', () => {
    expect(filterNameInput('Niccolò <b>!')).toBe('Niccol b');
    expect(filterNameInput('a'.repeat(30))).toHaveLength(16);
  });
  it('trims and folds spaces; every normalized name is valid', () => {
    expect(normalizeName('  Mario   Rossi ')).toBe('Mario Rossi');
    expect(normalizeName('🙂')).toBe('');
    for (const raw of ['  x  y ', 'è', '__--', 'abcdefghijklmnopqrstu', ' ']) expect(isValidName(normalizeName(raw))).toBe(true);
    expect(isValidName('a  b')).toBe(false);
    expect(isValidName(' a')).toBe(false);
  });
});

describe('roundGu', () => {
  it('rounds to the nearest half and clamps to 0..20', () => {
    expect(roundGu(7.3)).toBe(7.5);
    expect(roundGu(7.2)).toBe(7);
    expect(roundGu(-1)).toBe(0);
    expect(roundGu(25)).toBe(20);
    expect(roundGu(NaN)).toBe(0);
  });
});

describe('createLeaderboardApi', () => {
  it('is disabled without a base URL and never calls fetch', async () => {
    const f = fakeFetch([]);
    const api = createLeaderboardApi({ baseUrl: '', fetchImpl: f });
    expect(api.enabled).toBe(false);
    expect(await api.startRun('level1')).toBe(null);
    expect(await api.top('level1')).toBe(null);
    expect((await api.submit({ runToken: 't' })).kind).toBe('offline');
    expect(f).not.toHaveBeenCalled();
  });

  it('startRun returns the token; the farm and unknown levels never go online', async () => {
    const f = fakeFetch([['/runs/start', json(200, { runToken: 'tok', startedAt: 'x' })]]);
    const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: f });
    expect(await api.startRun('level1')).toBe('tok');
    expect(f.calls[0]).toMatchObject({ url: `${BASE}/runs/start`, method: 'POST', body: { levelId: 'level1' } });
    expect(await api.startRun('farm')).toBe(null);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('startRun fails soft (network, 5xx, bad body)', async () => {
    for (const reply of [json(500, {}), json(200, { nope: 1 }), () => Promise.reject(new TypeError('x'))]) {
      const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: fakeFetch([['/runs/start', reply]]) });
      expect(await api.startRun('level2')).toBe(null);
    }
  });

  it('submit sends a clean body and returns the ranks on 201', async () => {
    const f = fakeFetch([['/scores', json(201, { rankTime: 3, rankShame: 1 })]]);
    const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: f });
    const r = await api.submit({ runToken: 'tok', levelId: 'level1', timeMs: 83450.7, deaths: 12, guLeft: 7.3, name: '  Mario  ' });
    expect(r).toEqual({ ok: true, rankTime: 3, rankShame: 1 });
    expect(f.calls[0].body).toEqual({ runToken: 'tok', levelId: 'level1', timeMs: 83451, deaths: 12, guLeft: 7.5, name: 'Mario' });
  });

  it('an empty name is sent as null (the server says "Anonimo")', async () => {
    const f = fakeFetch([['/scores', json(201, { rankTime: 1, rankShame: 1 })]]);
    await createLeaderboardApi({ baseUrl: BASE, fetchImpl: f }).submit({ runToken: 't', levelId: 'level1', timeMs: 1, deaths: 0, guLeft: 0, name: '' });
    expect(f.calls[0].body.name).toBe(null);
  });

  it('maps errors: 4xx keep the server message, network and 5xx are offline', async () => {
    const cases = [
      [json(409, { error: 'run_already_used', message: 'Partita già inviata.' }), { kind: 'rejected', error: 'run_already_used', message: 'Partita già inviata.' }],
      [json(429, { error: 'rate_limited', message: 'Troppi invii.' }), { kind: 'rejected', error: 'rate_limited', message: 'Troppi invii.' }],
      [json(400, null), { kind: 'rejected', error: 'http_400', message: OFFLINE_MESSAGE }],
      [json(503, { error: 'x', message: 'interno' }), { kind: 'offline', error: 'offline', message: OFFLINE_MESSAGE }],
      [() => Promise.reject(new TypeError('net')), { kind: 'offline', error: 'offline', message: OFFLINE_MESSAGE }],
    ];
    for (const [reply, expected] of cases) {
      const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: fakeFetch([['/scores', reply]]) });
      expect(await api.submit({ runToken: 't', levelId: 'level1', timeMs: 1, deaths: 0, guLeft: 0 })).toEqual({ ok: false, ...expected });
    }
  });

  it('times out after timeoutMs (abort) and reports offline', async () => {
    const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: fakeFetch([['/scores', hang]]), timeoutMs: 20 });
    expect((await api.submit({ runToken: 't', levelId: 'level1', timeMs: 1, deaths: 0, guLeft: 0 })).kind).toBe('offline');
  });

  it('top: query, cap at 50, sanitized entries, null when offline', async () => {
    const f = fakeFetch([['/leaderboard/', json(200, [{ scoreId: 'a', name: 'Bo', timeMs: 10, deaths: 2, guLeft: 1, at: 'x' }, { name: '', timeMs: 20, deaths: 0 }, { bad: true }])]]);
    const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: f });
    const list = await api.top('level3', 'shame', 99, { fresh: true });
    expect(f.calls[0].url).toBe(`${BASE}/leaderboard/level3?type=shame&top=50`);
    expect(f.calls[0].init.cache).toBe('no-cache');
    expect(list).toEqual([
      { name: 'Bo', timeMs: 10, deaths: 2, guLeft: 1, at: 'x' },
      { name: 'Anonimo', timeMs: 20, deaths: 0, guLeft: undefined, at: undefined },
    ]);
    expect(await createLeaderboardApi({ baseUrl: BASE, fetchImpl: fakeFetch([]) }).top('level1')).toBe(null);
  });
});

describe('startOnlineRun', () => {
  it('asks the token at start and sends the score once, with that token', async () => {
    const f = fakeFetch([
      ['/runs/start', json(200, { runToken: 'tok1' })],
      ['/scores', json(201, { rankTime: 2, rankShame: 5 })],
    ]);
    const api = createLeaderboardApi({ baseUrl: BASE, fetchImpl: f });
    const attempt = startOnlineRun(api, 'level4');
    const a = attempt.submit({ timeMs: 5000, deaths: 1, guLeft: 3 }, 'Ada');
    const b = attempt.submit({ timeMs: 9999, deaths: 9, guLeft: 0 }, 'Other');
    expect(await a).toEqual({ ok: true, rankTime: 2, rankShame: 5 });
    expect(await b).toBe(await a);
    const posts = f.calls.filter((c) => c.url.endsWith('/scores'));
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ runToken: 'tok1', levelId: 'level4', name: 'Ada' });
  });

  it('without a token the score stays local (offline), and nothing is posted', async () => {
    const f = fakeFetch([['/runs/start', json(500, {})]]);
    const attempt = startOnlineRun(createLeaderboardApi({ baseUrl: BASE, fetchImpl: f }), 'level1');
    expect((await attempt.submit({ timeMs: 1, deaths: 0, guLeft: 0 }, 'x')).kind).toBe('offline');
    expect(f.calls.some((c) => c.url.endsWith('/scores'))).toBe(false);
  });

  it('is null when the API is disabled or for the farm', () => {
    expect(startOnlineRun(createLeaderboardApi({ baseUrl: '' }), 'level1')).toBe(null);
    expect(startOnlineRun(createLeaderboardApi({ baseUrl: BASE, fetchImpl: fakeFetch([]) }), 'farm')).toBe(null);
  });
});
