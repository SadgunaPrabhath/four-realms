/* ============================================================
   THE FOUR REALMS — bootstrap
   ============================================================ */
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/screens.css';
import './styles/polish.css';

import { initStore, state, saveStats } from './engine/store.js';
import { initAchievements } from './engine/achievements.js';
import { initCodex } from './engine/codex.js';
import { initCheats } from './engine/cheats.js';
import { bus } from './engine/bus.js';
import { unlock as unlockAudio, applyVolumes, sfx } from './engine/audio.js';
import { achievementToast, toast } from './ui/feedback.js';
import { mountCheatFab } from './ui/cheatMenu.js';
import { registerScreen, navigate } from './app.js';

// Screens
import { hubScreen } from './ui/screens/hub.js';
import { settingsScreen } from './ui/screens/settings.js';
import { achievementsScreen } from './ui/screens/achievements.js';
import { codexScreen } from './ui/screens/codex.js';
import { statsScreen } from './ui/screens/stats.js';
import { creditsScreen } from './ui/screens/credits.js';
import { cheatsScreen } from './ui/screens/cheats.js';

// Modes
import { kingdomScreen } from './modes/kingdom/ui.js';
import { mythosScreen } from './modes/mythos/ui.js';
import { crimeScreen } from './modes/crime/ui.js';
import { lastlifeScreen } from './modes/lastlife/ui.js';

function boot() {
  initStore();
  initAchievements();
  initCodex();
  initCheats();
  applyVolumes();

  state.stats.sessions++;
  saveStats();

  // Register meta screens
  registerScreen('hub', hubScreen, { realm: 'menu', music: 'hub' });
  registerScreen('settings', settingsScreen, { realm: 'menu' });
  registerScreen('achievements', achievementsScreen, { realm: 'menu' });
  registerScreen('codex', codexScreen, { realm: 'menu' });
  registerScreen('stats', statsScreen, { realm: 'menu' });
  registerScreen('credits', creditsScreen, { realm: 'menu' });
  registerScreen('cheats', cheatsScreen, { realm: 'menu' });

  // Register modes
  registerScreen('kingdom', kingdomScreen, { realm: 'kingdom' });
  registerScreen('mythos', mythosScreen, { realm: 'mythos' });
  registerScreen('crime', crimeScreen, { realm: 'crime' });
  registerScreen('lastlife', lastlifeScreen, { realm: 'lastlife' });

  // Global event → feedback wiring
  bus.on('achievement:unlocked', (ach) => achievementToast(ach));
  bus.on('profile:levelup', ({ level }) => toast({ type: 'success', icon: '⭐', title: 'Account Level Up', body: `You are now level ${level}.`, sound: 'levelup' }));
  bus.on('codex:discovered', (e) => toast({ icon: '📖', title: 'Codex Updated', body: e.title, sound: 'reveal' }));

  // Unlock audio on first interaction (browser autoplay policy)
  const kick = () => { unlockAudio(); document.removeEventListener('pointerdown', kick); document.removeEventListener('keydown', kick); bus.emit('audio:unlocked'); };
  document.addEventListener('pointerdown', kick);
  document.addEventListener('keydown', kick);

  // Global click sound for buttons (delegation)
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('button, .card.clickable, .portal, .choice, .mode-tab, .tab');
    if (t && !t.disabled && !t.dataset.noclick) sfx('hover');
  }, { passive: true });

  // Play-time tracking
  setInterval(() => { state.stats.playSeconds += 5; }, 5000);
  window.addEventListener('beforeunload', () => saveStats());

  startAmbientEmbers();

  mountCheatFab();

  navigate('hub', {}, { replace: true, silent: true });
}

// Slow-rising ambient embers for atmosphere (respects settings).
function startAmbientEmbers() {
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  setInterval(() => {
    const s = state.settings;
    if (!s || !s.particles || s.reduceMotion) return;
    if (document.hidden) return;
    if (layer.querySelectorAll('.ember').length > 14) return;
    const e = document.createElement('div');
    e.className = 'ember';
    const size = 2 + Math.random() * 4;
    e.style.left = Math.random() * 100 + 'vw';
    e.style.width = e.style.height = size + 'px';
    e.style.opacity = 0.3 + Math.random() * 0.5;
    layer.appendChild(e);
    const drift = (Math.random() - 0.5) * 120;
    const dur = 6000 + Math.random() * 6000;
    e.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0 },
      { opacity: e.style.opacity, offset: 0.15 },
      { transform: `translate(${drift}px, -${60 + Math.random() * 40}vh) scale(0.3)`, opacity: 0 },
    ], { duration: dur, easing: 'ease-out' }).onfinish = () => e.remove();
  }, 900);
}

// Global error guard so one broken screen doesn't blank the app
window.addEventListener('error', (e) => { console.error('[global error]', e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => { console.error('[unhandled]', e.reason); });

boot();
