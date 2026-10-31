/* ============================================================
   KINGDOM — deterministic game logic.
   Pure functions operating on a game-state object (gs).
   No DOM, no rng side-effects except through a passed RNG.
   Fully unit-testable.
   ============================================================ */
import { RNG, clamp } from '../../engine/rng.js';
import { BUILDINGS, UNITS, TIERS, POLICIES, FACTION_TEMPLATES, RESOURCES, REALM_ADJ, REALM_NOUN } from './data.js';

const DIFF = {
  easy:   { startGold: 260, startFood: 220, upkeepMult: 0.8, eventBad: 0.85, aiAggr: 0.7 },
  normal: { startGold: 200, startFood: 160, upkeepMult: 1.0, eventBad: 1.0, aiAggr: 1.0 },
  hard:   { startGold: 150, startFood: 120, upkeepMult: 1.2, eventBad: 1.2, aiAggr: 1.35 },
};

/* ---------------- New game ---------------- */
export function newGame({ seed, name, difficulty = 'normal' }) {
  const rng = new RNG(seed);
  const d = DIFF[difficulty] || DIFF.normal;
  const realmName = name || `The ${rng.pick(REALM_ADJ)}${rng.pick(REALM_NOUN)}`;

  const factions = rng.sample(FACTION_TEMPLATES, 4).map((t, i) => ({
    id: 'f' + i,
    name: t.name, leader: t.leader, personality: t.personality,
    color: t.color, banner: t.banner, trait: t.trait,
    relation: rng.int(-15, 25),
    strength: rng.int(35, 70),
    economy: rng.int(40, 80),
    status: 'neutral', // neutral | trade | ally | war
    lastAction: null,
  }));

  return {
    v: 1,
    seed, difficulty,
    name: realmName,
    ruler: 'Sovereign',
    turn: 1,
    createdAt: Date.now(),
    tierIndex: 0,
    res: { gold: d.startGold, food: d.startFood, wood: 120, stone: 80, iron: 30 },
    pop: 60,
    happy: 68,
    loyalty: 0.6,
    crime: 0.05,
    buildings: { house: 2, farm: 2, lumber: 1 },
    army: { militia: 6, infantry: 0, archers: 0, cavalry: 0, knights: 0 },
    policies: { tax: 'normal', rations: 'normal', military: 'standard' },
    factions,
    flags: {},
    log: [{ turn: 1, text: `You take the throne of ${realmName}. A village of 60 souls looks to you.`, kind: 'epic' }],
    history: [],
    pendingEvent: null,
    lastEventId: null,
    gameOver: null, // {won, reason}
    stats: { warsWon: 0, battles: 0, built: 0, seasonsRuled: 0 },
  };
}

/* ---------------- Derived values ---------------- */
export function tier(gs) { return TIERS[gs.tierIndex]; }

export function popCap(gs) {
  let cap = 40;
  for (const [k, n] of Object.entries(gs.buildings)) cap += (BUILDINGS[k]?.houses || 0) * n;
  return cap;
}

/** Aggregate all building + policy modifiers. */
export function computeMods(gs) {
  const m = { taxMult: 1, foodMult: 1, upkeepMult: 1, defense: 0, armyAttack: 0, armyQuality: 0,
    happy: 0, loyalty: 0, crime: 0, health: 0, wisdom: 0, recruitCap: 0, armyMorale: 0, jobs: 0 };
  for (const [k, n] of Object.entries(gs.buildings)) {
    const b = BUILDINGS[k]; if (!b) continue;
    for (const key of ['taxMult', 'foodMult']) if (b[key]) m[key] += b[key] * n;
    for (const key of ['defense', 'armyAttack', 'armyQuality', 'happy', 'loyalty', 'crime', 'health', 'wisdom', 'recruitCap', 'jobs']) if (b[key]) m[key] += b[key] * n;
  }
  // policies
  for (const [pk, choiceId] of Object.entries(gs.policies)) {
    const opt = POLICIES[pk]?.options.find((o) => o.id === choiceId);
    if (!opt) continue;
    if (opt.taxMult != null) m.taxMult *= opt.taxMult;
    if (opt.foodMult != null) m.foodMult *= opt.foodMult;
    if (opt.upkeepMult != null) m.upkeepMult *= opt.upkeepMult;
    if (opt.happy) m.happy += opt.happy;
    if (opt.loyalty) m.loyalty += opt.loyalty;
    if (opt.armyMorale) m.armyMorale += opt.armyMorale;
  }
  return m;
}

/** Total employed jobs available across buildings. */
export function totalJobs(gs) {
  let j = 0;
  for (const [k, n] of Object.entries(gs.buildings)) j += (BUILDINGS[k]?.jobs || 0) * n;
  return j;
}

/** Per-season production & consumption preview (does not mutate). */
export function production(gs) {
  const m = computeMods(gs);
  const d = DIFF[gs.difficulty] || DIFF.normal;
  const out = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
  const employment = clamp(gs.pop / Math.max(1, totalJobs(gs)), 0, 1); // workers available ratio

  for (const [k, n] of Object.entries(gs.buildings)) {
    const b = BUILDINGS[k]; if (!b?.produce) continue;
    for (const [res, amt] of Object.entries(b.produce)) {
      out[res] += amt * n * (b.jobs ? employment : 1);
    }
  }
  if (gs.flags.wells) out.food *= 1.1;

  // Tax income from population & happiness
  const baseTax = gs.pop * 0.5;
  const happyFactor = 0.5 + (gs.happy / 100) * 0.9;
  out.gold += Math.round(baseTax * m.taxMult * happyFactor);

  // Food consumption
  const consumption = Math.round(gs.pop * 0.5 * (2 - m.foodMult));
  out.food = Math.round(out.food * m.foodMult - consumption);

  // Army upkeep (gold + food)
  const upkeep = armyUpkeep(gs) * m.upkeepMult * d.upkeepMult;
  out.gold -= Math.round(upkeep);
  out.food -= Math.round(armyFood(gs));

  // Building maintenance
  out.gold -= Math.round(buildingCount(gs) * 1.5);

  for (const k of Object.keys(out)) out[k] = Math.round(out[k]);
  return out;
}

export function buildingCount(gs) { return Object.values(gs.buildings).reduce((a, b) => a + b, 0); }
export function armyTotal(gs) { return Object.entries(gs.army).reduce((a, [k, v]) => a + (UNITS[k] ? v : 0), 0); }
export function armyUpkeep(gs) { let u = 0; for (const [k, n] of Object.entries(gs.army)) u += (UNITS[k]?.upkeep || 0) * n; return u; }
export function armyFood(gs) { return armyTotal(gs) * 0.6; }

/** Player army combat power (attack + defense weighted by mods). */
export function armyPower(gs, mode = 'both') {
  const m = computeMods(gs);
  let atk = 0, def = 0;
  for (const [k, n] of Object.entries(gs.army)) {
    const u = UNITS[k]; if (!u) continue;
    atk += u.atk * n; def += u.def * n;
  }
  atk *= (1 + m.armyAttack + m.armyQuality + m.armyMorale);
  def *= (1 + m.defense + m.armyQuality);
  if (mode === 'atk') return atk;
  if (mode === 'def') return def;
  return atk + def;
}

export function recruitCap(gs) {
  const m = computeMods(gs);
  return 20 + m.recruitCap;
}

/* ---------------- Actions ---------------- */
export function canAfford(gs, cost) {
  return Object.entries(cost || {}).every(([r, amt]) => (gs.res[r] || 0) >= amt);
}
export function pay(gs, cost) {
  for (const [r, amt] of Object.entries(cost || {})) gs.res[r] -= amt;
}

/** Build a building (mutates gs). Returns {ok, msg}. */
export function build(gs, key) {
  const b = BUILDINGS[key];
  if (!b) return { ok: false, msg: 'Unknown building.' };
  if (b.once && gs.buildings[key]) return { ok: false, msg: `You may only raise one ${b.name}.` };
  const cost = scaledCost(gs, key);
  if (!canAfford(gs, cost)) return { ok: false, msg: 'Not enough resources.' };
  pay(gs, cost);
  gs.buildings[key] = (gs.buildings[key] || 0) + 1;
  gs.stats.built++;
  return { ok: true, msg: `${b.name} constructed.` };
}

/** Building cost scales with how many you already own (except once-only). */
export function scaledCost(gs, key) {
  const b = BUILDINGS[key];
  const n = gs.buildings[key] || 0;
  const mult = b.once ? 1 : 1 + n * 0.35;
  const out = {};
  for (const [r, amt] of Object.entries(b.cost)) out[r] = Math.round(amt * mult);
  return out;
}

/** Recruit n units of a type. */
export function recruit(gs, unitKey, n = 1) {
  const u = UNITS[unitKey];
  if (!u) return { ok: false, msg: 'Unknown unit.' };
  // requirement check
  for (const [bk, need] of Object.entries(u.req || {})) {
    if ((gs.buildings[bk] || 0) < need) return { ok: false, msg: `Requires ${BUILDINGS[bk].name} ×${need}.` };
  }
  if (armyTotal(gs) + n > recruitCap(gs)) return { ok: false, msg: 'Recruitment cap reached — build Barracks.' };
  const cost = {};
  for (const [r, amt] of Object.entries(u.cost)) cost[r] = amt * n;
  if (!canAfford(gs, cost)) return { ok: false, msg: 'Not enough resources.' };
  pay(gs, cost);
  gs.army[unitKey] = (gs.army[unitKey] || 0) + n;
  return { ok: true, msg: `Recruited ${n} ${u.name}.` };
}

/* ---------------- Battle resolution ---------------- */
/**
 * Deterministic-ish battle: compares power with rng variance.
 * Returns { win, playerLoss (unit counts), enemyLoss, gold, msg }.
 */
export function resolveBattle(gs, enemyStrength, rng, { defending = false } = {}) {
  const m = computeMods(gs);
  let power = defending ? armyPower(gs, 'def') * (1 + m.defense) : armyPower(gs, 'atk');
  power = Math.max(4, power);
  const enemyPower = enemyStrength * (0.9 + rng.next() * 0.5);
  const ratio = power / (power + enemyPower);
  const roll = rng.next();
  const win = roll < ratio;

  // Casualties proportional to how close the fight was
  const closeness = 1 - Math.abs(ratio - 0.5) * 2; // 0..1
  const lossFrac = clamp((win ? 0.08 : 0.28) + closeness * 0.22, 0.03, 0.6);

  const playerLoss = {};
  for (const [k, n] of Object.entries(gs.army)) {
    if (!UNITS[k] || n <= 0) continue;
    const lost = Math.min(n, Math.round(n * lossFrac * (0.7 + rng.next() * 0.6)));
    if (lost > 0) { gs.army[k] -= lost; playerLoss[k] = lost; }
  }
  gs.stats.battles++;
  let gold = 0;
  if (win) { gold = Math.round(enemyStrength * (0.6 + rng.next())); gs.res.gold += gold; }
  return { win, playerLoss, gold, ratio };
}

/* ---------------- Diplomacy ---------------- */
export function adjustRelation(faction, delta) { faction.relation = clamp(faction.relation + delta, -100, 100); }

export function proposeAlliance(gs, faction) {
  if (faction.status === 'war') return { ok: false, msg: 'You are at war — sue for peace first.' };
  const chance = 0.15 + faction.relation / 130;
  return { ok: false, needRoll: true, chance, msg: '' };
}

/** Per-turn AI faction behaviour. Mutates factions + may start war. Returns log lines. */
export function tickFactions(gs, rng) {
  const logs = [];
  const d = DIFF[gs.difficulty] || DIFF.normal;
  const myStrength = armyPower(gs) / 4 + buildingCount(gs) * 2 + gs.pop / 20;

  for (const f of gs.factions) {
    // relations drift toward personality baseline slowly
    f.strength = clamp(f.strength + rng.int(-2, 3), 20, 120);

    if (f.status === 'war') {
      // wars resolve via player action; small attrition
      if (rng.chance(0.35)) {
        const res = resolveBattle(gs, f.strength * 0.6, rng, { defending: true });
        if (res.win) { logs.push({ text: `You repelled a raid from ${f.name}. ${lossText(res.playerLoss)}`, kind: 'good' }); f.strength -= 8; }
        else { gs.res.gold = Math.max(0, gs.res.gold - 20); gs.happy -= 3; logs.push({ text: `${f.name} raided your lands. Gold lost, ${lossText(res.playerLoss)}`, kind: 'bad' }); }
      }
      continue;
    }

    let delta = 0;
    switch (f.personality) {
      case 'aggressive': delta = myStrength > f.strength ? rng.int(0, 3) : rng.int(-4, 1); break;
      case 'merchant': delta = gs.happy > 55 ? rng.int(0, 3) : rng.int(-2, 1); break;
      case 'defensive': delta = rng.int(-1, 2); break;
      case 'opportunist': delta = myStrength < f.strength * 0.7 ? rng.int(-5, 0) : rng.int(-1, 2); break;
      case 'diplomat': delta = f.relation < 40 ? rng.int(0, 3) : rng.int(-1, 2); break;
      default: delta = rng.int(-1, 1);
    }
    adjustRelation(f, delta);

    // Declare war if very hostile & sees weakness
    const wantsWar = f.relation < -35 && myStrength < f.strength * (1 / d.aiAggr) && rng.chance(0.25 * d.aiAggr);
    if (wantsWar) {
      f.status = 'war';
      logs.push({ text: `⚔️ ${f.name} has DECLARED WAR upon ${gs.name}! ${f.leader} smells weakness.`, kind: 'bad' });
    } else if (f.status === 'ally' && f.relation < -10) {
      f.status = 'neutral';
      logs.push({ text: `${f.name} has quietly dissolved your alliance.`, kind: 'bad' });
    }
  }
  return logs;
}

function lossText(loss) {
  const parts = Object.entries(loss).map(([k, n]) => `${n} ${UNITS[k].name}`);
  return parts.length ? `Lost ${parts.join(', ')}.` : 'No losses.';
}

/* ---------------- Turn processing ---------------- */
/**
 * End the season: apply economy, food/starvation, happiness, crime,
 * loyalty, tier advance, faction AI. Returns { logs, tierUp }.
 * The caller then rolls an event separately.
 */
export function endTurn(gs, rng) {
  const logs = [];
  const m = computeMods(gs);
  const prod = production(gs);

  // Apply production
  for (const r of Object.keys(gs.res)) gs.res[r] = Math.max(0, gs.res[r] + (prod[r] || 0));

  // Starvation: if food hit zero and net food negative
  if (gs.res.food <= 0 && prod.food < 0) {
    const starve = Math.round(gs.pop * 0.06 + rng.int(2, 8));
    gs.pop = Math.max(20, gs.pop - starve);
    gs.happy -= 12;
    logs.push({ text: `🥀 Famine! Granaries are empty. ${starve} people starve.`, kind: 'bad' });
  }

  // Population growth (needs food surplus, happiness, housing)
  const cap = popCap(gs);
  if (gs.res.food > gs.pop * 0.4 && gs.happy > 45 && gs.pop < cap) {
    const growth = Math.round(gs.pop * (0.03 + (gs.happy - 45) / 800) + rng.int(0, 3));
    gs.pop = Math.min(cap, gs.pop + growth);
  } else if (gs.pop >= cap && gs.happy > 50) {
    logs.push({ text: '🏠 Your people are crowded — build more Houses to grow.', kind: 'default' });
  }

  // Happiness natural drift + mods
  const targetHappy = clamp(50 + m.happy + (gs.res.food > gs.pop ? 6 : -8), 0, 100);
  gs.happy = clamp(Math.round(gs.happy + (targetHappy - gs.happy) * 0.35 + m.happy * 0.15), 0, 100);

  // Loyalty
  gs.loyalty = clamp(gs.loyalty + m.loyalty * 0.1 + (gs.happy > 55 ? 0.02 : -0.03), 0, 1);

  // Crime rises with low happiness, falls with watchtowers/loyalty
  const crimeTarget = clamp(0.25 - gs.happy / 400 - m.crime + (1 - gs.loyalty) * 0.15, 0, 0.6);
  gs.crime = clamp(gs.crime + (crimeTarget - gs.crime) * 0.4, 0, 0.8);
  if (gs.crime > 0.35 && rng.chance(gs.crime)) {
    const stolen = Math.round(gs.res.gold * gs.crime * 0.15);
    gs.res.gold = Math.max(0, gs.res.gold - stolen);
    if (stolen > 3) logs.push({ text: `🦹 Crime is rampant — ${stolen} gold vanishes from the treasury.`, kind: 'bad' });
  }

  // decay temporary flags
  if (gs.flags.wells) { gs.flags.wells--; if (gs.flags.wells <= 0) delete gs.flags.wells; }
  if (gs.flags.quarantine) { gs.flags.quarantine--; if (gs.flags.quarantine <= 0) delete gs.flags.quarantine; }

  // Tier advance
  const tierUp = updateTier(gs, logs);

  // Faction AI
  logs.push(...tickFactions(gs, rng));

  gs.turn++;
  gs.stats.seasonsRuled++;

  // Loss condition: total collapse
  if (gs.pop <= 20 && gs.happy < 12) {
    gs.gameOver = { won: false, reason: 'Your realm has collapsed into ruin — abandoned by its people.' };
  }

  return { logs, tierUp, prod };
}

export function updateTier(gs, logs = []) {
  let up = false;
  while (gs.tierIndex < TIERS.length - 1 && gs.pop >= TIERS[gs.tierIndex + 1].pop) {
    gs.tierIndex++;
    up = true;
    logs.push({ text: `✨ ${gs.name} has risen to a ${TIERS[gs.tierIndex].name}!`, kind: 'epic' });
    if (TIERS[gs.tierIndex].name === 'Empire') gs.gameOver = { won: true, reason: 'You forged an EMPIRE that will echo through the ages.' };
  }
  return up;
}

export const _DIFF = DIFF;
