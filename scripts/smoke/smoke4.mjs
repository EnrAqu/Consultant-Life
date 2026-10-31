import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// Iteration 4 smoke checks: flashlight micromanager, betraying goal, team & delegation.
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
  return { tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], gu: g.budget.gu, deaths: run.deaths, incidents: run.incidentsByCause, locks: [...g.player.locks], team: g.team?.count ?? null, level: g.levelId, goalX: Math.floor(g.goal.x / 32) };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('GameScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
async function hold(page, key, ms) { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); }
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
const scenes = (page) => page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));

// flashlight micromanager (level 2, zone 54–66)
{
  const page = await open('?debug=1&standup=off&level=level2&cp=cp0');
  await page.evaluate(() => { const mm = globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'mm1'); mm.brain.x = 54 * 32 + 16; mm.brain.facing = 1; mm.brain.turnTimer = 0; });
  await teleport(page, 55, 14); await sleep(300);
  const s = await state(page);
  await page.screenshot({ path: OUT + 'i4-torch.png' });
  check('stepping into the flashlight gets you stopped (-0.5 GU)', (s.incidents.micromanager ?? 0) === 1 && s.gu === 14.5, s);
  await page.close();
}

// betraying goal (level 2)
{
  const page = await open('?debug=1&standup=off&level=level2');
  await teleport(page, 104, 14); await hold(page, 'ArrowRight', 300); await sleep(200);
  const s = await state(page);
  check('reaching the sign from the left: the client changes their mind (-5 GU)', s.gu === 10 && s.locks.includes('goal'), s);
  await page.screenshot({ path: OUT + 'i4-goal-troll.png' });
  await sleep(3000);
  const s2 = await state(page);
  check('the sign is carried 14 columns ahead', s2.goalX === 120 && !s2.locks.includes('goal'), s2);
  await page.close();
  const p2 = await open('?debug=1&standup=off&level=level2');
  await teleport(p2, 108, 14); await hold(p2, 'ArrowLeft', 250); await sleep(1200);
  const sc = await scenes(p2);
  check('reaching the sign from the right wins right away', sc.includes('LessonsLearnedScene'), sc);
  await p2.close();
}

// team & delegation (level 3)
{
  const page = await open('?debug=1&standup=off&level=level3');
  const s0 = await state(page);
  check('level 3 starts with a team of 3', s0.team === 3, s0);
  await hold(page, 'ArrowRight', 500); await sleep(200);
  const blocked = await state(page);
  check('the approval gate blocks the way', blocked.tile[0] < 12, blocked);
  await page.keyboard.press('KeyE'); await sleep(1500);
  const s1 = await state(page);
  const open1 = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').traps.find((t) => t.def.id === 'gate1').open);
  check('E sends a junior to the plate: gate open, team 2', s1.team === 2 && open1 === true, { ...s1, open1 });
  await page.screenshot({ path: OUT + 'i4-gate.png' });
  await hold(page, 'ArrowRight', 1000); await sleep(200);
  const s2 = await state(page);
  check('you can walk through the open gate', s2.tile[0] > 12, s2);
  // delegate the "hai 5 minuti?" colleague at door 47
  await teleport(page, 41, 14); await sleep(400);
  await page.keyboard.press('KeyE'); await sleep(1200);
  await hold(page, 'ArrowRight', 1300); await sleep(200);
  const s3 = await state(page);
  check('a delegated colleague never hooks you', !(s3.incidents.fiveMinutes > 0) && s3.team === 1, s3);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
