/* ============================================================
   Global store — player profile, settings, cross-mode stats.
   Mode-specific state lives in each mode's own module.
   ============================================================ */
import { loadData, save, SAVE_KEYS } from './save.js';
import { bus } from './bus.js';

const defaultProfile = () => ({
  name: 'Wanderer',
  title: 'the Unproven',
  createdAt: Date.now(),
  totalXp: 0,
  level: 1,
  lastMode: null,
});

const defaultSettings = () => ({
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  screenShake: true,
  particles: true,
  reduceMotion: false,
  difficulty: 'normal', // easy | normal | hard
  aiNarration: false,
  fontScale: 1,
});

const defaultStats = () => ({
  playSeconds: 0,
  sessions: 0,
  // Kingdom
  kingdomsFounded: 0,
  warsWon: 0,
  highestPopulation: 0,
  highestTier: 0,
  // Mythos
  mythosBossesSlain: 0,
  mythosQuestsDone: 0,
  astrasUnlocked: 0,
  // Crime
  casesSolved: 0,
  casesFailed: 0,
  perfectCases: 0,
  // Lastlife
  runs: 0,
  bestDaysSurvived: 0,
  totalKills: 0,
  bossesDown: 0,
  deepestRegion: 0,
});

export const state = {
  profile: null,
  settings: null,
  stats: null,
};

export function initStore() {
  state.profile = { ...defaultProfile(), ...(loadData(SAVE_KEYS.profile) || {}) };
  state.settings = { ...defaultSettings(), ...(loadData(SAVE_KEYS.settings) || {}) };
  state.stats = { ...defaultStats(), ...(loadData(SAVE_KEYS.stats) || {}) };
  applySettings();
}

export function saveProfile() { save(SAVE_KEYS.profile, state.profile); }
export function saveSettings() { save(SAVE_KEYS.settings, state.settings); applySettings(); bus.emit('settings:changed', state.settings); }
export function saveStats() { save(SAVE_KEYS.stats, state.stats); }

/** Bump a global stat, keeping max-style stats correct. */
export function bumpStat(key, amount = 1, mode = 'add') {
  if (!(key in state.stats)) state.stats[key] = 0;
  if (mode === 'max') state.stats[key] = Math.max(state.stats[key], amount);
  else state.stats[key] += amount;
  saveStats();
  bus.emit('stat:changed', { key, value: state.stats[key] });
}

/** Award global account XP (from any mode) and handle level ups. */
export function awardXp(amount, reason = '') {
  state.profile.totalXp += amount;
  const need = (lvl) => 100 + lvl * 60;
  let leveled = false;
  while (state.profile.totalXp >= need(state.profile.level)) {
    state.profile.totalXp -= need(state.profile.level);
    state.profile.level++;
    leveled = true;
  }
  saveProfile();
  if (leveled) bus.emit('profile:levelup', { level: state.profile.level, reason });
  bus.emit('profile:xp', { amount, reason });
  return leveled;
}

export function xpProgress() {
  const need = 100 + state.profile.level * 60;
  return { current: state.profile.totalXp, need, pct: state.profile.totalXp / need };
}

function applySettings() {
  const s = state.settings;
  document.documentElement.style.setProperty('--font-scale', s.fontScale);
  document.body.classList.toggle('no-particles', !s.particles);
  document.body.classList.toggle('reduce-motion', s.reduceMotion);
}

export { defaultProfile, defaultSettings, defaultStats };
