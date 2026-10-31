import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
const BASE = 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', defaultViewport: { width: 1920, height: 1080 } });
const results = [];
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(query) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${query}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${query}: [${m.type()}] ${m.text()}`); });
  await page.goto(BASE + query, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__game?.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').player, { timeout: 10000 });
  await page.evaluate(() => { const w = globalThis.__game.scene.getScene('GameScene').physics.world; w.drawDebug = false; w.debugGraphic?.clear(); });
  await sleep(300);
  return page;
}
const state = (page) => page.evaluate(() => {
  const g = globalThis.__game.scene.getScene('GameScene');
  const run = g.stats.getRun();
  return { tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], gu: g.budget.gu, deaths: run.deaths, byCause: run.deathsByCause, incidents: run.incidentsByCause, locks: [...g.player.locks], level: g.levelId, outfit: g.outfit };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('GameScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
async function hold(page, key, ms) { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); }
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + JSON.stringify(info) : ''}`);

// email bridge (level 1, S6a)
{
  const page = await open('?debug=1&standup=off&resetStats=1');
  await teleport(page, 121, 14); await sleep(200);
  await hold(page, 'ArrowRight', 2200); await sleep(400);
  const s1 = await state(page);
  check('running into the escalation pit dies', s1.deaths >= 1, s1);
  await page.evaluate(() => { const g = globalThis.__game.scene.getScene('GameScene'); g.spawnPoint = { x: 121 * 32 + 16, y: 15 * 32 - 16 }; });
  await teleport(page, 124, 14); await sleep(200);
  await hold(page, 'ArrowRight', 350); await hold(page, 'ArrowLeft', 500);
  await sleep(3200);
  await page.screenshot({ path: OUT + 'i3-bridge.png' });
  const before = await state(page);
  await hold(page, 'ArrowRight', 1800); await sleep(300);
  const s2 = await state(page);
  check('waiting for the emails builds a bridge you can walk on', s2.tile[0] >= 138 && s2.deaths === before.deaths, { before, s2 });
  await page.close();
}

// micromanager (level 2)
{
  const page = await open('?debug=1&standup=off&level=level2&cp=cp0');
  await teleport(page, 54, 14);
  await sleep(7500);
  const s = await state(page);
  await page.screenshot({ path: OUT + 'i3-mm.png' });
  check('micromanager catches you standing still in sight', (s.incidents.micromanager ?? 0) >= 1 && s.gu === 14.5, s);
  await page.close();
  const p2 = await open('?debug=1&standup=off&level=level2&cp=cp0');
  await teleport(p2, 57, 14);
  const plants = await p2.evaluate(() => globalThis.__game.scene.getScene('GameScene').children.list.filter((c) => c.texture?.key === 'plant').length);
  check('plants are drawn', plants === 1, plants);
  await sleep(14000);
  const s2 = await state(p2);
  check('hiding behind the plant: never caught', (s2.incidents.micromanager ?? 0) === 0, s2);
  await p2.close();
}

// "hai 5 minuti?" (level 3)
{
  const page = await open('?debug=1&standup=off&level=level3');
  const s0 = await state(page);
  check('level 3 starts with the manager outfit', s0.outfit === 'manager' && s0.gu === 15, s0);
  await teleport(page, 41, 14); await sleep(200);
  await page.keyboard.down('ArrowRight'); await sleep(900);
  const s = await state(page);
  await page.screenshot({ path: OUT + 'i3-five.png' });
  await page.keyboard.up('ArrowRight');
  check('running into the colleague hooks you', s.locks.includes('five') && (s.incidents.fiveMinutes ?? 0) === 1, s);
  await sleep(3300);
  const s2 = await state(page);
  check('hook releases after 3 s', !s2.locks.includes('five'), s2);
  await page.close();
}

// level 2 → Lessons Learned 2 → level 3, leaderboard
{
  const page = await open('?debug=1&standup=off&level=level2');
  await teleport(page, 105, 14); await hold(page, 'ArrowRight', 300); await sleep(1500);
  const scenes = await page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));
  check('level 2 complete opens Lessons Learned', scenes.includes('LessonsLearnedScene'), scenes);
  await sleep(800);
  await page.screenshot({ path: OUT + 'i3-ll2.png' });
  await page.keyboard.press('Space'); await sleep(900);
  const s = await state(page);
  check('Lessons Learned 2 leads to level 3', s.level === 'level3', s);
  const lb = await page.evaluate(() => JSON.parse(localStorage.getItem('ragebait.leaderboard.v1')));
  check('debug runs stay out of the leaderboard', !lb?.entries?.some((e) => e.levelId === 'level2'), lb);
  await teleport(page, 175, 14); await hold(page, 'ArrowRight', 200); await sleep(1500);
  const end = await page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));
  check('level 3 complete opens the end screen', end.includes('MvpEndScene'), end);
  await sleep(500);
  await page.screenshot({ path: OUT + 'i3-end.png' });
  await page.close();
}

// pivoted micromanager guides
{
  const page = await open('?debug=1&standup=off&level=level3&pivot=micromanager');
  await teleport(page, 151, 14); await sleep(2500);
  const st = await page.evaluate(() => { const n = globalThis.__game.scene.getScene('GameScene').npcs.find((x) => x.def.id === 'slotMM'); return { mode: n.mode, state: n.brain.state, x: Math.floor(n.brain.x / 32) }; });
  check('pivoted micromanager guides ahead of you', st.mode === 'pivoted' && st.state === 'guide' && st.x > 151, st);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
