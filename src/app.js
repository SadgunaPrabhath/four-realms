/* ============================================================
   App shell + screen router.
   Registers screens; handles navigation, realm theming,
   audio theme switching, and lifecycle (mount/unmount).
   ============================================================ */
import { h, mount, clear } from './engine/dom.js';
import { sfx, playMusic } from './engine/audio.js';
import { bus } from './engine/bus.js';
import { state } from './engine/store.js';

const screens = new Map();
let current = null;
let currentName = null;
const history = [];

export function registerScreen(name, factory, opts = {}) {
  screens.set(name, { factory, opts });
}

export function currentScreen() { return currentName; }

/**
 * Navigate to a screen.
 * @param {string} name
 * @param {object} params passed to the screen factory
 * @param {object} navOpts { replace, silent }
 */
export function navigate(name, params = {}, navOpts = {}) {
  const entry = screens.get(name);
  if (!entry) { console.error('[router] unknown screen', name); return; }

  if (current?.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }

  if (!navOpts.silent) sfx(params._back ? 'back' : 'confirm');
  if (!navOpts.replace && currentName && currentName !== name) history.push({ name: currentName });

  const app = document.getElementById('app');
  const container = h('div.screen', { style: 'height:100%;width:100%;' });
  mount(app, container);
  // Entrance animation handled by CSS (.screen { animation: screenIn }).

  const realm = entry.opts.realm || 'menu';
  document.body.dataset.realm = realm === 'menu' ? '' : realm;

  const musicTheme = entry.opts.music ?? (realm === 'menu' ? 'hub' : realm);
  playMusic(musicTheme);

  currentName = name;
  current = entry.factory({ container, params, navigate, back }) || {};
  if (current.mount) current.mount(container);
  bus.emit('screen:changed', { name, realm });
  window.scrollTo(0, 0);
}

export function back() {
  const prev = history.pop();
  if (prev) navigate(prev.name, { _back: true }, { replace: true, silent: false });
  else navigate('hub', { _back: true }, { replace: true });
}

export function goHub() { history.length = 0; navigate('hub', {}, { replace: true }); }
