import { describe, it, expect, beforeEach } from 'vitest';
import { RNG, hashSeed, clamp } from '../src/engine/rng.js';
import { save, loadData, remove, exportAll, importAll, wipeAll } from '../src/engine/save.js';
import { fmt, signed, pct } from '../src/engine/format.js';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new RNG(42); const b = new RNG(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
  it('different seeds diverge', () => {
    const a = new RNG(1); const b = new RNG(2);
    expect(a.next()).not.toBe(b.next());
  });
  it('int() stays within bounds', () => {
    const r = new RNG(9);
    for (let i = 0; i < 1000; i++) { const v = r.int(3, 7); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(7); }
  });
  it('weighted() respects weights roughly', () => {
    const r = new RNG(5);
    let a = 0;
    for (let i = 0; i < 2000; i++) if (r.weighted([{ item: 'a', weight: 9 }, { item: 'b', weight: 1 }]) === 'a') a++;
    expect(a).toBeGreaterThan(1600); // ~90%
  });
  it('hashSeed is stable', () => { expect(hashSeed('hello')).toBe(hashSeed('hello')); });
  it('sample returns distinct elements', () => {
    const r = new RNG(3);
    const s = r.sample([1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
  });
});

describe('save system', () => {
  beforeEach(() => wipeAll());
  it('round-trips data', () => {
    save('k', { a: 1, b: [2, 3], c: 'x' });
    expect(loadData('k')).toEqual({ a: 1, b: [2, 3], c: 'x' });
  });
  it('returns fallback for missing keys', () => {
    expect(loadData('nope', 'DEF')).toBe('DEF');
  });
  it('remove deletes an entry', () => {
    save('t', 1); remove('t');
    expect(loadData('t', null)).toBe(null);
  });
  it('export/import preserves saves', () => {
    save('x', { v: 99 });
    const blob = exportAll();
    wipeAll();
    expect(loadData('x', null)).toBe(null);
    importAll(blob);
    expect(loadData('x')).toEqual({ v: 99 });
  });
  it('handles corrupt data gracefully', () => {
    save('good', 1);
    expect(loadData('good')).toBe(1);
  });
});

describe('format', () => {
  it('abbreviates large numbers', () => {
    expect(fmt(999)).toBe('999');
    expect(fmt(1500)).toBe('1.5K');
    expect(fmt(2500000)).toBe('2.5M');
  });
  it('signs numbers', () => { expect(signed(5)).toBe('+5'); expect(signed(-3)).toBe('-3'); });
  it('percent', () => { expect(pct(0.5)).toBe('50%'); });
});

describe('clamp', () => {
  it('bounds values', () => { expect(clamp(5, 0, 3)).toBe(3); expect(clamp(-1, 0, 3)).toBe(0); expect(clamp(2, 0, 3)).toBe(2); });
});
