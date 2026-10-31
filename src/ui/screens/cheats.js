/* Cheats screen — full catalogue & explanations of every cheat. */
import { h, mount } from '../../engine/dom.js';
import { topBar } from '../../ui/widgets.js';
import { sfx } from '../../engine/audio.js';
import { toast } from '../../ui/feedback.js';
import { openCheatMenu } from '../../ui/cheatMenu.js';
import { CHEAT_CATALOG, cheatFlags, toggleFlag } from '../../engine/cheats.js';

export function cheatsScreen({ container, back }) {
  return {
    mount() {
      const rerender = () => this.mount();
      mount(container, h('div.screen',
        topBar({ title: '⚡ Cheats & Codes', onBack: back }),
        h('div.content-page', h('div.content-inner',
          h('h2.page-title', 'Cheats & Codes'),
          h('div.page-sub', 'A sandbox of power. Every cheat, explained.'),

          h('div.panel.panel-pad', { style: 'margin-bottom:20px' },
            h('div.row.wrap', { style: 'justify-content:space-between;align-items:center;gap:12px' },
              h('div.col', { style: 'gap:2px' },
                h('strong', '🎮 How cheats work'),
                h('span.small.muted', 'Open the ⚡ button (bottom-right) or press "C" any time to apply cheats to your current game. Toggle switches (God Mode, Free Build…) stay on until turned off. One-shot codes (add gold, full heal…) apply instantly.')),
              h('button.btn.primary', { onclick: () => openCheatMenu() }, '⚡ Open Cheat Menu')),
          ),

          ...CHEAT_CATALOG.map((group) =>
            h('div', { style: 'margin-bottom:26px' },
              h('h3', { style: 'color:var(--gold-300);margin-bottom:12px' }, group.label),
              h('div.ach-grid',
                ...group.cheats.map((cheat) => {
                  const isFlag = cheat.kind === 'flag';
                  const on = isFlag && cheatFlags[cheat.flag];
                  return h('div.ach', { class: on ? 'done' : '', style: on ? '' : '' },
                    h('div.ach-ico', cheat.icon),
                    h('div.col', { style: 'gap:2px;flex:1' },
                      h('div.row', { style: 'justify-content:space-between;align-items:center;gap:8px' },
                        h('div.ach-name', cheat.name),
                        isFlag
                          ? h('label.switch', { onclick: (e) => e.stopPropagation() },
                              h('input', { type: 'checkbox', checked: on, onchange: () => { toggleFlag(cheat.flag); sfx('click'); toast({ icon: cheat.icon, body: `${cheat.name} ${cheatFlags[cheat.flag] ? 'ON' : 'OFF'}` }); rerender(); } }),
                              h('span.track'))
                          : h('span.tag', 'code')),
                      h('div.ach-desc', cheat.desc),
                    ),
                  );
                }),
              ),
            )),
          h('div', { style: 'height:24px' }),
        )),
      ));
    },
  };
}
