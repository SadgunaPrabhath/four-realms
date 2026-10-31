/* Credits screen. */
import { h, mount } from '../../engine/dom.js';
import { topBar } from '../../ui/widgets.js';

export function creditsScreen({ container, back }) {
  return {
    mount() {
      mount(container,
        h('div.screen',
          topBar({ title: '✦ Credits', onBack: back }),
          h('div.content-page', h('div.content-inner',
            h('div.credits',
              h('div', { style: 'font-size:3rem;margin:24px 0' }, '⚔️'),
              h('h1.hub-title', { style: 'font-size:2.4rem' }, 'The Four Realms'),
              h('p', { style: 'font-style:italic' }, 'A Living World of Power, Mystery, Survival & Legend'),

              h('h2', 'Design & Engineering'),
              h('p', 'A single-page game platform built with vanilla JavaScript, ES modules & Vite. Four distinct games sharing one world engine — no game framework, no heavy dependencies.'),

              h('h2', 'The Realms'),
              h('p', '👑 Kingdom — a deterministic economy & diplomacy simulator.'),
              h('p', '🕉️ Mythos — an original fantasy RPG inspired by the aesthetics of Indian epics.'),
              h('p', '🕵️ Crime — a procedural mystery engine with logically-consistent solutions.'),
              h('p', '💀 Last Life — a brutal permadeath roguelike with meta-progression.'),

              h('h2', 'A Note on Inspiration'),
              h('p', { style: 'font-size:0.98rem' }, 'The Mythos realm draws respectfully on the aesthetics and themes of Indian mythology. All characters, weapons, lore and events are original fictional inventions and are not presented as religious scripture.'),

              h('h2', 'Audio'),
              h('p', 'Every sound & the ambient score is synthesized live in your browser via the Web Audio API. No audio files were harmed.'),

              h('div.rule-fancy', { style: 'margin:32px 0' }, '✦'),
              h('p.tiny.faint', 'Thank you for playing. Every choice leaves a mark.'),
              h('div', { style: 'height:40px' }),
            ),
          )),
        ),
      );
    },
  };
}
