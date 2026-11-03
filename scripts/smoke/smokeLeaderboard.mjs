import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// Online leaderboard smoke checks (docs/LEADERBOARD.md): a mocked API (request interception on http://lb.test/api,
// selected with ?lbApi=, which only works on a local host). Checks: token at start, the name asked once, the body
// sent, ranks and top shown, offline fallback, debug runs never online.
const BASE = 'http://localhost:4173/';
const API = 'http://lb.test/api';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', defaultViewport: { width: 1920, height: 1080 } });
const results = [];
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const TOP = [
  { scoreId: '1', name: 'Velocissimo', timeMs: 61000, deaths: 1, guLeft: 9, at: '2026-11-03T20:00:00Z' },
  { scoreId: '2', name: 'Mario', timeMs: 75000, deaths: 4, guLeft: 7.5, at: '2026-11-03T20:00:00Z' },
];

async function open(query, { mode = 'ok', clearName = true, waitFor = 'GameScene' } = {}) {
  const page = await browser.newPage();
  const calls = [];
  page.on('pageerror', (e) => errors.push(`${query}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/lb\.test|Failed to load resource|ERR_/.test(m.text())) errors.push(`${query}: [error] ${m.text()}`); });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(API)) return req.continue();
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS, body: '' });
    calls.push({ method: req.method(), path: url.slice(API.length), body: req.postData() ? JSON.parse(req.postData()) : null });
    if (mode === 'offline') return req.abort('connectionrefused');
    const reply = (status, body) => req.respond({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (url.includes('/runs/start')) return reply(200, { runToken: 'tok-' + calls.length, startedAt: new Date().toISOString() });
    if (url.includes('/scores')) return mode === 'rejected' ? reply(400, { error: 'name_not_allowed', message: 'Nome non ammesso.' }) : reply(201, { rankTime: 3, rankShame: 1 });
    if (url.includes('/leaderboard/')) return reply(200, TOP);
    return reply(404, { error: 'nope', message: 'nope' });
  });
  await page.goto(BASE + query, { waitUntil: 'load' });
  if (clearName) await page.evaluate(() => { try { localStorage.removeItem('ragebait.playerName.v1'); } catch {} });
  await page.waitForFunction((key) => globalThis.__game?.scene.isActive(key) && (key !== 'GameScene' || globalThis.__game.scene.getScene('GameScene').player), { timeout: 10000 }, waitFor);
  await sleep(400);
  return { page, calls };
}
const complete = async (page) => {
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').completeLevel());
  await page.waitForFunction(() => globalThis.__game.scene.isActive('LessonsLearnedScene'), { timeout: 8000 });
  await sleep(600);
};
const lessonTexts = (page) => page.evaluate(() => globalThis.__game.scene.getScene('LessonsLearnedScene').children.list.filter((o) => o.type === 'Text').map((o) => o.text).join(' | '));
const nameInput = (page) => page.evaluate(() => Boolean(document.querySelector('input[aria-label]')));

// 1. first completed level: token at start, the name field, Enter sends the score with that name; ranks and top shown
{
  const { page, calls } = await open(`?debug=1&lbApi=${encodeURIComponent(API)}`);
  check('a token is asked when the level starts', calls.some((c) => c.path === '/runs/start' && c.body.levelId === 'level1'), calls);
  await complete(page);
  check('the first completed level asks for the name (no score sent yet)', (await nameInput(page)) && !calls.some((c) => c.path === '/scores'), calls.map((c) => c.path));
  await page.screenshot({ path: OUT + 'leaderboard-name.png' });
  await page.focus('input[aria-label]');
  await page.keyboard.type('Ma rio è <b>');
  await sleep(100);
  check('the field keeps only the allowed characters', (await page.$eval('input[aria-label]', (el) => el.value)) === 'Ma rio  b', await page.$eval('input[aria-label]', (el) => el.value));
  // Space typed in the field must not skip the slide
  check('typing (Space too) does not skip the slide', await page.evaluate(() => globalThis.__game.scene.isActive('LessonsLearnedScene')));
  await page.keyboard.press('Enter');
  await sleep(900);
  const post = calls.find((c) => c.path === '/scores');
  check('Enter sends the score once, name folded, guLeft in halves, token from the start', post && post.body.name === 'Ma rio b' && post.body.runToken.startsWith('tok-') && post.body.guLeft * 2 === Math.round(post.body.guLeft * 2) && Number.isInteger(post.body.timeMs), post);
  const texts = await lessonTexts(page);
  check('the ranks and the online top are on the slide', /#3 per tempo/.test(texts) && /Velocissimo/.test(texts) && /Classifica online/.test(texts) && !(await nameInput(page)), texts);
  check('the name is remembered', (await page.evaluate(() => localStorage.getItem('ragebait.playerName.v1'))) === '"Ma rio b"');
  await page.screenshot({ path: OUT + 'leaderboard-lessons.png' });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => globalThis.__game.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').levelId === 'level2', { timeout: 8000 }).catch(() => {});
  await sleep(400);
  check('the next project asks a new token', calls.filter((c) => c.path === '/runs/start').length === 2 && calls.some((c) => c.path === '/runs/start' && c.body.levelId === 'level2'), calls.map((c) => c.path));
  await page.close();
}

// 2. name already known: no field, the score goes at once
{
  const { page, calls } = await open(`?debug=1&lbApi=${encodeURIComponent(API)}`, { clearName: false });
  await page.evaluate(() => localStorage.setItem('ragebait.playerName.v1', '"Ada"'));
  await complete(page);
  await sleep(500);
  const post = calls.find((c) => c.path === '/scores');
  check('a known name: no field, sent at once', !(await nameInput(page)) && post?.body.name === 'Ada', post);
  await page.close();
}

// 3. the server refuses: its message is shown as is, the slide still works
{
  const { page } = await open(`?debug=1&lbApi=${encodeURIComponent(API)}`, { mode: 'rejected', clearName: false });
  await page.evaluate(() => localStorage.setItem('ragebait.playerName.v1', '"Ada"'));
  await complete(page);
  await sleep(600);
  check('a refusal shows the server message', /Nome non ammesso\./.test(await lessonTexts(page)), await lessonTexts(page));
  await page.close();
}

// 4. offline: the game goes on, local leaderboard with the offline note
{
  const { page } = await open(`?debug=1&lbApi=${encodeURIComponent(API)}`, { mode: 'offline', clearName: false });
  await page.evaluate(() => localStorage.setItem('ragebait.playerName.v1', '""'));
  await complete(page);
  await sleep(800);
  const texts = await lessonTexts(page);
  check('offline: "non raggiungibile" and the local leaderboard', /Classifica online non raggiungibile/.test(texts) && /offline/.test(texts), texts);
  await page.screenshot({ path: OUT + 'leaderboard-offline.png' });
  await page.close();
}

// 5. debug runs (gameplay overrides) never call the API; without ?lbApi= a local host stays local-only
{
  const { page, calls } = await open(`?debug=1&standup=off&god=1&lbApi=${encodeURIComponent(API)}`);
  await complete(page);
  check('a debug run never calls the API, and the slide has no online panel', calls.length === 0 && !/Classifica online/.test(await lessonTexts(page)) && !(await nameInput(page)), calls);
  await page.close();
  const local = await open('?debug=1&standup=off');
  await complete(local.page);
  check('local host without ?lbApi=: no network at all', local.calls.length === 0 && !(await nameInput(local.page)));
  await local.page.close();
}

// 6. the homepage (?home=1 shows it in debug too): leaderboard per project, back, Space starts the game at once
{
  const { page, calls } = await open(`?debug=1&home=1&lbApi=${encodeURIComponent(API)}`, { waitFor: 'HomeScene' });
  const homeTexts = () => page.evaluate(() => globalThis.__game.scene.getScene('HomeScene').children.list.flatMap((o) => (o.list ?? [o])).filter((o) => o.type === 'Text' && o.visible && o.parentContainer?.visible !== false).map((o) => o.text).join(' | '));
  check('the page opens on the homepage, with no game and no token yet', !(await page.evaluate(() => globalThis.__game.scene.isActive('GameScene'))) && calls.length === 0 && /Nuova partita/.test(await homeTexts()));
  await page.screenshot({ path: OUT + 'home.png' });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await sleep(700);
  const t1 = await homeTexts();
  check('"Classifica" shows Project 1 online, both lists', /Progetto 1/.test(t1) && /Velocissimo/.test(t1) && /vergogna/.test(t1) && calls.some((c) => c.path.startsWith('/leaderboard/level1')), t1);
  await page.screenshot({ path: OUT + 'home-leaderboard.png' });
  await page.keyboard.press('ArrowRight'); await sleep(600);
  check('→ goes to Project 2', /Progetto 2/.test(await homeTexts()) && calls.some((c) => c.path.startsWith('/leaderboard/level2')));
  await page.keyboard.press('Escape'); await sleep(200);
  check('Esc goes back to the menu', /Nuova partita/.test(await homeTexts()) && !/Progetto 2/.test(await homeTexts()));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => globalThis.__game.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').player, { timeout: 5000 }).catch(() => {});
  await sleep(400);
  const st = await page.evaluate(() => ({ level: globalThis.__game.scene.getScene('GameScene').levelId, home: globalThis.__game.scene.isActive('HomeScene'), hud: globalThis.__game.scene.isActive('UIScene') }));
  check('Space starts Project 1 with the HUD, and asks the token', st.level === 'level1' && !st.home && st.hud && calls.some((c) => c.path === '/runs/start'), st);
  await page.close();
}
{
  const { page } = await open('?debug=1&home=1', { waitFor: 'HomeScene' });
  await page.keyboard.press('l'); await sleep(500);
  const t = await page.evaluate(() => globalThis.__game.scene.getScene('HomeScene').children.list.flatMap((o) => (o.list ?? [o])).filter((o) => o.type === 'Text' && o.visible).map((o) => o.text).join(' | '));
  check('local host without API: the homepage leaderboard is this browser\'s', /solo in questo browser/.test(t), t);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('ERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
