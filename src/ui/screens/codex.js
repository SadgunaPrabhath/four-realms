/* Codex screen — discovered lore & entries. */
import { h, mount } from '../../engine/dom.js';
import { byCategory, count } from '../../engine/codex.js';
import { topBar, empty } from '../../ui/widgets.js';

export function codexScreen({ container, back }) {
  return {
    mount() {
      const groups = byCategory();
      const total = count();
      mount(container,
        h('div.screen',
          topBar({ title: '📖 Codex', onBack: back }),
          h('div.content-page', h('div.content-inner',
            h('h2.page-title', 'The Codex'),
            h('div.page-sub', total ? `${total} entries recorded through your journeys.` : 'Empty for now — play to uncover the world.'),
            total === 0
              ? empty('📖', 'The pages are blank.', 'Explore the realms to discover characters, weapons, factions, cases and lore. Entries appear here automatically.')
              : h('div', ...Object.entries(groups).map(([cat, list]) =>
                  h('div.codex-cat',
                    h('h3', { style: 'color:var(--gold-300);margin-bottom:12px' }, cat + ` · ${list.length}`),
                    ...list.map((e) => h('div.codex-entry',
                      h('div.row', { style: 'justify-content:space-between;align-items:baseline' },
                        h('h4', e.title),
                        e.realm && h('span.tag', e.realm),
                      ),
                      h('p', e.body),
                    )),
                  ))),
            h('div', { style: 'height:24px' }),
          )),
        ),
      );
    },
  };
}
