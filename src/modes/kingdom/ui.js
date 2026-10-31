/* ============================================================
   KINGDOM — screen & interface.
   ============================================================ */
import { h, mount, clear } from '../../engine/dom.js';
import { sfx } from '../../engine/audio.js';
import { bus } from '../../engine/bus.js';
import { RNG, newSeed } from '../../engine/rng.js';
import { state, bumpStat, awardXp } from '../../engine/store.js';
import { markRealmPlayed } from '../../engine/achievements.js';
import { discover } from '../../engine/codex.js';
import { cheatFlags, setCheatContext, clearCheatContext } from '../../engine/cheats.js';
import { fmt, signed } from '../../engine/format.js';
import { topBar, statPill, meter, empty, kv } from '../../ui/widgets.js';
import { toast, confirm, modal, burstAt, shake, floatText } from '../../ui/feedback.js';
import { RESOURCES, BUILDINGS, UNITS, TIERS, POLICIES } from './data.js';
import { EVENTS, rollEvent } from './events.js';
import * as L from './logic.js';
import { saveGame, loadGame, hasSave, deleteSave, applyChoice } from './state.js';

export function kingdomScreen({ container, back, navigate }) {
  let gs = null;
  let tab = 'overview';
  let root;

  const persist = () => saveGame(gs);

  return {
    mount() {
      markRealmPlayed('kingdom');
      if (hasSave()) startMenu();
      else newGameFlow();
    },
    unmount() { clearCheatContext(); if (gs && !gs.gameOver) persist(); },
  };

  function registerCheats() {
    setCheatContext({
      realm: 'kingdom', label: 'Kingdom',
      rerender: () => { persist(); render(); },
      handlers: {
        k_gold: () => { gs.res.gold += 5000; },
        k_resources: () => { for (const r of ['food', 'wood', 'stone', 'iron']) gs.res[r] += 1000; },
        k_population: () => { gs.pop += 500; L.updateTier(gs, gs.log); bumpStat('highestPopulation', gs.pop, 'max'); },
        k_morale: () => { gs.happy = 100; gs.loyalty = 1; gs.crime = 0; },
        k_army: () => { for (const u of ['militia', 'infantry', 'archers', 'cavalry', 'knights']) gs.army[u] = (gs.army[u] || 0) + 50; },
        k_diplomacy: () => { gs.factions.forEach((f) => { f.status = 'ally'; f.relation = 100; }); bus.emit('kingdom:alliance', gs.factions[0]); },
      },
    });
  }

  /* ---------- Start / new game ---------- */
  function startMenu() {
    const existing = loadGame();
    mount(container,
      h('div.screen',
        topBar({ title: '👑 Kingdom', onBack: back }),
        h('div.content-page', h('div.content-inner',
          h('div.cinematic',
            h('div', { style: 'font-size:3rem' }, '👑'),
            h('h1', 'Build Your Own Kingdom'),
            h('p.page-sub', 'From a humble village to an empire that shapes history.'),
          ),
          existing && h('div.panel.ornate', { style: 'margin-bottom:16px' },
            h('div.slot',
              h('div.slot-badge', TIERS[existing.tierIndex]?.icon || '🏚️'),
              h('div.col', { style: 'flex:1;gap:2px' },
                h('strong', existing.name),
                h('div.tiny.muted', `${TIERS[existing.tierIndex]?.name} · Season ${existing.turn} · Pop ${fmt(existing.pop)} · ${fmt(existing.res.gold)} gold`),
              ),
              h('button.btn.primary', { onclick: () => { gs = existing; enterGame(); } }, '▶ Continue'),
            ),
          ),
          h('div.row.wrap.gap-3', { style: 'justify-content:center' },
            h('button.btn', { onclick: () => confirmNew() }, '✦ New Realm'),
            h('button.btn.ghost', { onclick: back }, '‹ Back to Hub'),
          ),
        )),
      ),
    );
  }

  async function confirmNew() {
    if (hasSave() && !(await confirm({ title: 'Abandon current realm?', message: 'Starting a new realm will overwrite your existing kingdom. Continue?', confirmLabel: 'New Realm', danger: true }))) return;
    newGameFlow();
  }

  function newGameFlow() {
    let realmName = '';
    let diff = state.settings.difficulty;
    mount(container,
      h('div.screen',
        topBar({ title: '👑 Found a Realm', onBack: back }),
        h('div.content-page', h('div.content-inner', { style: 'max-width:560px' },
          h('div.panel.panel-pad.ornate',
            h('h2.page-title', { style: 'font-size:1.6rem' }, 'A New Dynasty'),
            h('p.muted', { style: 'margin-bottom:16px' }, 'Name your realm and choose the weight of your burden.'),
            h('label.tiny.upper.faint', 'Realm Name'),
            h('input.text-input', { placeholder: 'e.g. The Golden Reach', maxlength: 28, style: 'margin:6px 0 16px',
              oninput: (e) => { realmName = e.target.value; } }),
            h('label.tiny.upper.faint', 'Difficulty'),
            h('div.seg', { style: 'display:flex;margin:6px 0 20px' },
              ...['easy', 'normal', 'hard'].map((dv) => {
                const b = h('button', { class: diff === dv ? 'active' : '', style: 'flex:1', onclick: () => { diff = dv; [...b.parentNode.children].forEach((c) => c.classList.remove('active')); b.classList.add('active'); sfx('click'); } }, dv);
                return b;
              })),
            h('button.btn.primary.block.lg', { onclick: () => {
              gs = L.newGame({ seed: newSeed(), name: realmName.trim(), difficulty: diff });
              bumpStat('kingdomsFounded');
              saveGame(gs);
              sfx('build');
              enterGame();
            } }, '👑 Take the Throne'),
          ),
        )),
      ),
    );
  }

  /* ---------- Main game ---------- */
  function enterGame() { tab = 'overview'; registerCheats(); render(); }

  function render() {
    if (gs.gameOver) return renderGameOver();
    const prod = L.production(gs);
    const t = TIERS[gs.tierIndex];

    root = h('div.screen',
      // top bar with realm identity + end season
      h('header.topbar',
        h('button.icon-btn', { onclick: () => { persist(); back(); }, 'aria-label': 'Back' }, '‹'),
        h('div.col', { style: 'gap:0' },
          h('div.topbar-title', `${t.icon} ${gs.name}`),
          h('div.tiny.faint', `${t.name} · Season ${gs.turn}`),
        ),
        h('div.grow'),
        h('button.btn.realm', { id: 'end-season', onclick: (e) => endSeason(e) }, '⏭ End Season'),
      ),
      // resource bar
      renderResBar(prod),
      // body
      h('div.mode-body',
        h('div.mode-scroll', h('div.mode-scroll-inner', { id: 'k-content' }, renderTab())),
      ),
      // tabs
      renderTabs(),
    );
    mount(container, root);
    checkMilestones();
  }

  function refreshBody() {
    const c = root.querySelector('#k-content');
    if (c) mount(c, renderTab());
    const rb = root.querySelector('#k-resbar-wrap');
    if (rb) mount(rb, ...renderResBarChildren(L.production(gs)));
  }

  function renderResBar(prod) {
    return h('div.resbar', { id: 'k-resbar-wrap' }, ...renderResBarChildren(prod));
  }
  function renderResBarChildren(prod) {
    const cap = L.popCap(gs);
    return [
      ...Object.entries(RESOURCES).map(([k, r]) =>
        statPill({ icon: r.icon, value: gs.res[k], delta: prod[k], id: `res-${k}` })),
      h('div.divider-v'),
      statPill({ icon: '🧑', value: `${fmt(gs.pop)}/${fmt(cap)}`, label: 'Folk', mono: false }),
      statPill({ icon: '😊', value: Math.round(gs.happy) + '%', label: 'Happy', mono: false }),
      statPill({ icon: '🛡️', value: fmt(L.armyTotal(gs)), label: 'Army', mono: false }),
    ];
  }

  function renderTabs() {
    const tabs = [
      ['overview', '📜', 'Realm'], ['build', '🏗️', 'Build'], ['military', '⚔️', 'Army'],
      ['diplomacy', '🕊️', 'Courts'], ['policy', '⚖️', 'Rule'], ['log', '📖', 'Chronicle'],
    ];
    return h('nav.mode-tabs', ...tabs.map(([id, ico, label]) =>
      h('button.mode-tab', { class: tab === id ? 'active' : '', onclick: () => { tab = id; sfx('click'); refreshBody(); highlightTabs(); } },
        h('span.mt-ico', ico), h('span', label))));
  }
  function highlightTabs() {
    root.querySelectorAll('.mode-tab').forEach((el, i) => {
      const ids = ['overview', 'build', 'military', 'diplomacy', 'policy', 'log'];
      el.classList.toggle('active', ids[i] === tab);
    });
  }

  function renderTab() {
    switch (tab) {
      case 'build': return renderBuild();
      case 'military': return renderMilitary();
      case 'diplomacy': return renderDiplomacy();
      case 'policy': return renderPolicy();
      case 'log': return renderLog();
      default: return renderOverview();
    }
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    const t = TIERS[gs.tierIndex];
    const next = TIERS[gs.tierIndex + 1];
    const prod = L.production(gs);
    return h('div.two-col',
      h('div.col.gap-4',
        h('div.panel.panel-pad.ornate',
          h('div.row', { style: 'justify-content:space-between;align-items:center;margin-bottom:12px' },
            h('h3', `${t.icon} State of the Realm`),
            h('span.tag.gold', t.name),
          ),
          next
            ? meter({ label: `Toward ${next.name} (${fmt(gs.pop)}/${fmt(next.pop)} folk)`, value: gs.pop, max: next.pop, kind: 'realm', showNums: false })
            : h('div.tag.gold', '👑 Empire — the pinnacle of power'),
          h('div', { style: 'height:12px' }),
          h('div.grid.grid-2.gap-2',
            meter({ label: 'Happiness', value: gs.happy, max: 100, kind: 'happy', showNums: false }),
            meter({ label: 'Loyalty', value: gs.loyalty * 100, max: 100, kind: 'realm', showNums: false }),
            meter({ label: 'Order (low crime)', value: (1 - gs.crime) * 100, max: 100, kind: 'stamina', showNums: false }),
            meter({ label: 'Employment', value: Math.min(1, gs.pop / Math.max(1, L.totalJobs(gs))) * 100, max: 100, kind: 'xp', showNums: false }),
          ),
        ),
        h('div.panel.panel-pad',
          h('h3', { style: 'margin-bottom:10px' }, '📈 Season Forecast'),
          h('div.grid.grid-auto.gap-2',
            ...Object.entries(RESOURCES).map(([k, r]) =>
              h('div.stat', h('span.ico', r.icon),
                h('div.col', { style: 'gap:0' },
                  h('span.lbl', r.name),
                  h('span', { class: 'val ' + (prod[k] >= 0 ? '' : ''), style: `color:${prod[k] >= 0 ? 'var(--success)' : 'var(--danger)'}` }, signed(prod[k]) + '/season'),
                )),
            )),
          prod.food < 0 && gs.res.food < gs.pop && h('p.small', { style: 'color:var(--danger);margin-top:10px' }, '⚠️ Food is running out — build Farms or ease rations, or famine will strike.'),
        ),
      ),
      h('div.col.gap-4',
        h('div.panel.panel-pad',
          h('h3', { style: 'margin-bottom:10px' }, '🏛️ Holdings'),
          Object.keys(gs.buildings).length === 0
            ? empty('🏗️', 'No buildings yet.')
            : h('div', ...Object.entries(gs.buildings).filter(([, n]) => n > 0).map(([k, n]) =>
                kv(`${BUILDINGS[k].icon} ${BUILDINGS[k].name}`, `×${n}`))),
        ),
        h('div.panel.panel-pad',
          h('h3', { style: 'margin-bottom:10px' }, '⚡ Quick Actions'),
          h('div.col.gap-2',
            h('button.btn.block', { onclick: () => { tab = 'build'; refreshBody(); highlightTabs(); } }, '🏗️ Construct'),
            h('button.btn.block', { onclick: () => { tab = 'military'; refreshBody(); highlightTabs(); } }, '⚔️ Muster Army'),
            h('button.btn.realm.block', { onclick: (e) => endSeason(e) }, '⏭ End the Season'),
          ),
        ),
      ),
    );
  }

  /* ---------- Build ---------- */
  function renderBuild() {
    const cats = { economy: '💰 Economy', military: '⚔️ Military', civic: '🏛️ Civic' };
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, 'Construct buildings to grow your realm. Costs rise with each copy you own.'),
      ...Object.entries(cats).map(([cat, label]) =>
        h('div', { style: 'margin-bottom:20px' },
          h('h3', { style: 'color:var(--gold-300);margin-bottom:10px' }, label),
          h('div.grid.grid-auto-lg',
            ...Object.entries(BUILDINGS).filter(([, b]) => b.cat === cat).map(([k, b]) => buildCard(k, b))),
        )),
    );
  }

  function buildCard(k, b) {
    const owned = gs.buildings[k] || 0;
    const cost = L.scaledCost(gs, k);
    const affordable = L.canAfford(gs, cost);
    const maxed = b.once && owned >= 1;
    const card = h('div.card',
      h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
        h('div.row.gap-2', h('span', { style: 'font-size:1.4rem' }, b.icon),
          h('div.col', { style: 'gap:0' }, h('strong', b.name), owned > 0 && h('span.tiny.faint', `Owned ×${owned}`))),
      ),
      h('p.tiny.muted', { style: 'margin:8px 0;min-height:32px' }, b.desc),
      h('div.row.wrap.gap-1', { style: 'margin-bottom:10px' },
        ...Object.entries(cost).map(([r, amt]) =>
          h('span.tag', { style: (gs.res[r] || 0) >= amt ? '' : 'color:var(--danger);border-color:var(--blood-600)' }, `${RESOURCES[r].icon} ${amt}`))),
      h('button.btn.sm.block', { class: affordable && !maxed ? 'primary' : '', disabled: !affordable || maxed,
        onclick: (e) => doBuild(k, e) }, maxed ? 'Built' : '🔨 Construct'),
    );
    return card;
  }

  function doBuild(k, e) {
    let res;
    if (cheatFlags.freeBuild) {
      const snap = { ...gs.res };
      for (const r of Object.keys(gs.res)) gs.res[r] += 1e6;
      res = L.build(gs, k);
      gs.res = snap; // fully refund
    } else res = L.build(gs, k);
    if (!res.ok) { toast({ type: 'warning', body: res.msg, sound: 'wrong' }); return; }
    sfx('build'); burstAt(e.target, { color: 'var(--kingdom)', count: 8 });
    awardXp(4, 'construction');
    persist();
    toast({ type: 'success', icon: BUILDINGS[k].icon, body: res.msg });
    refreshBody();
    // codex on first palace/temple etc.
    if (k === 'palace') discover({ id: 'k_palace', category: 'Kingdom', realm: 'kingdom', title: 'The Seat of Power', body: 'A ruler who raises a Palace declares to all the world: this dynasty means to endure. From its halls, loyalty flows and coffers swell.' });
    checkMilestones();
  }

  /* ---------- Military ---------- */
  function renderMilitary() {
    const cap = L.recruitCap(gs);
    const total = L.armyTotal(gs);
    return h('div.two-col.even',
      h('div.col.gap-4',
        h('div.panel.panel-pad',
          h('div.row', { style: 'justify-content:space-between' }, h('h3', '⚔️ Muster Troops'), h('span.tag', `${total}/${cap} capacity`)),
          h('p.tiny.muted', { style: 'margin:8px 0 12px' }, 'Recruit soldiers to defend your realm and wage war. Each unit costs resources and ongoing upkeep.'),
          h('div.col.gap-2',
            ...Object.entries(UNITS).map(([k, u]) => recruitRow(k, u))),
        ),
      ),
      h('div.col.gap-4',
        h('div.panel.panel-pad',
          h('h3', { style: 'margin-bottom:10px' }, '🛡️ Your Host'),
          total === 0 ? empty('🕊️', 'You have no standing army.', 'Recruit troops to defend against raids and rivals.')
            : h('div',
                ...Object.entries(gs.army).filter(([k, n]) => UNITS[k] && n > 0).map(([k, n]) =>
                  kv(`${UNITS[k].icon} ${UNITS[k].name}`, `×${n}`)),
                h('div.divider'),
                kv('Attack Power', fmt(Math.round(L.armyPower(gs, 'atk')))),
                kv('Defense Power', fmt(Math.round(L.armyPower(gs, 'def')))),
                kv('Upkeep / season', `🪙 ${fmt(Math.round(L.armyUpkeep(gs)))} · 🌾 ${fmt(Math.round(L.armyFood(gs)))}`),
              ),
        ),
        h('div.panel.panel-pad',
          h('h3', { style: 'margin-bottom:8px' }, '⚔️ Warfare'),
          h('p.tiny.muted', { style: 'margin-bottom:10px' }, 'March against factions you are at war with from the Courts. A strong army deters invasion.'),
          h('button.btn.block', { onclick: () => { tab = 'diplomacy'; refreshBody(); highlightTabs(); } }, '🕊️ Go to the Courts'),
        ),
      ),
    );
  }

  function recruitRow(k, u) {
    const locked = Object.entries(u.req || {}).some(([bk, need]) => (gs.buildings[bk] || 0) < need);
    const cost = u.cost;
    const can = !locked && L.canAfford(gs, cost) && L.armyTotal(gs) < L.recruitCap(gs);
    return h('div.card', { style: 'padding:12px' },
      h('div.row', { style: 'justify-content:space-between;align-items:center;gap:8px' },
        h('div.row.gap-2', h('span', { style: 'font-size:1.3rem' }, u.icon),
          h('div.col', { style: 'gap:0' },
            h('strong', u.name),
            h('span.tiny.faint', `⚔${u.atk} 🛡${u.def} · ${Object.entries(u.cost).map(([r, a]) => RESOURCES[r].icon + a).join(' ')}`),
          )),
        locked
          ? h('span.tag.danger', 'Locked')
          : h('div.row.gap-1',
              h('button.btn.sm', { disabled: !can, onclick: (e) => doRecruit(k, 1, e) }, '+1'),
              h('button.btn.sm', { disabled: !L.canAfford(gs, Object.fromEntries(Object.entries(cost).map(([r, a]) => [r, a * 5]))) || L.armyTotal(gs) + 5 > L.recruitCap(gs), onclick: (e) => doRecruit(k, 5, e) }, '+5'),
            ),
      ),
      locked && h('div.tiny', { style: 'color:var(--danger);margin-top:6px' }, 'Requires ' + Object.entries(u.req).map(([bk, n]) => `${BUILDINGS[bk].name} ×${n}`).join(', ')),
    );
  }

  function doRecruit(k, n, e) {
    let res;
    if (cheatFlags.freeBuild) {
      const snap = { ...gs.res };
      for (const r of Object.keys(gs.res)) gs.res[r] += 1e6;
      res = L.recruit(gs, k, n);
      gs.res = snap;
    } else res = L.recruit(gs, k, n);
    if (!res.ok) { toast({ type: 'warning', body: res.msg, sound: 'wrong' }); return; }
    sfx('confirm'); burstAt(e.target, { emoji: UNITS[k].icon, count: 5 });
    persist(); refreshBody();
    toast({ icon: UNITS[k].icon, body: res.msg });
  }

  /* ---------- Diplomacy ---------- */
  function renderDiplomacy() {
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, 'The other powers of the world watch your rise. Court them, trade with them — or crush them.'),
      h('div.grid.grid-auto-lg',
        ...gs.factions.map((f) => factionCard(f))),
    );
  }

  function factionCard(f) {
    const rel = f.relation;
    const relColor = rel > 30 ? 'var(--success)' : rel < -20 ? 'var(--danger)' : 'var(--text-dim)';
    const relLabel = f.status === 'war' ? 'AT WAR' : f.status === 'ally' ? 'ALLIED' : f.status === 'trade' ? 'TRADE PACT' : rel > 40 ? 'Friendly' : rel < -20 ? 'Hostile' : 'Neutral';
    return h('div.card', { style: `border-left:3px solid ${f.color}` },
      h('div.row', { style: 'justify-content:space-between;align-items:flex-start' },
        h('div.row.gap-2', h('span', { style: 'font-size:1.4rem' }, f.banner),
          h('div.col', { style: 'gap:0' }, h('strong', f.name), h('span.tiny.faint', f.leader))),
        h('span.tag', { style: `color:${relColor};border-color:${relColor}` }, relLabel),
      ),
      h('p.tiny.muted', { style: 'margin:8px 0' }, f.trait),
      meter({ label: 'Relations', value: rel + 100, max: 200, kind: 'realm', showNums: false, thin: true }),
      h('div.row.wrap.gap-1', { style: 'margin-top:6px' },
        h('span.tag', `⚔️ Str ${Math.round(f.strength)}`),
        h('span.tag', `💰 Eco ${Math.round(f.economy)}`),
      ),
      h('div.divider', { style: 'margin:10px 0' }),
      h('div.row.wrap.gap-1',
        f.status === 'war'
          ? h('button.btn.sm.danger', { onclick: (e) => attackFaction(f, e) }, '⚔️ March to War')
          : [
              h('button.btn.sm', { onclick: () => giftFaction(f) }, '🎁 Gift 50g'),
              h('button.btn.sm', { onclick: () => tradeFaction(f) }, '⚖️ Trade'),
              h('button.btn.sm', { disabled: f.status === 'ally' || f.relation < 30, onclick: () => allyFaction(f) }, '🤝 Alliance'),
              h('button.btn.sm.ghost', { onclick: () => threatenFaction(f) }, '💢 Threaten'),
            ],
        f.status === 'war' && h('button.btn.sm.ghost', { onclick: () => suePeace(f) }, '🕊️ Sue for Peace'),
      ),
    );
  }

  function giftFaction(f) {
    if (gs.res.gold < 50) { toast({ type: 'warning', body: 'Not enough gold.', sound: 'wrong' }); return; }
    gs.res.gold -= 50; L.adjustRelation(f, 14); sfx('coin');
    toast({ icon: '🎁', body: `${f.leader} accepts your gift. Relations improve.` });
    persist(); refreshBody();
  }
  function tradeFaction(f) {
    if (f.status === 'trade') { toast({ body: 'A trade pact already stands.' }); return; }
    if (f.relation < 0) { toast({ type: 'warning', body: `${f.leader} refuses to trade with a rival.`, sound: 'wrong' }); return; }
    f.status = 'trade'; L.adjustRelation(f, 8);
    gs.flags['trade_' + f.id] = true;
    toast({ type: 'success', icon: '⚖️', body: `Trade pact signed with ${f.name}. Extra gold each season.` });
    sfx('confirm'); persist(); refreshBody();
  }
  function allyFaction(f) {
    const chance = 0.2 + f.relation / 130;
    const rng = new RNG((gs.seed ^ gs.turn ^ f.id.charCodeAt(1)) >>> 0);
    if (rng.next() < chance) {
      f.status = 'ally'; L.adjustRelation(f, 20);
      bus.emit('kingdom:alliance', f);
      toast({ type: 'success', icon: '🤝', body: `${f.name} stands with you! An alliance is forged.`, sound: 'levelup' });
      awardXp(10, 'alliance');
      discover({ id: 'k_ally_' + f.id, category: 'Factions', realm: 'kingdom', title: f.name, body: `${f.trait} Led by ${f.leader}. Bound to your realm in alliance.` });
    } else {
      L.adjustRelation(f, -6);
      toast({ type: 'warning', body: `${f.leader} declines — for now. Raise relations further.`, sound: 'wrong' });
    }
    persist(); refreshBody();
  }
  function threatenFaction(f) {
    const myPower = L.armyPower(gs) / 4;
    if (myPower > f.strength) { L.adjustRelation(f, -10); f.strength = Math.max(20, f.strength - 5); toast({ icon: '💢', body: `${f.leader} yields to your show of force, but resents it.` }); }
    else { L.adjustRelation(f, -18); toast({ type: 'warning', body: `${f.leader} scoffs at your weak threat. Relations sour.`, sound: 'wrong' }); }
    sfx('back'); persist(); refreshBody();
  }
  function suePeace(f) {
    const cost = Math.round(f.strength * 2);
    if (gs.res.gold < cost) { toast({ type: 'warning', body: `Peace demands ${cost} gold in tribute — you cannot pay.`, sound: 'wrong' }); return; }
    gs.res.gold -= cost; f.status = 'neutral'; L.adjustRelation(f, 15);
    toast({ type: 'success', icon: '🕊️', body: `Peace bought with ${cost} gold. The war ends.` });
    persist(); refreshBody();
  }
  async function attackFaction(f, e) {
    if (L.armyTotal(gs) === 0) { toast({ type: 'warning', body: 'You have no army to march.', sound: 'wrong' }); return; }
    const rng = new RNG((gs.seed ^ (gs.turn * 7919) ^ f.strength) >>> 0);
    const res = L.resolveBattle(gs, f.strength, rng, { defending: false });
    shake(); sfx(res.win ? 'victory' : 'hurt');
    if (res.win) {
      f.strength = Math.max(15, f.strength - 20);
      L.adjustRelation(f, -5);
      burstAt(e.target, { color: 'var(--success)', count: 16 });
      if (f.strength <= 18) {
        f.status = 'neutral'; f.relation = 0;
        gs.stats.warsWon++; bumpStat('warsWon');
        bus.emit('kingdom:warWon', f);
        awardXp(30, 'war won');
        toast({ type: 'success', icon: '👑', title: 'Victory!', body: `${f.name} is broken and sues for peace! You have won the war.`, sound: 'victory' });
      } else {
        toast({ type: 'success', icon: '⚔️', body: `Victory on the field! You took ${res.gold} gold. ${f.name}'s strength wanes.` });
      }
    } else {
      L.adjustRelation(f, -8);
      toast({ type: 'danger', icon: '💀', body: `Your assault was thrown back with heavy losses. Regroup and rebuild.`, sound: 'death' });
    }
    persist(); refreshBody();
  }

  /* ---------- Policy ---------- */
  function renderPolicy() {
    return h('div',
      h('p.muted.small', { style: 'margin-bottom:12px' }, 'Set the laws of your realm. Every policy has a price — gold, happiness, or loyalty.'),
      h('div.grid.grid-auto-lg',
        ...Object.entries(POLICIES).map(([pk, pol]) =>
          h('div.panel.panel-pad',
            h('h3', { style: 'margin-bottom:4px' }, `${pol.icon} ${pol.label}`),
            h('div.col.gap-2', { style: 'margin-top:8px' },
              ...pol.options.map((o) => {
                const active = gs.policies[pk] === o.id;
                return h('button.choice', { class: active ? 'selected' : '', style: active ? 'border-left-color:var(--realm);background:var(--surface-raised)' : '',
                  onclick: () => { gs.policies[pk] = o.id; sfx('click'); persist(); refreshBody();
                    toast({ icon: pol.icon, body: `${pol.label}: ${o.name} enacted.` }); } },
                  h('div.row', { style: 'justify-content:space-between' }, h('span.c-label', o.name), active && h('span.tag.gold', 'Active')),
                  h('div.c-hint', o.desc));
              })),
          ))),
    );
  }

  /* ---------- Log / Chronicle ---------- */
  function renderLog() {
    return h('div.panel.panel-pad',
      h('h3', { style: 'margin-bottom:12px' }, '📖 Chronicle of ' + gs.name),
      h('div.log',
        ...[...gs.log].reverse().slice(0, 60).map((e) =>
          h(`div.log-entry.${e.kind || 'default'}`, h('span.lt', 'S' + e.turn), e.text))),
    );
  }

  /* ---------- End season ---------- */
  function endSeason(e) {
    if (gs.pendingEvent) { showEvent(gs.pendingEvent); return; }
    const rng = new RNG((gs.seed ^ (gs.turn * 40503)) >>> 0);
    const { logs, tierUp } = L.endTurn(gs, rng);
    logs.forEach((l) => pushLog(l));
    if (cheatFlags.godMode && gs.gameOver && !gs.gameOver.won) { gs.gameOver = null; gs.happy = Math.max(gs.happy, 50); gs.pop = Math.max(gs.pop, 60); }
    sfx('paper');
    if (e?.target) burstAt(e.target, { color: 'var(--kingdom)', count: 6 });

    // Emit tracking events
    bus.emit('kingdom:population', gs.pop);
    bus.emit('kingdom:gold', gs.res.gold);
    if (tierUp) { bus.emit('kingdom:tier', { tierIndex: gs.tierIndex, tierName: TIERS[gs.tierIndex].name }); bumpStat('highestTier', gs.tierIndex, 'max'); sfx('levelup'); }
    bumpStat('highestPopulation', gs.pop, 'max');
    awardXp(3, 'season');

    if (gs.gameOver) { persist(); render(); return; }

    // Roll an event
    const event = rollEvent(gs, rng);
    persist();
    render();
    if (event) { gs.pendingEvent = event; setTimeout(() => showEvent(event), 350); }
  }

  function pushLog(l) { gs.log.push({ turn: gs.turn, text: l.text, kind: l.kind }); if (gs.log.length > 200) gs.log.shift(); }

  function showEvent(event) {
    const rendered = typeof event.build === 'function' ? event : event;
    modal({
      title: rendered.title,
      dismissable: false,
      body: (close) => h('div',
        h('p.serif', { style: 'font-size:1.1rem;line-height:1.6;color:var(--text-dim);margin-bottom:16px' }, rendered.text),
        h('div.col.gap-2',
          ...rendered.choices.map((c) => {
            const affordable = (!c.cost || L.canAfford(gs, c.cost)) && (!c.req || c.req(gs));
            return h('button.choice', { disabled: !affordable,
              onclick: () => {
                const msg = applyChoice(gs, rendered, c);
                pushLog({ turn: gs.turn, text: `[${rendered.title.replace(/^[^ ]+ /, '')}] ${msg}`, kind: 'default' });
                sfx('confirm');
                close();
                persist(); render();
                if (msg) toast({ body: msg, duration: 4500 });
              } },
              h('div.row', { style: 'justify-content:space-between;gap:10px' },
                h('div.grow', h('div.c-label', c.label), c.hint && h('div.c-hint', c.hint)),
                c.cost && h('div.c-cost', Object.entries(c.cost).map(([r, a]) => `${RESOURCES[r].icon}${a}`).join(' ')),
              ),
              !affordable && c.req && h('div.tiny', { style: 'color:var(--danger);margin-top:4px' }, 'Requirements not met'));
          })),
      ),
    });
  }

  /* ---------- Game over ---------- */
  function renderGameOver() {
    const won = gs.gameOver.won;
    sfx(won ? 'victory' : 'death');
    mount(container,
      h('div.screen',
        h('div.content-page', h('div.content-inner',
          h('div.cinematic',
            h('div', { style: 'font-size:3.4rem' }, won ? '👑' : '🥀'),
            h('h1', { style: `color:${won ? 'var(--gold-300)' : 'var(--blood-400)'}` }, won ? 'AN EMPIRE ETERNAL' : 'THE REALM HAS FALLEN'),
            h('p.page-sub', gs.gameOver.reason),
            h('div.panel.panel-pad', { style: 'max-width:420px;margin:20px auto;text-align:left' },
              kv('Realm', gs.name),
              kv('Final Tier', TIERS[gs.tierIndex].name),
              kv('Seasons Ruled', gs.stats.seasonsRuled),
              kv('Peak Population', fmt(gs.pop)),
              kv('Wars Won', gs.stats.warsWon),
              kv('Buildings Raised', gs.stats.built),
            ),
            h('div.row.gap-3', { style: 'justify-content:center;margin-top:16px' },
              h('button.btn.primary', { onclick: () => { deleteSave(); newGameFlow(); } }, '✦ Found a New Realm'),
              h('button.btn.ghost', { onclick: () => { deleteSave(); back(); } }, '‹ Return to Hub'),
            ),
          ),
        )),
      ),
    );
    deleteSave();
  }

  /* ---------- Milestones ---------- */
  function checkMilestones() {
    bus.emit('kingdom:population', gs.pop);
    bus.emit('kingdom:gold', gs.res.gold);
    if (gs.tierIndex >= 3) bus.emit('kingdom:tier', { tierIndex: gs.tierIndex, tierName: TIERS[gs.tierIndex].name });
  }
}
