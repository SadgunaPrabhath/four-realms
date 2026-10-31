/* ============================================================
   Deterministic seeded RNG (Mulberry32) + helpers.
   Used for all procedural generation so runs are reproducible
   and testable. Never use Math.random for game-critical logic.
   ============================================================ */

/** Hash a string to a 32-bit seed. */
export function hashSeed(str) {
  str = String(str);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** A small, fast, deterministic PRNG object. */
export class RNG {
  constructor(seed) {
    this.seed = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed ?? Date.now());
    this.state = this.seed;
  }
  /** float [0,1) */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** integer in [min, max] inclusive */
  int(min, max) {
    if (max === undefined) { max = min; min = 0; }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /** float in [min, max) */
  float(min, max) {
    if (max === undefined) { max = min; min = 0; }
    return this.next() * (max - min) + min;
  }
  /** true with probability p */
  chance(p) { return this.next() < p; }
  /** pick a random element */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** pick n distinct elements (Fisher-Yates partial) */
  sample(arr, n) {
    const a = arr.slice();
    const out = [];
    n = Math.min(n, a.length);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(this.next() * a.length);
      out.push(a.splice(j, 1)[0]);
    }
    return out;
  }
  /** shuffle a copy */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** weighted pick: entries = [{item, weight}] or map of item->weight */
  weighted(entries) {
    const list = Array.isArray(entries)
      ? entries
      : Object.entries(entries).map(([item, weight]) => ({ item, weight }));
    const total = list.reduce((s, e) => s + e.weight, 0);
    let r = this.next() * total;
    for (const e of list) {
      r -= e.weight;
      if (r <= 0) return e.item;
    }
    return list[list.length - 1].item;
  }
  /** rough normal distribution (Box-Muller), clamped */
  gaussian(mean = 0, sd = 1) {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  fork(salt) { return new RNG((this.seed ^ hashSeed(String(salt))) >>> 0); }
}

/** Convenience: a fresh non-deterministic seed for new runs. */
export function newSeed() {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0);
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
