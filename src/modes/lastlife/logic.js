/* ============================================================
   LAST LIFE — roguelike logic. Deterministic per seed.
   Permadeath is enforced: a dead run cannot be revived, only
   ended. Meta-progression grants NEW runs advantages, never
   resurrection.
   ============================================================ */
import { RNG, clamp } from '../../engine/rng.js';
import { CLASSES, WEAPONS, ABILITIES, REGIONS, ENEMIES, EVENTS, BACKGROUNDS } from './data.js';

const ENCOUNTERS_PER_REGION = 4;

/* ---------------- Run creation ---------------- */
export function newRun({ seed, classId, meta = {} }) {
  const rng = new RNG(seed);
  const cls = CLASSES.find((c) => c.id === classId) || CLASSES[0];
  const boons = meta.boons || {};
  const bonusHp = boons.boon_veteran ? 15 : 0;
  const run = {
    v: 1, seed, classId: cls.id, className: cls.name, icon: cls.icon,
    background: rng.pick(BACKGROUNDS),
    stats: { atk: cls.stats.atk, def: cls.stats.def, luck: cls.stats.luck },
    maxHp: cls.stats.hp + bonusHp,
    hp: cls.stats.hp + bonusHp,
    hunger: 0,
    gold: 10 + (boons.boon_coin ? 25 : 0),
    food: 2 + (boons.boon_rations ? 2 : 0),
    potions: 1 + (boons.boon_medkit ? 1 : 0),
    weapon: cls.weapon,
    ability: cls.ability,
    abilityUsedRun: false,
    regionIndex: 0,
    encountersCleared: 0,
    encountersInRegion: 0,
    day: 1,
    kills: 0,
    discoveries: 0,
    bossesDown: 0,
    decisions: [],
    statuses: [], // {type, turns, mag}
    alive: true,
    won: false,
    cause: null,
    currentEncounter: null,
    log: [{ text: `You set out as ${cls.name} — ${rng.pick(BACKGROUNDS)}. One life. No second chance.`, kind: 'epic' }],
    createdAt: Date.now(),
    fragmentsEarned: 0,
  };
  run.background = run.log[0].text.match(/— (.+?)\./)?.[1] || run.background;
  return run;
}

export function weaponOf(run) { return WEAPONS[run.weapon]; }
export function abilityOf(run) { return ABILITIES[run.ability]; }
export function currentRegion(run) { return REGIONS[run.regionIndex]; }
export function attackDamage(run) { return run.stats.atk + weaponOf(run).dmg; }

/* ---------------- Encounter generation ---------------- */
/** Generate the next encounter deterministically from run progress. */
export function generateEncounter(run) {
  const rng = new RNG((run.seed ^ (run.day * 2654435761) ^ (run.encountersCleared * 40503)) >>> 0);
  const region = currentRegion(run);
  // Boss appears once the region's encounters are cleared.
  if (run.encountersInRegion >= ENCOUNTERS_PER_REGION) {
    return { kind: 'boss', enemyKey: region.boss, region: region.id };
  }
  const roll = rng.next();
  if (roll < 0.42) return { kind: 'combat', enemyKey: rng.pick(region.enemies), region: region.id };
  if (roll < 0.64) return { kind: 'event', event: rng.pick(EVENTS), region: region.id };
  if (roll < 0.78) return { kind: 'merchant', region: region.id, stock: rollMerchant(run, rng) };
  if (roll < 0.9) return { kind: 'camp', region: region.id };
  return { kind: 'ruins', region: region.id };
}

function rollMerchant(run, rng) {
  const stock = [];
  stock.push({ id: 'food', name: 'Rations', icon: '🍖', price: 12, effect: 'food' });
  stock.push({ id: 'potion', name: 'Healing Potion', icon: '🧪', price: 25, effect: 'potion' });
  // A weapon upgrade sometimes
  const upgrades = ['woodaxe', 'spear', 'warhammer', 'runeblade', 'dragonfang'];
  const tier = clamp(run.regionIndex, 0, upgrades.length - 1);
  if (rng.chance(0.7)) {
    const wkey = upgrades[clamp(tier + rng.int(0, 1), 0, upgrades.length - 1)];
    stock.push({ id: 'weapon:' + wkey, name: WEAPONS[wkey].name, icon: WEAPONS[wkey].icon, price: 30 + WEAPONS[wkey].dmg * 5, effect: 'weapon', ref: wkey, dmg: WEAPONS[wkey].dmg });
  }
  return stock;
}

/** Advance to a new encounter (travel). Applies hunger & day. */
export function travel(run) {
  if (!run.alive) return run;
  run.day++;
  run.encountersCleared++;
  // Hunger climbs; Revenant hungers faster.
  const hungerRate = run.classId === 'revenant' ? 12 : 9;
  run.hunger = clamp(run.hunger + hungerRate, 0, 100);
  // Status ticks
  tickStatuses(run);
  // Starvation
  if (run.hunger >= 100) {
    const dmg = 8;
    run.hp -= dmg;
    run.log.push({ text: `You are starving! You lose ${dmg} HP. Find food.`, kind: 'bad' });
    if (run.hp <= 0) return die(run, 'starvation');
  }
  run.currentEncounter = generateEncounter(run);
  return run;
}

function tickStatuses(run) {
  for (const st of run.statuses) {
    if (st.type === 'poison') { run.hp -= st.mag; run.log.push({ text: `Poison courses through you (−${st.mag} HP).`, kind: 'bad' }); }
    st.turns--;
  }
  run.statuses = run.statuses.filter((s) => s.turns > 0);
  if (run.hp <= 0) die(run, 'poison');
}

export function eat(run) {
  if (run.food <= 0) return false;
  run.food--;
  run.hunger = clamp(run.hunger - 45, 0, 100);
  run.log.push({ text: 'You eat. The gnawing hunger fades.', kind: 'good' });
  return true;
}

export function drinkPotion(run) {
  if (run.potions <= 0) return false;
  run.potions--;
  const heal = Math.round(run.maxHp * 0.45);
  run.hp = Math.min(run.maxHp, run.hp + heal);
  run.log.push({ text: `You drink a potion (+${heal} HP).`, kind: 'good' });
  return heal;
}

/* ---------------- Combat ---------------- */
export function startCombat(run, enemyKey, isBoss = false) {
  const tpl = ENEMIES[enemyKey];
  const scale = 1 + run.regionIndex * 0.06;
  return {
    rng: new RNG((run.seed ^ (run.day * 7919) ^ enemyKey.charCodeAt(0)) >>> 0),
    enemyKey, isBoss: isBoss || tpl.boss,
    enemy: { ...tpl, maxHp: Math.round(tpl.hp * scale), hp: Math.round(tpl.hp * scale) },
    turn: 0, firstStrikeUsed: false, trapSenseUsed: false, secondWindUsed: false,
    defending: false, over: false, result: null, log: [{ text: `A ${tpl.name} attacks!`, kind: 'enemy' }],
  };
}

export function combatAction(run, combat, action) {
  if (combat.over) return combat;
  const log = [];
  const ab = run.ability;
  combat.defending = false;

  if (action === 'attack' || action === 'heavy') {
    let dmg = attackDamage(run);
    if (action === 'heavy') dmg = Math.round(dmg * 1.7);
    // First Strike ability
    if (ab === 'firststrike' && !combat.firstStrikeUsed) { dmg *= 2; combat.firstStrikeUsed = true; log.push({ text: 'First Strike! Double damage.', kind: 'crit' }); }
    const variance = 0.85 + combat.rng.next() * 0.35;
    let real = Math.max(1, Math.round(dmg * variance) - Math.floor(combat.enemy.def * 0.5));
    if (action === 'heavy' && combat.rng.next() < 0.15) { real = 0; log.push({ text: 'Your heavy blow misses!', kind: 'miss' }); }
    combat.enemy.hp = Math.max(0, combat.enemy.hp - real);
    if (real > 0) log.push({ text: `You strike the ${combat.enemy.name} for ${real}.`, kind: 'player' });
    // Life Drain
    if (ab === 'lifedrain' && real > 0) { const h = Math.round(real * 0.25); run.hp = Math.min(run.maxHp, run.hp + h); log.push({ text: `Life Drain restores ${h} HP.`, kind: 'good' }); }
  } else if (action === 'defend') {
    combat.defending = true;
    log.push({ text: 'You brace behind your guard.', kind: 'player' });
  } else if (action === 'potion') {
    if (run.potions <= 0) { log.push({ text: 'No potions left!', kind: 'warn' }); combat.log.push(...log); return combat; }
    const heal = drinkPotion(run);
    log.push({ text: `You drink a potion (+${heal} HP).`, kind: 'good' });
  }

  combat.log.push(...log);

  if (combat.enemy.hp <= 0) { winCombat(run, combat); return combat; }

  enemyStrike(run, combat);
  combat.turn++;
  return combat;
}

export function combatFlee(run, combat) {
  if (combat.isBoss) { combat.log.push({ text: 'The boss blocks all escape!', kind: 'warn' }); return combat; }
  const chance = 0.4 + run.stats.luck * 0.02;
  if (combat.rng.next() < chance) { combat.over = true; combat.result = 'flee'; combat.log.push({ text: 'You escape into the wilds.', kind: 'player' }); }
  else { combat.log.push({ text: 'You stumble — no escape!', kind: 'warn' }); enemyStrike(run, combat); }
  return combat;
}

function enemyStrike(run, combat) {
  const e = combat.enemy;
  if (e.hp <= 0) return;
  // Trap Sense: dodge first enemy hit
  if (run.ability === 'trapsense' && !combat.trapSenseUsed) { combat.trapSenseUsed = true; combat.log.push({ text: `Trap Sense! You slip aside from the ${e.name}'s first blow.`, kind: 'good' }); return; }
  const heavy = combat.rng.next() < (combat.isBoss ? 0.3 : 0.18);
  let dmg = Math.round(e.atk * (heavy ? 1.6 : 0.9 + combat.rng.next() * 0.3));
  dmg = Math.max(1, dmg - Math.floor(run.stats.def * 0.6));
  if (combat.defending) dmg = Math.round(dmg * 0.4);
  if (run.ability === 'ironhide') dmg = Math.round(dmg * 0.7);
  run.hp -= dmg;
  combat.log.push({ text: `${e.name} ${heavy ? 'lands a savage hit' : 'hits you'} for ${dmg}.`, kind: 'enemy' });

  // Second Wind
  if (run.ability === 'secondwind' && !combat.secondWindUsed && run.hp > 0 && run.hp < run.maxHp / 3) {
    combat.secondWindUsed = true; const h = Math.round(run.maxHp * 0.25); run.hp = Math.min(run.maxHp, run.hp + h);
    combat.log.push({ text: `Second Wind! You rally and recover ${h} HP.`, kind: 'crit' });
  }

  if (run.hp <= 0) {
    // Undying: cheat death once
    if (run.ability === 'undying' && !run.abilityUsedRun) {
      run.abilityUsedRun = true; run.hp = 1;
      combat.log.push({ text: 'UNDYING! You should be dead — yet you rise at 1 HP.', kind: 'crit' });
    } else {
      combat.over = true; combat.result = 'lose';
      combat.log.push({ text: `The ${e.name} strikes you down…`, kind: 'enemy' });
    }
  }
}

function winCombat(run, combat) {
  combat.over = true; combat.result = 'win';
  run.kills++;
  const e = combat.enemy;
  const gold = combat.rng.int(6, 16) + run.regionIndex * 4 + Math.round(run.stats.luck * 0.5);
  run.gold += gold;
  combat.reward = { gold, loot: null };
  combat.log.push({ text: `You slay the ${e.name}! +${gold} gold.`, kind: 'good' });
  // Loot chance influenced by luck
  if (combat.rng.next() < 0.2 + run.stats.luck * 0.02) {
    const roll = combat.rng.next();
    if (roll < 0.5) { run.food++; combat.reward.loot = '🍖 Rations'; }
    else if (roll < 0.8) { run.potions++; combat.reward.loot = '🧪 Potion'; }
    else { combat.reward.loot = 'gold'; run.gold += 20; }
    if (combat.reward.loot) combat.log.push({ text: `You loot ${combat.reward.loot === 'gold' ? '20 extra gold' : combat.reward.loot}.`, kind: 'good' });
  }
  if (combat.isBoss) { run.bossesDown++; }
}

/* ---------------- Events ---------------- */
export function resolveEvent(run, event, optionIndex) {
  const opt = event.options[optionIndex];
  const rng = new RNG((run.seed ^ (run.day * 131071) ^ optionIndex ^ event.id.charCodeAt(0)) >>> 0);
  if (opt.cost) {
    for (const [k, v] of Object.entries(opt.cost)) { if ((run[k] || 0) < v) return { text: 'You cannot afford that.', fail: true }; run[k] -= v; }
  }
  const outcome = rng.weighted(opt.outcomes.map((o) => ({ item: o, weight: o.w })));
  run.decisions.push({ day: run.day, event: event.title, choice: opt.label });
  return applyOutcome(run, outcome, rng, event);
}

function applyOutcome(run, o, rng, event) {
  switch (o.type) {
    case 'loot': { const g = Math.round((15 + rng.int(0, 25)) * o.mag); run.gold += g; run.discoveries++; return { text: `You find ${g} gold worth of plunder!`, kind: 'good' }; }
    case 'gold': { run.gold += o.mag; return { text: `+${o.mag} gold.`, kind: 'good' }; }
    case 'ally_gold': { run.gold += o.mag; return { text: `The stranger rewards your kindness with ${o.mag} gold and a blessing.`, kind: 'good' }; }
    case 'damage': { run.hp -= o.mag; if (run.hp <= 0) die(run, event.id); return { text: `A trap! You take ${o.mag} damage.`, kind: 'bad' }; }
    case 'hunger': { run.hunger = clamp(run.hunger + o.mag, 0, 100); return { text: `The detour costs you — hunger rises.`, kind: 'bad' }; }
    case 'heal': { run.hp = Math.min(run.maxHp, run.hp + o.mag); return { text: `A warmth restores ${o.mag} HP.`, kind: 'good' }; }
    case 'food': { run.hunger = clamp(run.hunger - o.mag, 0, 100); return { text: `You eat your fill. Hunger fades.`, kind: 'good' }; }
    case 'supplies': { run.food += o.mag; return { text: `You gather ${o.mag} rations.`, kind: 'good' }; }
    case 'poison': { run.statuses.push({ type: 'poison', turns: 3, mag: o.mag / 3 }); run.hp -= o.mag; if (run.hp <= 0) die(run, 'poison'); return { text: `Poison! You take ${o.mag} damage and feel ill.`, kind: 'bad' }; }
    case 'curse': { run.hp -= o.mag; run.statuses.push({ type: 'curse', turns: 4, mag: 0 }); if (run.hp <= 0) die(run, event.id); return { text: `A curse settles over you (−${o.mag} HP).`, kind: 'bad' }; }
    case 'blessing': { run.stats.luck += 2; run.discoveries++; return { text: `A blessing! Your fortune (luck) grows.`, kind: 'good' }; }
    case 'ambush': return { text: 'It was a trap — bandits close in!', kind: 'bad', fight: true };
    case 'fight': return { text: 'You are forced into a fight!', kind: 'bad', fight: true };
    default: return { text: 'Nothing comes of it. You press on.', kind: 'default' };
  }
}

/* ---------------- Region / progression ---------------- */
export function clearEncounter(run) {
  run.encountersInRegion++;
  run.currentEncounter = null;
}

export function afterBoss(run) {
  run.encountersInRegion = 0;
  const frag = 8 + run.regionIndex * 4;
  run.fragmentsEarned += frag;
  if (run.regionIndex >= REGIONS.length - 1) { run.won = true; run.alive = true; return { won: true, frag }; }
  run.regionIndex++;
  run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3)); // survive-the-boss reward
  return { won: false, frag };
}

/* ---------------- Death (permadeath) ---------------- */
export function die(run, cause) {
  if (!run.alive) return run;
  run.alive = false;
  run.cause = cause;
  run.hp = 0;
  run.log.push({ text: 'Your story ends here.', kind: 'epic' });
  return run;
}

/** Fragments awarded at end of run (for meta-progression). */
export function runFragments(run) {
  let f = run.fragmentsEarned;
  f += run.kills * 1;
  f += run.day * 1;
  f += run.discoveries * 2;
  if (run.won) f += 50;
  return Math.round(f);
}

export const _ENCOUNTERS_PER_REGION = ENCOUNTERS_PER_REGION;
