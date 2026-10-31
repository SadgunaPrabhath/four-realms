/* ============================================================
   CRIME — detective investigation interface.
   ============================================================ */
import { h, mount } from '../../engine/dom.js';
import { sfx } from '../../engine/audio.js';
import { bus } from '../../engine/bus.js';
import { newSeed } from '../../engine/rng.js';
import { bumpStat, awardXp } from '../../engine/store.js';
import { markRealmPlayed } from '../../engine/achievements.js';
import { discover } from '../../engine/codex.js';
import { setCheatContext, clearCheatContext } from '../../engine/cheats.js';
import { topBar, meter, empty, kv } from '../../ui/widgets.js';
import { toast, modal, confirm, burstAt, shake } from '../../ui/feedback.js';
import { generateCase } from './generator.js';
import * as L from './logic.js';
import { RANKS } from './data.js';
import { defaultProfile, saveDetective, loadDetective, hasSave, deleteSave } from './state.js';

export function crimeScreen({ container, back }) {
  let prof = null;
  let c = null; // current case
  let tab = 'brief';
  let root;
  const persist = () => { prof.currentCase = c; saveDetective(prof); };

  return {
    mount() { markRealmPlayed('crime'); prof = (hasSave() && loadDetective()) || defaultProfile(); c = prof.currentCase; startMenu(); },
    unmount() { clearCheatContext(); if (prof) persist(); },
  };

  function registerCheats() {
    setCheatContext({
      realm: 'crime', label: 'Crime',
      rerender: () => { if (c && !c.solved && !c.failed) { persist(); render(); } },
      handlers: {
        c_evidence: () => { if (c) c.location.spots.forEach((s) => L.searchSpot(c, s)); toast({ icon: '🔦', body: 'All evidence discovered.' }); },
        c_alibi: () => { if (!c) return; const culprit = L.suspectById(c, c.culpritId); culprit.alibiBroken = true; culprit.motiveKnown = true; c.suspects.forEach((s) => { s.motiveKnown = true; s.questioned = true; }); bus.emit('crime:contradiction'); toast({ type: 'danger', icon: '⚠️', body: `${culprit.name}'s alibi shattered!` }); },
        c_reveal: () => { if (!c) return; const culprit = L.suspectById(c, c.culpritId); toast({ type: 'warning', icon: '👁️', title: 'The Culprit', body: `${culprit.name} — ${culprit.occ}.`, duration: 6000 }); },
      },
    });
  }

  function startMenu() {
    clearCheatContext();
    mount(container, h('div.screen',
      topBar({ title: '🕵️ Crime', onBack: back }),
      h('div.content-page', h('div.content-inner',
        h('div.cinematic', h('div', { style: 'font-size:3rem' }, '🕵️'), h('h1', 'Truth Hides Behind Lies'),
          h('p.page-sub', 'Every case has one guilty soul and a dozen liars. Find the truth through reason alone.')),
        h('div.panel.panel-pad.ornate', { style: 'margin-bottom:16px' },
          h('div.row', { style: 'justify-content:space-between;flex-wrap:wrap;gap:12px' },
            h('div.col', { style: 'gap:2px' }, h('strong', { style: 'font-size:1.1rem' }, L.rankFor(prof.casesSolved)),
              h('span.tiny.muted', `${prof.casesSolved} solved · ${prof.perfectCases} perfect · ${prof.casesFailed} failed`)),
            h('div', { style: 'min-width:160px' }, meter({ label: '🎖️ Reputation', value: prof.reputation, max: 100, kind: 'happy', showNums: false }))),
        ),
        c && !c.solved && !c.failed
          ? h('div.panel.ornate', { style: 'margin-bottom:16px' }, h('div.slot', h('div.slot-badge', '🔎'),
              h('div.col', { style: 'flex:1;gap:2px' }, h('strong', c.title), h('div.tiny.muted', `Case #${c.number} · ${L.foundEvidence(c).length} clues found`)),
              h('button.btn.primary', { onclick: () => enterCase() }, '▶ Resume')))
          : null,
        h('div.row.wrap.gap-3', { style: 'justify-content:center' },
          h('button.btn', { onclick: () => newCase() }, (c && !c.solved && !c.failed) ? '✦ Abandon & New Case' : '✦ New Case'),
          h('button.btn.ghost', { onclick: back }, '‹ Back to Hub')),
      )),
    ));
  }

  async function newCase() {
    if (c && !c.solved && !c.failed && !(await confirm({ title: 'Abandon current case?', message: 'This unsolved case will be lost. Take a new one?', confirmLabel: 'New Case', danger: true }))) return;
    c = generateCase(newSeed(), prof.difficulty);
    tab = 'brief'; persist(); sfx('reveal'); enterCase();
  }

  function enterCase() { tab = 'brief'; registerCheats(); render(); }

  function render() {
    if (c.solved || c.failed) return renderVerdict();
    root = h('div.screen',
      h('header.topbar',
        h('button.icon-btn', { onclick: () => { persist(); startMenu(); } }, '‹'),
        h('div.col', { style: 'gap:0' }, h('div.topbar-title', `🔎 ${c.title}`), h('div.tiny.faint', `Case #${c.number}`)),
        h('div.grow'),
        h('span.tag', `${L.foundKeyCount(c)}/${L.keyEvidence(c).length} key clues`)),
      h('div.mode-body', h('div.mode-scroll', h('div.mode-scroll-inner', { id: 'c-content' }, renderTab()))),
      renderTabs(),
    );
    mount(container, root);
  }
  function refreshBody() { const el = root.querySelector('#c-content'); if (el) mount(el, renderTab());
    const kc = root.querySelector('.topbar .tag'); if (kc) kc.textContent = `${L.foundKeyCount(c)}/${L.keyEvidence(c).length} key clues`; }

  function renderTabs() {
    const tabs = [['brief', '📋', 'Brief'], ['scene', '🔦', 'Scene'], ['suspects', '👤', 'Suspects'], ['evidence', '🗂️', 'Evidence'], ['board', '🧩', 'Deduce']];
    return h('nav.mode-tabs', ...tabs.map(([id, ico, label]) =>
      h('button.mode-tab', { class: tab === id ? 'active' : '', onclick: () => { tab = id; sfx('paper'); refreshBody(); sync(); } }, h('span.mt-ico', ico), h('span', label))));
  }
  function sync() { const ids = ['brief', 'scene', 'suspects', 'evidence', 'board']; root.querySelectorAll('.mode-tab').forEach((el, i) => el.classList.toggle('active', ids[i] === tab)); }

  function renderTab() {
    switch (tab) {
      case 'scene': return renderScene();
      case 'suspects': return renderSuspects();
      case 'evidence': return renderEvidence();
      case 'board': return renderBoard();
      default: return renderBrief();
    }
  }

  /* ---------- Brief ---------- */
  function renderBrief() {
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate',
        h('h2', { style: 'font-size:1.4rem;color:var(--crime)' }, '📋 Case Briefing'),
        h('div.divider'),
        h('p.serif', { style: 'font-size:1.15rem;line-height:1.7;color:var(--text-dim)' }, c.intro),
        h('div.grid.grid-2.gap-2', { style: 'margin-top:14px' },
          kv('Victim', c.victim.name), kv('Occupation', c.victim.occ.replace(/^a /, '')),
          kv('Location', `${c.location.scene}, ${c.location.name}`), kv('Time of Death', c.time),
          kv('Cause', c.method.name), kv('Suspects', String(c.suspects.length))),
      ),
      h('div.panel.panel-pad',
        h('h3', { style: 'margin-bottom:8px' }, '🔍 How to Investigate'),
        h('ol', { style: 'margin-left:18px;color:var(--text-dim);line-height:1.9' },
          h('li', h('strong', 'Search the Scene'), ' — examine every spot to recover physical evidence.'),
          h('li', h('strong', 'Interrogate Suspects'), ' — hear their alibis, then present evidence to catch lies.'),
          h('li', h('strong', 'Break the Alibi'), ' — the guilty one claims to be elsewhere; hard evidence proves otherwise.'),
          h('li', h('strong', 'Accuse'), ' — name the culprit. Guess wrong twice and the case is lost.')),
      ),
      h('button.btn.realm.block.lg', { onclick: () => { tab = 'scene'; refreshBody(); sync(); } }, '🔦 Begin at the Crime Scene →'),
    );
  }

  /* ---------- Scene ---------- */
  function renderScene() {
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, `You stand in ${c.location.scene}. Search each location carefully — evidence hides in the details.`),
      h('div.grid.grid-auto-lg',
        ...c.location.spots.map((spot) => {
          const searched = !!c.searched[spot];
          const foundHere = c.evidence.filter((e) => e.spot === spot && e.found);
          return h('div.card', { class: searched ? '' : 'clickable', style: searched ? 'opacity:0.85' : '',
            onclick: searched ? null : () => doSearch(spot) },
            h('div.row', { style: 'justify-content:space-between;align-items:center' },
              h('strong', { style: 'text-transform:capitalize' }, `🔦 ${spot}`),
              searched ? h('span.tag', foundHere.length ? `${foundHere.length} found` : 'searched') : h('span.tag.gold', 'search')),
            searched && foundHere.length > 0 && h('div', { style: 'margin-top:8px' }, ...foundHere.map((e) => h('div.tiny', { style: 'color:var(--crime)' }, `• ${e.name}`))),
            searched && foundHere.length === 0 && h('div.tiny.faint', { style: 'margin-top:8px' }, 'Nothing of note here.'));
        })),
    );
  }

  function doSearch(spot) {
    const res = L.searchSpot(c, spot);
    if (res.newlyFound.length) {
      sfx('reveal');
      res.newlyFound.forEach((e) => toast({ type: 'success', icon: '🔍', title: 'Evidence Found', body: e.name, duration: 4200 }));
      awardXp(4, 'clue');
    } else { sfx('paper'); toast({ body: 'Nothing of note here.' }); }
    persist(); refreshBody();
  }

  /* ---------- Suspects ---------- */
  function renderSuspects() {
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, 'Question each suspect, then present evidence to challenge their story. Watch for the alibi that cannot hold.'),
      h('div.grid.grid-auto-lg', ...c.suspects.map((s) => suspectCard(s))),
    );
  }

  function suspectCard(s) {
    return h('div.card', { class: 'clickable', style: s.alibiBroken ? 'border-color:var(--danger)' : s.cleared ? 'border-color:var(--success)' : '',
      onclick: () => openSuspect(s.id) },
      h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
        h('div.col', { style: 'gap:2px' }, h('strong', s.name), h('span.tiny.faint', s.occ)),
        s.alibiBroken ? h('span.tag.danger', '⚠ Alibi Broken') : s.cleared ? h('span.tag.success', '✓ Cleared') : s.questioned ? h('span.tag', 'Questioned') : h('span.tag.gold', 'Question')),
      s.motiveKnown && h('p.tiny', { style: 'margin-top:8px;color:var(--warning)' }, `Motive: ${s.motive.type}`),
      h('p.tiny.muted', { style: 'margin-top:6px' }, s.questioned ? `Claims: "${s.claimedAlibi}"` : 'Not yet questioned.'));
  }

  function openSuspect(id) {
    const s = L.suspectById(c, id);
    const statements = L.interrogate(c, id);
    persist();
    const foundEv = L.foundEvidence(c);
    const dialogue = h('div.col.gap-2', { id: 'interrogation-log' },
      stmt('🗣️ Alibi', statements.alibi),
      stmt('💬 Relationship', statements.relation),
      stmt('😐 Under pressure', statements.deny),
    );
    modal({ wide: true, title: `👤 ${s.name} — ${s.occ}`,
      body: h('div',
        h('p.tiny.faint', { style: 'margin-bottom:10px' }, `Demeanour: ${s.personality}. ${s.alibiBroken ? 'Their alibi lies in ruins.' : s.cleared ? 'Their story checks out.' : 'Watch their reactions closely.'}`),
        dialogue,
        h('div.divider'),
        h('h4', { style: 'margin-bottom:8px' }, '🗂️ Present Evidence'),
        foundEv.length === 0
          ? empty('🔦', 'No evidence to present.', 'Search the crime scene first.')
          : h('div.grid.grid-2.gap-2', ...foundEv.map((e) =>
              h('button.choice', { onclick: (ev) => present(s, e, ev) },
                h('div.c-label', e.name),
                h('div.c-hint', e.type === 'presence' ? 'physical evidence' : e.type)))),
      ),
      actions: [{ label: 'Leave', primary: true, onClick: (close) => { close(); refreshBody(); return true; } }] });

    function present(s, e, ev) {
      const res = L.presentEvidence(c, s.id, e.id);
      sfx(res.contradiction ? 'wrong' : res.cleared ? 'confirm' : 'paper');
      if (res.contradiction && res.brokeAlibi) {
        bus.emit('crime:contradiction');
        if (ev?.target) burstAt(ev.target, { color: 'var(--danger)', count: 12 });
        shake();
        awardXp(10, 'alibi broken');
      }
      const logEl = document.getElementById('interrogation-log');
      if (logEl) {
        const entry = h('div.panel', { style: `padding:10px;border-left:3px solid ${res.contradiction ? 'var(--danger)' : res.cleared ? 'var(--success)' : 'var(--panel-border-soft)'}` },
          h('div.tiny.faint', `You present: ${e.name}`),
          h('p.serif', { style: 'color:var(--text);margin-top:4px' }, res.text));
        logEl.appendChild(entry);
        entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      persist();
    }
  }

  function stmt(label, text) {
    return h('div.panel', { style: 'padding:10px' }, h('div.tiny.faint', label), h('p.serif', { style: 'color:var(--text);margin-top:2px' }, text));
  }

  /* ---------- Evidence ---------- */
  function renderEvidence() {
    const found = L.foundEvidence(c);
    if (!found.length) return empty('🗂️', 'Your evidence file is empty.', 'Search the crime scene to recover clues.');
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, `${found.length} pieces of evidence recovered. Key evidence is marked with ★.`),
      h('div.col.gap-3', ...found.map((e) =>
        h('div.panel.panel-pad', { style: `border-left:3px solid ${evColor(e.type)}` },
          h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
            h('strong', `${e.key ? '★ ' : ''}${e.name}`),
            h('span.tag', e.type)),
          h('p.serif', { style: 'color:var(--text-dim);margin-top:6px' }, e.desc)))),
    );
  }
  function evColor(type) { return type === 'presence' ? 'var(--danger)' : type === 'means' ? 'var(--warning)' : type === 'motive' ? 'var(--magic)' : type === 'false' ? 'var(--stone-400)' : 'var(--crime)'; }

  /* ---------- Deduction board ---------- */
  function renderBoard() {
    const hint = L.deductionHint(c);
    return h('div.col.gap-4',
      h('div.panel.panel-pad', { style: `border-color:${hint.level === 'ready' ? 'var(--success)' : 'var(--panel-border)'}` },
        h('h3', { style: 'margin-bottom:6px' }, '🧩 Deduction'),
        h('p.serif', { style: 'font-size:1.05rem;color:var(--text-dim)' }, hint.text)),
      h('div.grid.grid-auto-lg', ...c.suspects.map((s) => {
        const status = s.alibiBroken ? { t: 'PRIME SUSPECT', col: 'var(--danger)' } : s.cleared ? { t: 'Cleared', col: 'var(--success)' } : s.questioned ? { t: 'Under suspicion', col: 'var(--text-dim)' } : { t: 'Unquestioned', col: 'var(--text-faint)' };
        return h('div.panel.panel-pad', { style: `border-left:3px solid ${status.col}` },
          h('strong', s.name), h('div.tiny.faint', s.occ),
          h('div.divider', { style: 'margin:8px 0' }),
          kv('Alibi', s.questioned ? s.claimedAlibi : '???'),
          kv('Alibi status', s.alibiBroken ? '❌ BROKEN' : s.cleared ? '✓ Confirmed' : '— unverified'),
          kv('Motive', s.motiveKnown ? s.motive.type : '— unknown'),
          kv('Means access', s.hasMeansAccess ? 'possible' : 'unlikely'),
          h('button.btn.sm.danger.block', { style: 'margin-top:10px', onclick: () => tryAccuse(s) }, `⚖️ Accuse ${s.name.split(' ')[0]}`));
      })),
      h('p.tiny.faint.center-text', `Wrong accusations: ${c.wrongAccusations}/2 — a second error loses the case.`),
    );
  }

  async function tryAccuse(s) {
    const ok = await confirm({ title: `Accuse ${s.name}?`, message: `You are about to formally accuse ${s.name} of the murder of ${c.victim.name}. Be certain — two wrong accusations and the true killer walks free.`, confirmLabel: 'Make the Accusation', danger: true });
    if (!ok) return;
    const res = L.accuse(c, s.id);
    persist();
    if (res.correct) { sfx('victory'); onSolved(res); }
    else {
      sfx('wrong'); shake();
      prof.reputation = Math.max(0, prof.reputation - 8);
      if (res.failed) { onFailed(); }
      else { toast({ type: 'danger', icon: '❌', title: 'Wrong!', body: `${s.name} is innocent. The department's patience wears thin. One more mistake ends the case.`, duration: 5000 }); persist(); render(); }
    }
  }

  function onSolved(res) {
    c.solved = true;
    prof.casesSolved++;
    bumpStat('casesSolved');
    if (res.perfect) { prof.perfectCases++; bumpStat('perfectCases'); }
    prof.cleanStreak = c.wrongAccusations === 0 ? prof.cleanStreak + 1 : 0;
    prof.reputation = Math.min(100, prof.reputation + (res.perfect ? 10 : 5));
    prof.difficulty = Math.min(6, prof.difficulty + 1);
    const reward = L.caseReward(c);
    awardXp(reward.xp, 'case solved');
    bus.emit('crime:solved', { perfect: res.perfect, cleanStreak: prof.cleanStreak });
    discover({ id: 'c_case_' + c.seed, category: 'Solved Cases', realm: 'crime', title: c.title, body: `Solved: ${res.culprit.name} (${res.culprit.occ}) murdered ${c.victim.name} by ${c.method.name}, driven by ${res.culprit.motive.type}. ${res.perfect ? 'A flawless investigation.' : ''}` });
    persist();
    renderVerdict();
  }

  function onFailed() {
    c.failed = true;
    prof.casesFailed++; bumpStat('casesFailed');
    prof.cleanStreak = 0;
    prof.reputation = Math.max(0, prof.reputation - 12);
    prof.difficulty = Math.max(1, prof.difficulty - 1);
    bus.emit('crime:failed');
    persist();
    renderVerdict();
  }

  /* ---------- Verdict ---------- */
  function renderVerdict() {
    const culprit = L.suspectById(c, c.culpritId);
    const won = c.solved;
    sfx(won ? 'victory' : 'death');
    mount(container, h('div.screen',
      h('div.content-page', h('div.content-inner',
        h('div.cinematic',
          h('div', { style: 'font-size:3rem' }, won ? (c.perfect ? '🏆' : '⚖️') : '🚔'),
          h('h1', { style: `color:${won ? 'var(--crime)' : 'var(--blood-400)'}` }, won ? (c.perfect ? 'A PERFECT CASE' : 'CASE CLOSED') : 'THE KILLER WALKS FREE'),
          h('div.panel.panel-pad', { style: 'max-width:520px;margin:16px auto;text-align:left' },
            h('h3', { style: 'color:var(--crime);margin-bottom:8px' }, 'The Truth'),
            h('p.serif', { style: 'font-size:1.1rem;color:var(--text-dim);line-height:1.7' },
              `${culprit.name}, ${culprit.occ}, murdered ${c.victim.name} in ${c.location.scene} by ${c.method.name}. `,
              `The motive: they ${culprit.motive.text}. `,
              `They claimed to be ${culprit.claimedAlibi} — but the evidence placed them at the scene.`),
            h('div.divider'),
            kv('Verdict', won ? 'Correct' : 'Failed'),
            kv('Key clues found', `${L.foundKeyCount(c)}/${L.keyEvidence(c).length}`),
            kv('Wrong accusations', String(c.wrongAccusations)),
            won && kv('Reward', `+${L.caseReward(c).xp} XP`),
          ),
          !won && h('p.muted', { style: 'max-width:460px;margin:0 auto 16px' }, 'The department has lost faith in this investigation. The guilty escape justice — this time.'),
          h('div.row.gap-3', { style: 'justify-content:center' },
            h('button.btn.primary', { onclick: () => { c = null; newCase(); } }, '✦ Take a New Case'),
            h('button.btn.ghost', { onclick: () => { c = null; persist(); startMenu(); } }, '‹ Precinct')),
        ),
      )),
    ));
    // clear solved case from active slot
    prof.currentCase = null; saveDetective(prof);
  }
}
