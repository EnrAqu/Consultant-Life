import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

// The farm (docs/FARM.md §6 F-M3): no office HUD, chores, the phone, the pond, the bench, the burnout ending, a new campaign.
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
  await page.waitForFunction(() => globalThis.__game?.scene.isActive('FarmScene') && globalThis.__game.scene.getScene('FarmScene').player, { timeout: 10000 });
  await page.evaluate(() => { const w = globalThis.__game.scene.getScene('FarmScene').physics.world; w.drawDebug = false; w.debugGraphic?.clear(); });
  await sleep(300);
  return page;
}
const state = (page) => page.evaluate(() => {
  const gm = globalThis.__game;
  const f = gm.scene.getScene('FarmScene');
  const hud = gm.scene.getScene('FarmHudScene');
  const d = f.day;
  return {
    scenes: gm.scene.getScenes(true).map((s) => s.scene.key), uiSleeping: gm.scene.isSleeping('UIScene'),
    eggs: d?.eggs, veg: d?.veg, received: d?.received, thrown: d?.phoneThrown, ended: d?.ended, zone: f.inPondZone,
    card: hud?.card?.visible ? hud.cardText.text : null, unread: hud?.unread?.text,
    tile: f.player ? [Math.floor(f.player.x / 32), Math.floor(f.player.y / 32)] : null, worldH: f.worldH, py: f.player?.y,
  };
});
const teleport = (page, tx, ty) => page.evaluate(([tx, ty]) => globalThis.__game.scene.getScene('FarmScene').player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16), [tx, ty]);
const hold = async (page, key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };
const check = (name, ok, info) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + JSON.stringify(info) : ''}`);
const endingText = (page) => page.evaluate(() => globalThis.__game.scene.getScene('EndingScene').children.list.filter((o) => o.type === 'Text').map((t) => t.text).join('\n'));
const waitEnding = (page) => page.waitForFunction(() => globalThis.__game.scene.isActive('EndingScene'), { timeout: 15000 }).then(() => true, () => false);

// the whole day: chores, phone, pond, bench, ending, new campaign
{
  const page = await open('?debug=1&level=farm');
  const s0 = await state(page);
  check('?level=farm opens the farm with its HUD; the office HUD sleeps, no GameScene', s0.scenes.includes('FarmScene') && s0.scenes.includes('FarmHudScene') && !s0.scenes.includes('GameScene') && s0.uiSleeping, s0);
  await page.screenshot({ path: OUT + 'farm-start.png' });
  await sleep(4500);
  const s1 = await state(page);
  check('the phone is quiet before the first move', s1.received === 0 && s1.card === null, s1);

  await teleport(page, 18, 14); await sleep(300);
  const s2 = await state(page);
  check('an egg is collected (1/5)', s2.eggs === 1, s2);
  await hold(page, 'ArrowRight', 300);
  const buzzed = await page.waitForFunction(() => globalThis.__game.scene.getScene('FarmScene').day.received >= 1, { timeout: 12000 }).then(() => true, () => false);
  await sleep(200);
  const s3 = await state(page);
  check('after the first move the phone buzzes: "Hai 5 minuti?" on screen', buzzed && s3.card === 'Hai 5 minuti?' && /Notifiche non lette: 1/.test(s3.unread), s3);
  await page.screenshot({ path: OUT + 'farm-phone.png' });

  // can't fall: at the far left edge, walking left keeps you on the ground
  await teleport(page, 0, 14); await hold(page, 'ArrowLeft', 600); await sleep(200);
  const s4 = await state(page);
  check('the world edge holds you: still on the ground at col 0', s4.tile[0] === 0 && s4.tile[1] === 14, s4);

  await page.keyboard.press('KeyE'); await sleep(200);
  const s5 = await state(page);
  check('E away from the pond does nothing', s5.thrown === false, s5);
  await teleport(page, 105, 14); await sleep(300);
  const s6 = await state(page);
  check('in the pond zone the prompt shows', s6.zone === true, s6);
  await page.keyboard.press('KeyE'); await sleep(900);
  const s7 = await state(page);
  check('E at the pond throws the phone: card gone, HUD says it is in the pond', s7.thrown === true && s7.card === null && s7.unread === 'Telefono: nello stagno' && s7.zone === false, s7);
  await page.screenshot({ path: OUT + 'farm-pond.png' });

  await teleport(page, 121, 14); await hold(page, 'ArrowRight', 500);
  await sleep(1200);
  const s8 = await state(page);
  check('the bench ends the day', s8.ended === true, s8);
  await page.screenshot({ path: OUT + 'farm-sunset.png' });
  const ended = await waitEnding(page);
  await sleep(2000);
  const txt = ended ? await endingText(page) : '';
  check('then the burnout ending, with the farm summary and the phone in the pond', ended && /Ora fai il contadino/.test(txt) && /Le rane non fanno call/.test(txt) && /Uova: 1\/5 · Ortaggi: 0\/4 · Notifiche ignorate: 1 · Telefono: nello stagno/.test(txt) && !/onboarding/.test(txt), txt);
  await page.screenshot({ path: OUT + 'farm-ending.png' });
  await sleep(500);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => globalThis.__game.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').player, { timeout: 10000 }).catch(() => {});
  await sleep(600);
  const s9 = await page.evaluate(() => {
    const gm = globalThis.__game;
    const g = gm.scene.getScene('GameScene');
    return { level: g.levelId, burnout: g.burnout?.value, uiAwake: gm.scene.isActive('UIScene') && !gm.scene.isSleeping('UIScene'), hud: gm.scene.getScene('UIScene').hud.visible, farm: gm.scene.isActive('FarmScene') };
  });
  check('a new campaign: Project 1 at 0%, the office HUD awake and visible, the farm gone', s9.level === 'level1' && s9.burnout === 0 && s9.uiAwake && s9.hud && !s9.farm, s9);
  await page.close();
}

// the phone stays in your pocket: one last message on the bench, and the ending says so
{
  const page = await open('?debug=1&level=farm');
  await teleport(page, 121, 14); await hold(page, 'ArrowRight', 500);
  await sleep(300);
  const s = await state(page);
  check('on the bench with the phone in your pocket, the Partner writes once more', s.ended && s.received === 1 && /call di allineamento/.test(s.card ?? ''), s);
  const ended = await waitEnding(page);
  await sleep(2000);
  const txt = ended ? await endingText(page) : '';
  check('ending: the phone is still in your pocket', /ancora in tasca\. Vibra\./.test(txt) && /Notifiche ignorate: 1/.test(txt) && !/Telefono: nello stagno/.test(txt), txt);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
