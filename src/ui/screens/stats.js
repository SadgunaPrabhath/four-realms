/* Statistics screen — global lifetime stats. */
import { h, mount } from '../../engine/dom.js';
import { state } from '../../engine/store.js';
import { topBar } from '../../ui/widgets.js';
import { fmt, fmtTime } from '../../engine/format.js';

export function statsScreen({ container, back }) {
  return {
    mount() {
      const s = state.stats;
      const p = state.profile;
      const tile = (val, lbl) => h('div.stat-tile', h('div.st-val', val), h('div.st-lbl', lbl));
      const group = (title, tiles) => h('div', { style: 'margin-bottom:24px' },
        h('h3', { style: 'color:var(--gold-300);margin-bottom:12px' }, title),
        h('div.stat-tiles', ...tiles));

      mount(container,
        h('div.screen',
          topBar({ title: '📊 Statistics', onBack: back }),
          h('div.content-page', h('div.content-inner',
            h('h2.page-title', 'Statistics'),
            h('div.page-sub', `The ledger of ${p.name}, ${p.title}.`),
            group('⏳ Overall', [
              tile('Lv ' + p.level, 'Account Level'),
              tile(fmtTime(s.playSeconds), 'Time Played'),
              tile(fmt(s.sessions), 'Sessions'),
            ]),
            group('👑 Kingdom', [
              tile(fmt(s.kingdomsFounded), 'Realms Founded'),
              tile(fmt(s.warsWon), 'Wars Won'),
              tile(fmt(s.highestPopulation), 'Peak Population'),
            ]),
            group('🕉️ Mythos', [
              tile(fmt(s.mythosBossesSlain), 'Guardians Slain'),
              tile(fmt(s.mythosQuestsDone), 'Quests Done'),
              tile(fmt(s.astrasUnlocked), 'Astras Unlocked'),
            ]),
            group('🕵️ Crime', [
              tile(fmt(s.casesSolved), 'Cases Solved'),
              tile(fmt(s.perfectCases), 'Perfect Cases'),
              tile(fmt(s.casesFailed), 'Cases Failed'),
            ]),
            group('💀 Last Life', [
              tile(fmt(s.runs), 'Runs Attempted'),
              tile(fmt(s.bestDaysSurvived), 'Best Days Survived'),
              tile(fmt(s.totalKills), 'Total Kills'),
              tile(fmt(s.bossesDown), 'Bosses Slain'),
            ]),
            h('div', { style: 'height:24px' }),
          )),
        ),
      );
    },
  };
}
