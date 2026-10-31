/* ============================================================
   LAST LIFE — roguelike survival interface.
   ============================================================ */
import { h, mount } from '../../engine/dom.js';
import { sfx } from '../../engine/audio.js';
import { bus } from '../../engine/bus.js';
import { newSeed } from '../../engine/rng.js';
import { bumpStat, awardXp } from '../../engine/store.js';
import { markRealmPlayed } from '../../engine/achievements.js';
import { discover } from '../../engine/codex.js';
import { cheatFlags, setCheatContext, clearCheatContext } from '../../engine/cheats.js';
import { fmt } from '../../engine/format.js';
import { topBar, meter, statPill, empty, kv } from '../../ui/widgets.js';
import { toast, modal, confirm, burstAt, shake } from '../../ui/feedback.js';
import { CLASSES, WEAPONS, ABILITIES, REGIONS, ENEMIES, EVENTS, META_UNLOCKS, DEATH_FLAVORS } from './data.js';
import * as L from './logic.js';
import { saveRun, loadRun, hasRun, deleteRun, loadMeta, saveMeta, defaultMeta, availableClasses, purchaseUnlock } from './state.js';

export function lastlifeScreen({ container, back }) {
  let run = null;
  let meta = null;
  let root;
  const persist = () => saveRun(run);

  return {
    mount() { markRealmPlayed('lastlife'); meta = loadMeta(); run = (hasRun() && loadRun()) || null; startMenu(); },
    unmount() { clearCheatContext(); if (run && run.alive) persist(); },
  };

  function registerCheats() {
    setCheatContext({
      realm: 'lastlife', label: 'Last Life',
      rerender: () => { if (run && run.alive && !run.won) { persist(); render(); } },
      handlers: {
        l_heal: () => { run.hp = run.maxHp; run.statuses = []; },
        l_supplies: () => { run.gold += 500; run.food += 10; run.potions += 10; },
        l_stats: () => { run.stats.atk += 10; run.stats.def += 8; run.stats.luck += 8; run.maxHp += 50; run.hp = run.maxHp; },
        l_region: () => { if (run.regionIndex < REGIONS.length - 1) { run.encountersInRegion = 0; run.regionIndex++; run.hp = run.maxHp; run.currentEncounter = L.generateEncounter(run); bus.emit('lastlife:region', run.regionIndex + 1); } },
        l_fragments: () => { meta.fragments += 999; saveMeta(meta); toast({ icon: '🔹', body: '+999 Soul Fragments' }); },
        l_classes: () => { CLASSES.forEach((c) => { meta.unlockedClasses[c.id] = true; }); saveMeta(meta); toast({ icon: '🔓', body: 'All classes unlocked!' }); },
      },
    });
  }

  /* ---------- Menu ---------- */
  function startMenu() {
    mount(container, h('div.screen',
      topBar({ title: '💀 Last Life', onBack: back }),
      h('div.content-page', h('div.content-inner',
        h('div.cinematic', h('div', { style: 'font-size:3rem' }, '💀'), h('h1', 'One Life. No Second Chance.'),
          h('p.page-sub', 'A brutal, procedural descent. When you die, you die. Only your legend — and hard-won unlocks — carry on.')),
        h('div.panel.panel-pad', { style: 'margin-bottom:16px' },
          h('div.row', { style: 'justify-content:space-between;flex-wrap:wrap;gap:12px' },
            h('div.col', { style: 'gap:2px' }, h('strong', { style: 'font-size:1.1rem' }, `🔹 ${meta.fragments} Soul Fragments`),
              h('span.tiny.muted', `${meta.totalRuns} runs · ${meta.wins} escaped · best: day ${meta.bestDay}`)),
            h('button.btn.ghost', { onclick: () => openMetaShop() }, '🔓 Sanctum of Souls'))),
        run && run.alive
          ? h('div.panel.ornate', { style: 'margin-bottom:16px' }, h('div.slot', h('div.slot-badge', run.icon),
              h('div.col', { style: 'flex:1;gap:2px' }, h('strong', `${run.className}, day ${run.day}`),
                h('div.tiny.muted', `${REGIONS[run.regionIndex].name} · ${run.hp}/${run.maxHp} HP`)),
              h('button.btn.primary', { onclick: () => enterRun() }, '▶ Continue Run')))
          : null,
        h('div.row.wrap.gap-3', { style: 'justify-content:center' },
          h('button.btn.danger', { onclick: () => newRunFlow() }, (run && run.alive) ? '☠️ Abandon & New Run' : '☠️ Begin a New Life'),
          h('button.btn.ghost', { onclick: back }, '‹ Back to Hub')),
      )),
    ));
  }

  async function newRunFlow() {
    if (run && run.alive && !(await confirm({ title: 'Abandon this life?', message: 'Your current run will be lost forever. Begin anew?', confirmLabel: 'New Run', danger: true }))) return;
    const classes = availableClasses(meta);
    let chosen = classes[0].id;
    const render = () => mount(container, h('div.screen',
      topBar({ title: '💀 Begin a New Life', onBack: startMenu }),
      h('div.content-page', h('div.content-inner',
        h('h2.page-title', 'Choose Your Doom'),
        h('div.page-sub', 'Every background is a gamble. Choose, and step into the dark.'),
        h('div.grid.grid-auto-lg', ...classes.map((c) => {
          const locked = !c.unlocked;
          return h('div.card', { class: (chosen === c.id && !locked ? 'selected ' : '') + (locked ? 'locked' : 'clickable'),
            onclick: locked ? () => toast({ type: 'warning', body: `Unlock ${c.name} in the Sanctum of Souls (${c.cost} fragments).`, sound: 'wrong' }) : () => { chosen = c.id; sfx('click'); render(); } },
            h('div.row.gap-2', { style: 'align-items:center' }, h('span', { style: 'font-size:1.6rem' }, locked ? '🔒' : c.icon), h('strong', c.name)),
            h('div.grid.grid-2.gap-1', { style: 'margin:8px 0' },
              h('span.tiny', `❤️ ${c.stats.hp} HP`), h('span.tiny', `⚔️ ${c.stats.atk} ATK`),
              h('span.tiny', `🛡️ ${c.stats.def} DEF`), h('span.tiny', `🍀 ${c.stats.luck} LUCK`)),
            h('p.tiny', { style: 'color:var(--success)' }, `✔ ${c.strength}`),
            h('p.tiny', { style: 'color:var(--danger)' }, `✘ ${c.weakness}`),
            h('div.tiny.faint', { style: 'margin-top:6px' }, `${WEAPONS[c.weapon].icon} ${WEAPONS[c.weapon].name} · ✦ ${ABILITIES[c.ability].name}`),
            locked && h('div.tag.gold', { style: 'margin-top:6px' }, `🔒 ${c.cost} fragments`));
        })),
        h('button.btn.danger.block.lg', { style: 'margin-top:20px', onclick: () => {
          run = L.newRun({ seed: newSeed(), classId: chosen, meta });
          run.currentEncounter = L.generateEncounter(run);
          meta.totalRuns++; saveMeta(meta); bumpStat('runs'); saveRun(run);
          sfx('danger'); enterRun();
        } }, '☠️ One Life Begins'),
      )),
    ));
    render();
  }

  /* ---------- Run ---------- */
  function enterRun() { registerCheats(); bus.emit('lastlife:day', run.day); bus.emit('lastlife:region', run.regionIndex + 1); render(); }

  function render() {
    if (!run.alive) return renderDeath();
    if (run.won) return renderVictory();
    root = h('div.screen',
      h('header.topbar',
        h('button.icon-btn', { onclick: () => { persist(); startMenu(); } }, '‹'),
        h('div.col', { style: 'gap:0' }, h('div.topbar-title', `${run.icon} Day ${run.day}`), h('div.tiny.faint', `${REGIONS[run.regionIndex].icon} ${REGIONS[run.regionIndex].name}`)),
        h('div.grow'),
        h('span.tag', `⚔️ ${run.kills} slain`)),
      renderHud(),
      h('div.mode-body', h('div.mode-scroll', h('div.mode-scroll-inner', { id: 'r-content', style: 'max-width:720px' }, renderEncounter()))),
    );
    mount(container, root);
  }

  function renderHud() {
    return h('div.resbar',
      h('div', { style: 'min-width:140px;flex:1' }, meter({ label: '❤️ Health', value: run.hp, max: run.maxHp, kind: 'hp' })),
      h('div', { style: 'min-width:120px;flex:1' }, meter({ label: '🍖 Hunger', value: run.hunger, max: 100, kind: 'hunger', showNums: false })),
      h('div.divider-v'),
      statPill({ icon: '🪙', value: run.gold, label: 'Gold' }),
      statPill({ icon: '🍖', value: run.food, label: 'Food', mono: false }),
      statPill({ icon: '🧪', value: run.potions, label: 'Potion', mono: false }),
    );
  }

  /* ---------- Encounter rendering ---------- */
  function renderEncounter() {
    const enc = run.currentEncounter;
    if (!enc) { run.currentEncounter = L.generateEncounter(run); }
    switch (run.currentEncounter.kind) {
      case 'combat': return encCombat(run.currentEncounter, false);
      case 'boss': return encCombat(run.currentEncounter, true);
      case 'event': return encEvent(run.currentEncounter);
      case 'merchant': return encMerchant(run.currentEncounter);
      case 'camp': return encCamp();
      case 'ruins': return encRuins();
      default: return encCamp();
    }
  }

  function survivalBar() {
    return h('div.row.wrap.gap-2', { style: 'margin-bottom:14px' },
      run.food > 0 && h('button.btn.sm.ghost', { onclick: () => { L.eat(run); sfx('confirm'); persist(); render(); } }, `🍖 Eat (${run.food})`),
      run.potions > 0 && run.hp < run.maxHp && h('button.btn.sm.ghost', { onclick: () => { L.drinkPotion(run); sfx('confirm'); persist(); render(); } }, `🧪 Potion (${run.potions})`),
      run.statuses.length > 0 && h('span.tag.danger', run.statuses.map(s => s.type).join(', ')),
    );
  }

  function encCombat(enc, isBoss) {
    const e = ENEMIES[enc.enemyKey];
    const region = REGIONS[run.regionIndex];
    return h('div.col.gap-4',
      isBoss
        ? h('div.panel.panel-pad.ornate', { style: 'text-align:center;border-color:var(--blood-500)' },
            h('div', { style: 'font-size:3rem' }, e.icon), h('h2', { style: 'color:var(--blood-400)' }, `⚠️ ${e.name}`),
            h('span.tag.danger', 'REGIONAL BOSS'),
            h('p.serif', { style: 'color:var(--text-dim);margin-top:8px' }, `The guardian of ${region.name} bars your path. Defeat it to escape this region — or die trying.`))
        : h('div.panel.panel-pad', { style: 'text-align:center' },
            h('div', { style: 'font-size:2.4rem' }, e.icon), h('h2', { style: 'font-size:1.4rem' }, e.name),
            h('p.serif', { style: 'color:var(--text-dim)' }, 'A hostile foe blocks your way.')),
      survivalBar(),
      h('div.row.gap-3', { style: 'justify-content:center;flex-wrap:wrap' },
        h('button.btn.danger.lg', { onclick: () => beginCombat(enc.enemyKey, isBoss) }, '⚔️ Fight'),
        !isBoss && h('button.btn.ghost.lg', { onclick: () => tryAvoid() }, '🏃 Try to Avoid')),
    );
  }

  function tryAvoid() {
    const rng = { chance: Math.random() < 0.4 + run.stats.luck * 0.02 };
    if (rng.chance) { sfx('dodge'); toast({ icon: '🏃', body: 'You slip past unnoticed.' }); L.clearEncounter(run); L.travel(run); persist(); afterTravel(); }
    else { sfx('hurt'); toast({ type: 'warning', body: 'You are spotted — no escape!' }); beginCombat(run.currentEncounter.enemyKey, run.currentEncounter.kind === 'boss'); }
  }

  function beginCombat(enemyKey, isBoss) {
    const combat = L.startCombat(run, enemyKey, isBoss);
    if (isBoss) sfx('danger'); else sfx('hit');
    renderCombat(combat);
  }

  function renderCombat(combat) {
    const e = combat.enemy;
    const act = (action) => { L.combatAction(run, combat, action); afterCombatAction(combat); };
    mount(container, h('div.screen',
      h('header.topbar', h('div.topbar-title', combat.isBoss ? '☠️ BOSS BATTLE' : '⚔️ Battle'), h('div.grow'),
        h('span.tag', `${ABILITIES[run.ability].name}`)),
      h('div.mode-scroll', h('div.mode-scroll-inner', { style: 'max-width:600px' },
        h('div.panel.panel-pad.ornate', { style: 'text-align:center;border-color:var(--blood-500)' },
          h('div', { style: 'font-size:2.8rem', id: 'r-enemy' }, e.icon), h('h2', { style: 'font-size:1.3rem' }, e.name),
          h('div', { style: 'max-width:320px;margin:8px auto 0' }, meter({ value: e.hp, max: e.maxHp, kind: 'hp' }))),
        h('div', { style: 'height:10px' }),
        h('div.panel', { style: 'padding:12px;max-height:180px;overflow-y:auto' }, h('div.log', { id: 'r-log' }, ...combat.log.slice(-12).map((l) => h(`div.log-entry.${logClass(l.kind)}`, l.text)))),
        h('div', { style: 'height:10px' }),
        h('div.panel.panel-pad',
          meter({ label: '❤️ Your HP', value: run.hp, max: run.maxHp, kind: 'hp' })),
        h('div', { style: 'height:10px' }),
        h('div.grid.grid-2.gap-2',
          h('button.btn.block', { onclick: () => { act('attack'); pulse(); } }, '🗡️ Attack'),
          h('button.btn.block', { onclick: () => { act('heavy'); pulse(); } }, '💥 Heavy Blow'),
          h('button.btn.block', { onclick: () => act('defend') }, '🛡️ Defend'),
          h('button.btn.block', { disabled: run.potions <= 0, onclick: () => act('potion') }, `🧪 Potion (${run.potions})`),
          !combat.isBoss && h('button.btn.ghost.block', { style: 'grid-column:1/-1', onclick: () => { L.combatFlee(run, combat); afterCombatAction(combat); } }, '🏃 Flee'),
        ),
      )),
    ));
  }

  function pulse() { const s = container.querySelector('#r-enemy'); if (s) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } }

  function afterCombatAction(combat) {
    persist();
    if (run.hp < run.maxHp * 0.25 && run.hp > 0) shake(container, 0.4);
    if (combat.over) { setTimeout(() => resolveCombat(combat), 350); return; }
    renderCombat(combat);
    const log = container.querySelector('#r-log'); if (log) log.scrollTop = log.scrollHeight;
  }

  function resolveCombat(combat) {
    if (combat.result === 'win') {
      sfx('victory');
      bumpStat('totalKills'); bus.emit('lastlife:day', run.day);
      if (combat.isBoss) {
        bumpStat('bossesDown'); bus.emit('lastlife:boss', combat.enemyKey);
        awardXp(25, 'boss');
        discover({ id: 'l_boss_' + combat.enemyKey, category: 'Enemies', realm: 'lastlife', title: ENEMIES[combat.enemyKey].name, body: `A regional boss of the ${REGIONS[run.regionIndex].name}. Felled by a rare few.` });
        const res = L.afterBoss(run);
        toast({ type: 'success', icon: '🔹', body: `Boss slain! +${res.frag} soul fragments.`, sound: 'levelup' });
        persist();
        if (run.won) { finishWin(); return; }
        bus.emit('lastlife:region', run.regionIndex + 1);
        modal({ title: `🌄 ${REGIONS[run.regionIndex].name}`, dismissable: false,
          body: h('div', { style: 'text-align:center' }, h('div', { style: 'font-size:2.4rem' }, REGIONS[run.regionIndex].icon),
            h('p.serif', { style: 'color:var(--text-dim);margin:10px 0' }, `You survive the boss and press into ${REGIONS[run.regionIndex].name}. ${REGIONS[run.regionIndex].desc}`)),
          actions: [{ label: 'Press On', primary: true, onClick: (close) => { close(); L.travel(run); persist(); afterTravel(); return true; } }] });
      } else {
        awardXp(3, 'kill');
        L.clearEncounter(run); L.travel(run); persist(); afterTravel();
      }
    } else if (combat.result === 'flee') { L.travel(run); persist(); afterTravel(); }
    else { onDeath(combat.enemyKey); }
  }

  function afterTravel() {
    if (cheatFlags.noHunger) run.hunger = 0;
    if (!run.alive) { onDeath(run.cause); return; }
    bus.emit('lastlife:day', run.day);
    if (run.day > (meta.bestDay || 0)) { meta.bestDay = run.day; }
    bumpStat('bestDaysSurvived', run.day, 'max'); saveMeta(meta);
    render();
  }

  /* ---------- Non-combat encounters ---------- */
  function encEvent(enc) {
    const ev = enc.event;
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate',
        h('h2', { style: 'font-size:1.4rem' }, ev.title),
        h('p.serif', { style: 'font-size:1.1rem;line-height:1.7;color:var(--text-dim);margin-top:8px' }, ev.text)),
      survivalBar(),
      h('div.col.gap-2', ...ev.options.map((opt, i) => {
        const unaffordable = opt.cost && Object.entries(opt.cost).some(([k, v]) => (run[k] || 0) < v);
        return h('button.choice', { disabled: unaffordable, onclick: () => chooseEvent(ev, i) },
          h('div.c-label', opt.label),
          opt.cost && h('div.c-hint', 'Cost: ' + Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(', ')));
      })),
    );
  }

  function chooseEvent(ev, i) {
    const res = L.resolveEvent(run, ev, i);
    sfx(res.kind === 'good' ? 'coin' : res.kind === 'bad' ? 'hurt' : 'paper');
    if (res.fail) { toast({ type: 'warning', body: res.text, sound: 'wrong' }); return; }
    if (res.discoveries) run.discoveries++;
    persist();
    if (!run.alive) { toast({ type: 'danger', body: res.text }); setTimeout(() => onDeath(ev.id), 500); return; }
    toast({ type: res.kind === 'good' ? 'success' : res.kind === 'bad' ? 'danger' : 'default', body: res.text, duration: 4500 });
    if (res.fight) { setTimeout(() => beginCombat(REGIONS[run.regionIndex].enemies[0], false), 400); return; }
    L.clearEncounter(run); L.travel(run); persist(); afterTravel();
  }

  function encMerchant(enc) {
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate', h('h2', { style: 'font-size:1.4rem' }, '🧙 A Wandering Merchant'),
        h('p.serif', { style: 'color:var(--text-dim);margin-top:6px' }, '"Coin for comfort, traveller. The road ahead is unkind."')),
      survivalBar(),
      h('div.grid.grid-auto-lg', ...enc.stock.map((item) =>
        h('div.card',
          h('div.row.gap-2', { style: 'align-items:center' }, h('span', { style: 'font-size:1.4rem' }, item.icon), h('strong', item.name)),
          item.dmg && h('div.tiny.muted', { style: 'margin:4px 0' }, `⚔️ ${item.dmg} damage${WEAPONS[run.weapon].dmg < item.dmg ? ' (upgrade!)' : ''}`),
          h('button.btn.sm.block', { style: 'margin-top:8px', disabled: run.gold < item.price, onclick: () => buy(item) }, `🪙 ${item.price}`))),
      ),
      h('button.btn.realm.block.lg', { onclick: () => { L.clearEncounter(run); L.travel(run); persist(); afterTravel(); } }, '🌄 Move On →'),
    );
  }

  function buy(item) {
    if (run.gold < item.price) return;
    run.gold -= item.price; sfx('coin');
    if (item.effect === 'food') run.food++;
    else if (item.effect === 'potion') run.potions++;
    else if (item.effect === 'weapon') { run.weapon = item.ref; toast({ icon: item.icon, body: `Equipped ${item.name}.` }); }
    persist(); render();
    if (item.effect !== 'weapon') toast({ icon: item.icon, body: `Bought ${item.name}.` });
  }

  function encCamp() {
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate', { style: 'text-align:center' }, h('div', { style: 'font-size:2.6rem' }, '🏕️'),
        h('h2', { style: 'font-size:1.4rem' }, 'A Safe Camp'),
        h('p.serif', { style: 'color:var(--text-dim);margin-top:6px' }, 'A rare moment of quiet. You could rest and recover — but resting costs time, and time means hunger.')),
      survivalBar(),
      h('div.row.gap-3', { style: 'justify-content:center;flex-wrap:wrap' },
        h('button.btn.lg', { onclick: () => { const heal = Math.round(run.maxHp * 0.35); run.hp = Math.min(run.maxHp, run.hp + heal); sfx('magic'); toast({ icon: '🏕️', body: `You rest and recover ${heal} HP.` }); L.clearEncounter(run); L.travel(run); persist(); afterTravel(); } }, '🔥 Rest (+35% HP)'),
        h('button.btn.ghost.lg', { onclick: () => { L.clearEncounter(run); L.travel(run); persist(); afterTravel(); } }, '🌄 Press On')),
    );
  }

  function encRuins() {
    return h('div.col.gap-4',
      h('div.panel.panel-pad.ornate', { style: 'text-align:center' }, h('div', { style: 'font-size:2.6rem' }, '🏚️'),
        h('h2', { style: 'font-size:1.4rem' }, 'Silent Ruins'),
        h('p.serif', { style: 'color:var(--text-dim);margin-top:6px' }, 'Ancient stones, half-swallowed by the land. Something may yet remain among them.')),
      survivalBar(),
      h('div.row.gap-3', { style: 'justify-content:center;flex-wrap:wrap' },
        h('button.btn.lg', { onclick: () => searchRuins() }, '🔦 Search the Ruins'),
        h('button.btn.ghost.lg', { onclick: () => { L.clearEncounter(run); L.travel(run); persist(); afterTravel(); } }, '🌄 Press On')),
    );
  }

  function searchRuins() {
    const luck = run.stats.luck;
    const r = Math.random();
    run.discoveries++;
    if (r < 0.35) { const g = 15 + Math.floor(Math.random() * 30); run.gold += g; sfx('coin'); toast({ icon: '🪙', body: `You find ${g} gold in the rubble.` }); }
    else if (r < 0.55) { run.potions++; sfx('reveal'); toast({ icon: '🧪', body: 'You find a healing potion.' }); }
    else if (r < 0.72) { run.food++; sfx('reveal'); toast({ icon: '🍖', body: 'You scavenge some rations.' }); }
    else if (r < 0.85 + luck * 0.01) { run.stats.atk += 1; sfx('levelup'); toast({ type: 'success', icon: '⚔️', body: 'You find a whetstone. +1 ATK permanently this run.' }); }
    else { const dmg = 10 + Math.floor(Math.random() * 12); run.hp -= dmg; sfx('hurt'); shake(container); toast({ type: 'danger', icon: '🪤', body: `A trap! You take ${dmg} damage.` });
      if (run.hp <= 0) { L.die(run, 'a ruin trap'); persist(); setTimeout(() => onDeath('a ruin trap'), 400); return; } }
    L.clearEncounter(run); L.travel(run); persist(); afterTravel();
  }

  /* ---------- Death (permadeath) ---------- */
  function onDeath(cause) {
    if (cheatFlags.godMode) {
      run.alive = true; run.hp = Math.max(1, Math.round(run.maxHp * 0.6)); run.hunger = 0; run.statuses = [];
      toast({ type: 'success', icon: '✨', body: 'God Mode — you cheat death.' });
      persist(); render(); return;
    }
    if (run.alive) L.die(run, cause);
    renderDeath();
  }

  function renderDeath() {
    sfx('death');
    const frags = L.runFragments(run);
    meta.fragments += frags; meta.totalRuns = Math.max(meta.totalRuns, meta.totalRuns);
    if (run.day > (meta.bestDay || 0)) meta.bestDay = run.day;
    saveMeta(meta);
    bus.emit('lastlife:death');
    bumpStat('bestDaysSurvived', run.day, 'max');
    deleteRun(); // PERMADEATH — the run can never be reloaded.

    const causeText = typeof run.cause === 'string' && ENEMIES[run.cause] ? `slain by ${ENEMIES[run.cause].name}` : `lost to ${run.cause || 'the wilds'}`;
    const majorDecisions = run.decisions.slice(-4);
    mount(container, h('div.screen',
      h('div.content-page', h('div.content-inner',
        h('div.cinematic',
          h('div', { style: 'font-size:3.4rem' }, '💀'),
          h('h1', { style: 'color:var(--blood-400);font-size:clamp(2rem,7vw,3.4rem)' }, 'YOUR STORY ENDS HERE'),
          h('p.page-sub', DEATH_FLAVORS[run.day % DEATH_FLAVORS.length]),
          h('div.panel.panel-pad', { style: 'max-width:460px;margin:16px auto;text-align:left' },
            kv('The Fallen', `${run.className} — ${run.background}`),
            kv('Days Survived', String(run.day)),
            kv('Reached', REGIONS[run.regionIndex].name),
            kv('Enemies Defeated', String(run.kills)),
            kv('Bosses Slain', String(run.bossesDown)),
            kv('Discoveries', String(run.discoveries)),
            kv('Wealth', `🪙 ${run.gold}`),
            kv('Cause of Death', causeText),
            h('div.divider'),
            kv('🔹 Soul Fragments Earned', `+${frags}`),
          ),
          majorDecisions.length > 0 && h('div.panel', { style: 'max-width:460px;margin:0 auto 16px;padding:12px;text-align:left' },
            h('div.tiny.faint', { style: 'margin-bottom:6px' }, 'Your final choices:'),
            ...majorDecisions.map((d) => h('div.tiny.muted', `Day ${d.day}: ${d.choice} — ${d.event}`))),
          h('div.row.gap-3', { style: 'justify-content:center' },
            h('button.btn.danger', { onclick: () => { run = null; newRunFlow(); } }, '☠️ Start New Run'),
            h('button.btn.ghost', { onclick: () => { run = null; openMetaShop(); } }, '🔓 Spend Fragments'),
            h('button.btn.ghost', { onclick: () => { run = null; back(); } }, '‹ Hub')),
        ),
      )),
    ));
  }

  function finishWin() {
    run.won = true;
    meta.wins++; const frags = L.runFragments(run); meta.fragments += frags; saveMeta(meta);
    bus.emit('lastlife:won'); bus.emit('lastlife:region', run.regionIndex + 1);
    awardXp(80, 'run won');
    deleteRun();
    renderVictory(frags);
  }

  function renderVictory(frags = L.runFragments(run)) {
    sfx('victory');
    mount(container, h('div.screen',
      h('div.content-page', h('div.content-inner',
        h('div.cinematic',
          h('div', { style: 'font-size:3.4rem' }, '🏆'),
          h('h1', { style: 'color:var(--gold-300)' }, 'YOU ESCAPED THE WILDS'),
          h('p.page-sub', 'Against all odds, you crossed the Ashlands and lived. A legend, at last.'),
          h('div.panel.panel-pad', { style: 'max-width:440px;margin:16px auto;text-align:left' },
            kv('Survivor', `${run.className} — ${run.background}`),
            kv('Days Survived', String(run.day)),
            kv('Enemies Defeated', String(run.kills)),
            kv('Bosses Slain', String(run.bossesDown)),
            kv('🔹 Fragments Earned', `+${frags}`)),
          h('div.row.gap-3', { style: 'justify-content:center' },
            h('button.btn.primary', { onclick: () => { run = null; newRunFlow(); } }, '☠️ Tempt Fate Again'),
            h('button.btn.ghost', { onclick: () => { run = null; back(); } }, '‹ Hub')),
        ),
      )),
    ));
  }

  /* ---------- Meta shop ---------- */
  function openMetaShop() {
    meta = loadMeta();
    mount(container, h('div.screen',
      topBar({ title: '🔓 Sanctum of Souls', onBack: () => { run = loadRun(); startMenu(); } }),
      h('div.content-page', h('div.content-inner',
        h('h2.page-title', 'Sanctum of Souls'),
        h('div.page-sub', 'The dead pay for the living. Spend Soul Fragments on permanent unlocks — but the dead do not return.'),
        h('div.panel.panel-pad', { style: 'margin-bottom:16px;text-align:center' }, h('strong', { style: 'font-size:1.4rem;color:var(--lastlife)' }, `🔹 ${meta.fragments} Fragments`)),
        h('div.grid.grid-auto-lg', ...META_UNLOCKS.map((u) => {
          const owned = (u.type === 'class' && meta.unlockedClasses[u.ref]) || (u.type === 'boon' && meta.boons[u.id]);
          return h('div.card', { class: owned ? '' : '', style: owned ? 'border-color:var(--success)' : '' },
            h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
              h('strong', u.name), owned ? h('span.tag.success', '✓ Owned') : h('span.tag.gold', `🔹 ${u.cost}`)),
            h('p.tiny.muted', { style: 'margin:8px 0' }, u.desc),
            !owned && h('button.btn.sm.block', { class: meta.fragments >= u.cost ? 'primary' : '', disabled: meta.fragments < u.cost,
              onclick: () => { const res = purchaseUnlock(meta, u.id); if (res.ok) { sfx('levelup'); toast({ type: 'success', icon: '🔓', body: `Unlocked: ${u.name}` }); openMetaShop(); } else toast({ type: 'warning', body: 'Not enough fragments.', sound: 'wrong' }); } }, 'Unlock'));
        })),
        h('div', { style: 'height:24px' }),
      )),
    ));
  }

  function logClass(kind) { return kind === 'crit' ? 'epic' : kind === 'good' || kind === 'player' ? 'good' : kind === 'enemy' || kind === 'bad' || kind === 'warn' ? 'bad' : 'default'; }
}
