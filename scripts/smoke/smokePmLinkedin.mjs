import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// The PM and LinkedIn (docs/PM_LINKEDIN.md): the Gantt bar slides away, the posts go viral, the level 3 lessons.
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
  const t = (id) => g.traps.find((x) => x.def.id === id);
  const s = (id) => t(id) && { state: t(id).brain.state, mode: t(id).mode, likes: t(id).brain.likes, x: Math.round(t(id).plat.body.x / 32) };
  return { tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], deaths: run.deaths, byCause: run.deathsByCause, pm1: s('pm1'), li1: s('li1'), li2: s('li2'), slotPM: s('slotPM'), slotLI: s('slotLI') };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('GameScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
const waitFor = (page, fn, timeout = 6000) => page.waitForFunction(fn, { timeout }).then(() => true, () => false);
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);

// level 2: the PM's bar slides away under you if you stay on it
{
  const page = await open('?debug=1&level=level2&standup=off&cp=cp0');
  await teleport(page, 69, 12);
  const moved = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'pm1').brain.state === 'moving');
  await sleep(150);
  await page.screenshot({ path: OUT + 'pm-reschedule.png' });
  const died = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').stats.getRun().deaths >= 1);
  const s = await state(page);
  check('L2: standing on the Gantt bar, the PM reschedules and you fall (death by pm)', moved && died && s.byCause.pm === 1, s);
  await sleep(800);
  const s2 = await state(page);
  check('L2: after the respawn the bar is back home (col 68), armed', s2.pm1.state === 'idle' && s2.pm1.x === 68, s2);
  await page.close();
}

// level 2: LinkedIn posts — the first holds until its 3rd like, the sponsored one goes at the first
{
  const page = await open('?debug=1&level=level2&standup=off&cp=cp0');
  await teleport(page, 98, 11);
  const liking = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'li1').brain.likes >= 1);
  const s0 = await state(page);
  check('L2: on the post the likes start and it still holds', liking && s0.li1.state === 'liking' && s0.deaths === 0, s0);
  await page.screenshot({ path: OUT + 'linkedin-likes.png' });
  const died = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').stats.getRun().deaths >= 1);
  const s1 = await state(page);
  check('L2: at the third like the post goes viral and you fall (death by linkedin)', died && s1.byCause.linkedin === 1, s1);
  await sleep(800);
  await teleport(page, 101, 9);
  const died2 = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').stats.getRun().deaths >= 2);
  const s2 = await state(page);
  check('L2: the sponsored post goes at the first like', died2 && s2.byCause.linkedin === 2, s2);
  await page.close();
}

// level 3 with the lessons: the bar carries you forward, the post never collapses
{
  const page = await open('?debug=1&level=level3&standup=off&pivot=pm');
  await teleport(page, 42, 12);
  const done = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotPM').brain.state === 'done');
  await sleep(200);
  const s = await state(page);
  check('L3 pivot=pm: the bar carries you forward 2 columns, alive', done && s.slotPM.mode === 'pivoted' && s.slotPM.x === 44 && s.deaths === 0 && s.tile[0] >= 44, s);
  await page.close();
}
{
  const page = await open('?debug=1&level=level3&standup=off&pivot=linkedin');
  await teleport(page, 60, 12);
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotLI').brain.likes >= 4, 12000);
  const s = await state(page);
  check('L3 pivot=linkedin: the post keeps getting likes and never collapses', s.slotLI.mode === 'pivoted' && s.slotLI.likes >= 4 && s.slotLI.state === 'liking' && s.deaths === 0, s);
  await page.screenshot({ path: OUT + 'linkedin-pivoted.png' });
  await page.close();
}

// level 4: the PM asks for a resource, the recruiter poaches (docs/PM_LINKEDIN.md §8–9)
// teleporting leaves the juniors behind (where the level 4 arrivista catches one): regroup them at the player
const teleportTeam = (page, tx, ty) => page.evaluate(([tx, ty]) => {
  const g = globalThis.__game.scene.getScene('GameScene');
  g.player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16);
  g.team.restore();
}, [tx, ty]);
const l4 = (page) => page.evaluate(() => {
  const g = globalThis.__game.scene.getScene('GameScene');
  const run = g.stats.getRun();
  return { tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], team: g.team?.count, burnout: g.burnout.value, incidents: run.incidentsByCause, net: g.team?.netLoss() };
});
{
  const page = await open('?debug=1&level=level4&standup=off');
  await teleportTeam(page, 140, 14); await sleep(1200);
  const s0 = await l4(page);
  await page.keyboard.down('ArrowRight');
  const took = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').team.count < 3, 4000);
  await page.keyboard.up('ArrowRight');
  await sleep(300);
  const s1 = await l4(page);
  check('L4: walking on the PM\'s carpet he takes a junior: team 3 → 2, burnout +10%, incident pm, nothing more to charge', took && s0.team === 3 && s1.team === 2 && s1.burnout === s0.burnout + 10 && s1.incidents.pm === 1 && s1.net === 0, { s0, s1 });
  await page.screenshot({ path: OUT + 'l4-pm-resource.png' });
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off');
  await teleportTeam(page, 143, 12); await sleep(1500);
  const s = await l4(page);
  check('L4: standing on the PM\'s desk is safe', s.team === 3 && !s.incidents.pm, s);
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off&pivot=pm');
  await teleportTeam(page, 144, 14); await sleep(600);
  const s = await l4(page);
  check('L4 pivot=pm: the PM lends you a junior (team 4)', s.team === 4, s);
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off');
  await teleportTeam(page, 41, 14);
  const lost = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').team.count === 0, 8000);
  const s = await l4(page);
  check('L4: standing still in the #OpenToWork zone, the juniors resign one by one (incidents linkedin 3)', lost && s.incidents.linkedin === 3, s);
  await page.screenshot({ path: OUT + 'l4-recruiter.png' });
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off');
  // keep the colleague at door 46 inside: this check is about crossing the zone
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'five1').brain.occupy(20000));
  // a real crossing: run from col 25, jump the pit 34–36, keep running through the zone 37–44
  await teleportTeam(page, 25, 14); await sleep(1200);
  await page.keyboard.down('ArrowRight');
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').player.x >= 32 * 32 + 20, 5000);
  await page.keyboard.press('Space');
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').player.x >= 47 * 32, 5000);
  await page.keyboard.up('ArrowRight');
  await sleep(1500);
  const s = await l4(page);
  check('L4: crossing the zone without stopping keeps the whole team', s.team === 3 && !s.incidents.linkedin, s);
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off&pivot=linkedin');
  await teleportTeam(page, 40, 14); await sleep(600);
  const s = await l4(page);
  check('L4 pivot=linkedin: the recruiter hires one for you (team 4)', s.team === 4, s);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
