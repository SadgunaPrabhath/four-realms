/* ============================================================
   MYTHOS — deterministic RPG logic.
   Character, combat engine, progression, quests. Pure functions.
   ============================================================ */
import { RNG, clamp } from '../../engine/rng.js';
import { CLASSES, WEAPONS, ENEMIES, REGIONS, COMPANIONS, ASTRA_IDS, STATS } from './data.js';

/* ---------------- Character ---------------- */
export function newHero({ seed, name, classId }) {
  const cls = CLASSES.find((c) => c.id === classId) || CLASSES[0];
  const hero = {
    v: 1, seed, name: name || 'Aranya',
    classId: cls.id, className: cls.name,
    level: 1, xp: 0,
    stats: { ...cls.stats },
    statPoints: 0,
    skills: { swordsmanship: 1, archery: 1, spear: 1, defense: 1, meditation: 1, tactics: 1 },
    weapons: [cls.weapon],
    equipped: cls.weapon,
    astras: [],
    inventory: { potion: 3, elixir: 0 },
    gold: 25,
    hp: 0, maxHp: 0, stamina: 0, maxStamina: 0,
    companions: [],
    regionIndex: 0,
    clearedBosses: [],
    completedQuests: [],
    questProgress: {},
    createdAt: Date.now(),
    kills: 0,
  };
  recalc(hero);
  hero.hp = hero.maxHp; hero.stamina = hero.maxStamina;
  return hero;
}

/** Recalculate derived stats. */
export function recalc(hero) {
  const s = hero.stats;
  hero.maxHp = 40 + s.vit * 9 + hero.level * 6;
  hero.maxStamina = 8 + Math.floor(s.wis * 1.5) + Math.floor(hero.level / 2);
  hero.hp = Math.min(hero.hp || hero.maxHp, hero.maxHp);
  hero.stamina = Math.min(hero.stamina ?? hero.maxStamina, hero.maxStamina);
}

export function weaponOf(hero) { return WEAPONS[hero.equipped]; }

export function baseDamage(hero) {
  const w = weaponOf(hero);
  const s = hero.stats;
  const skillBonus = w.type === 'bow' ? hero.skills.archery : w.type === 'staff' || w.type === 'astra' ? hero.skills.meditation : hero.skills.swordsmanship;
  let dmg = w.dmg + s.str * 0.9 + s.int * (w.element ? 0.8 : 0.2) + s.agi * 0.3 + skillBonus * 1.2;
  return Math.round(dmg);
}

export function dodgeChance(hero) { return clamp(0.05 + hero.stats.agi * 0.02 + hero.skills.defense * 0.01, 0, 0.55); }

/* ---------------- Progression ---------------- */
export function xpToNext(level) { return 40 + level * 35; }

export function gainXp(hero, amount) {
  hero.xp += amount;
  let leveled = 0;
  while (hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    hero.level++;
    hero.statPoints += 3;
    leveled++;
  }
  if (leveled) { recalc(hero); hero.hp = hero.maxHp; hero.stamina = hero.maxStamina; }
  return leveled;
}

export function spendStatPoint(hero, stat) {
  if (hero.statPoints <= 0 || !(stat in hero.stats)) return false;
  hero.stats[stat]++;
  hero.statPoints--;
  recalc(hero);
  return true;
}

export function trainSkill(hero, skill, cost) {
  if (hero.gold < cost || !(skill in hero.skills)) return false;
  hero.gold -= cost;
  hero.skills[skill]++;
  return true;
}

/* ---------------- Combat ---------------- */
/**
 * Begin a combat. Returns a combat object (mutated by actions).
 * enemyKey: an ENEMIES id. opts.hpMult scales a bounty target.
 */
export function startCombat(hero, enemyKey, { seed, hpMult = 1, isBoss = false } = {}) {
  const tpl = ENEMIES[enemyKey];
  const rng = new RNG(seed ?? (hero.seed ^ Date.now()));
  return {
    rng,
    enemyKey,
    enemy: {
      ...tpl,
      key: enemyKey,
      maxHp: Math.round(tpl.hp * hpMult),
      hp: Math.round(tpl.hp * hpMult),
    },
    isBoss: isBoss || tpl.boss,
    turn: 0,
    blocking: false,
    log: [{ text: tpl.intro || `A ${tpl.name} blocks your path!`, kind: 'enemy' }],
    over: false,
    result: null, // 'win' | 'lose' | 'flee'
    rewards: null,
  };
}

/** Apply elemental weakness multiplier. */
function elementMult(combat, element) {
  if (element && combat.enemy.weak === element) return 1.5;
  return 1;
}

/** Companion assist damage applied each player action. */
function companionDamage(hero, combat) {
  let dmg = 0, heal = 0;
  for (const cid of hero.companions) {
    const c = COMPANIONS[cid];
    if (c.dmg) dmg += Math.round(c.dmg * (0.7 + combat.rng.next() * 0.6));
    if (c.heal) heal += c.heal;
  }
  return { dmg, heal };
}

/** Player performs an action: 'light' | 'heavy' | 'special' | 'block' | 'dodge' | 'potion'. */
export function playerAction(hero, combat, action) {
  if (combat.over) return combat;
  const log = [];
  const w = weaponOf(hero);
  let skipEnemy = false;
  combat.blocking = false;
  hero._dodging = false;

  if (action === 'light') {
    const dmg = Math.round(baseDamage(hero) * (0.85 + combat.rng.next() * 0.35));
    const total = applyToEnemy(combat, dmg, w.element, log, 'strike');
    hero.stamina = Math.min(hero.maxStamina, hero.stamina + 1);
  } else if (action === 'heavy') {
    if (hero.stamina < 2) { log.push({ text: 'Too exhausted for a heavy blow!', kind: 'warn' }); combat.log.push(...log); return combat; }
    hero.stamina -= 2;
    const miss = combat.rng.next() < 0.12;
    if (miss) log.push({ text: 'Your heavy strike swings wide!', kind: 'miss' });
    else { const dmg = Math.round(baseDamage(hero) * (1.5 + combat.rng.next() * 0.4)); applyToEnemy(combat, dmg, w.element, log, 'heavy'); }
  } else if (action === 'special') {
    const ab = w.ability;
    if (hero.stamina < ab.stam) { log.push({ text: 'Not enough stamina for ' + ab.name + '!', kind: 'warn' }); combat.log.push(...log); return combat; }
    hero.stamina -= ab.stam;
    const hits = ab.hits || 1;
    for (let i = 0; i < hits; i++) {
      const dmg = Math.round(baseDamage(hero) * ab.mult * (0.9 + combat.rng.next() * 0.2) / (hits > 1 ? 1.4 : 1));
      applyToEnemy(combat, dmg, ab.element || w.element, log, 'astra', ab.name);
      if (combat.enemy.hp <= 0) break;
    }
  } else if (action === 'block') {
    combat.blocking = true;
    hero.stamina = Math.min(hero.maxStamina, hero.stamina + 3);
    log.push({ text: 'You raise your guard, bracing for the blow.', kind: 'player' });
  } else if (action === 'dodge') {
    if (hero.stamina < 1) { log.push({ text: 'Too tired to dodge!', kind: 'warn' }); combat.log.push(...log); return combat; }
    hero.stamina -= 1;
    hero._dodging = true;
    log.push({ text: 'You ready yourself to slip aside.', kind: 'player' });
  } else if (action === 'potion') {
    if (hero.inventory.potion <= 0) { log.push({ text: 'No potions left!', kind: 'warn' }); combat.log.push(...log); return combat; }
    hero.inventory.potion--;
    const heal = 35 + hero.stats.vit * 2;
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    log.push({ text: `You drink a healing draught. +${heal} HP.`, kind: 'good' });
  }

  // Companion assist (not on pure defensive turns doing nothing else — allow always for offense)
  if (['light', 'heavy', 'special'].includes(action) && combat.enemy.hp > 0) {
    const { dmg, heal } = companionDamage(hero, combat);
    if (dmg > 0) { combat.enemy.hp = Math.max(0, combat.enemy.hp - dmg); log.push({ text: `Your companions strike for ${dmg}!`, kind: 'ally' }); }
    if (heal > 0 && hero.hp < hero.maxHp) { hero.hp = Math.min(hero.maxHp, hero.hp + heal); log.push({ text: `Ravan's chant mends ${heal} of your wounds.`, kind: 'good' }); }
  }

  combat.log.push(...log);

  // Check enemy death
  if (combat.enemy.hp <= 0) { winCombat(hero, combat); return combat; }

  // Enemy turn
  enemyTurn(hero, combat);
  combat.turn++;
  // passive stamina regen
  hero.stamina = Math.min(hero.maxStamina, hero.stamina + 1);
  return combat;
}

function applyToEnemy(combat, rawDmg, element, log, kind, abilityName) {
  const mult = elementMult(combat, element);
  const dmg = Math.max(1, Math.round((rawDmg - combat.enemy.def * 0.5) * mult));
  combat.enemy.hp = Math.max(0, combat.enemy.hp - dmg);
  const weakTxt = mult > 1 ? ' (WEAKNESS!)' : '';
  const label = abilityName ? `${abilityName} hits for` : kind === 'heavy' ? 'Your heavy blow lands for' : 'You strike for';
  log.push({ text: `${label} ${dmg}${weakTxt}`, kind: mult > 1 ? 'crit' : 'player', dmg });
  return dmg;
}

export function playerFlee(hero, combat) {
  if (combat.isBoss) { combat.log.push({ text: 'There is no fleeing this foe.', kind: 'warn' }); return combat; }
  const chance = 0.4 + hero.stats.agi * 0.02;
  if (combat.rng.next() < chance) { combat.over = true; combat.result = 'flee'; combat.log.push({ text: 'You break away and escape into the wilds.', kind: 'player' }); }
  else { combat.log.push({ text: 'You fail to escape!', kind: 'warn' }); enemyTurn(hero, combat); }
  return combat;
}

function enemyTurn(hero, combat) {
  const e = combat.enemy;
  if (e.hp <= 0) return;
  const heavy = combat.rng.next() < (combat.isBoss ? 0.35 : 0.2);
  let dmg = Math.round(e.atk * (heavy ? 1.6 : 0.9 + combat.rng.next() * 0.35));
  // dodge
  if (hero._dodging && combat.rng.next() < dodgeChance(hero) + 0.35) {
    combat.log.push({ text: `You dodge the ${e.name}'s attack!`, kind: 'good' });
    hero._dodging = false;
    return;
  }
  // block
  if (combat.blocking) dmg = Math.round(dmg * 0.35);
  // defense stat
  dmg = Math.max(1, dmg - Math.floor(hero.skills.defense * 0.6));
  hero.hp = Math.max(0, hero.hp - dmg);
  combat.log.push({ text: `${e.name} ${heavy ? 'unleashes a savage blow' : 'attacks'} for ${dmg}${combat.blocking ? ' (blocked)' : ''}.`, kind: 'enemy', dmg });
  if (hero.hp <= 0) { combat.over = true; combat.result = 'lose'; combat.log.push({ text: 'You fall, your vision fading to black…', kind: 'enemy' }); }
}

function winCombat(hero, combat) {
  combat.over = true; combat.result = 'win';
  const e = combat.enemy;
  const gold = combat.rng.int(e.gold[0], e.gold[1]);
  const xp = e.xp;
  hero.gold += gold; hero.kills++;
  const leveled = gainXp(hero, xp);
  combat.rewards = { gold, xp, leveled };
  combat.log.push({ text: `${e.name} is defeated! +${xp} XP, +${gold} gold.`, kind: 'good' });
  if (leveled) combat.log.push({ text: `You have reached level ${hero.level}! (+3 stat points)`, kind: 'crit' });
}

/* ---------------- World / regions ---------------- */
export function currentRegion(hero) { return REGIONS[hero.regionIndex]; }
export function canAdvanceRegion(hero) {
  const r = REGIONS[hero.regionIndex];
  return !r.boss || hero.clearedBosses.includes(r.boss);
}
export function advanceRegion(hero) {
  if (canAdvanceRegion(hero) && hero.regionIndex < REGIONS.length - 1) { hero.regionIndex++; return true; }
  return false;
}

export function unlockAstra(hero, astraId) {
  if (astraId && !hero.astras.includes(astraId)) {
    hero.astras.push(astraId);
    if (!hero.weapons.includes(astraId)) hero.weapons.push(astraId);
    return true;
  }
  return false;
}

export function recruitCompanion(hero, cid) {
  if (!hero.companions.includes(cid)) { hero.companions.push(cid); return true; }
  return false;
}

/** Full rest at a sanctuary — restore hp/stamina for gold. */
export function rest(hero, cost = 0) {
  if (hero.gold < cost) return false;
  hero.gold -= cost;
  hero.hp = hero.maxHp; hero.stamina = hero.maxStamina;
  return true;
}
