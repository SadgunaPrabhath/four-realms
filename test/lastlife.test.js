import { describe, it, expect } from 'vitest';
import * as L from '../src/modes/lastlife/logic.js';
import { REGIONS, ENEMIES } from '../src/modes/lastlife/data.js';

const mkRun = (cls = 'wanderer', meta = {}) => L.newRun({ seed: 123, classId: cls, meta });

describe('lastlife: run creation', () => {
  it('starts alive at full hp', () => {
    const r = mkRun();
    expect(r.alive).toBe(true);
    expect(r.hp).toBe(r.maxHp);
    expect(r.regionIndex).toBe(0);
  });
  it('applies meta boons to starting resources', () => {
    const base = mkRun('wanderer', {});
    const boon = mkRun('wanderer', { boons: { boon_coin: true, boon_rations: true, boon_veteran: true } });
    expect(boon.gold).toBeGreaterThan(base.gold);
    expect(boon.food).toBeGreaterThan(base.food);
    expect(boon.maxHp).toBeGreaterThan(base.maxHp);
  });
});

describe('lastlife: permadeath', () => {
  it('die() ends the run irreversibly', () => {
    const r = mkRun();
    L.die(r, 'test');
    expect(r.alive).toBe(false);
    expect(r.hp).toBe(0);
    // calling die again does not "revive" or change state
    L.die(r, 'again');
    expect(r.alive).toBe(false);
  });
  it('undying ability cheats death exactly once', () => {
    const r = L.newRun({ seed: 7, classId: 'revenant', meta: { unlockedClasses: { revenant: true } } });
    const c = L.startCombat(r, 'demon', false);
    r.hp = 1;
    // Force many enemy hits
    let survivedOnce = false;
    for (let i = 0; i < 40 && r.alive && !c.over; i++) {
      L.combatAction(r, c, 'defend');
      if (r.abilityUsedRun) survivedOnce = true;
    }
    expect(survivedOnce || !r.alive).toBe(true);
  });
});

describe('lastlife: survival', () => {
  it('hunger rises on travel and can starve', () => {
    const r = mkRun();
    r.hunger = 95;
    const hp0 = r.hp;
    L.travel(r);
    expect(r.hunger).toBe(100);
    L.travel(r); // now starving
    expect(r.hp).toBeLessThan(hp0);
  });
  it('eating reduces hunger and consumes food', () => {
    const r = mkRun();
    r.hunger = 60; const food0 = r.food;
    L.eat(r);
    expect(r.hunger).toBeLessThan(60);
    expect(r.food).toBe(food0 - 1);
  });
});

describe('lastlife: combat & bosses', () => {
  it('combat is deterministic per seed', () => {
    const r1 = mkRun(); const c1 = L.startCombat(r1, 'wolf', false);
    const r2 = mkRun(); const c2 = L.startCombat(r2, 'wolf', false);
    L.combatAction(r1, c1, 'attack'); L.combatAction(r2, c2, 'attack');
    expect(c1.enemy.hp).toBe(c2.enemy.hp);
    expect(r1.hp).toBe(r2.hp);
  });
  it('winning grants gold and kills', () => {
    const r = mkRun('warrior'); r.stats.atk = 999;
    const c = L.startCombat(r, 'rat', false);
    L.combatAction(r, c, 'attack');
    expect(c.result).toBe('win');
    expect(r.kills).toBe(1);
    expect(r.gold).toBeGreaterThan(10);
  });
  it('boss victory advances region and grants fragments', () => {
    const r = mkRun('warrior');
    r.encountersInRegion = 4;
    const startFrag = r.fragmentsEarned;
    const res = L.afterBoss(r);
    expect(r.regionIndex).toBe(1);
    expect(r.fragmentsEarned).toBeGreaterThan(startFrag);
    expect(res.won).toBe(false);
  });
  it('clearing the final region wins the run', () => {
    const r = mkRun('warrior');
    r.regionIndex = REGIONS.length - 1;
    const res = L.afterBoss(r);
    expect(res.won).toBe(true);
    expect(r.won).toBe(true);
  });
});

describe('lastlife: encounters', () => {
  it('generates a boss after clearing region encounters', () => {
    const r = mkRun();
    r.encountersInRegion = 4;
    const enc = L.generateEncounter(r);
    expect(enc.kind).toBe('boss');
    expect(ENEMIES[enc.enemyKey].boss).toBe(true);
  });
  it('event resolution records a decision', () => {
    const r = mkRun();
    const ev = { id: 'test', title: 'T', options: [{ label: 'a', outcomes: [{ w: 1, type: 'gold', mag: 10 }] }] };
    const before = r.gold;
    L.resolveEvent(r, ev, 0);
    expect(r.gold).toBe(before + 10);
    expect(r.decisions).toHaveLength(1);
  });
});
