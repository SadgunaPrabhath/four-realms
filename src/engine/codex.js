/* ============================================================
   Codex — dynamically unlocked lore & discovery entries.
   Modes call discover(); the Codex UI reads the store.
   ============================================================ */
import { loadData, save, SAVE_KEYS } from './save.js';
import { bus } from './bus.js';

let entries = {}; // id -> { id, category, realm, title, body, ts }

export function initCodex() { entries = loadData(SAVE_KEYS.codex) || {}; }

export function discover(entry) {
  if (!entry?.id || entries[entry.id]) return false;
  entries[entry.id] = { ...entry, ts: Date.now() };
  save(SAVE_KEYS.codex, entries);
  bus.emit('codex:discovered', entries[entry.id]);
  return true;
}

export function has(id) { return !!entries[id]; }
export function all() { return Object.values(entries).sort((a, b) => a.ts - b.ts); }
export function count() { return Object.keys(entries).length; }

export function byCategory() {
  const groups = {};
  for (const e of all()) (groups[e.category || 'Lore'] ||= []).push(e);
  return groups;
}
