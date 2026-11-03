import { describe, it, expect } from 'vitest';
import RestartBrain from '../src/core/RestartBrain.js';
import VpnBrain from '../src/core/VpnBrain.js';
import TicketBrain from '../src/core/TicketBrain.js';
import TeamBuildingBrain from '../src/core/TeamBuildingBrain.js';
import ContractorBrain from '../src/core/ContractorBrain.js';

describe('RestartBrain — forced restart', () => {
  it('3, 2, 1, then frozen for 1.2 s; once per life', () => {
    const b = new RestartBrain({ countdownMs: 3000, freezeMs: 1200 });
    expect(b.update(5000, true)).toBe(null);
    expect(b.trigger()).toBe(true);
    expect(b.secondsLeft).toBe(3);
    b.update(1500, true);
    expect(b.secondsLeft).toBe(2);
    expect(b.update(1499, true)).toBe(null);
    expect(b.update(1, true)).toBe('freeze');
    expect(b.update(1199, true)).toBe(null);
    expect(b.update(1, true)).toBe('unfreeze');
    expect(b.trigger()).toBe(false);
    b.reset();
    expect(b.trigger()).toBe(true);
  });

  it('at zero in the air it waits for the landing', () => {
    const b = new RestartBrain();
    b.trigger();
    expect(b.update(3000, false)).toBe(null);
    expect(b.update(400, false)).toBe(null);
    expect(b.state).toBe('waitLand');
    expect(b.update(16, true)).toBe('freeze');
  });
});

describe('VpnBrain', () => {
  it('connected 2 s, disconnected 1.2 s, shifted by its phase; dots go out in the last 600 ms', () => {
    const v = new VpnBrain({ onMs: 2000, offMs: 1200, phaseMs: 400 });
    expect(v.isOn(0)).toBe(false);
    expect(v.isOn(400)).toBe(true);
    expect(v.isOn(2399)).toBe(true);
    expect(v.isOn(2400)).toBe(false);
    expect(v.isOn(3600)).toBe(true);
    expect(v.dots(400)).toBe(3);
    expect(v.dots(400 + 1500)).toBe(3);
    expect(v.dots(400 + 1700)).toBe(2);
    expect(v.dots(400 + 1900)).toBe(1);
    expect(v.dots(2500)).toBe(null);
  });

  it('pivoted (split tunneling): always connected', () => {
    const v = new VpnBrain({ onMs: 2000, offMs: 1200 }, true);
    for (let t = 0; t < 10000; t += 100) expect(v.isOn(t)).toBe(true);
  });
});

describe('TicketBrain', () => {
  it('low priority: 4 s of work, open 2.5 s, then closed and re-armed', () => {
    const t = new TicketBrain({ workMs: 4000, openMs: 2500 });
    expect(t.update(10000)).toBe(null);
    expect(t.touch()).toBe(true);
    expect(t.touch()).toBe(false);
    t.update(2000);
    expect(t.progress).toBe(0.5);
    expect(t.update(2000)).toBe('open');
    expect(t.open).toBe(true);
    expect(t.update(2499)).toBe(null);
    expect(t.update(1)).toBe('close');
    expect([t.open, t.state]).toEqual([false, 'idle']);
  });

  it('pivoted P1: open after 300 ms and stays open', () => {
    const t = new TicketBrain({ workMs: 4000, openMs: 2500 }, true);
    t.touch();
    expect(t.update(300)).toBe('open');
    expect(t.update(100000)).toBe(null);
    expect(t.open).toBe(true);
  });
});

describe('TeamBuildingBrain', () => {
  it('takes each junior who walks in for 8 s, then gives them back', () => {
    const b = new TeamBuildingBrain({ awayMs: 8000 });
    expect(b.update(16, [{ key: 'a', inZone: true }, { key: 'b', inZone: false }])).toEqual({ taken: ['a'], back: [] });
    expect(b.update(16, [{ key: 'b', inZone: true }]).taken).toEqual(['b']);
    expect(b.anyAway).toBe(true);
    expect(b.update(7984, []).back).toEqual(['a']);
    expect(b.update(16, []).back).toEqual(['b']);
    expect(b.anyAway).toBe(false);
  });
});

describe('ContractorBrain', () => {
  it('hire → late → "come da specifica" → report the defect → complete', () => {
    const c = new ContractorBrain({ delayMs: 4000, fixMs: 2000 });
    expect(c.act()).toBe('hire');
    expect(c.act()).toBe(null);
    expect(c.update(3999)).toBe(null);
    expect(c.update(1)).toBe('build');
    expect(c.act()).toBe('report');
    expect(c.update(2000)).toBe('fix');
    expect(c.act()).toBe(null);
    expect(c.state).toBe('complete');
  });
});

import { LEVELS } from '../src/levels/index.js';
import { parseLevel } from '../src/core/LevelParser.js';
import { resolveLevel, resolveMode } from '../src/core/pivot.js';
import { validateLevel, longestQuietStretch } from '../src/core/LevelValidator.js';
import { PLAYER, GRAVITY, TILE, BURNOUT } from '../src/config/constants.js';
import { CAUSES } from '../src/data/causes.js';

const without = (def, ids) => ({ ...def, entities: def.entities.filter((e) => !ids.includes(e.id)) });

describe('IT and HR in the levels', () => {
  it('both are pivotable lessons; the HR course costs +10% (user)', () => {
    expect(CAUSES.it.pivotable && CAUSES.hr.pivotable).toBe(true);
    expect(BURNOUT.gain.hrCourse).toBe(10);
  });

  it('level 3: 215 columns, checkpoint 183, goal 210; the VPN pit cannot be crossed without the VPNs', () => {
    const lv = parseLevel(resolveLevel(LEVELS.level3));
    expect([lv.width, lv.goal.x]).toEqual([215, 210]);
    expect(lv.checkpoints.map((c) => c.x)).toContain(183);
    expect(validateLevel(lv, { table: 'normal' }).ok).toBe(true);
    const noVpn = parseLevel(resolveLevel(without(LEVELS.level3, ['slotVPN1', 'slotVPN2', 'slotVPN3'])));
    expect(validateLevel(noVpn).ok).toBe(false);
    // the IT ticket is a barrier like the approval gate
    expect(validateLevel(parseLevel(resolveLevel(without(LEVELS.level3, ['gate1']))), { gatesClosed: true }).ok).toBe(false);
    expect(longestQuietStretch(lv)).toBeLessThanOrEqual(12);
  });

  it('level 3 slots switch with the `it` lesson; level 4 slot with `hr`', () => {
    expect(resolveMode({ type: 'vpn', cause: 'it', slot: true }, 'it')).toBe('pivoted');
    expect(resolveLevel(LEVELS.level3, 'it').entities.find((e) => e.id === 'slotTicket').mode).toBe('pivoted');
    expect(resolveLevel(LEVELS.level4, 'hr').entities.find((e) => e.id === 'slotHR').mode).toBe('pivoted');
  });

  it("level 4: the certificate is reachable only from the contractor's last step", () => {
    const c = LEVELS.level4.entities.find((e) => e.id === 'contractor1');
    const hr = LEVELS.level4.entities.find((e) => e.id === 'slotHR').params.normal;
    const jump = PLAYER.jumpVelocity ** 2 / (2 * GRAVITY);
    const certTop = hr.certY * TILE + 16 + 8; // the pickup's lower edge
    const reachHead = (stepRow) => stepRow * TILE - jump - PLAYER.bodyHeight; // head at the jump's peak
    const rows = c.params.steps.map((s) => c.y + s.dy);
    expect(reachHead(rows[rows.length - 1])).toBeLessThan(certTop);
    for (const r of rows.slice(0, -1)) expect(reachHead(r)).toBeGreaterThan(certTop);
    expect(reachHead(c.y + 1)).toBeGreaterThan(certTop);
    // every step is at most 2 rows above the previous surface
    let prev = c.y + 1;
    for (const r of rows) {
      expect(prev - r).toBeLessThanOrEqual(2);
      prev = r;
    }
  });
});
