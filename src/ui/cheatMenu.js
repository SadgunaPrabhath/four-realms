/* ============================================================
   Cheat menu — floating button + live overlay.
   Available everywhere; gameplay actions apply to the active mode.
   ============================================================ */
import { h } from '../engine/dom.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/bus.js';
import { modal, toast } from './feedback.js';
import { CHEAT_CATALOG, cheatFlags, toggleFlag, runCheat, currentContext, anyFlagOn } from '../engine/cheats.js';

let fab = null;

/** Mount the persistent floating cheat button. */
export function mountCheatFab() {
  if (fab) return;
  fab = h('button.cheat-fab', { title: 'Cheats & Codes (C)', 'aria-label': 'Open cheats', onclick: () => openCheatMenu() }, '⚡');
  document.body.appendChild(fab);
  const sync = () => fab.classList.toggle('active', anyFlagOn());
  bus.on('cheats:changed', sync); sync();

  // Keyboard shortcut: C (when not typing in a field)
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && !/input|textarea/i.test(e.target.tagName) && !e.metaKey && !e.ctrlKey) openCheatMenu();
  });
}

export function openCheatMenu() {
  sfx('confirm');
  const ctx = currentContext();
  const realm = ctx?.realm || null;

  const sections = [];
  // Global always first
  sections.push(renderGroup(CHEAT_CATALOG.find((g) => g.realm === 'global'), true));
  // Then the active realm's group, if any
  if (realm) {
    const g = CHEAT_CATALOG.find((x) => x.realm === realm && x.realm !== 'global');
    if (g) sections.push(renderGroup(g, true));
  } else {
    sections.push(h('div.panel', { style: 'padding:14px;text-align:center' },
      h('p.muted.small', 'Enter a realm to use its gameplay cheats. Global cheats work anywhere.')));
  }

  modal({
    wide: true, title: '⚡ Cheats & Codes',
    body: h('div',
      h('p.tiny.faint', { style: 'margin-bottom:12px' }, 'Codes apply to your current game. Toggle switches stay on until you turn them off. This is meant for fun — enjoy the sandbox.'),
      ...sections,
      h('div.divider'),
      h('p.tiny.faint', { style: 'text-align:center' }, 'Full descriptions live in the Cheats screen from the main menu.'),
    ),
    actions: [{ label: 'Done', primary: true, onClick: (close) => { close(); return true; } }],
  });
}

function renderGroup(group, live) {
  if (!group) return null;
  return h('div', { style: 'margin-bottom:16px' },
    h('h3', { style: 'color:var(--gold-300);margin-bottom:8px' }, group.label),
    h('div.grid.grid-auto-lg',
      ...group.cheats.map((cheat) => cheatControl(group, cheat))),
  );
}

function cheatControl(group, cheat) {
  if (cheat.kind === 'flag') {
    const on = cheatFlags[cheat.flag];
    return h('div.card', { style: on ? 'border-color:var(--realm)' : '' },
      h('div.row', { style: 'justify-content:space-between;align-items:center;gap:10px' },
        h('div.row.gap-2', { style: 'align-items:center' }, h('span', { style: 'font-size:1.2rem' }, cheat.icon), h('strong', cheat.name)),
        h('label.switch',
          h('input', { type: 'checkbox', checked: on, onchange: (e) => { toggleFlag(cheat.flag); sfx('click'); toast({ icon: cheat.icon, body: `${cheat.name} ${e.target.checked ? 'ON' : 'OFF'}` }); openCheatMenu(); } }),
          h('span.track'))),
      h('p.tiny.muted', { style: 'margin-top:6px' }, cheat.desc));
  }
  // action
  const ctx = currentContext();
  const usable = cheat.realm === 'global' || group.realm === 'global' ? isGlobalUsable(cheat) : (ctx && ctx.realm === group.realm && ctx.handlers[cheat.id]);
  return h('div.card',
    h('div.row.gap-2', { style: 'align-items:center' }, h('span', { style: 'font-size:1.2rem' }, cheat.icon), h('strong', cheat.name)),
    h('p.tiny.muted', { style: 'margin:6px 0' }, cheat.desc),
    h('button.btn.sm.block', { class: usable ? 'primary' : '', disabled: !usable,
      onclick: () => activate(group, cheat) }, usable ? 'Activate' : 'Enter realm first'));
}

function isGlobalUsable(cheat) {
  // global actions are always usable; god_mode is a flag handled above
  return true;
}

function activate(group, cheat) {
  sfx('levelup');
  if (group.realm === 'global') {
    globalCheat(cheat.id);
  } else {
    if (!runCheat(cheat.id)) { toast({ type: 'warning', body: 'Enter that realm to use this cheat.', sound: 'wrong' }); return; }
    toast({ type: 'success', icon: cheat.icon, body: `${cheat.name} activated!` });
  }
}

function globalCheat(id) {
  import('../engine/achievements.js').then((A) => {
    if (id === 'unlock_achievements') {
      let n = 0; A.ACHIEVEMENTS.forEach((a) => { if (A.unlock(a.id)) n++; });
      toast({ type: 'success', icon: '🏆', body: `Unlocked ${n} achievements!` });
    }
  });
  if (id === 'account_levels') {
    import('../engine/store.js').then((S) => { S.awardXp(2000, 'cheat'); toast({ type: 'success', icon: '⭐', body: 'Account XP granted — several levels!' }); });
  }
}
