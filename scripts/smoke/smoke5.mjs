import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// Iteration 5A smoke checks: the tower, escalation, workers, sycophant, deals, Board and the Partner ending.
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
  const esc = g.escalation?.brain;
  const worker = (id) => g.npcs.find((n) => n.def.id === id)?.brain.built;
  return {
    tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], gu: g.budget.gu, incidents: run.incidentsByCause, locks: [...g.player.locks],
    level: g.levelId, outfit: g.outfit, deals: g.dealCount, esc: esc && { state: esc.state, stage: esc.stageIndex, rows: Math.round(esc.distanceRows(g.player.body.bottom)) },
    w1: worker('worker1'), syc: g.sycophant && { state: g.sycophant.brain.state, col: Math.floor(g.sycophant.brain.x / 32) },
  };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('GameScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
async function hold(page, key, ms) { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); }
async function waitFor(page, cond, timeoutMs = 8000) {
  const t0 = Date.now();
  let s = await state(page);
  while (!cond(s) && Date.now() - t0 < timeoutMs) {
    await sleep(100);
    s = await state(page);
  }
  return s;
}
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
const scenes = (page) => page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));

// the lobby: quiet; climbing out of it starts the escalation; standing still gets you caught (-3 GU, a call)
{
  const page = await open('?debug=1&standup=off&level=level5');
  const s0 = await state(page);
  check('level 5 starts in the lobby, dressed as a Partner, escalation waiting', s0.outfit === 'partner' && s0.esc.state === 'waiting' && s0.tile[1] === 96, s0);
  await page.screenshot({ path: OUT + 'i5-lobby.png' });
  await teleport(page, 25, 85); await sleep(300);
  const s1 = await state(page);
  check('reaching floor 1 starts the escalation, 10 rows below you', s1.esc.state === 'rising' && s1.esc.rows <= 10, s1);
  const s2 = await waitFor(page, (s) => (s.incidents.escalation ?? 0) > 0, 12000);
  await page.screenshot({ path: OUT + 'i5-escalation.png' });
  check('standing still, the tide catches you: a call with the client (-3 GU, frozen)', s2.gu === 12 && s2.locks.includes('escalation'), s2);
  const s3 = await waitFor(page, (s) => !s.locks.includes('escalation'), 3000);
  check('after the call the tide drops back below you', s3.esc.rows >= 9 && s3.gu === 12, s3);
  await page.close();
}

// worker 1: looking at him stops him, turning around lets him build the scaffolding
{
  const page = await open('?debug=1&standup=off&level=level5&escalation=off');
  await teleport(page, 22, 85); await sleep(200);
  await hold(page, 'ArrowLeft', 80); await sleep(1500);
  const watched = await state(page);
  check('watched by the Partner, the worker does not build', watched.w1 === 0, watched);
  await page.screenshot({ path: OUT + 'i5-worker-watched.png' });
  await hold(page, 'ArrowRight', 80);
  const built = await waitFor(page, (s) => s.w1 === 5, 6000);
  check('looking away, he builds all five planks', built.w1 === 5, built);
  await page.screenshot({ path: OUT + 'i5-worker-done.png' });
  await page.close();
}

// the sycophant bows on the mat and bounces you 5 rows up
{
  const page = await open('?debug=1&standup=off&level=level5&escalation=off');
  await teleport(page, 18, 96);
  const bow = await waitFor(page, (s) => s.syc.state === 'bowing', 3000);
  check('near the mat the sycophant bows', bow.syc.state === 'bowing' && bow.syc.col === 20, bow);
  await page.screenshot({ path: OUT + 'i5-bow.png' });
  await teleport(page, 20, 93);
  const up = await waitFor(page, (s) => s.tile[1] <= 91, 2000);
  check('landing on his back sends you up to the shelf 5 rows above', up.tile[1] <= 91, up);
  await page.close();
}

// deals, the Board door and the Partner ending
{
  const page = await open('?debug=1&standup=off&level=level5&cp=cp3');
  await teleport(page, 6, 13); await hold(page, 'ArrowLeft', 300); await sleep(400);
  const locked = await scenes(page);
  check('the Board door stays shut without the pipeline', locked.includes('GameScene') && !locked.includes('EndingScene'), locked);
  await page.screenshot({ path: OUT + 'i5-board-locked.png' });
  // a deal on floor 1
  await teleport(page, 1, 70); await sleep(300);
  const d = await state(page);
  check('a deal goes into the pipeline', d.deals === 1, d);
  await page.close();
}
{
  const page = await open('?debug=1&standup=off&level=level5&cp=cp3&deals=3');
  await teleport(page, 6, 13); await hold(page, 'ArrowLeft', 300); await sleep(1800);
  const end = await scenes(page);
  check('with 3/3 the Board door opens the Partner ending', end.includes('EndingScene'), end);
  await sleep(1500);
  await page.screenshot({ path: OUT + 'i5-ending.png' });
  await sleep(800);
  await page.keyboard.press('Space'); await sleep(900);
  const s = await state(page);
  check('the next campaign starts from Project 1, dressed as a Partner', s.level === 'level1' && s.outfit === 'partner', s);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
