import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
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

  // jump test: from spawn, run and jump the 2-gap (taking off before 544 px: the client's hidden mail stays hidden, see 1d)
  await teleport(page, 14, 14);
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
  await teleport(page, 88, 11);
  await sleep(500);
  const s5 = await state(page);
  check('fake KT burns 3 GU and locks input', s5.gu === before - 3 && s5.locked === true, s5);
  await page.screenshot({ path: OUT + 'shot-kt.png' });
  await sleep(4200);
  const s5b = await state(page);
  check('KT call ends after 4s', s5b.locked === false, s5b);

  // Deck: run into corridor
  await teleport(page, 95, 14);
  await sleep(200);
  await hold(page, 'ArrowRight', 1300);
  await sleep(400);
  const s6 = await state(page);
  check('running into the deck corridor dies by deckCollapse', (s6.byCause.deckCollapse ?? 0) >= 1, s6);
  await teleport(page, 98, 14);
  await page.keyboard.down('ArrowRight');
  await sleep(150);
  await page.keyboard.up('ArrowRight');
  await sleep(150);
  await hold(page, 'ArrowLeft', 300);
  await sleep(1500);
  await page.screenshot({ path: OUT + 'shot-deck.png' });

  // ScopeCreep left
  await teleport(page, 140, 14);
  await sleep(2500);
  const s7 = await state(page);
  check('scope creep left pushes into the pit behind', (s7.byCause.scopeCreep ?? 0) >= 2, s7);

  // Goal → Lessons Learned
  await teleport(page, 189, 14);
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

// 1c. level 1 betrayals and combos (docs/LEVELS.md, level 1 log): runners die, whoever waits gets through
{
  const fresh = () => open('?debug=1&standup=off');
  const cause = (s, c) => s.byCause[c] ?? 0;
  const run = async (page, from, ms) => {
    await teleport(page, from, 14);
    await sleep(150);
    await hold(page, 'ArrowRight', ms);
    await sleep(300);
    return state(page);
  };

  // run right and jump when the player reaches `jumpCol` (a real runner jumps onto the next step)
  const runJump = async (page, from, jumpCol, ms, row = 14) => {
    await teleport(page, from, row);
    await sleep(150);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction((c) => globalThis.__game.scene.getScene('GameScene').player.x >= c * 32, { timeout: 3000 }, jumpCol).catch(() => {});
    await hold(page, 'Space', 250);
    await sleep(ms);
    await page.keyboard.up('ArrowRight');
    await sleep(300);
    return state(page);
  };

  let page = await fresh();
  const a = await runJump(page, 46, 53.3, 600);
  check('L1: running out of the first corridor and jumping onto the step, the second inbox (ra1b) gets you', cause(a, 'replyAll') >= 1, a);
  await page.close();

  page = await fresh();
  await teleport(page, 50, 14);
  await sleep(1300);
  const b = await state(page);
  check('L1: stopping on the second inbox trigger, its emails miss you', b.deaths === 0, b);
  await page.screenshot({ path: OUT + 'shot-l1-inbox2.png' });
  await page.close();

  page = await fresh();
  const c = await run(page, 147, 1700);
  check('L1: running at the last gap, the "last round of comments" (ra3) gets you', cause(c, 'replyAll') >= 1, c);
  await page.close();

  page = await fresh();
  await teleport(page, 169, 14);
  await sleep(100);
  await teleport(page, 177, 12);
  await sleep(1200);
  const d = await state(page);
  check('L1: on the CR step right after the trigger, the email storm (ra4) gets you', cause(d, 'replyAll') >= 1, d);
  await page.close();

  page = await fresh();
  await teleport(page, 169, 14);
  await sleep(2300);
  await page.screenshot({ path: OUT + 'shot-l1-storm.png' });
  // the real chain: onto the step, across the fix without stopping, short hop over the pit, stop before the deck
  await teleport(page, 171, 14);
  await sleep(150);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__game.scene.getScene('GameScene').player.x >= 172.2 * 32, { timeout: 3000 }).catch(() => {});
  await hold(page, 'Space', 250);
  await page.waitForFunction(() => globalThis.__game.scene.getScene('GameScene').player.x >= 177.9 * 32, { timeout: 3000 }).catch(() => {});
  await hold(page, 'Space', 200);
  await page.waitForFunction(() => globalThis.__game.scene.getScene('GameScene').player.x >= 182.2 * 32, { timeout: 3000 }).catch(() => {});
  await page.keyboard.up('ArrowRight');
  await sleep(600);
  const e = await state(page);
  check('L1: after waiting out the storm you cross the fix step and land before the documentation', e.deaths === 0 && e.tile[0] >= 182 && e.tile[0] <= 183, e);
  await page.close();

  page = await fresh();
  const f = await run(page, 182, 1300);
  check('L1: running at the goal, the final deck (dk2) crushes you', cause(f, 'deckCollapse') >= 1, f);
  await page.close();

  page = await fresh();
  await teleport(page, 184, 14);
  await hold(page, 'ArrowLeft', 250);
  await sleep(1800);
  await page.screenshot({ path: OUT + 'shot-l1-deck-pile.png' });
  await page.keyboard.down('ArrowRight');
  await sleep(80);
  await hold(page, 'Space', 300);
  await sleep(1300);
  await page.keyboard.up('ArrowRight');
  await sleep(1300);
  const g = await state(page);
  check('L1: after the deck falls, you climb its pile and reach the goal', g.deaths === 0 && g.active.includes('LessonsLearnedScene'), g);
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

// 1d. the client's pranks in level 1 (docs/LEVELS.md, 2026-11-02): take-offs fixed in pixels, not by key timing
{
  const fresh = () => open('?debug=1&standup=off');
  const cause = (s, c) => s.byCause[c] ?? 0;
  const pranks = (page) =>
    page.evaluate(() => {
      const g = globalThis.__game.scene.getScene('GameScene');
      const hm = g.traps.find((t) => t.def.id === 'hm1');
      const rs = g.traps.find((t) => t.def.id === 'rs1');
      return { mail: hm.shown, mailVisible: hm.view.visible, plat: Math.round(rs.plat.x / 32), shift: rs.state, caption: rs.caption.visible, jump: g.player.lastJump && Math.round(g.player.lastJump.x) };
    });
  // hold the keys while the input is locked, then put the player on the floor at x0 running right with a buffered jump:
  // the jump happens on the next update, a few px further on. hop: no jump key held, so the jump is cut at once.
  const takeoff = async (page, x0, { hop = false, coyote = false } = {}) => {
    await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').player.lockInput('smoke', true));
    await page.keyboard.down('ArrowRight');
    if (!hop) await page.keyboard.down('Space');
    await sleep(120);
    await page.evaluate(([x0, coyote]) => {
      const g = globalThis.__game.scene.getScene('GameScene');
      const pl = g.player;
      pl.lockInput('smoke', false);
      pl.body.reset(x0, 15 * 32 - 16);
      pl.body.setVelocityX(260);
      if (!coyote) {
        pl.jumpBufferTimer = 110;
        return;
      }
      // coyote: buffer the jump only once the body has left the edge of col 17 (x > 585)
      const onUpdate = () => {
        if (pl.x > 588 && !pl.grounded) {
          pl.jumpBufferTimer = 110;
          g.events.off('postupdate', onUpdate);
        }
      };
      g.events.on('postupdate', onUpdate);
    }, [x0, coyote]);
  };
  const release = async (page) => {
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');
  };

  // (a) take off early in col 15: no mail, the 2-gap is cleared
  {
    const page = await fresh();
    await takeoff(page, 496);
    await sleep(700);
    await release(page);
    await sleep(300);
    const s = await state(page);
    const pr = await pranks(page);
    check('1d(a) taking off from col 15 the client mail stays hidden and the gap is cleared', !pr.mail && s.deaths === 0 && s.tile[0] >= 20, { ...pr, tile: s.tile, deaths: s.deaths });
    await page.close();
  }
  // (b) the comfortable jump from the edge of col 17: the mail pops over your head, you bonk and fall
  {
    const page = await fresh();
    await takeoff(page, 572);
    await sleep(160);
    const pr = await pranks(page);
    await page.screenshot({ path: OUT + 'shot-prank-mail.png' });
    await sleep(600);
    await release(page);
    await sleep(300);
    const s = await state(page);
    check('1d(b) taking off at the edge of col 17 the client mail appears and kills (hiddenClient)', pr.mail && pr.mailVisible && cause(s, 'hiddenClient') === 1, { ...pr, byCause: s.byCause });
    await page.close();
  }
  // (c) a coyote jump past the edge is caught too
  {
    const page = await fresh();
    await takeoff(page, 560, { coyote: true });
    await sleep(160);
    const pr = await pranks(page);
    await sleep(600);
    await release(page);
    await sleep(300);
    const s = await state(page);
    check('1d(c) a coyote jump past the edge of col 17 is caught as well', pr.mail && pr.jump > 585 && cause(s, 'hiddenClient') === 1, { ...pr, byCause: s.byCause });
    await page.close();
  }
  // (d) a full running jump from the edge of col 24: the landing slides back to 25–27 with the caption, you overshoot
  {
    const page = await fresh();
    await takeoff(page, 770);
    await sleep(250);
    const pr = await pranks(page);
    await page.screenshot({ path: OUT + 'shot-prank-requirement.png' });
    await sleep(600);
    await release(page);
    await sleep(300);
    const s = await state(page);
    check('1d(d) running jump from the edge of col 23: the requirement moves back (25–27), the caption shows, death by requirementChange', pr.plat === 25 && pr.caption && cause(s, 'requirementChange') === 1, { ...pr, byCause: s.byCause });
    await page.close();
  }
  // (e) a short hop from the same edge lands on the moved platform; from there the step 30–31 is reachable, spikes avoided
  {
    const page = await fresh();
    await takeoff(page, 770, { hop: true });
    await sleep(280);
    await release(page);
    await sleep(300);
    const s1 = await state(page);
    const pr = await pranks(page);
    // from the right end of the moved platform: jump holding right briefly, then let go so as not to reach the spikes
    await teleport(page, 27, 14);
    await sleep(250);
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowRight');
    await sleep(260);
    await page.keyboard.up('ArrowRight');
    await sleep(250);
    await page.keyboard.up('Space');
    await sleep(400);
    const s2 = await state(page);
    check('1d(e) a short hop lands on the moved requirement, then the step 30–31 is reachable without dying', pr.plat === 25 && s1.deaths === 0 && s1.tile[0] >= 25 && s1.tile[0] <= 27 && s2.deaths === 0 && s2.tile[0] >= 30 && s2.tile[0] <= 31 && s2.tile[1] === 12, { pr, s1: s1.tile, s2: s2.tile, deaths: s2.deaths, byCause: s2.byCause });
    await page.close();
  }
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
    // keep the level 2 micromanager busy: this check is about the bridge
    await page.evaluate(() => globalThis.__game.scene.getScene('GameScene').npcs.find((n) => n.def.id === 'mm1').brain.occupy(20000));
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
