import { describe, it, expect } from 'vitest';
import FarmDay, { progress, skyColor, sunsetColor, SKY, farmEndingText } from '../src/core/FarmDay.js';
import { PHONE_MESSAGES, FINAL_MESSAGE } from '../src/data/farm.js';
import farm from '../src/levels/farm.js';
import { parseLevel, TILE_SOLID } from '../src/core/LevelParser.js';
import { LEVELS, LEVEL_ORDER } from '../src/levels/index.js';
import { PLAYER, GRAVITY, TILE } from '../src/config/constants.js';

const day = (over = {}) => new FarmDay({ eggsTotal: 5, vegTotal: 4, messages: PHONE_MESSAGES, firstMs: 4000, intervalMs: 8000, finalMessage: FINAL_MESSAGE, ...over });

describe('FarmDay — the phone', () => {
  it('stays quiet before the first move', () => {
    const d = day();
    expect(d.update(60000)).toBe(null);
    expect(d.received).toBe(0);
  });

  it('buzzes at fixed times, in order: first after 4 s, then every 8 s', () => {
    const d = day();
    d.start();
    expect(d.update(3999)).toBe(null);
    expect(d.update(1)).toBe(PHONE_MESSAGES[0]);
    expect(d.update(7999)).toBe(null);
    expect(d.update(1)).toBe(PHONE_MESSAGES[1]);
    expect(d.received).toBe(2);
  });

  it('hands out one message per call, even after a long frame, and cycles', () => {
    const d = day();
    d.start();
    const got = [d.update(4000 + 8000 * 9)];
    for (let i = 0; i < 9; i++) got.push(d.update(0));
    expect(got).toEqual([...PHONE_MESSAGES, PHONE_MESSAGES[0], PHONE_MESSAGES[1]]);
    expect(d.update(0)).toBe(null);
  });

  it('goes silent in the pond, and can be thrown only once', () => {
    const d = day();
    d.start();
    d.update(4000);
    expect(d.throwPhone()).toBe(true);
    expect(d.throwPhone()).toBe(false);
    expect(d.update(100000)).toBe(null);
    expect(d.received).toBe(1);
  });
});

describe('FarmDay — chores and summary', () => {
  it('counts eggs and vegetables, capped at the totals', () => {
    const d = day({ eggsTotal: 2 });
    d.collect('egg');
    d.collect('egg');
    d.collect('egg');
    d.collect('veg');
    expect([d.eggs, d.veg]).toEqual([2, 1]);
  });

  it('with the phone in your pocket, one last message arrives on the bench', () => {
    const d = day();
    d.start();
    d.update(4000);
    const s = d.finish();
    expect(s).toMatchObject({ received: 2, phoneThrown: false, lastMessage: FINAL_MESSAGE });
    // finishing twice changes nothing; nothing counts after the end
    d.collect('egg');
    expect(d.finish()).toEqual(s);
    expect(d.update(100000)).toBe(null);
  });

  it('with the phone in the pond, no last message', () => {
    const d = day();
    d.throwPhone();
    expect(d.finish()).toMatchObject({ received: 0, phoneThrown: true, lastMessage: null });
  });
});

describe('FarmDay — sky and ending texts', () => {
  it('progress is clamped', () => {
    expect(progress(0, 10, 20)).toBe(0);
    expect(progress(15, 10, 20)).toBe(0.5);
    expect(progress(99, 10, 20)).toBe(1);
  });

  it('the sky goes from afternoon to golden, then the sunset to night', () => {
    expect(skyColor(0)).toBe(SKY.afternoon);
    expect(skyColor(1)).toBe(SKY.golden);
    expect(skyColor(2)).toBe(SKY.golden);
    expect(sunsetColor(0)).toBe(SKY.golden);
    expect(sunsetColor(0.5)).toBe(SKY.sunset);
    expect(sunsetColor(1)).toBe(SKY.night);
  });

  it('ending texts: phone thrown, phone in pocket, no summary', () => {
    const thrown = farmEndingText({ eggs: 4, eggsTotal: 5, veg: 3, vegTotal: 4, received: 6, phoneThrown: true });
    expect(thrown.after).toBe('Hai mollato tutto. Ora fai il contadino.\nIl telefono è nello stagno. Le rane non fanno call.');
    expect(thrown.stats).toBe('Uova: 4/5 · Ortaggi: 3/4 · Notifiche ignorate: 6 · Telefono: nello stagno');
    const pocket = farmEndingText({ eggs: 0, eggsTotal: 5, veg: 0, vegTotal: 4, received: 3, phoneThrown: false });
    expect(pocket.after).toMatch(/ancora in tasca\. Vibra\.$/);
    expect(pocket.stats).toBe('Uova: 0/5 · Ortaggi: 0/4 · Notifiche ignorate: 3');
    expect(farmEndingText(undefined)).toEqual({ after: 'Hai mollato tutto. Ora fai il contadino.', stats: '' });
  });
});

describe('farm level map', () => {
  const level = parseLevel(farm);
  const solid = (x, y) => level.tiles[y]?.[x] === TILE_SOLID;
  // jump height in tiles: v² / 2g
  const jumpTiles = PLAYER.jumpVelocity ** 2 / (2 * GRAVITY) / TILE;

  it('is not part of the campaign (no lessons, leaderboard or pivots)', () => {
    expect(LEVEL_ORDER).not.toContain('farm');
    expect(Object.values(LEVELS)).not.toContain(farm);
  });

  it('has continuous ground and no spikes: you cannot fall or die', () => {
    for (let x = 0; x < level.width; x++) expect(solid(x, 15) && solid(x, 16), `col ${x}`).toBe(true);
    expect(level.spikes).toEqual([]);
  });

  it('hay stacks are at most 2 tiles high, well under the jump', () => {
    expect(jumpTiles).toBeGreaterThan(3);
    for (let x = 0; x < level.width; x++) {
      let h = 0;
      for (let y = 14; y >= 0 && solid(x, y); y--) h++;
      expect(h, `col ${x}`).toBeLessThanOrEqual(2);
    }
  });

  it('every egg and vegetable sits in the air, right on top of a surface', () => {
    const chores = farm.entities.filter((e) => e.type === 'egg' || e.type === 'veg');
    expect(chores.filter((e) => e.type === 'egg')).toHaveLength(5);
    expect(chores.filter((e) => e.type === 'veg')).toHaveLength(4);
    for (const c of chores) {
      expect(solid(c.x, c.y), c.id).toBe(false);
      expect(solid(c.x, c.y + 1), c.id).toBe(true);
    }
  });

  it('the pond zone and the bench are on the way, bench after the pond', () => {
    const pond = farm.entities.find((e) => e.type === 'pond');
    expect(pond.params.zoneFrom).toBeLessThanOrEqual(pond.x);
    expect(pond.params.zoneTo).toBeGreaterThanOrEqual(pond.x + pond.params.w - 1);
    expect(level.goal.x).toBeGreaterThan(pond.params.zoneTo);
    expect(level.spawn.x).toBe(farm.skyFrom);
    expect(level.goal.x).toBe(farm.skyTo);
  });
});
