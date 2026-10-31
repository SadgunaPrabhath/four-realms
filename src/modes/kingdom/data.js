/* ============================================================
   KINGDOM — static game data.
   Buildings, tiers, factions, policies, event templates.
   All gameplay effects are declared here as pure data.
   ============================================================ */

export const RESOURCES = {
  gold:  { icon: '🪙', name: 'Gold' },
  food:  { icon: '🌾', name: 'Food' },
  wood:  { icon: '🪵', name: 'Wood' },
  stone: { icon: '🪨', name: 'Stone' },
  iron:  { icon: '⛏️', name: 'Iron' },
};

/** Settlement tiers — reached by hitting population thresholds. */
export const TIERS = [
  { name: 'Village',    pop: 0,    icon: '🏚️' },
  { name: 'Settlement', pop: 120,  icon: '🏘️' },
  { name: 'Town',       pop: 350,  icon: '🏙️' },
  { name: 'City',       pop: 800,  icon: '🏛️' },
  { name: 'Kingdom',    pop: 1800, icon: '🏰' },
  { name: 'Empire',     pop: 4000, icon: '👑' },
];

/**
 * Buildings. Effects applied per turn (production/upkeep) or as
 * one-time modifiers. `jobs` = population employed. `houses` = pop capacity.
 */
export const BUILDINGS = {
  house:      { name: 'Houses',        icon: '🏠', desc: 'Shelter for your people. Raises population capacity.', cost: { wood: 30, gold: 20 }, houses: 40, upkeep: {}, cat: 'civic' },
  farm:       { name: 'Farm',          icon: '🌾', desc: 'Produces food each season.', cost: { wood: 40, gold: 25 }, produce: { food: 22 }, jobs: 8, cat: 'economy' },
  lumber:     { name: 'Lumber Camp',   icon: '🪵', desc: 'Harvests wood from the forests.', cost: { gold: 40, stone: 10 }, produce: { wood: 16 }, jobs: 6, cat: 'economy' },
  quarry:     { name: 'Stone Quarry',  icon: '🪨', desc: 'Cuts stone for construction.', cost: { wood: 40, gold: 45 }, produce: { stone: 12 }, jobs: 7, cat: 'economy' },
  mine:       { name: 'Iron Mine',     icon: '⛏️', desc: 'Extracts iron ore for arms & tools.', cost: { wood: 55, gold: 60, stone: 20 }, produce: { iron: 7 }, jobs: 9, cat: 'economy' },
  market:     { name: 'Marketplace',   icon: '🏪', desc: 'Boosts tax income and enables trade.', cost: { wood: 60, gold: 90, stone: 30 }, taxMult: 0.18, jobs: 10, cat: 'economy' },
  blacksmith: { name: 'Blacksmith',    icon: '🔨', desc: 'Forges equipment; improves army quality.', cost: { wood: 40, gold: 80, iron: 20 }, armyQuality: 0.12, jobs: 8, cat: 'military' },
  barracks:   { name: 'Barracks',      icon: '🛡️', desc: 'Trains and houses soldiers. Raises recruit cap.', cost: { wood: 70, gold: 100, stone: 40 }, recruitCap: 60, jobs: 6, cat: 'military' },
  walls:      { name: 'Walls',         icon: '🧱', desc: 'Fortifications. Major defensive bonus.', cost: { wood: 50, gold: 70, stone: 120 }, defense: 0.35, cat: 'military' },
  watchtower: { name: 'Watchtower',    icon: '🗼', desc: 'Early warning; reduces surprise attacks & crime.', cost: { wood: 40, gold: 50, stone: 60 }, defense: 0.1, crime: -0.12, jobs: 3, cat: 'military' },
  temple:     { name: 'Temple',        icon: '⛩️', desc: 'Lifts spirits. Raises happiness & loyalty.', cost: { wood: 40, gold: 90, stone: 50 }, happy: 8, loyalty: 0.08, jobs: 4, cat: 'civic' },
  healer:     { name: "Healer's Hall", icon: '⚕️', desc: 'Tends the sick. Reduces plague impact & death.', cost: { wood: 40, gold: 110, stone: 30 }, health: 0.3, jobs: 5, cat: 'civic' },
  library:    { name: 'Library',       icon: '📚', desc: 'Advances knowledge. Improves policy outcomes & events.', cost: { wood: 50, gold: 130, stone: 40 }, wisdom: 0.15, jobs: 4, cat: 'civic' },
  training:   { name: 'Training Grnds', icon: '⚔️', desc: 'Drills the militia. Boosts army attack.', cost: { wood: 60, gold: 90, iron: 15 }, armyAttack: 0.15, jobs: 5, cat: 'military' },
  palace:     { name: 'Palace',        icon: '🏰', desc: 'Seat of power. Boosts loyalty, tax & prestige.', cost: { wood: 120, gold: 300, stone: 200, iron: 60 }, taxMult: 0.15, loyalty: 0.15, happy: 6, once: true, cat: 'civic' },
};

/** Military unit archetypes. */
export const UNITS = {
  militia:  { name: 'Militia',  icon: '🔱', atk: 3,  def: 3,  cost: { gold: 10, food: 5 }, upkeep: 1, req: {} },
  infantry: { name: 'Infantry', icon: '🗡️', atk: 6,  def: 7,  cost: { gold: 25, iron: 4, food: 6 }, upkeep: 2, req: { barracks: 1 } },
  archers:  { name: 'Archers',  icon: '🏹', atk: 8,  def: 3,  cost: { gold: 30, wood: 8, food: 5 }, upkeep: 2, req: { barracks: 1 } },
  cavalry:  { name: 'Cavalry',  icon: '🐎', atk: 11, def: 6,  cost: { gold: 55, iron: 8, food: 12 }, upkeep: 4, req: { barracks: 1, training: 1 } },
  knights:  { name: 'Knights',  icon: '🛡️', atk: 16, def: 14, cost: { gold: 90, iron: 18, food: 14 }, upkeep: 6, req: { barracks: 2, blacksmith: 1 } },
};

/** AI faction templates. Personalities drive diplomacy behaviour. */
export const FACTION_TEMPLATES = [
  { name: 'The Ironhold Dominion', leader: 'Warlord Gareth', personality: 'aggressive', color: '#c0563a', banner: '⚔️', trait: 'Militaristic — respects strength, quick to war.' },
  { name: 'The Silver Concord',    leader: 'Chancellor Vael', personality: 'merchant', color: '#c9a24b', banner: '⚖️', trait: 'Mercantile — loves trade, hates instability.' },
  { name: 'The Verdant Covenant',  leader: 'Matriarch Sylwen', personality: 'defensive', color: '#5aa06a', banner: '🌿', trait: 'Isolationist — cautious, values loyalty & peace.' },
  { name: 'The Crimson Banners',   leader: 'Baron Voss',      personality: 'opportunist', color: '#9b2222', banner: '🩸', trait: 'Opportunist — strikes the weak, flees the strong.' },
  { name: 'The Azure League',      leader: 'Duchess Marenne', personality: 'diplomat', color: '#4aa3c9', banner: '🕊️', trait: 'Diplomatic — seeks alliances and balance.' },
];

/** Government policies — persistent modifiers the ruler toggles. */
export const POLICIES = {
  tax: {
    label: 'Taxation', icon: '💰',
    options: [
      { id: 'low', name: 'Low Taxes', taxMult: 0.6, happy: 6, desc: 'Less gold, happier people.' },
      { id: 'normal', name: 'Balanced', taxMult: 1, happy: 0, desc: 'A fair levy.' },
      { id: 'high', name: 'High Taxes', taxMult: 1.5, happy: -10, desc: 'More gold, resentment grows.' },
      { id: 'crushing', name: 'Crushing', taxMult: 2.1, happy: -22, loyalty: -0.12, desc: 'Fills coffers, breeds rebellion.' },
    ],
  },
  rations: {
    label: 'Food Policy', icon: '🍞',
    options: [
      { id: 'feast', name: 'Feasts', foodMult: 1.4, happy: 10, desc: 'Generous portions, happier folk.' },
      { id: 'normal', name: 'Normal', foodMult: 1, happy: 0, desc: 'Standard rations.' },
      { id: 'ration', name: 'Rationing', foodMult: 0.65, happy: -12, desc: 'Save food, tighten belts.' },
    ],
  },
  military: {
    label: 'Military Spending', icon: '🛡️',
    options: [
      { id: 'minimal', name: 'Minimal', upkeepMult: 0.6, armyMorale: -0.1, desc: 'Cheap, but a soft army.' },
      { id: 'standard', name: 'Standard', upkeepMult: 1, armyMorale: 0, desc: 'A professional force.' },
      { id: 'lavish', name: 'Lavish', upkeepMult: 1.6, armyMorale: 0.2, happy: -4, desc: 'A feared, costly host.' },
    ],
  },
};

/** Names for procedurally naming the realm. */
export const REALM_ADJ = ['Ashen', 'Golden', 'Iron', 'Emerald', 'Crimson', 'Silver', 'Storm', 'Sun', 'Frost', 'Thorn'];
export const REALM_NOUN = ['reach', 'vale', 'march', 'hold', 'crown', 'expanse', 'dominion', 'shore', 'wold', 'realm'];
