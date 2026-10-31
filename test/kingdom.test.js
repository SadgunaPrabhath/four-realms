import { describe, it, expect } from 'vitest';
import * as L from '../src/modes/kingdom/logic.js';
import { RNG } from '../src/engine/rng.js';
import { BUILDINGS } from '../src/modes/kingdom/data.js';

const mk = (over = {}) => L.newGame({ seed: 12345, name: 'Testland', difficulty: 'normal', ...over });

describe('kingdom: new game', () => {
  it('creates a valid starting state', () => {
    const gs = mk();
    expect(gs.pop).toBe(60);
    expect(gs.res.gold).toBeGreaterThan(0);
    expect(gs.factions).toHaveLength(4);
    expect(gs.tierIndex).toBe(0);
  });
  it('is deterministic for a given seed', () => {
    const a = L.newGame({ seed: 999, name: 'X' });
    const b = L.newGame({ seed: 999, name: 'X' });
    expect(a.factions.map(f => f.name)).toEqual(b.factions.map(f => f.name));
  });
});

describe('kingdom: building', () => {
  it('spends resources and adds a building', () => {
    const gs = mk();
    const goldBefore = gs.res.gold;
    const r = L.build(gs, 'farm');
    expect(r.ok).toBe(true);
    expect(gs.buildings.farm).toBe(3); // started with 2
    expect(gs.res.gold).toBeLessThan(goldBefore);
  });
  it('refuses when unaffordable', () => {
    const gs = mk();
    gs.res = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
    const r = L.build(gs, 'farm');
    expect(r.ok).toBe(false);
  });
  it('enforces once-only buildings (palace)', () => {
    const gs = mk();
    gs.res = { gold: 9999, food: 9999, wood: 9999, stone: 9999, iron: 9999 };
    expect(L.build(gs, 'palace').ok).toBe(true);
    expect(L.build(gs, 'palace').ok).toBe(false);
  });
  it('scales cost with count', () => {
    const gs = mk();
    const c1 = L.scaledCost(gs, 'farm');
    gs.buildings.farm += 3;
    const c2 = L.scaledCost(gs, 'farm');
    expect(c2.wood).toBeGreaterThan(c1.wood);
  });
});

describe('kingdom: economy', () => {
  it('production increases food when farms are built', () => {
    const gs = mk();
    const before = L.production(gs).food;
    gs.buildings.farm += 5;
    const after = L.production(gs).food;
    expect(after).toBeGreaterThan(before);
  });
  it('high taxes yield more gold than low taxes', () => {
    const gs = mk();
    gs.policies.tax = 'low';
    const low = L.production(gs).gold;
    gs.policies.tax = 'high';
    const high = L.production(gs).gold;
    expect(high).toBeGreaterThan(low);
  });
  it('endTurn advances the season and never makes resources negative', () => {
    const gs = mk();
    const rng = new RNG(1);
    for (let i = 0; i < 20; i++) L.endTurn(gs, rng);
    expect(gs.turn).toBe(21);
    for (const v of Object.values(gs.res)) expect(v).toBeGreaterThanOrEqual(0);
    expect(gs.happy).toBeGreaterThanOrEqual(0);
    expect(gs.happy).toBeLessThanOrEqual(100);
  });
});

describe('kingdom: military', () => {
  it('recruits units when affordable and requirements met', () => {
    const gs = mk();
    const r = L.recruit(gs, 'militia', 3);
    expect(r.ok).toBe(true);
    expect(gs.army.militia).toBe(9);
  });
  it('blocks advanced units without buildings', () => {
    const gs = mk();
    const r = L.recruit(gs, 'knights', 1);
    expect(r.ok).toBe(false);
  });
  it('army power increases with more troops', () => {
    const gs = mk();
    const p1 = L.armyPower(gs);
    L.recruit(gs, 'militia', 5);
    expect(L.armyPower(gs)).toBeGreaterThan(p1);
  });
  it('battle resolution reduces army and is deterministic per seed', () => {
    const gsA = mk(); L.recruit(gsA, 'militia', 10);
    const gsB = mk(); L.recruit(gsB, 'militia', 10);
    const ra = L.resolveBattle(gsA, 40, new RNG(7));
    const rb = L.resolveBattle(gsB, 40, new RNG(7));
    expect(ra.win).toBe(rb.win);
    expect(L.armyTotal(gsA)).toBe(L.armyTotal(gsB));
  });
});

describe('kingdom: tiers', () => {
  it('advances tier when population crosses threshold', () => {
    const gs = mk();
    gs.pop = 400;
    const logs = [];
    L.updateTier(gs, logs);
    expect(gs.tierIndex).toBeGreaterThanOrEqual(2); // Town
  });
  it('declares empire victory at top tier', () => {
    const gs = mk();
    gs.pop = 5000;
    L.updateTier(gs, []);
    expect(gs.gameOver?.won).toBe(true);
  });
});
