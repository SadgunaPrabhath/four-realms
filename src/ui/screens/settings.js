/* Settings screen — audio, gameplay, data management. */
import { h, mount } from '../../engine/dom.js';
import { state, saveSettings } from '../../engine/store.js';
import { applyVolumes, sfx } from '../../engine/audio.js';
import { topBar } from '../../ui/widgets.js';
import { toast, confirm } from '../../ui/feedback.js';
import { exportAll, importAll, wipeAll, SAVE_KEYS, remove } from '../../engine/save.js';

export function settingsScreen({ container, navigate, back }) {
  return {
    mount() {
      const s = state.settings;
      const slider = (key, label, desc) => {
        const val = h('span.mono.small', Math.round(s[key] * 100) + '%');
        return row(label, desc,
          h('div.set-control',
            h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], style: 'width:130px',
              oninput: (e) => { s[key] = parseFloat(e.target.value); val.textContent = Math.round(s[key] * 100) + '%'; applyVolumes(); },
              onchange: () => { saveSettings(); sfx('click'); } }),
            val,
          ));
      };
      const toggle = (key, label, desc) => row(label, desc,
        h('label.switch',
          h('input', { type: 'checkbox', checked: s[key], onchange: (e) => { s[key] = e.target.checked; saveSettings(); sfx('click'); } }),
          h('span.track'),
        ));
      const seg = (key, label, desc, options) => row(label, desc,
        h('div.seg', ...options.map((o) =>
          h('button', { class: s[key] === o.v ? 'active' : '', onclick: () => { s[key] = o.v; saveSettings(); sfx('click'); rerender(); } }, o.l))));

      const rerender = () => this.mount();

      mount(container,
        h('div.screen',
          topBar({ title: '⚙️ Settings', onBack: back }),
          h('div.content-page', h('div.content-inner',
            h('h2.page-title', 'Settings'),
            h('div.page-sub', 'Tune the experience to your liking.'),

            h('div.panel.panel-pad',
              h('div.panel-title', { style: 'margin-bottom:8px' }, '🔊 Audio'),
              toggle('muted', 'Mute All', 'Silence every sound.'),
              slider('musicVolume', 'Music Volume', 'Procedural ambient score.'),
              slider('sfxVolume', 'SFX Volume', 'Interface & combat sounds.'),
            ),
            h('div', { style: 'height:16px' }),
            h('div.panel.panel-pad',
              h('div.panel-title', { style: 'margin-bottom:8px' }, '🎮 Gameplay'),
              seg('difficulty', 'Difficulty', 'Affects economy, combat & survival.', [{ v: 'easy', l: 'Easy' }, { v: 'normal', l: 'Normal' }, { v: 'hard', l: 'Hard' }]),
              toggle('screenShake', 'Screen Shake', 'Impact feedback on hits & events.'),
              toggle('particles', 'Particles', 'Ambient & burst particle effects.'),
              toggle('reduceMotion', 'Reduce Motion', 'Minimise animations.'),
              toggle('aiNarration', 'AI Narration (optional)', 'Enhance flavour text via AI if a key is configured. Game works fully without it.'),
              seg('fontScale', 'Text Size', 'Scale interface text.', [{ v: 0.9, l: 'S' }, { v: 1, l: 'M' }, { v: 1.15, l: 'L' }]),
            ),
            h('div', { style: 'height:16px' }),
            h('div.panel.panel-pad',
              h('div.panel-title', { style: 'margin-bottom:8px' }, '💾 Data'),
              h('p.small.muted', { style: 'margin-bottom:12px' }, 'Your progress is saved locally in this browser. Export a backup or start fresh.'),
              h('div.row.wrap.gap-2',
                h('button.btn.ghost', { onclick: doExport }, '⬇ Export Save'),
                h('button.btn.ghost', { onclick: doImport }, '⬆ Import Save'),
                h('button.btn.danger', { onclick: doWipe }, '🗑 Erase Everything'),
              ),
            ),
            h('div', { style: 'height:32px' }),
          )),
        ),
      );

      function row(label, desc, control) {
        return h('div.set-row',
          h('div.col', { style: 'gap:2px' }, h('span.set-label', label), desc && h('span.set-desc', desc)),
          control,
        );
      }

      function doExport() {
        const blob = new Blob([exportAll()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `four-realms-save-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        toast({ type: 'success', icon: '⬇', body: 'Save exported.', sound: 'confirm' });
      }
      function doImport() {
        const input = h('input', { type: 'file', accept: '.json', style: 'display:none' });
        input.onchange = async () => {
          const file = input.files[0]; if (!file) return;
          try { const n = importAll(await file.text()); toast({ type: 'success', icon: '⬆', body: `Imported ${n} save entries. Reloading…`, sound: 'confirm' }); setTimeout(() => location.reload(), 1200); }
          catch { toast({ type: 'danger', icon: '⚠', body: 'Invalid save file.', sound: 'wrong' }); }
        };
        document.body.appendChild(input); input.click(); input.remove();
      }
      async function doWipe() {
        if (await confirm({ title: 'Erase Everything?', message: 'This permanently deletes all saves, achievements and progress. This cannot be undone.', confirmLabel: 'Erase All', danger: true })) {
          wipeAll(); toast({ type: 'danger', icon: '🗑', body: 'All data erased. Reloading…' }); setTimeout(() => location.reload(), 900);
        }
      }
    },
  };
}
