/* ============================================================
   Cheat system.
   - A persisted set of toggle flags (God Mode, Free Build, …)
     that mode UIs read at action time.
   - A live "context" the active mode registers so one-shot cheat
     ACTIONS (add gold, full heal, reveal culprit, …) can mutate
     the current game state and trigger a re-render.
   - A catalog used both by the live cheat menu and the in-game
     Cheats detail screen.
   Cheats never run through mode logic.js, so deterministic tests
   and core balance are untouched unless the player opts in.
   ============================================================ */
import { loadData, save } from './save.js';
import { bus } from './bus.js';

const KEY = 'cheats';

export const cheatFlags = {
  godMode: false,        // survive lethal hits (mythos/lastlife); realm never collapses (kingdom)
  freeBuild: false,      // kingdom: buildings & recruits cost nothing
  infiniteStamina: false,// mythos: abilities never run out of stamina
  noHunger: false,       // lastlife: hunger never rises
};

export function initCheats() {
  const saved = loadData(KEY);
  if (saved) Object.assign(cheatFlags, saved);
}
export function saveCheatFlags() { save(KEY, cheatFlags); bus.emit('cheats:changed', cheatFlags); }
export function setFlag(id, val) { if (id in cheatFlags) { cheatFlags[id] = val; saveCheatFlags(); } }
export function toggleFlag(id) { if (id in cheatFlags) { cheatFlags[id] = !cheatFlags[id]; saveCheatFlags(); } return cheatFlags[id]; }
export function anyFlagOn() { return Object.values(cheatFlags).some(Boolean); }

/* ---- Live mode context ---- */
let ctx = null; // { realm, label, handlers:{id:fn}, rerender:fn }
export function setCheatContext(c) { ctx = c; bus.emit('cheats:context', c); }
export function clearCheatContext() { ctx = null; bus.emit('cheats:context', null); }
export function currentContext() { return ctx; }

/** Run an action cheat by id against the active mode. */
export function runCheat(id) {
  if (!ctx || !ctx.handlers[id]) return false;
  ctx.handlers[id]();
  ctx.rerender?.();
  bus.emit('cheats:used', id);
  return true;
}

/* ============================================================
   CATALOG — every cheat, its realm, kind and description.
   kind: 'flag' (persistent toggle) | 'action' (one-shot)
   ============================================================ */
export const CHEAT_CATALOG = [
  {
    realm: 'global', label: '🌌 Global', icon: '🌌',
    cheats: [
      { id: 'unlock_achievements', name: 'Grand Historian', icon: '🏆', kind: 'action', desc: 'Instantly unlock every achievement across all four realms.' },
      { id: 'account_levels', name: 'Ascendant', icon: '⭐', kind: 'action', desc: 'Grant a large amount of account XP (several level-ups at once).' },
      { id: 'god_mode', name: 'God Mode', icon: '✨', kind: 'flag', flag: 'godMode', desc: 'You cannot die. Lethal blows leave you at 1 HP in combat; your kingdom never collapses. Works in Mythos, Last Life and Kingdom.' },
    ],
  },
  {
    realm: 'kingdom', label: '👑 Kingdom', icon: '👑',
    cheats: [
      { id: 'k_gold', name: 'Overflowing Coffers', icon: '🪙', kind: 'action', desc: 'Add 5,000 gold to the treasury.' },
      { id: 'k_resources', name: 'Bottomless Stores', icon: '📦', kind: 'action', desc: 'Add 1,000 of every resource (food, wood, stone, iron).' },
      { id: 'k_population', name: 'Great Migration', icon: '🧑‍🤝‍🧑', kind: 'action', desc: 'Add 500 population and instantly advance your settlement tier if eligible.' },
      { id: 'k_morale', name: 'Beloved Ruler', icon: '😊', kind: 'action', desc: 'Set happiness and loyalty to maximum, wipe out crime.' },
      { id: 'k_army', name: 'Endless Legions', icon: '🛡️', kind: 'action', desc: 'Add 50 of every military unit to your host.' },
      { id: 'k_diplomacy', name: 'Silver Tongue', icon: '🤝', kind: 'action', desc: 'Make every faction your ally and end all wars.' },
      { id: 'freebuild', name: 'Free Construction', icon: '🏗️', kind: 'flag', flag: 'freeBuild', desc: 'Buildings and troop recruitment cost no resources while active.' },
    ],
  },
  {
    realm: 'mythos', label: '🕉️ Mythos', icon: '🕉️',
    cheats: [
      { id: 'm_heal', name: 'Divine Restoration', icon: '❤️', kind: 'action', desc: 'Fully restore health and stamina.' },
      { id: 'm_levels', name: 'Destined Hero', icon: '📈', kind: 'action', desc: 'Gain 5 levels and 30 unspent stat points.' },
      { id: 'm_astras', name: 'Celestial Arsenal', icon: '🌟', kind: 'action', desc: 'Unlock every legendary and divine astra at once.' },
      { id: 'm_gold', name: 'Treasure Hoard', icon: '🪙', kind: 'action', desc: 'Add 1,000 gold and 10 healing potions.' },
      { id: 'infstam', name: 'Boundless Spirit', icon: '⚡', kind: 'flag', flag: 'infiniteStamina', desc: 'Special abilities never run out of stamina in combat.' },
    ],
  },
  {
    realm: 'crime', label: '🕵️ Crime', icon: '🕵️',
    cheats: [
      { id: 'c_evidence', name: 'Sharp Eyes', icon: '🔦', kind: 'action', desc: 'Instantly discover every piece of evidence at the crime scene.' },
      { id: 'c_alibi', name: 'The Perfect Trap', icon: '⚠️', kind: 'action', desc: 'Break the guilty suspect\'s alibi and reveal all motives.' },
      { id: 'c_reveal', name: 'Whodunit', icon: '👁️', kind: 'action', desc: 'Reveal who the true culprit is (a hint, not an auto-solve).' },
    ],
  },
  {
    realm: 'lastlife', label: '💀 Last Life', icon: '💀',
    cheats: [
      { id: 'l_heal', name: 'Iron Constitution', icon: '❤️', kind: 'action', desc: 'Fully restore health and clear all status effects.' },
      { id: 'l_supplies', name: 'Well Provisioned', icon: '🎒', kind: 'action', desc: 'Add 500 gold, 10 food and 10 potions.' },
      { id: 'l_stats', name: 'Peak Condition', icon: '💪', kind: 'action', desc: 'Boost attack, defense and luck, and raise max health.' },
      { id: 'l_region', name: 'Pathfinder', icon: '🌄', kind: 'action', desc: 'Skip ahead to the next region (survives the boss).' },
      { id: 'l_fragments', name: 'Soul Harvest', icon: '🔹', kind: 'action', desc: 'Add 999 Soul Fragments to your meta-progression.' },
      { id: 'l_classes', name: 'Many Lives', icon: '🔓', kind: 'action', desc: 'Permanently unlock every starting class.' },
      { id: 'nohunger', name: 'Never Hungry', icon: '🍖', kind: 'flag', flag: 'noHunger', desc: 'Hunger never rises. You will never starve.' },
      { id: 'godmode2', name: 'God Mode', icon: '✨', kind: 'flag', flag: 'godMode', desc: 'You cannot die. Shares the global God Mode toggle.' },
    ],
  },
];

export function catalogForRealm(realm) { return CHEAT_CATALOG.find((g) => g.realm === realm); }
