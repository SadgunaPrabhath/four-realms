/* ============================================================
   Main Hub — cinematic launcher for the four realms.
   ============================================================ */
import { h, mount } from '../../engine/dom.js';
import { state, xpProgress } from '../../engine/store.js';
import { exists, loadData, SAVE_KEYS } from '../../engine/save.js';
import { TIERS } from '../../modes/kingdom/data.js';
import { REGIONS as MYTHOS_REGIONS } from '../../modes/mythos/data.js';
import { REGIONS as LL_REGIONS } from '../../modes/lastlife/data.js';
import { rankFor } from '../../modes/crime/logic.js';
import { unlockedCount } from '../../engine/achievements.js';
import { count as codexCount } from '../../engine/codex.js';
import { ACHIEVEMENTS } from '../../engine/achievements.js';
import { meter } from '../../ui/widgets.js';
import { sfx } from '../../engine/audio.js';
import { narrateLocal } from '../../engine/narrative.js';
import { burstAt } from '../../ui/feedback.js';

const REALMS = [
  { id: 'kingdom', icon: '👑', name: 'Kingdom', tag: 'Build. Rule. Conquer.', color: 'var(--kingdom)', save: SAVE_KEYS.kingdom },
  { id: 'mythos', icon: '🕉️', name: 'Mythos', tag: 'Walk among legends.', color: 'var(--mythos)', save: SAVE_KEYS.mythos },
  { id: 'crime', icon: '🕵️', name: 'Crime', tag: 'Truth hides behind lies.', color: 'var(--crime)', save: SAVE_KEYS.crime },
  { id: 'lastlife', icon: '💀', name: 'Last Life', tag: 'One life. No second chance.', color: 'var(--lastlife)', save: SAVE_KEYS.lastlife },
];

/** Build a compact per-realm status card for the dashboard. */
function realmStatus(id) {
  try {
    if (id === 'kingdom') {
      const s = loadData(SAVE_KEYS.kingdom);
      if (!s) return { active: false, text: 'Unclaimed throne' };
      return { active: true, text: `${TIERS[s.tierIndex]?.name || 'Village'} · Season ${s.turn}` };
    }
    if (id === 'mythos') {
      const s = loadData(SAVE_KEYS.mythos);
      if (!s) return { active: false, text: 'No legend yet' };
      return { active: true, text: `Lv ${s.level} · ${MYTHOS_REGIONS[s.regionIndex]?.name || '—'}` };
    }
    if (id === 'crime') {
      const s = loadData(SAVE_KEYS.crime);
      if (!s) return { active: false, text: 'No cases yet' };
      return { active: true, text: `${rankFor(s.casesSolved)} · ${s.casesSolved} solved` };
    }
    if (id === 'lastlife') {
      const m = loadData(SAVE_KEYS.lastlifeMeta);
      const run = loadData(SAVE_KEYS.lastlife);
      if (run && run.alive) return { active: true, text: `Day ${run.day} · ${LL_REGIONS[run.regionIndex]?.name || '—'}` };
      if (m && (m.totalRuns || m.bestDay)) return { active: true, text: `Best: day ${m.bestDay} · ${m.fragments || 0} 🔹` };
      return { active: false, text: 'No runs yet' };
    }
  } catch { /* ignore */ }
  return { active: false, text: '—' };
}

function dashCard(r, navigate) {
  const st = realmStatus(r.id);
  return h('button.dash-card', { style: `--dc:${r.color}`, onclick: () => navigate(r.id) },
    h('span.dash-ico', r.icon),
    h('div.dash-meta',
      h('span.dash-name', r.name),
      h('span', { class: 'dash-status' + (st.active ? ' active' : '') }, st.text),
    ),
  );
}

export function hubScreen({ container, navigate }) {
  return {
    mount() {
      const xp = xpProgress();
      const p = state.profile;

      const portal = (r) => {
        const hasSave = exists(r.save);
        const el = h('button.portal', {
          style: `--pc:${r.color}`,
          onclick: (e) => { burstAt(e.currentTarget, { color: r.color, count: 10 }); setTimeout(() => navigate(r.id), 120); },
        },
          hasSave && h('span.portal-cont.tag.gold', 'Continue'),
          h('div.portal-content',
            h('div.portal-ico', r.icon),
            h('div.portal-name', r.name),
            h('div.portal-tag', r.tag),
          ),
        );
        return el;
      };

      const navBtn = (label, screen, icon) => h('button.btn.ghost', { onclick: () => navigate(screen) }, icon + ' ' + label);

      mount(container,
        h('div.hub',
          h('div.hub-inner',
            h('div.hub-header',
              h('div.hub-crest', '⚔️'),
              h('h1.hub-title', 'The Four Realms'),
              h('div.hub-tag', 'A Living World of Power, Mystery, Survival & Legend'),
            ),

            // Profile strip
            h('div.profile-strip',
              h('div.avatar', p.name.charAt(0).toUpperCase()),
              h('div.col', { style: 'gap:2px;min-width:150px;flex:1' },
                h('div.row', { style: 'gap:8px;align-items:baseline' },
                  h('strong', p.name),
                  h('span.tiny.faint', p.title),
                ),
                meter({ label: `Level ${p.level}`, value: xp.current, max: xp.need, kind: 'xp', showNums: false, thin: true }),
              ),
              h('div.row.gap-3', { style: 'flex:none' },
                h('div.center-text', h('div', { style: 'font-family:var(--font-display);color:var(--gold-300);font-size:1.2rem' }, unlockedCount()), h('div.tiny.faint', `/ ${ACHIEVEMENTS.length} 🏆`)),
                h('div.center-text', h('div', { style: 'font-family:var(--font-display);color:var(--gold-300);font-size:1.2rem' }, codexCount()), h('div.tiny.faint', '📖 Codex')),
              ),
            ),

            // Portals
            h('div.portals', ...REALMS.map(portal)),

            // Realm dashboard
            h('div.realm-dash', ...REALMS.map((r) => dashCard(r, navigate))),

            // Nav
            h('div.hub-nav',
              navBtn('Achievements', 'achievements', '🏆'),
              navBtn('Codex', 'codex', '📖'),
              navBtn('Statistics', 'stats', '📊'),
              navBtn('Cheats', 'cheats', '⚡'),
              navBtn('Settings', 'settings', '⚙️'),
              navBtn('Credits', 'credits', '✦'),
            ),

            h('div.hub-foot',
              h('div.serif', { style: 'font-style:italic;color:var(--gold-300);opacity:0.75;margin-bottom:6px' }, '“' + narrateLocal('rumor', { seed: Date.now() }) + '”'),
              'Four games, one world. Every choice leaves a mark. · v1.0'),
          ),
        ),
      );
    },
  };
}
