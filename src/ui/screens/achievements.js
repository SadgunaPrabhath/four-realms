/* Achievements screen. */
import { h, mount } from '../../engine/dom.js';
import { ACHIEVEMENTS, achievementsByRealm, isUnlocked, unlockedCount } from '../../engine/achievements.js';
import { topBar } from '../../ui/widgets.js';
import { meter } from '../../ui/widgets.js';

const REALM_NAMES = { kingdom: '👑 Kingdom', mythos: '🕉️ Mythos', crime: '🕵️ Crime', lastlife: '💀 Last Life', meta: '🌌 Realmwalker' };

export function achievementsScreen({ container, back }) {
  return {
    mount() {
      const groups = achievementsByRealm();
      const total = ACHIEVEMENTS.length;
      const done = unlockedCount();

      mount(container,
        h('div.screen',
          topBar({ title: '🏆 Achievements', onBack: back }),
          h('div.content-page', h('div.content-inner',
            h('h2.page-title', 'Achievements'),
            h('div.page-sub', `${done} of ${total} deeds accomplished across the realms.`),
            h('div.panel.panel-pad', { style: 'margin-bottom:24px' }, meter({ label: 'Total Progress', value: done, max: total, kind: 'xp' })),
            ...Object.entries(groups).map(([realm, list]) =>
              h('div', { style: 'margin-bottom:28px' },
                h('h3', { style: 'color:var(--gold-300);margin-bottom:12px' }, REALM_NAMES[realm] || realm),
                h('div.ach-grid', ...list.map((a) => {
                  const got = isUnlocked(a.id);
                  return h(`div.ach${got ? '.done' : '.locked'}`,
                    h('div.ach-ico', got ? a.icon : '🔒'),
                    h('div.col', { style: 'gap:2px;flex:1' },
                      h('div.ach-name', a.name),
                      h('div.ach-desc', a.desc),
                      h('div.ach-xp', got ? `Earned · +${a.xp} XP` : `+${a.xp} XP`),
                    ),
                  );
                })),
              )),
            h('div', { style: 'height:24px' }),
          )),
        ),
      );
    },
  };
}
