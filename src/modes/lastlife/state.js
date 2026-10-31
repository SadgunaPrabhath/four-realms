/* LAST LIFE — run + meta-progression persistence.
   The run save is deleted on death (permadeath): a dead run
   can never be reloaded. Meta persists across all runs. */
import { save, loadData, remove, exists, SAVE_KEYS } from '../../engine/save.js';
import { CLASSES, META_UNLOCKS } from './data.js';

/* ---- Active run ---- */
export function saveRun(run) { return save(SAVE_KEYS.lastlife, run); }
export function loadRun() { return loadData(SAVE_KEYS.lastlife); }
export function hasRun() { return exists(SAVE_KEYS.lastlife); }
export function deleteRun() { remove(SAVE_KEYS.lastlife); }

/* ---- Meta ---- */
export function defaultMeta() {
  return { v: 1, fragments: 0, unlocks: {}, boons: {}, unlockedClasses: {}, bestDay: 0, totalRuns: 0, wins: 0 };
}
export function loadMeta() { return { ...defaultMeta(), ...(loadData(SAVE_KEYS.lastlifeMeta) || {}) }; }
export function saveMeta(m) { return save(SAVE_KEYS.lastlifeMeta, m); }

/** Which classes are available given meta unlocks. */
export function availableClasses(meta) {
  return CLASSES.map((c) => ({ ...c, unlocked: c.unlocked || !!meta.unlockedClasses[c.id] }));
}

export function purchaseUnlock(meta, unlockId) {
  const u = META_UNLOCKS.find((x) => x.id === unlockId);
  if (!u || meta.fragments < u.cost) return { ok: false };
  if (u.type === 'class' && meta.unlockedClasses[u.ref]) return { ok: false };
  if (u.type === 'boon' && meta.boons[u.id]) return { ok: false };
  meta.fragments -= u.cost;
  if (u.type === 'class') meta.unlockedClasses[u.ref] = true;
  if (u.type === 'boon') meta.boons[u.id] = true;
  saveMeta(meta);
  return { ok: true, unlock: u };
}
