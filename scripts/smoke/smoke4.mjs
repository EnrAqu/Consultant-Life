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
// hold a key until a condition on the game state is true (robust when the machine is slow)
async function holdUntil(page, key, cond, timeoutMs = 4000) {
  await page.keyboard.down(key);
  const t0 = Date.now();
  let s = await state(page);
  while (!cond(s) && Date.now() - t0 < timeoutMs) {
    await sleep(50);
    s = await state(page);
  }
  await page.keyboard.up(key);
  return s;
}
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
  await teleport(p2, 108, 14);
  await p2.keyboard.down('ArrowLeft');
  await p2.waitForFunction(() => globalThis.__game.scene.isActive('LessonsLearnedScene'), { timeout: 4000 }).catch(() => {});
  await p2.keyboard.up('ArrowLeft');
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
  const s2 = await holdUntil(page, 'ArrowRight', (s) => s.tile[0] > 12);
  check('you can walk through the open gate', s2.tile[0] > 12, s2);
  // delegate the "hai 5 minuti?" colleague at door 47
  await teleport(page, 41, 14); await sleep(400);
  await page.keyboard.press('KeyE');
  // wait for the junior to reach the door, then walk past it
  await page.waitForFunction(() => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'five1').brain.state === 'occupied', { timeout: 4000 }).catch(() => {});
  const s3 = await holdUntil(page, 'ArrowRight', (s) => s.tile[0] >= 50 || s.locks.includes('five'));
  check('a delegated colleague never hooks you', !(s3.incidents.fiveMinutes > 0) && s3.team === 1, s3);
  await page.close();
}

// delegation re-checks its target on arrival: the junior comes back if the trap already fired
{
  const page = await open('?debug=1&standup=off&level=level3');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => globalThis.__game.scene.getScene('GameScene').traps.find((t) => t.def.id === 'gate1').open, { timeout: 4000 }).catch(() => {});
  // fire the deck before the junior gets there
  const r = await page.evaluate(() => {
    const g = globalThis.__game.scene.getScene('GameScene');
    const team = g.team;
    const deck = g.traps.find((t) => t.def.id === 'slotC');
    g.npcs.find((n) => n.def.id === 'mmB').brain.occupy(20000); // keep the deck the only target in range
    g.player.body.reset(90 * 32 + 16, 15 * 32 - 16);
    return { before: team.count, deckState: deck.state };
  });
  await sleep(300);
  await page.keyboard.press('KeyE');
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').traps.find((t) => t.def.id === 'slotC').onTrigger());
  await sleep(2500);
  const after = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').team.count);
  check('a junior sent to a trap that already fired comes back to the team', after === r.before, { ...r, after });
  await page.close();
}

// level 4: arrivista and AI draft
{
  const page = await open('?debug=1&standup=off&level=level4');
  const s0 = await state(page);
  check('level 4 starts with a team', s0.team === 3 && s0.level === 'level4', s0);
  await teleport(page, 10, 14); await sleep(600);
  const rival = await page.evaluate(() => { const r = globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'rival1'); return { state: r.brain.state, col: Math.floor(r.brain.x / 32) }; });
  check('the arrivista starts running when you pass him', rival.state === 'running' && rival.col > 0, rival);
  await teleport(page, 82, 11); await sleep(400);
  const ai = await page.evaluate(() => { const t = globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'ai1'); return { taken: t.taken, visible: t.platforms.filter((p) => p.ts.visible).length }; });
  await page.screenshot({ path: OUT + 'i4-ai.png' });
  check('the AI chip draws a shortcut of 5 platforms', ai.taken && ai.visible === 5, ai);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
