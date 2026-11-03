import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// IT, HR and the contractor (docs/IT_HR_EXTERNAL.md): forced restart (L2), IT ticket, VPNs, team building (L3),
// HR course, certificate and contractor (L4).
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
const G = 'globalThis.__game.scene.getScene("GameScene")';
const state = (page) => page.evaluate(() => {
  const g = globalThis.__game.scene.getScene('GameScene');
  const run = g.stats.getRun();
  const t = (id) => g.traps.find((x) => x.def.id === id);
  return {
    tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)], locks: [...g.player.locks], gu: g.budget.gu, burnout: g.burnout.value,
    incidents: run.incidentsByCause, deaths: run.deaths, team: g.team?.count, away: g.team?.members.filter((m) => m.state === 'away').length,
    ticket: t('slotTicket') && { state: t('slotTicket').brain.state, barrier: t('slotTicket').barrier.body.enable },
    hr: t('slotHR') && { state: t('slotHR').state, cert: t('slotHR').hasCert, barrier: t('slotHR').barrier.body.enable },
  };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => {
  const g = globalThis.__game.scene.getScene('GameScene');
  g.player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16);
  g.team?.restore();
}, [tx, ty]);
// generous timeouts: on a slow machine the game time runs well behind the real one; a fast one finishes at once
const waitFor = (page, fn, timeout = 30000) => page.waitForFunction(fn, { timeout }).then(() => true, () => false);
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
void G;

// L2: the forced restart
{
  const page = await open('?debug=1&level=level2&standup=off&cp=cp0');
  await teleport(page, 77, 14);
  const frozen = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').player.locks.has('it'));
  const s = await state(page);
  await page.screenshot({ path: OUT + 'it-restart.png' });
  const released = await waitFor(page, () => !globalThis.__game.scene.getScene('GameScene').player.locks.has('it'));
  const s2 = await state(page);
  check('L2: col 77 starts the forced restart: after the countdown you are frozen, then released; no incident without a death', frozen && released && !s2.incidents.it && s2.deaths === 0, { s, s2 });
  await page.close();
}

// L3: the IT ticket
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1');
  await teleport(page, 184, 14);
  await sleep(300);
  const s0 = await state(page);
  const opened = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotTicket').brain.open);
  const s1 = await state(page);
  check('L3: touching the IT kiosk opens a ticket; the barrier opens after the work, then closes again', s0.ticket.state === 'working' && s0.ticket.barrier && opened && !s1.ticket.barrier, { s0, s1 });
  await page.screenshot({ path: OUT + 'it-ticket.png' });
  const closed = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotTicket').barrier.body.enable);
  const s2 = await state(page);
  check('L3: closing with you still in front counts an `it` incident', closed && s2.incidents.it === 1, s2);
  await page.close();
}
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1&pivot=it');
  await teleport(page, 184, 14);
  const opened = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotTicket').brain.open);
  await sleep(3500);
  const s = await state(page);
  const vpn = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').traps.filter((x) => x.type === 'vpn').map((v) => v.mode + ':' + v.plat.body.enable));
  check('L3 pivot=it: P1 ticket opens at once and stays open; VPNs always connected', opened && !s.ticket.barrier && vpn.every((v) => v === 'pivoted:true'), { s, vpn });
  await page.close();
}

// L3: the VPNs connect and disconnect on their cycle
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1');
  const seen = await page.evaluate(async () => {
    const g = globalThis.__game.scene.getScene('GameScene');
    const v = g.traps.find((x) => x.def.id === 'slotVPN1');
    const states = new Set();
    for (let i = 0; i < 60; i++) { states.add(v.plat.body.enable); await new Promise((r) => setTimeout(r, 100)); }
    return [...states];
  });
  check('L3: VPN 1 is both connected and disconnected within 6 s', seen.length === 2, seen);
  await page.screenshot({ path: OUT + 'it-vpn.png' });
  await page.close();
}

// L3: team building — the juniors walking into the zone are away for 8 s, then back; delegating then is an `hr` incident
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1');
  await teleport(page, 174, 14); await sleep(300);
  await page.keyboard.down('ArrowRight');
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').player.x >= 182.5 * 32);
  await page.keyboard.up('ArrowRight');
  const allAway = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').team.members.filter((m) => m.state === 'away').length === 3);
  const s0 = await state(page);
  await page.keyboard.press('KeyE'); await sleep(300);
  const s1 = await state(page);
  check('L3: all three juniors go to the team building (not lost: no net loss); E with nobody there is an `hr` incident', allAway && s0.team === 0 && s1.incidents.hr === 1, { s0, s1, net: await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').team.netLoss()) });
  await page.screenshot({ path: OUT + 'hr-team-building.png' });
  const back = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').team.count === 3);
  check('L3: after 8 s they are back', back, await state(page));
  await page.close();
}

// L4: the HR course without the certificate: frozen, +10%, then open; only once per level
{
  const page = await open('?debug=1&level=level4&standup=off&cp=cp0');
  await teleport(page, 116, 14); await sleep(300);
  const b0 = (await state(page)).burnout;
  await page.keyboard.down('ArrowRight');
  const inCourse = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').player.locks.has('hr'));
  await page.keyboard.up('ArrowRight');
  const s1 = await state(page);
  await page.screenshot({ path: OUT + 'hr-course.png' });
  const opened = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotHR').state === 'open');
  check('L4: the HR course freezes you, costs +10% burnout and an `hr` incident, then opens', inCourse && s1.burnout === b0 + 10 && s1.incidents.hr === 1 && opened, { b0, s1 });
  await page.close();
}

// L4: the contractor — hire (4 GU), "come da specifica" (no last step), report the defect, climb, certificate, course skipped
{
  const page = await open('?debug=1&level=level4&standup=off&cp=cp0');
  await teleport(page, 104, 14); await sleep(400);
  const gu0 = (await state(page)).gu;
  await page.keyboard.press('KeyE');
  await sleep(300);
  const gu1 = (await state(page)).gu;
  const built = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'contractor1').brain.state === 'built');
  const steps1 = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'contractor1').steps.map((s) => s.body.enable));
  await page.screenshot({ path: OUT + 'ext-contractor-spec.png' });
  await page.keyboard.press('KeyE');
  const fixed = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'contractor1').brain.state === 'complete');
  const steps2 = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'contractor1').steps.map((s) => s.body.enable));
  check('L4: E hires the contractor (-4 GU); late, "come da specifica" without the last step; E again reports the defect and the last step comes', gu1 === gu0 - 4 && built && steps1.join() === 'true,true,false' && fixed && steps2.join() === 'true,true,true', { gu0, gu1, steps1, steps2 });
  // on the last step, jump to the certificate
  await page.evaluate(() => { const g = globalThis.__game.scene.getScene('GameScene'); g.player.body.reset(110 * 32 + 16, 9 * 32 - 16); });
  await sleep(400);
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Space'); await sleep(350); await page.keyboard.up('Space'); await sleep(150); await page.keyboard.up('ArrowLeft');
  const cert = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotHR').hasCert);
  await sleep(600);
  await teleport(page, 116, 14); await sleep(300);
  const b0 = (await state(page)).burnout;
  await page.keyboard.down('ArrowRight');
  const opened = await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotHR').state === 'open');
  await page.keyboard.up('ArrowRight');
  const s = await state(page);
  check('L4: from the last step you reach the certificate; with it the HR course opens at once, no burnout', cert && opened && s.burnout === b0 && !s.incidents.hr, { cert, b0, s });
  await page.close();
}
{
  const page = await open('?debug=1&level=level4&standup=off&cp=cp0&pivot=hr');
  const s = await state(page);
  check('L4 pivot=hr: the HR barrier is already open', s.hr.state === 'open' && !s.hr.barrier, s);
  await page.close();
}

// review IT_HR #1: finishing level 3 with juniors at the team building: they come with you to level 4
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1&pivot=it');
  await teleport(page, 174, 14); await sleep(300);
  await page.keyboard.down('ArrowRight');
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').team.members.filter((m) => m.state === 'away').length >= 1);
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => { const g = globalThis.__game.scene.getScene('GameScene'); g.player.body.reset(209 * 32 + 16, 15 * 32 - 16); });
  await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight');
  const ll = await waitFor(page, () => globalThis.__game.scene.isActive('LessonsLearnedScene'));
  await sleep(1500);
  await page.keyboard.press('Space');
  await waitFor(page, () => globalThis.__game.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').levelId === 'level4');
  await sleep(500);
  const s = await state(page);
  check('L3 → L4: juniors still at the team building at the goal come along (team 3 in level 4)', ll && s.team === 3, s);
  await page.close();
}

// review IT_HR #2: after a death the solved ticket stays open
{
  const page = await open('?debug=1&level=level3&standup=off&cp=cp1');
  await teleport(page, 184, 14);
  await waitFor(page, () => globalThis.__game.scene.getScene('GameScene').traps.find((x) => x.def.id === 'slotTicket').solved);
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').die('spike'));
  await waitFor(page, () => !globalThis.__game.scene.getScene('GameScene').player.isDead);
  await sleep(3000);
  const s = await state(page);
  check('L3: after a death the solved IT ticket stays open', s.ticket.state === 'open' && !s.ticket.barrier, s);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
