import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:4173/';
const OUT = new URL('./shots/', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--window-size=960,540', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 960, height: 540 },
});
const results = [];
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(query) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${query}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${query}: [${m.type()}] ${m.text()}`);
  });
  await page.goto(BASE + query, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__game?.scene.isActive('GameScene') && globalThis.__game.scene.getScene('GameScene').player, { timeout: 10000 });
  await sleep(300);
  return page;
}

const state = (page) =>
  page.evaluate(() => {
    const g = globalThis.__game.scene.getScene('GameScene');
    const run = g.stats.getRun();
    return {
      x: Math.round(g.player.x), y: Math.round(g.player.y), tile: [Math.floor(g.player.x / 32), Math.floor(g.player.y / 32)],
      gu: g.budget.gu, deaths: run.deaths, byCause: run.deathsByCause, paused: [...g.pauseReasons], locked: g.player.inputLocked,
      active: globalThis.__game.scene.getScenes(true).map((s) => s.scene.key),
    };
  });

const teleport = (page, tx, ty) =>
  page.evaluate(([tx, ty]) => {
    const g = globalThis.__game.scene.getScene('GameScene');
    g.player.body.reset(tx * 32 + 16, (ty + 1) * 32 - 16);
  }, [tx, ty]);

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

function check(name, ok, info) {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + JSON.stringify(info) : ''}`);
}

// 1. boot + pit death
{
  const page = await open('?debug=1&standup=off&resetStats=1');
  await page.screenshot({ path: OUT + 'shot-start.png' });
  const hd = await page.evaluate(() => {
    const g = globalThis.__game;
    const gs = g.scene.getScene('GameScene');
    return { canvas: g.canvas.width, tex: g.textures.get('player_junior').source[0].width, frames: g.textures.get('player_junior').getFrameNames().length, zoom: gs.cameras.main.zoom, outfit: gs.outfit };
  });
  check('HD canvas 1920, 2x textures, zoom 2, junior outfit', hd.canvas === 1920 && hd.tex === 32 * 9 * 3 && hd.zoom === 2.5 && hd.outfit === 'junior', hd);
  const s0 = await state(page);
  check('boot at spawn with 20 GU', s0.gu === 20 && s0.tile[0] === 2, s0);
  await hold(page, 'ArrowRight', 2600);
  await sleep(500);
  const s1 = await state(page);
  check('running into first pit kills (pit, -0.5 GU) and respawns', s1.deaths >= 1 && s1.byCause.pit >= 1 && s1.gu === 20 - 0.5 * s1.deaths && s1.tile[0] < 5, s1);

  // jump test: from spawn, run and jump the 2-gap
  await teleport(page, 15, 14);
  await sleep(200);
  await page.keyboard.down('ArrowRight');
  await sleep(250);
  await page.keyboard.down('Space');
  await sleep(350);
  await page.keyboard.up('Space');
  await sleep(250);
  await page.keyboard.up('ArrowRight');
  await sleep(300);
  const s2 = await state(page);
  check('jump clears a 2-tile gap', s2.tile[0] >= 20 && s2.deaths === s1.deaths, s2);

  // spikes
  const sBefore = await state(page);
  await teleport(page, 30, 12);
  await sleep(150);
  await hold(page, 'ArrowRight', 400);
  await sleep(400);
  const sSpike = await state(page);
  check('walking into spikes dies by spike', (sSpike.byCause.spike ?? 0) >= 1, sSpike);

  // animation states
  await teleport(page, 75, 14);
  await sleep(300);
  const animIdle = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').playerView.anim);
  await page.keyboard.down('ArrowRight');
  await sleep(300);
  const animRun = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').playerView.anim);
  await page.keyboard.down('Space');
  await sleep(120);
  const animJump = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').playerView.anim);
  await page.keyboard.up('Space');
  await sleep(250);
  const animFall = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').playerView.anim);
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: OUT + 'shot-anim.png' });
  check('animations idle/run/jump/fall', animIdle === 'idle' && animRun === 'run' && animJump === 'jump' && animFall === 'fall', { animIdle, animRun, animJump, animFall });

  // ReplyAll: run through the corridor
  await teleport(page, 36, 12);
  await sleep(200);
  await hold(page, 'ArrowRight', 1500);
  await sleep(400);
  const s3 = await state(page);
  check('running through reply-all corridor dies by replyAll', (s3.byCause.replyAll ?? 0) >= 1, s3);
  await page.screenshot({ path: OUT + 'shot-replyall.png' });

  // ScopeCreep: stand on ledge
  await teleport(page, 57, 12);
  await sleep(2500);
  const s4 = await state(page);
  check('standing on scope-creep ledge dies by scopeCreep', (s4.byCause.scopeCreep ?? 0) >= 1, s4);

  // Fake KT
  const before = (await state(page)).gu;
  await teleport(page, 97, 11);
  await sleep(500);
  const s5 = await state(page);
  check('fake KT burns 3 GU and locks input', s5.gu === before - 3 && s5.locked === true, s5);
  await page.screenshot({ path: OUT + 'shot-kt.png' });
  await sleep(4200);
  const s5b = await state(page);
  check('KT call ends after 4s', s5b.locked === false, s5b);

  // Deck: run into corridor
  await teleport(page, 109, 14);
  await sleep(200);
  await hold(page, 'ArrowRight', 1300);
  await sleep(400);
  const s6 = await state(page);
  check('running into the deck corridor dies by deckCollapse', (s6.byCause.deckCollapse ?? 0) >= 1, s6);
  await teleport(page, 112, 14);
  await page.keyboard.down('ArrowRight');
  await sleep(150);
  await page.keyboard.up('ArrowRight');
  await sleep(150);
  await hold(page, 'ArrowLeft', 300);
  await sleep(1500);
  await page.screenshot({ path: OUT + 'shot-deck.png' });

  // ScopeCreep left
  await teleport(page, 154, 14);
  await sleep(2500);
  const s7 = await state(page);
  check('scope creep left pushes into the pit behind', (s7.byCause.scopeCreep ?? 0) >= 2, s7);

  // Goal → Lessons Learned
  await teleport(page, 213, 12);
  await hold(page, 'ArrowRight', 300);
  await sleep(1300);
  const s8 = await page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));
  check('goal opens Lessons Learned', s8.includes('LessonsLearnedScene'), s8);
  await sleep(1000);
  await page.screenshot({ path: OUT + 'shot-lessons.png' });
  await page.keyboard.press('Space');
  await sleep(800);
  const s9 = await page.evaluate(() => {
    const g = globalThis.__game.scene.getScene('GameScene');
    return { active: globalThis.__game.scene.isActive('GameScene'), level: g.levelId, pivot: g.pivotCause };
  });
  check('Space starts level 2 with the dominant pivot', s9.active && s9.level === 'level2' && s9.pivot, s9);
  await page.screenshot({ path: OUT + 'shot-level2.png' });
  await page.close();
}

// 1b. outfits preview
for (const outfit of ['consultant', 'manager', 'seniorManager', 'partner', 'farmer']) {
  const page = await open(`?debug=1&standup=off&outfit=${outfit}`);
  await teleport(page, 6, 14);
  await sleep(400);
  const key = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').playerView.sprite.texture.key);
  check(`outfit ${outfit} renders`, key === `player_${outfit}`, key);
  await page.screenshot({ path: OUT + `shot-outfit-${outfit}.png`, clip: { x: 0, y: 300, width: 600, height: 240 } });
  await page.close();
}

// 2. standup freeze
{
  const page = await open('?debug=1&clock=09:19');
  await sleep(1500);
  const s = await state(page);
  check('standup freezes the world at 09:20', s.paused.includes('standup'), s);
  await page.screenshot({ path: OUT + 'shot-standup.png' });
  await sleep(3000);
  const s2 = await state(page);
  check('standup ends after 3s', !s2.paused.includes('standup'), s2);
  await page.close();
}

// 3. budget over
{
  const page = await open('?debug=1&standup=off&gu=1');
  await hold(page, 'ArrowRight', 2600);
  await sleep(500);
  const mid = await state(page);
  check('first death at gu=1 leaves 0.5 GU', mid.gu === 0.5, mid);
  await hold(page, 'ArrowRight', 2600);
  await sleep(1200);
  const active = await page.evaluate(() => globalThis.__game.scene.getScenes(true).map((s) => s.scene.key));
  check('budget at 0 shows BudgetOverScene', active.includes('BudgetOverScene'), active);
  await page.screenshot({ path: OUT + 'shot-budget.png' });
  await page.close();
}

// 4. level 2 with every pivot
for (const pivot of ['', 'replyAll', 'scopeCreep', 'deckCollapse', 'fakeKT']) {
  const page = await open(`?debug=1&standup=off&level=level2${pivot ? '&pivot=' + pivot : ''}`);
  const s = await state(page);
  check(`level2 pivot=${pivot || 'none'} loads`, s.gu === 15, s);
  if (pivot === 'scopeCreep') {
    await teleport(page, 31, 14);
    await sleep(2500);
    await page.screenshot({ path: OUT + 'shot-l2-scope.png' });
    await hold(page, 'ArrowRight', 2200);
    await sleep(300);
    const s2 = await state(page);
    check('pivoted scope creep bridge lets you walk across', s2.tile[0] >= 47 && s2.deaths === 0, s2);
  }
  if (pivot === 'deckCollapse') {
    await teleport(page, 50, 14);
    await sleep(200);
    await hold(page, 'ArrowRight', 2600);
    await sleep(300);
    const s2 = await state(page);
    check('pivoted deck bridge lets a running player cross', s2.tile[0] >= 67 && s2.deaths === 0, s2);
    await page.screenshot({ path: OUT + 'shot-l2-deck.png' });
  }
  if (pivot === 'replyAll') {
    await teleport(page, 4, 14);
    await sleep(5000);
    await page.screenshot({ path: OUT + 'shot-l2-replyall.png' });
    const s2 = await state(page);
    check('pivoted reply-all does not kill', s2.deaths === 0, s2);
  }
  if (pivot === 'fakeKT') {
    await teleport(page, 83, 11);
    await sleep(1200);
    await page.screenshot({ path: OUT + 'shot-l2-kt.png' });
    const s2 = await state(page);
    check('real KT gives GU (capped) and does not lock forever', s2.locked === false && s2.gu === 15, s2);
    const cp = await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').checkpoints.map((c) => c.id));
    check('level 2 has a checkpoint', cp.length === 1, cp);
  }
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nERRORS:\n' + (errors.length ? errors.join('\n') : 'none'));
