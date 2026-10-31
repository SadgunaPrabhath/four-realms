/* ============================================================
   MYTHOS — RPG screen, world navigation & combat interface.
   ============================================================ */
import { h, mount } from '../../engine/dom.js';
import { sfx } from '../../engine/audio.js';
import { bus } from '../../engine/bus.js';
import { newSeed, RNG } from '../../engine/rng.js';
import { bumpStat, awardXp } from '../../engine/store.js';
import { markRealmPlayed } from '../../engine/achievements.js';
import { discover } from '../../engine/codex.js';
import { cheatFlags, setCheatContext, clearCheatContext } from '../../engine/cheats.js';
import { fmt } from '../../engine/format.js';
import { topBar, statPill, meter, empty, kv, pips } from '../../ui/widgets.js';
import { toast, modal, burstAt, shake, floatText } from '../../ui/feedback.js';
import { STATS, CLASSES, WEAPONS, ENEMIES, REGIONS, COMPANIONS, ASTRA_IDS, RARITY_ORDER, SIDE_QUESTS } from './data.js';
import * as L from './logic.js';
import { saveHero, loadHero, hasSave, deleteSave } from './state.js';

export function mythosScreen({ container, back }) {
  let hero = null;
  let tab = 'journey';
  let root;
  const persist = () => saveHero(hero);

  return {
    mount() { markRealmPlayed('mythos'); hasSave() ? startMenu() : newHeroFlow(); },
    unmount() { clearCheatContext(); if (hero) persist(); },
  };

  function registerCheats() {
    setCheatContext({
      realm: 'mythos', label: 'Mythos',
      rerender: () => { persist(); render(); },
      handlers: {
        m_heal: () => { hero.hp = hero.maxHp; hero.stamina = hero.maxStamina; },
        m_levels: () => { hero.level += 5; hero.statPoints += 30; L.recalc(hero); hero.hp = hero.maxHp; hero.stamina = hero.maxStamina; bus.emit('mythos:level', hero.level); },
        m_astras: () => { ASTRA_IDS.forEach((a) => L.unlockAstra(hero, a)); bumpStat('astrasUnlocked'); bus.emit('mythos:astra', { total: hero.astras.length, all: true }); },
        m_gold: () => { hero.gold += 1000; hero.inventory.potion += 10; },
      },
    });
  }

  /* ---------- Start ---------- */
  function startMenu() {
    const existing = loadHero();
    mount(container, h('div.screen',
      topBar({ title: '🕉️ Mythos', onBack: back }),
      h('div.content-page', h('div.content-inner',
        h('div.cinematic', h('div', { style: 'font-size:3rem' }, '🕉️'), h('h1', 'Walk Among Legends'),
          h('p.page-sub', 'An original saga inspired by the epics of old. Rise from wanderer to celestial legend.')),
        h('div.panel', { style: 'padding:12px;margin-bottom:14px;border-color:var(--panel-border-soft)' },
          h('p.tiny.muted', '⚠️ A note: The Mythos realm draws on the aesthetics of Indian mythology. All lore, weapons and characters here are original fiction, not religious scripture.')),
        existing && h('div.panel.ornate', { style: 'margin-bottom:16px' },
          h('div.slot', h('div.slot-badge', CLASSES.find(c => c.id === existing.classId)?.icon || '⚔️'),
            h('div.col', { style: 'flex:1;gap:2px' }, h('strong', existing.name),
              h('div.tiny.muted', `${existing.className} · Lv ${existing.level} · ${REGIONS[existing.regionIndex].name}`)),
            h('button.btn.primary', { onclick: () => { hero = existing; L.recalc(hero); enterGame(); } }, '▶ Continue'))),
        h('div.row.wrap.gap-3', { style: 'justify-content:center' },
          h('button.btn', { onclick: () => newHeroFlow() }, '✦ New Legend'),
          h('button.btn.ghost', { onclick: back }, '‹ Back to Hub')),
      )),
    ));
  }

  function newHeroFlow() {
    let name = ''; let classId = 'warrior';
    const render = () => mount(container, h('div.screen',
      topBar({ title: '🕉️ Forge a Legend', onBack: back }),
      h('div.content-page', h('div.content-inner',
        h('h2.page-title', 'Who Will You Become?'),
        h('div.page-sub', 'Name your hero and choose your path.'),
        h('input.text-input', { placeholder: 'Name your hero…', maxlength: 20, value: name, style: 'margin-bottom:20px', oninput: (e) => name = e.target.value }),
        h('div.grid.grid-auto-lg',
          ...CLASSES.map((c) => h('div.card.clickable', { class: classId === c.id ? 'selected' : '', onclick: () => { classId = c.id; sfx('click'); render(); } },
            h('div.row.gap-2', { style: 'align-items:center;margin-bottom:8px' }, h('span', { style: 'font-size:1.6rem' }, c.icon), h('strong', c.name)),
            h('p.tiny.muted', { style: 'min-height:36px' }, c.desc),
            h('div.divider', { style: 'margin:8px 0' }),
            h('div.grid.grid-2.gap-1', ...Object.entries(c.stats).map(([k, v]) => h('div.tiny', `${STATS[k].icon} ${STATS[k].name.slice(0, 3)} ${v}`))),
            h('div.tiny.faint', { style: 'margin-top:8px' }, `Starts with ${WEAPONS[c.weapon].icon} ${WEAPONS[c.weapon].name}`),
          ))),
        h('button.btn.primary.block.lg', { style: 'margin-top:20px', onclick: () => {
          hero = L.newHero({ seed: newSeed(), name: name.trim(), classId });
          saveHero(hero); sfx('levelup'); enterGame();
        } }, '⚔️ Begin the Journey'),
      )),
    ));
    render();
  }

  /* ---------- Main ---------- */
  function enterGame() { tab = 'journey'; registerCheats(); render(); }

  function render() {
    root = h('div.screen',
      h('header.topbar',
        h('button.icon-btn', { onclick: () => { persist(); back(); } }, '‹'),
        h('div.col', { style: 'gap:0' }, h('div.topbar-title', `${hero.name}`), h('div.tiny.faint', `${hero.className} · Lvl ${hero.level}`)),
        h('div.grow'),
        hero.statPoints > 0 && h('span.tag.gold', { style: 'animation:pop 0.4s' }, `${hero.statPoints} pts!`),
      ),
      renderHud(),
      h('div.mode-body', h('div.mode-scroll', h('div.mode-scroll-inner', { id: 'm-content' }, renderTab()))),
      renderTabs(),
    );
    mount(container, root);
  }

  function refreshBody() { const c = root.querySelector('#m-content'); if (c) mount(c, renderTab());
    const hud = root.querySelector('#m-hud'); if (hud) mount(hud.parentNode, ...renderHudChildren()); }

  function renderHud() { return h('div.resbar', { id: 'm-hud-wrap' }, ...renderHudChildren()); }
  function renderHudChildren() {
    return [
      h('div', { id: 'm-hud', style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;flex:1' },
        h('div', { style: 'min-width:120px;flex:1' }, meter({ label: '❤️ HP', value: hero.hp, max: hero.maxHp, kind: 'hp' })),
        h('div', { style: 'min-width:110px;flex:1' }, meter({ label: '⚡ Stamina', value: hero.stamina, max: hero.maxStamina, kind: 'stamina' })),
        h('div', { style: 'min-width:110px;flex:1' }, meter({ label: `✦ Lv ${hero.level}`, value: hero.xp, max: L.xpToNext(hero.level), kind: 'xp', showNums: false })),
      ),
      statPill({ icon: '🪙', value: hero.gold, label: 'Gold' }),
    ];
  }

  function renderTabs() {
    const tabs = [['journey', '🗺️', 'Journey'], ['character', '💪', 'Hero'], ['arsenal', '⚔️', 'Arsenal'], ['companions', '🫂', 'Allies'], ['quests', '📜', 'Quests']];
    return h('nav.mode-tabs', ...tabs.map(([id, ico, label]) =>
      h('button.mode-tab', { class: tab === id ? 'active' : '', onclick: () => { tab = id; sfx('click'); refreshBody(); syncTabs(); } }, h('span.mt-ico', ico), h('span', label))));
  }
  function syncTabs() { const ids = ['journey', 'character', 'arsenal', 'companions', 'quests']; root.querySelectorAll('.mode-tab').forEach((el, i) => el.classList.toggle('active', ids[i] === tab)); }

  function renderTab() {
    switch (tab) {
      case 'character': return renderCharacter();
      case 'arsenal': return renderArsenal();
      case 'companions': return renderCompanions();
      case 'quests': return renderQuests();
      default: return renderJourney();
    }
  }

  /* ---------- Journey ---------- */
  function renderJourney() {
    const r = L.currentRegion(hero);
    const bossCleared = !r.boss || hero.clearedBosses.includes(r.boss);
    const companionHere = Object.entries(COMPANIONS).find(([cid, c]) => c.region === r.id && !hero.companions.includes(cid));
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate',
        h('div.row', { style: 'justify-content:space-between;align-items:center' },
          h('h2', { style: 'font-size:1.5rem' }, `${r.icon} ${r.name}`),
          h('span.tag.gold', `Region ${hero.regionIndex + 1}/${REGIONS.length}`)),
        h('p.serif', { style: 'font-size:1.1rem;color:var(--text-dim);margin:8px 0' }, r.desc),
      ),
      h('div.grid.grid-auto-lg',
        h('div.card.clickable', { onclick: () => explore() },
          h('div', { style: 'font-size:1.8rem' }, '🔦'), h('strong', 'Explore the Region'),
          h('p.tiny.muted', 'Search for encounters, enemies and hidden fortune.')),
        h('div.card.clickable', { onclick: () => fight(pickRegionEnemy(), {}) },
          h('div', { style: 'font-size:1.8rem' }, '⚔️'), h('strong', 'Seek a Fight'),
          h('p.tiny.muted', 'Hunt a wandering foe for XP and gold.')),
        h('div.card.clickable', { onclick: () => doRest() },
          h('div', { style: 'font-size:1.8rem' }, '🏕️'), h('strong', 'Rest & Meditate'),
          h('p.tiny.muted', 'Restore health and stamina. Free between battles.')),
        companionHere && h('div.card.clickable', { style: 'border-color:var(--magic)', onclick: () => meetCompanion(companionHere[0]) },
          h('div', { style: 'font-size:1.8rem' }, COMPANIONS[companionHere[0]].icon), h('strong', 'A Potential Ally'),
          h('p.tiny.muted', `${COMPANIONS[companionHere[0]].name} lingers here…`)),
      ),
      r.boss && h('div.panel.panel-pad', { style: `border-color:${bossCleared ? 'var(--success)' : 'var(--blood-500)'}` },
        h('div.row', { style: 'justify-content:space-between;align-items:center' },
          h('div.row.gap-2', h('span', { style: 'font-size:1.8rem' }, ENEMIES[r.boss].icon),
            h('div.col', { style: 'gap:0' }, h('strong', ENEMIES[r.boss].name), h('span.tiny.faint', bossCleared ? 'Vanquished' : 'Regional Guardian — barring the way'))),
          bossCleared ? h('span.tag.success', '✓ Slain') : h('button.btn.danger', { onclick: () => fight(r.boss, { isBoss: true }) }, '⚔️ Challenge')),
        r.astra && !bossCleared && h('p.tiny', { style: 'margin-top:8px;color:var(--gold-300)' }, `Reward: unlock ${WEAPONS[r.astra].icon} ${WEAPONS[r.astra].name}`),
      ),
      bossCleared && hero.regionIndex < REGIONS.length - 1 && h('button.btn.realm.block.lg', { onclick: () => travelOnward() },
        `🌄 Journey onward to ${REGIONS[hero.regionIndex + 1].name} →`),
      hero.regionIndex === REGIONS.length - 1 && bossCleared && h('div.panel.panel-pad', { style: 'text-align:center;border-color:var(--gold-500)' },
        h('h2', { style: 'color:var(--gold-300)' }, '👑 The Saga is Complete'),
        h('p.muted', 'You have conquered every trial and claimed the celestial arsenal. A legend eternal.')),
    );
  }

  function pickRegionEnemy() {
    const r = L.currentRegion(hero);
    const rng = new RNG((hero.seed ^ Date.now()) >>> 0);
    return rng.pick(r.enemies);
  }

  function explore() {
    const rng = new RNG((hero.seed ^ (Date.now() >>> 3)) >>> 0);
    const roll = rng.next();
    if (roll < 0.45) { fight(pickRegionEnemy(), {}); }
    else if (roll < 0.7) { const g = rng.int(10, 35); hero.gold += g; sfx('coin'); persist(); refreshBody(); toast({ icon: '🪙', body: `You find ${g} gold among the ruins.` }); }
    else if (roll < 0.85) { hero.inventory.potion += 1; sfx('reveal'); persist(); refreshBody(); toast({ icon: '🧪', body: 'You discover a healing potion.' }); }
    else { const xp = rng.int(8, 20); const lv = L.gainXp(hero, xp); sfx('reveal'); persist(); refreshBody(); toast({ icon: '📜', body: `Ancient inscriptions grant you ${xp} XP.` });
      discover({ id: 'm_region_' + L.currentRegion(hero).id, category: 'Locations', realm: 'mythos', title: L.currentRegion(hero).name, body: L.currentRegion(hero).desc + ' A place of old power and older secrets.' });
      if (lv) toast({ icon: '✨', body: `Level up! You are now level ${hero.level}.`, sound: 'levelup' }); }
  }

  function doRest() { L.rest(hero, 0); sfx('magic'); persist(); refreshBody(); toast({ icon: '🏕️', body: 'You rest. Health and stamina restored.' }); }

  function travelOnward() {
    if (L.advanceRegion(hero)) { sfx('confirm'); L.rest(hero, 0); persist(); refreshBody();
      bumpStat('mythosQuestsDone'); awardXp(15, 'region cleared');
      toast({ type: 'success', icon: '🌄', body: `You arrive at ${L.currentRegion(hero).name}.` }); }
  }

  function meetCompanion(cid) {
    const c = COMPANIONS[cid];
    modal({ title: `${c.icon} ${c.name}`, wide: false,
      body: h('div',
        h('p.tiny.faint', c.role),
        h('p.serif', { style: 'font-size:1.05rem;color:var(--text-dim);margin:10px 0' }, c.personality),
        h('div.panel', { style: 'padding:12px;margin:10px 0' }, h('strong.tiny', '📜 Their Cause: '), h('span.small.muted', c.quest)),
        h('p.small', c.desc)),
      actions: [
        { label: 'Not now', onClick: (close) => { close(); return true; } },
        { label: '🤝 Recruit', primary: true, sound: 'levelup', onClick: (close) => {
          L.recruitCompanion(hero, cid); bus.emit('mythos:companion', cid); awardXp(10, 'companion');
          discover({ id: 'm_comp_' + cid, category: 'Characters', realm: 'mythos', title: c.name, body: `${c.role}. ${c.personality} ${c.quest}` });
          persist(); refreshBody(); toast({ type: 'success', icon: c.icon, body: `${c.name} joins your journey!` });
          close(); return true; } },
      ] });
  }

  /* ---------- Combat ---------- */
  function fight(enemyKey, opts) {
    const seed = (hero.seed ^ Date.now() ^ (enemyKey.charCodeAt(0) * 131)) >>> 0;
    const combat = L.startCombat(hero, enemyKey, { seed, isBoss: opts.isBoss, hpMult: opts.hpMult || (opts.isBoss ? 1 : 0.9 + Math.random() * 0.3) });
    if (combat.isBoss) { sfx('danger'); toast({ type: 'danger', icon: ENEMIES[enemyKey].icon, title: 'BOSS', body: ENEMIES[enemyKey].name, sound: 'danger' }); }
    else sfx('hit');
    renderCombat(combat, opts);
  }

  function renderCombat(combat, opts) {
    const e = combat.enemy;
    const w = L.weaponOf(hero);
    const ab = w.ability;
    const doAction = (fn) => {
      if (cheatFlags.infiniteStamina) hero.stamina = hero.maxStamina;
      fn();
      if (cheatFlags.godMode && combat.result === 'lose') { combat.over = false; combat.result = null; hero.hp = Math.max(1, Math.round(hero.maxHp * 0.6)); }
      afterAction(combat, opts);
    };

    const enemyCard = h('div.panel.panel-pad.ornate', { id: 'enemy-card', style: 'text-align:center;border-color:var(--blood-500)' },
      h('div', { style: 'font-size:3rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6))', id: 'enemy-sprite' }, e.icon),
      h('h2', { style: 'font-size:1.4rem;margin:4px 0' }, e.name),
      combat.isBoss && h('span.tag.danger', 'GUARDIAN'),
      e.weak && h('div.tiny.muted', { style: 'margin:6px 0' }, `Weak to ${e.weak} damage`),
      h('div', { style: 'max-width:340px;margin:10px auto 0' }, meter({ label: '', value: e.hp, max: e.maxHp, kind: 'hp', showNums: true })),
    );

    const logBox = h('div.panel', { style: 'padding:12px;max-height:200px;overflow-y:auto' },
      h('div.log', { id: 'combat-log' }, ...renderCombatLog(combat)));

    const heroBox = h('div.panel.panel-pad', { id: 'hero-combat' },
      h('div.row', { style: 'justify-content:space-between;align-items:center;margin-bottom:8px' },
        h('strong', `${hero.name}`), h('span.tiny.faint', `${w.icon} ${w.name}`)),
      meter({ label: '❤️ HP', value: hero.hp, max: hero.maxHp, kind: 'hp' }),
      h('div', { style: 'height:6px' }),
      meter({ label: '⚡ Stamina', value: hero.stamina, max: hero.maxStamina, kind: 'stamina' }),
    );

    const actions = h('div.grid.grid-2.gap-2', { id: 'combat-actions' },
      h('button.btn.block', { onclick: (ev) => doAction(() => { L.playerAction(hero, combat, 'light'); pulseEnemy(); }) }, '🗡️ Strike'),
      h('button.btn.block', { disabled: hero.stamina < 2, onclick: (ev) => doAction(() => { L.playerAction(hero, combat, 'heavy'); pulseEnemy(); }) }, `💥 Heavy ⚡2`),
      h('button.btn.realm.block', { disabled: hero.stamina < ab.stam, onclick: (ev) => doAction(() => { L.playerAction(hero, combat, 'special'); pulseEnemy(); sfx('magic'); }) }, `✨ ${ab.name} ⚡${ab.stam}`),
      h('button.btn.block', { onclick: () => doAction(() => L.playerAction(hero, combat, 'block')) }, '🛡️ Block'),
      h('button.btn.block', { disabled: hero.stamina < 1, onclick: () => doAction(() => L.playerAction(hero, combat, 'dodge')) }, '💨 Dodge'),
      h('button.btn.block', { disabled: hero.inventory.potion <= 0, onclick: () => doAction(() => L.playerAction(hero, combat, 'potion')) }, `🧪 Potion (${hero.inventory.potion})`),
      !combat.isBoss && h('button.btn.ghost.block', { style: 'grid-column:1/-1', onclick: () => doAction(() => L.playerFlee(hero, combat)) }, '🏃 Flee'),
    );

    mount(container, h('div.screen',
      h('header.topbar', h('div.topbar-title', '⚔️ Battle'), h('div.grow'),
        hero.companions.length ? h('span.tiny.faint', `${hero.companions.map(c => COMPANIONS[c].icon).join('')} at your side`) : null),
      h('div.mode-scroll', h('div.mode-scroll-inner', { style: 'max-width:640px' },
        enemyCard, h('div', { style: 'height:12px' }), logBox, h('div', { style: 'height:12px' }), heroBox, h('div', { style: 'height:12px' }), actions)),
    ));
  }

  function renderCombatLog(combat) {
    return [...combat.log].slice(-14).map((l) => h(`div.log-entry.${logClass(l.kind)}`, l.text));
  }
  function logClass(kind) { return kind === 'crit' ? 'epic' : kind === 'good' || kind === 'player' || kind === 'ally' ? 'good' : kind === 'enemy' || kind === 'warn' ? 'bad' : 'default'; }

  function pulseEnemy() { const s = container.querySelector('#enemy-sprite'); if (s) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } }

  function afterAction(combat, opts) {
    persist();
    if (combat.over) { setTimeout(() => resolveCombat(combat, opts), 400); return; }
    // re-render combat view (cheap for this scale)
    renderCombat(combat, opts);
    const log = container.querySelector('#combat-log'); if (log) log.scrollTop = log.scrollHeight;
    if (hero.hp < hero.maxHp * 0.25) shake(container.querySelector('#hero-combat'), 0.5);
  }

  function resolveCombat(combat, opts) {
    if (combat.result === 'win') {
      const e = combat.enemy;
      sfx('victory');
      // boss handling
      if (combat.isBoss) {
        if (!hero.clearedBosses.includes(combat.enemyKey)) hero.clearedBosses.push(combat.enemyKey);
        bumpStat('mythosBossesSlain'); bus.emit('mythos:boss', combat.enemyKey); bus.emit('mythos:level', hero.level);
        const r = L.currentRegion(hero);
        if (r.astra) { L.unlockAstra(hero, r.astra); const all = ASTRA_IDS.every(a => hero.astras.includes(a)); bumpStat('astrasUnlocked'); bus.emit('mythos:astra', { total: hero.astras.length, all });
          discover({ id: 'm_' + r.astra, category: 'Weapons', realm: 'mythos', title: WEAPONS[r.astra].name, body: WEAPONS[r.astra].lore }); }
        if (combat.enemyKey === 'vritraxis') { bus.emit('mythos:won'); }
        awardXp(40, 'boss slain');
      } else { bus.emit('mythos:level', hero.level); }
      // bounty quest completion
      if (opts.questId && !hero.completedQuests.includes(opts.questId)) completeQuest(opts.questId);
      persist();
      showCombatResult(combat, opts);
    } else if (combat.result === 'flee') {
      persist(); enterGame(); toast({ icon: '🏃', body: 'You escaped with your life.' });
    } else { // lose
      sfx('death'); showDefeat();
    }
  }

  function showCombatResult(combat, opts) {
    const e = combat.enemy; const rw = combat.rewards || { gold: 0, xp: 0 };
    const astraUnlocked = combat.isBoss && L.currentRegion(hero).astra;
    modal({ title: combat.isBoss ? '👑 Guardian Vanquished' : '⚔️ Victory', dismissable: false,
      body: h('div', { style: 'text-align:center' },
        h('div', { style: 'font-size:2.6rem;margin-bottom:6px' }, e.icon),
        h('p.serif', { style: 'font-size:1.1rem;color:var(--text-dim)' }, `You have defeated the ${e.name}.`),
        h('div.panel', { style: 'padding:12px;margin:14px 0;text-align:left' },
          kv('XP Gained', '+' + rw.xp), kv('Gold Plundered', '+' + rw.gold),
          rw.leveled ? kv('Level Up!', `Now Lv ${hero.level} (+${rw.leveled * 3} pts)`) : null),
        astraUnlocked && h('div.panel', { style: 'padding:14px;border-color:var(--gold-500);margin-bottom:8px' },
          h('div', { style: 'font-size:1.8rem' }, WEAPONS[astraUnlocked].icon),
          h('strong', { style: 'color:var(--gold-300)' }, 'ASTRA UNLOCKED'),
          h('div', WEAPONS[astraUnlocked].name),
          h('p.tiny.muted', { style: 'margin-top:6px' }, WEAPONS[astraUnlocked].lore)),
      ),
      actions: [{ label: 'Continue', primary: true, onClick: (close) => { close(); enterGame(); return true; } }] });
  }

  function showDefeat() {
    modal({ title: '💀 You Have Fallen', dismissable: false,
      body: h('div', { style: 'text-align:center' },
        h('div', { style: 'font-size:2.6rem' }, '🩸'),
        h('p.serif', { style: 'font-size:1.1rem;color:var(--text-dim);margin:10px 0' }, 'Darkness takes you… but a legend\'s tale does not end so easily. You awaken at the last sanctuary, wounds bound, purse lighter.'),
      ),
      actions: [{ label: 'Rise Again', primary: true, onClick: (close) => {
        hero.hp = hero.maxHp; hero.stamina = hero.maxStamina;
        hero.gold = Math.floor(hero.gold * 0.7);
        persist(); close(); enterGame(); return true; } }] });
  }

  /* ---------- Character ---------- */
  function renderCharacter() {
    return h('div.two-col.even',
      h('div.panel.panel-pad',
        h('div.row', { style: 'justify-content:space-between;align-items:center;margin-bottom:8px' },
          h('h3', '💪 Attributes'), hero.statPoints > 0 && h('span.tag.gold', `${hero.statPoints} points to spend`)),
        h('div.col.gap-2', ...Object.entries(STATS).map(([k, s]) =>
          h('div.row', { style: 'justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--hairline)' },
            h('div.col', { style: 'gap:0' }, h('span', `${s.icon} ${s.name}`), h('span.tiny.faint', s.desc)),
            h('div.row.gap-2', { style: 'align-items:center' }, h('strong.mono', { style: 'font-size:1.1rem' }, hero.stats[k]),
              hero.statPoints > 0 && h('button.btn.sm.primary', { onclick: (e) => { if (L.spendStatPoint(hero, k)) { sfx('confirm'); burstAt(e.target, { count: 5 }); persist(); refreshBody(); } } }, '+')))),
        ),
        h('div.divider'),
        h('div.grid.grid-2.gap-2',
          kv('Max Health', hero.maxHp), kv('Max Stamina', hero.maxStamina),
          kv('Base Damage', L.baseDamage(hero)), kv('Dodge Chance', Math.round(L.dodgeChance(hero) * 100) + '%')),
      ),
      h('div.panel.panel-pad',
        h('h3', { style: 'margin-bottom:10px' }, '🎯 Skills'),
        h('p.tiny.muted', { style: 'margin-bottom:10px' }, 'Train skills with gold at any time to sharpen your craft.'),
        h('div.col.gap-2', ...Object.entries(hero.skills).map(([k, v]) => {
          const cost = 20 + v * 15;
          return h('div.row', { style: 'justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--hairline)' },
            h('div.row.gap-2', h('span', { style: 'text-transform:capitalize' }, k), pips(Math.min(5, v), 5)),
            h('button.btn.sm', { disabled: hero.gold < cost, onclick: () => { if (L.trainSkill(hero, k, cost)) { sfx('confirm'); persist(); refreshBody(); toast({ body: `${k} improved to ${hero.skills[k]}.` }); } } }, `🪙 ${cost}`));
        })),
      ),
    );
  }

  /* ---------- Arsenal ---------- */
  function renderArsenal() {
    const owned = hero.weapons.map((id) => WEAPONS[id]).filter(Boolean);
    const locked = ASTRA_IDS.filter((id) => !hero.astras.includes(id));
    return h('div',
      h('h3', { style: 'color:var(--gold-300);margin-bottom:10px' }, '⚔️ Your Arsenal'),
      h('div.grid.grid-auto-lg', ...hero.weapons.map((id) => weaponCard(id, true))),
      locked.length > 0 && h('div', { style: 'margin-top:24px' },
        h('h3', { style: 'color:var(--gold-300);margin-bottom:10px' }, `🌟 The Celestial Arsenal (${hero.astras.length}/${ASTRA_IDS.length})`),
        h('div.grid.grid-auto-lg', ...locked.map((id) => weaponCard(id, false)))),
    );
  }

  function weaponCard(id, owned) {
    const w = WEAPONS[id];
    const equipped = hero.equipped === id;
    return h('div.card', { class: (equipped ? 'selected' : '') + (owned ? '' : ' locked'), style: 'position:relative' },
      h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
        h('div.row.gap-2', h('span', { style: 'font-size:1.5rem' }, owned ? w.icon : '🔒'),
          h('div.col', { style: 'gap:0' }, h('strong', w.name), h('span', { class: 'tiny rarity-' + w.rarity, style: 'text-transform:capitalize' }, w.rarity))),
        equipped && h('span.tag.gold', 'Equipped')),
      h('div.row.wrap.gap-1', { style: 'margin:8px 0' },
        h('span.tag', `⚔️ ${w.dmg} dmg`), w.element && h('span.tag.magic', w.element),
        h('span.tag', `✦ ${w.ability.name}`)),
      h('p.tiny.muted', { style: 'font-style:italic;min-height:34px' }, w.lore),
      owned
        ? (!equipped && h('button.btn.sm.block', { onclick: () => { hero.equipped = id; sfx('confirm'); persist(); refreshBody(); toast({ icon: w.icon, body: `${w.name} equipped.` }); } }, 'Equip'))
        : h('div.tiny', { style: 'color:var(--gold-400);margin-top:4px' }, `🔓 ${w.unlock}`),
    );
  }

  /* ---------- Companions ---------- */
  function renderCompanions() {
    if (hero.companions.length === 0) return h('div', empty('🫂', 'You walk alone.', 'Companions can be found across the regions of the world. Explore to meet them.'));
    return h('div.grid.grid-auto-lg', ...hero.companions.map((cid) => {
      const c = COMPANIONS[cid];
      return h('div.panel.panel-pad', { style: 'border-left:3px solid var(--magic)' },
        h('div.row.gap-2', { style: 'align-items:center' }, h('span', { style: 'font-size:1.6rem' }, c.icon),
          h('div.col', { style: 'gap:0' }, h('strong', c.name), h('span.tiny.faint', c.role))),
        h('p.serif', { style: 'color:var(--text-dim);margin:8px 0' }, c.personality),
        h('div.row.wrap.gap-1', c.dmg && h('span.tag', `+${c.dmg} dmg/turn`), c.heal && h('span.tag.success', `+${c.heal} heal/turn`)),
        h('p.tiny.muted', { style: 'margin-top:8px' }, `📜 ${c.quest}`));
    }));
  }

  /* ---------- Quests ---------- */
  function renderQuests() {
    const r = L.currentRegion(hero);
    const available = SIDE_QUESTS.filter((q) => q.region === r.id || hero.regionIndex >= REGIONS.findIndex(x => x.id === q.region));
    const main = h('div.panel.panel-pad', { style: 'margin-bottom:16px;border-color:var(--gold-700)' },
      h('div.row', { style: 'justify-content:space-between' }, h('h3', '📖 The Main Saga'), h('span.tag.gold', `Ch. ${hero.regionIndex + 1}`)),
      h('p.serif', { style: 'font-size:1.05rem;color:var(--text-dim);margin-top:8px' },
        r.boss && !hero.clearedBosses.includes(r.boss)
          ? `Defeat ${ENEMIES[r.boss].name}, the guardian of ${r.name}, to claim its power and press onward.`
          : `You have mastered ${r.name}. Journey onward to face the next trial.`));
    return h('div', main,
      h('h3', { style: 'color:var(--gold-300);margin-bottom:10px' }, '📜 Side Quests & Bounties'),
      h('div.col.gap-3', ...available.map((q) => {
        const done = hero.completedQuests.includes(q.id);
        return h('div.card', { class: done ? '' : 'clickable', style: done ? 'opacity:0.6' : '',
          onclick: done ? null : () => startSideQuest(q) },
          h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
            h('div.col', { style: 'gap:2px' }, h('strong', q.name), h('span.tiny.faint', q.type === 'bounty' ? '🎯 Bounty' : '🔦 Exploration')),
            done ? h('span.tag.success', '✓ Done') : h('span.tag', Object.entries(q.reward).map(([k, v]) => k === 'gold' ? `🪙${v}` : k === 'xp' ? `✦${v}` : `${k}`).join(' '))),
          h('p.tiny.muted', { style: 'margin-top:6px' }, q.desc));
      })));
  }

  function startSideQuest(q) {
    if (q.type === 'bounty') { fight(q.combat, { hpMult: q.hpMult, questId: q.id }); }
    else {
      // exploration quest — simple resolution
      completeQuest(q.id);
      sfx('reveal'); persist(); refreshBody();
      toast({ type: 'success', icon: '📜', body: `Quest complete: ${q.name}` });
    }
  }

  function completeQuest(id) {
    const q = SIDE_QUESTS.find((x) => x.id === id); if (!q || hero.completedQuests.includes(id)) return;
    hero.completedQuests.push(id);
    const rw = q.reward;
    if (rw.gold) hero.gold += rw.gold;
    if (rw.xp) L.gainXp(hero, rw.xp);
    if (rw.potion) hero.inventory.potion += rw.potion;
    bumpStat('mythosQuestsDone'); awardXp(12, 'quest');
    bus.emit('mythos:level', hero.level);
  }
}
