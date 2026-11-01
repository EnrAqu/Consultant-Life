import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// Burnout smoke checks (docs/BURNOUT.md §7 B-M4): the ending, reliefs, retry, new campaign, HUD and the tired character.
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
  await waitGame(page);
  await page.evaluate(() => { const w = globalThis.__game.scene.getScene('GameScene').physics.world; w.drawDebug = false; w.debugGraphic?.clear(); });
  await sleep(300);
  return page;
}
const waitGame = (page) => page.waitForFunction(() => globalThis.__game?.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').player, { timeout: 10000 });
const state = (page) => page.evaluate(() => {
  const g = globalThis.__game.scene.getScene('GameScene');
  return { level: g.levelId, burnout: g.burnout?.value, tier: g.burnout?.tier, key: g.playerView?.key, gu: g.budget?.gu, scenes: globalThis.__game.scene.getScenes(true).map((s) => s.scene.key) };
});
const die = (page) => page.evaluate(() => globalThis.__game.scene.getScene('GameScene').die('spike'));
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('GameScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
const scenes = (page) => page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));

// 100%: the burnout ending wins over everything; then a new campaign starts from 0 (the debug value is not reapplied)
{
  const page = await open('?debug=1&standup=off&burnout=99.75');
  const s0 = await state(page);
  check('?burnout=99.75 starts the campaign at 99.75%, cooked (tier 2 texture)', s0.burnout === 99.75 && s0.key.endsWith('_t2'), s0);
  await page.screenshot({ path: OUT + 'burnout-hud.png' });
  await die(page);
  await sleep(1600);
  const sc = await scenes(page);
  check('one more death (+1%) goes to the burnout ending, and only there', sc.includes('EndingScene') && !sc.includes('GameScene') && !sc.includes('BudgetOverScene'), sc);
  await sleep(1500);
  await page.screenshot({ path: OUT + 'burnout-ending.png' });
  await sleep(800);
  await page.keyboard.press('Space');
  await waitGame(page); await sleep(400);
  const s1 = await state(page);
  check('the new campaign starts from Project 1 at 0%, rested', s1.level === 'level1' && s1.burnout === 0 && s1.tier === 0, s1);
  await page.close();
}

// Budget sforato: the retry keeps the burnout, including the death that blew the budget (level 1 retry is not a new campaign)
{
  const page = await open('?debug=1&standup=off&burnout=20&gu=0.5');
  await die(page);
  await page.waitForFunction(() => globalThis.__game.scene.isActive('BudgetOverScene'), { timeout: 5000 }).catch(() => {});
  await sleep(1300);
  await page.keyboard.press('KeyR');
  await sleep(300);
  await waitGame(page); await sleep(400);
  const s = await state(page);
  check('retrying level 1 after Budget sforato keeps 21%', s.level === 'level1' && s.burnout === 21, s);
  await page.close();
}

// coffee: -2%
{
  const page = await open('?debug=1&standup=off&burnout=40');
  const pos = await page.evaluate(() => { const p = globalThis.__game.scene.getScene('GameScene').pickups[0].sprite; return [Math.floor(p.x / 32), Math.floor(p.y / 32)]; });
  await teleport(page, pos[0], pos[1]); await sleep(300);
  const s = await state(page);
  check('a coffee takes 2% off', s.burnout === 38, { pos, ...s });
  await page.close();
}

// real KT: -3% once per level, even if a respawn puts it back
{
  const page = await open('?debug=1&standup=off&level=level2&pivot=fakeKT&burnout=50');
  const s0 = await state(page);
  await teleport(page, 83, 11); await sleep(400);
  const s1 = await state(page);
  check('the real KT takes 3% off', s1.burnout === s0.burnout - 3, { s0: s0.burnout, s1: s1.burnout });
  await page.evaluate(() => { const g = globalThis.__game.scene.getScene('GameScene'); g.player.lockInput('kt', false); });
  await sleep(4500);
  await die(page); await sleep(600);
  await teleport(page, 83, 11); await sleep(400);
  const s2 = await state(page);
  check('taking it again after a respawn gives nothing more (only the death +1%)', s2.burnout === s1.burnout + 1, { s1: s1.burnout, s2: s2.burnout });
  await page.close();
}

// a level without deaths: Lessons Learned explains it, the next level starts 5% lower
{
  const page = await open('?debug=1&standup=off&burnout=20');
  await page.evaluate(() => { const g = globalThis.__game.scene.getScene('GameScene'); g.player.body.reset(g.goal.x - 40, g.goal.floorY - 20); });
  await page.keyboard.down('ArrowRight'); await sleep(400); await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => globalThis.__game.scene.isActive('LessonsLearnedScene'), { timeout: 5000 }).catch(() => {});
  await sleep(1300);
  await page.screenshot({ path: OUT + 'burnout-lessons.png' });
  await page.keyboard.press('Space');
  await sleep(300);
  await waitGame(page); await sleep(400);
  const s = await state(page);
  check('clean level 1 at 20%: Project 2 starts at 15% (20 → max(20, 15) − 5)', s.level === 'level2' && s.burnout === 15, s);
  await page.close();
}

// tier 1 texture and the HUD bar with a long toast
{
  const page = await open('?debug=1&standup=off&level=level3&burnout=55');
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').addBurnout('micromanager'));
  await sleep(150);
  const s = await state(page);
  check('at 58% the player has eye bags (tier 1)', s.tier === 1 && s.key.endsWith('_t1') && s.burnout === 58, s);
  await page.screenshot({ path: OUT + 'burnout-tier1.png' });
  await page.close();
}

// crossing 80%: the warning line is not covered by the death line (review #1); tier 2 HUD at 960×540
{
  const page = await open('?debug=1&standup=off&burnout=79.75');
  await page.setViewport({ width: 960, height: 540 });
  await die(page);
  await sleep(2200);
  const line = await page.evaluate(() => { const ui = globalThis.__game.scene.getScene('UIScene'); return ui.narrText.visible ? ui.narrText.text : ''; });
  const s = await state(page);
  check('crossing 80% the narrator warns you, after the death line', s.tier === 2 && /stanco|occhiaie|wellbeing/.test(line), { line, ...s });
  await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').addBurnout('micromanager'));
  await sleep(100);
  await page.screenshot({ path: OUT + 'burnout-tier2-960.png' });
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
