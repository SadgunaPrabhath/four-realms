/* ============================================================
   Save system — storage abstraction layer.
   Local persistence now; swap the driver for cloud later
   without touching game code.
   ============================================================ */

const PREFIX = 'four-realms:';
const SCHEMA_VERSION = 3;

/** Storage driver interface. LocalStorage implementation. */
const localDriver = {
  get(key) {
    try { return localStorage.getItem(PREFIX + key); }
    catch { return memoryFallback.get(key) ?? null; }
  },
  set(key, val) {
    try { localStorage.setItem(PREFIX + key, val); }
    catch { memoryFallback.set(key, val); }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch {}
    memoryFallback.delete(key);
  },
  keys() {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length));
    } catch { return [...memoryFallback.keys()]; }
  },
};
const memoryFallback = new Map(); // when localStorage is blocked (private mode)

let driver = localDriver;
export function setStorageDriver(d) { driver = d; }

/** Read + parse JSON. Returns fallback on any error. */
export function load(key, fallback = null) {
  const raw = driver.get(key);
  if (raw == null) return fallback;
  try {
    const obj = JSON.parse(raw);
    return migrate(key, obj);
  } catch (e) {
    console.warn('[save] corrupt entry', key, e);
    return fallback;
  }
}

/** Serialize + write. Returns true on success. */
export function save(key, value) {
  try {
    const payload = { _v: SCHEMA_VERSION, _t: Date.now(), data: value };
    driver.set(key, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('[save] write failed', key, e);
    return false;
  }
}

/** Unwrap the {_v,_t,data} envelope for consumers. */
export function loadData(key, fallback = null) {
  const wrapped = load(key, null);
  if (wrapped == null) return fallback;
  if (wrapped && typeof wrapped === 'object' && 'data' in wrapped && '_v' in wrapped) {
    return wrapped.data;
  }
  return wrapped; // legacy unwrapped
}

export function meta(key) {
  const wrapped = load(key, null);
  return wrapped && wrapped._t ? { savedAt: wrapped._t, version: wrapped._v } : null;
}

export function remove(key) { driver.remove(key); }
export function exists(key) { return driver.get(key) != null; }
export function allKeys() { return driver.keys(); }

/** Migrate old save shapes forward. Extend per version bump. */
function migrate(key, obj) {
  // Currently a passthrough; hook point for future schema changes.
  return obj;
}

/** Export every save as a portable JSON blob (for manual backup). */
export function exportAll() {
  const out = {};
  for (const k of driver.keys()) out[k] = driver.get(k);
  return JSON.stringify({ game: 'the-four-realms', version: SCHEMA_VERSION, exportedAt: Date.now(), saves: out }, null, 2);
}

/** Import a previously exported blob. */
export function importAll(json) {
  const parsed = JSON.parse(json);
  if (!parsed.saves) throw new Error('Invalid save file.');
  for (const [k, v] of Object.entries(parsed.saves)) driver.set(k, v);
  return Object.keys(parsed.saves).length;
}

export function wipeAll() {
  for (const k of driver.keys()) driver.remove(k);
}

export const SAVE_KEYS = {
  profile: 'profile',
  settings: 'settings',
  achievements: 'achievements',
  codex: 'codex',
  stats: 'stats',
  kingdom: 'save:kingdom',
  mythos: 'save:mythos',
  crime: 'save:crime',
  lastlife: 'save:lastlife',
  lastlifeMeta: 'meta:lastlife',
};
