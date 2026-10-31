/* ============================================================
   Achievements — definitions + unlock tracking.
   Modes emit bus events; this module records unlocks.
   ============================================================ */
import { loadData, save, SAVE_KEYS } from './save.js';
import { bus } from './bus.js';
import { awardXp } from './store.js';

export const ACHIEVEMENTS = [
  // ---- Kingdom ----
  { id: 'k_first_city', realm: 'kingdom', icon: '🏙️', name: 'Founded Your First City', desc: 'Grow a settlement into a City.', xp: 40 },
  { id: 'k_first_war', realm: 'kingdom', icon: '⚔️', name: 'Survived Your First War', desc: 'Win a war against a rival faction.', xp: 50 },
  { id: 'k_empire', realm: 'kingdom', icon: '👑', name: 'Built an Empire', desc: 'Reach the Empire tier.', xp: 120 },
  { id: 'k_pop_1000', realm: 'kingdom', icon: '🧑‍🤝‍🧑', name: 'A Thousand Souls', desc: 'Reach a population of 1,000.', xp: 40 },
  { id: 'k_ally', realm: 'kingdom', icon: '🤝', name: 'Diplomat', desc: 'Forge an alliance with a rival faction.', xp: 30 },
  { id: 'k_treasury', realm: 'kingdom', icon: '💰', name: 'Golden Coffers', desc: 'Hold 5,000 gold at once.', xp: 40 },
  // ---- Mythos ----
  { id: 'm_first_astra', realm: 'mythos', icon: '🏹', name: 'First Astra', desc: 'Unlock your first celestial weapon.', xp: 40 },
  { id: 'm_guardian', realm: 'mythos', icon: '🐉', name: 'Defeated a Legendary Guardian', desc: 'Slay a boss guardian.', xp: 60 },
  { id: 'm_arsenal', realm: 'mythos', icon: '🌟', name: 'Master of the Celestial Arsenal', desc: 'Unlock every celestial weapon.', xp: 150 },
  { id: 'm_companion', realm: 'mythos', icon: '🫂', name: 'Bound by Fate', desc: 'Recruit a companion.', xp: 30 },
  { id: 'm_level10', realm: 'mythos', icon: '💪', name: 'Seasoned Warrior', desc: 'Reach character level 10.', xp: 50 },
  // ---- Crime ----
  { id: 'c_first_case', realm: 'crime', icon: '🔍', name: 'First Case Solved', desc: 'Correctly identify a culprit.', xp: 40 },
  { id: 'c_perfect', realm: 'crime', icon: '🎯', name: 'Perfect Investigation', desc: 'Solve a case with full evidence and no wrong accusations.', xp: 70 },
  { id: 'c_clean', realm: 'crime', icon: '⚖️', name: 'Never Accused the Wrong Suspect', desc: 'Solve 3 cases without a single false accusation.', xp: 90 },
  { id: 'c_interrogator', realm: 'crime', icon: '🗣️', name: 'The Interrogator', desc: 'Break an alibi with contradicting evidence.', xp: 30 },
  // ---- Lastlife ----
  { id: 'l_day10', realm: 'lastlife', icon: '🌅', name: 'Survived 10 Days', desc: 'Survive to day 10 in a single run.', xp: 50 },
  { id: 'l_boss', realm: 'lastlife', icon: '💀', name: 'Defeated Your First Boss', desc: 'Kill a regional boss.', xp: 60 },
  { id: 'l_final', realm: 'lastlife', icon: '🏔️', name: 'Reached the Final Region', desc: 'Travel to the last region of the world.', xp: 90 },
  { id: 'l_legendary', realm: 'lastlife', icon: '🔥', name: 'Legendary Run', desc: 'Escape the wilds alive — win a run.', xp: 200 },
  { id: 'l_first_death', realm: 'lastlife', icon: '⚰️', name: 'This Is How It Ends', desc: 'Die for the first time. It happens to us all.', xp: 10 },
  // ---- Meta ----
  { id: 'meta_alltried', realm: 'meta', icon: '🌌', name: 'Realmwalker', desc: 'Play all four realms at least once.', xp: 60 },
  { id: 'meta_level5', realm: 'meta', icon: '⭐', name: 'Rising Legend', desc: 'Reach account level 5.', xp: 40 },
];

const byId = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

let unlocked = {}; // id -> timestamp

export function initAchievements() {
  unlocked = loadData(SAVE_KEYS.achievements) || {};
  wireEvents();
}

export function isUnlocked(id) { return !!unlocked[id]; }
export function unlockedMap() { return unlocked; }
export function unlockedCount() { return Object.keys(unlocked).length; }

export function unlock(id) {
  if (unlocked[id] || !byId[id]) return false;
  unlocked[id] = Date.now();
  save(SAVE_KEYS.achievements, unlocked);
  const ach = byId[id];
  awardXp(ach.xp || 20, `Achievement: ${ach.name}`);
  bus.emit('achievement:unlocked', ach);
  return true;
}

/** Wire mode events to achievement unlocks. */
function wireEvents() {
  bus.on('kingdom:tier', ({ tierIndex, tierName }) => {
    if (tierName === 'City') unlock('k_first_city');
    if (tierName === 'Empire') unlock('k_empire');
  });
  bus.on('kingdom:warWon', () => unlock('k_first_war'));
  bus.on('kingdom:population', (pop) => { if (pop >= 1000) unlock('k_pop_1000'); });
  bus.on('kingdom:gold', (g) => { if (g >= 5000) unlock('k_treasury'); });
  bus.on('kingdom:alliance', () => unlock('k_ally'));

  bus.on('mythos:astra', ({ total, all }) => { unlock('m_first_astra'); if (all) unlock('m_arsenal'); });
  bus.on('mythos:boss', () => unlock('m_guardian'));
  bus.on('mythos:companion', () => unlock('m_companion'));
  bus.on('mythos:level', (lvl) => { if (lvl >= 10) unlock('m_level10'); });

  bus.on('crime:solved', ({ perfect, cleanStreak }) => { unlock('c_first_case'); if (perfect) unlock('c_perfect'); if (cleanStreak >= 3) unlock('c_clean'); });
  bus.on('crime:contradiction', () => unlock('c_interrogator'));

  bus.on('lastlife:day', (day) => { if (day >= 10) unlock('l_day10'); });
  bus.on('lastlife:boss', () => unlock('l_boss'));
  bus.on('lastlife:region', (idx) => { if (idx >= 4) unlock('l_final'); });
  bus.on('lastlife:won', () => unlock('l_legendary'));
  bus.on('lastlife:death', () => unlock('l_first_death'));

  bus.on('profile:levelup', ({ level }) => { if (level >= 5) unlock('meta_level5'); });
  bus.on('realm:played', checkAllRealms);
}

function checkAllRealms() {
  const played = loadData('realmsPlayed') || {};
  if (played.kingdom && played.mythos && played.crime && played.lastlife) unlock('meta_alltried');
}

export function markRealmPlayed(realm) {
  const played = loadData('realmsPlayed') || {};
  if (!played[realm]) { played[realm] = true; save('realmsPlayed', played); bus.emit('realm:played', realm); }
}

export function achievementsByRealm() {
  const groups = {};
  for (const a of ACHIEVEMENTS) { (groups[a.realm] ||= []).push(a); }
  return groups;
}
