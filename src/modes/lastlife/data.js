/* ============================================================
   LAST LIFE — roguelike data. One life. No second chance.
   ============================================================ */

/** Starting backgrounds. Some are locked behind meta-progression. */
export const CLASSES = [
  { id: 'wanderer', name: 'Wanderer', icon: '🚶', unlocked: true, cost: 0,
    stats: { hp: 100, atk: 10, def: 4, luck: 5 }, weapon: 'rustyblade', ability: 'secondwind',
    strength: 'Balanced — no glaring weakness.', weakness: 'Master of nothing.' },
  { id: 'hunter', name: 'Hunter', icon: '🏹', unlocked: true, cost: 0,
    stats: { hp: 85, atk: 13, def: 3, luck: 7 }, weapon: 'huntbow', ability: 'trapsense',
    strength: 'High damage & luck; finds more loot.', weakness: 'Fragile in a brawl.' },
  { id: 'warrior', name: 'Warrior', icon: '🛡️', unlocked: true, cost: 0,
    stats: { hp: 130, atk: 11, def: 8, luck: 3 }, weapon: 'ironsword', ability: 'ironhide',
    strength: 'Tough and armoured. Survives hard hits.', weakness: 'Slow; poor fortune.' },
  { id: 'outlaw', name: 'Outlaw', icon: '🗡️', unlocked: false, cost: 30,
    stats: { hp: 95, atk: 14, def: 4, luck: 6 }, weapon: 'twindaggers', ability: 'firststrike',
    strength: 'Deadly opener; strikes first, strikes hard.', weakness: 'Reckless; low defense.' },
  { id: 'mystic', name: 'Mystic', icon: '🔮', unlocked: false, cost: 45,
    stats: { hp: 90, atk: 12, def: 5, luck: 8 }, weapon: 'stormrod', ability: 'lifedrain',
    strength: 'Drains life from foes; blessed by fortune.', weakness: 'Frail body.' },
  { id: 'revenant', name: 'Revenant', icon: '💀', unlocked: false, cost: 80,
    stats: { hp: 110, atk: 15, def: 6, luck: 5 }, weapon: 'gravemaul', ability: 'undying',
    strength: 'Cheats death once per run. Fearsome.', weakness: 'Hunger gnaws faster.' },
];

export const WEAPONS = {
  rustyblade: { name: 'Rusty Blade', icon: '🗡️', dmg: 4 },
  huntbow:    { name: 'Hunter\'s Bow', icon: '🏹', dmg: 5 },
  ironsword:  { name: 'Iron Sword', icon: '⚔️', dmg: 6 },
  twindaggers:{ name: 'Twin Daggers', icon: '🔪', dmg: 5 },
  stormrod:   { name: 'Storm Rod', icon: '🪄', dmg: 6 },
  gravemaul:  { name: 'Grave Maul', icon: '🔨', dmg: 8 },
  // Lootable upgrades
  woodaxe:    { name: 'Woodsman\'s Axe', icon: '🪓', dmg: 7 },
  spear:      { name: 'Long Spear', icon: '🔱', dmg: 8 },
  warhammer:  { name: 'Warhammer', icon: '🔨', dmg: 11 },
  runeblade:  { name: 'Runed Blade', icon: '🗡️', dmg: 14 },
  dragonfang: { name: 'Dragonfang', icon: '🐲', dmg: 18 },
};

export const ABILITIES = {
  secondwind: { name: 'Second Wind', desc: 'Heal 25% when below a third HP (once per fight).', cd: 0 },
  trapsense:  { name: 'Trap Sense', desc: 'Avoid the first hit of each fight.' },
  ironhide:   { name: 'Iron Hide', desc: 'Take 30% less damage from all sources.' },
  firststrike:{ name: 'First Strike', desc: 'Deal double damage on the first blow of a fight.' },
  lifedrain:  { name: 'Life Drain', desc: 'Heal for 25% of the damage you deal.' },
  undying:    { name: 'Undying', desc: 'Survive one lethal blow at 1 HP per run.' },
};

/** Regions in travel order. Danger scales. */
export const REGIONS = [
  { id: 'wilds', name: 'The Wilds', icon: '🌲', enemies: ['rat', 'wolf', 'bandit'], boss: 'alpha', desc: 'Overgrown borderlands where the desperate hide.' },
  { id: 'marsh', name: 'The Rotmarsh', icon: '🐊', enemies: ['wolf', 'ghoul', 'bandit'], boss: 'marshking', desc: 'A fetid swamp that swallows the unwary.' },
  { id: 'ruins', name: 'The Broken Ruins', icon: '🏚️', enemies: ['ghoul', 'brigand', 'wraith'], boss: 'warden', desc: 'The bones of a dead civilisation.' },
  { id: 'frost', name: 'The Frostfell', icon: '🏔️', enemies: ['brigand', 'wraith', 'yeti'], boss: 'frostjarl', desc: 'A merciless white waste where warmth is currency.' },
  { id: 'ashlands', name: 'The Ashlands', icon: '🌋', enemies: ['wraith', 'yeti', 'demon'], boss: 'ashtitan', desc: 'The final trial. Beyond it lies escape — and freedom.' },
];

export const ENEMIES = {
  rat:     { name: 'Plague Rat', icon: '🐀', hp: 18, atk: 5, def: 0 },
  wolf:    { name: 'Starving Wolf', icon: '🐺', hp: 28, atk: 8, def: 1 },
  bandit:  { name: 'Roadside Bandit', icon: '🗡️', hp: 34, atk: 9, def: 2 },
  ghoul:   { name: 'Marsh Ghoul', icon: '🧟', hp: 45, atk: 11, def: 3 },
  brigand: { name: 'Armoured Brigand', icon: '🛡️', hp: 55, atk: 13, def: 6 },
  wraith:  { name: 'Ruin Wraith', icon: '👻', hp: 60, atk: 16, def: 4 },
  yeti:    { name: 'Frost Yeti', icon: '🦣', hp: 80, atk: 18, def: 7 },
  demon:   { name: 'Ash Demon', icon: '👹', hp: 95, atk: 22, def: 9 },
  // Bosses
  alpha:     { name: 'The Alpha', icon: '🐺', hp: 120, atk: 14, def: 4, boss: true },
  marshking: { name: 'The Marsh King', icon: '🐲', hp: 180, atk: 18, def: 6, boss: true },
  warden:    { name: 'The Hollow Warden', icon: '🗿', hp: 240, atk: 22, def: 10, boss: true },
  frostjarl: { name: 'The Frost Jarl', icon: '❄️', hp: 320, atk: 28, def: 12, boss: true },
  ashtitan:  { name: 'The Ash Titan', icon: '🌋', hp: 420, atk: 34, def: 16, boss: true },
};

/** Procedural encounter decision-events. Outcomes rolled by rng. */
export const EVENTS = [
  {
    id: 'fortress', title: '🏰 An Abandoned Fortress',
    text: 'A crumbling fortress looms, its gate ajar. It could hold treasure — or death.',
    options: [
      { label: 'Enter boldly', outcomes: [{ w: 5, type: 'loot', mag: 1.4 }, { w: 3, type: 'fight' }, { w: 2, type: 'damage', mag: 18 }] },
      { label: 'Scout first', outcomes: [{ w: 6, type: 'loot', mag: 1 }, { w: 2, type: 'nothing' }, { w: 2, type: 'fight' }] },
      { label: 'Search for another way', outcomes: [{ w: 5, type: 'loot', mag: 0.8 }, { w: 3, type: 'hunger', mag: 12 }, { w: 2, type: 'nothing' }] },
      { label: 'Avoid it entirely', outcomes: [{ w: 8, type: 'nothing' }, { w: 2, type: 'supplies', mag: 1 }] },
    ],
  },
  {
    id: 'stranger', title: '🧎 A Wounded Stranger',
    text: 'A wounded traveller begs for aid at the roadside. Their eyes dart nervously.',
    options: [
      { label: 'Help them', outcomes: [{ w: 5, type: 'ally_gold', mag: 30 }, { w: 3, type: 'nothing' }, { w: 2, type: 'ambush' }] },
      { label: 'Rob them', outcomes: [{ w: 6, type: 'gold', mag: 25 }, { w: 4, type: 'fight' }] },
      { label: 'Ignore and pass', outcomes: [{ w: 10, type: 'nothing' }] },
    ],
  },
  {
    id: 'shrine', title: '⛩️ A Forgotten Shrine',
    text: 'A moss-covered shrine hums with faint power. An offering bowl waits.',
    options: [
      { label: 'Offer gold (20)', cost: { gold: 20 }, outcomes: [{ w: 6, type: 'blessing', mag: 1 }, { w: 4, type: 'heal', mag: 40 }] },
      { label: 'Pray humbly', outcomes: [{ w: 4, type: 'heal', mag: 20 }, { w: 4, type: 'nothing' }, { w: 2, type: 'blessing', mag: 1 }] },
      { label: 'Desecrate it for relics', outcomes: [{ w: 4, type: 'loot', mag: 1.6 }, { w: 4, type: 'curse', mag: 15 }, { w: 2, type: 'fight' }] },
    ],
  },
  {
    id: 'forage', title: '🍄 A Grove of Strange Fungi',
    text: 'Pale mushrooms cluster beneath a dead tree. Some may be food. Some may be poison.',
    options: [
      { label: 'Eat your fill', outcomes: [{ w: 5, type: 'food', mag: 30 }, { w: 3, type: 'poison', mag: 15 }, { w: 2, type: 'nothing' }] },
      { label: 'Gather carefully', outcomes: [{ w: 7, type: 'supplies', mag: 2 }, { w: 3, type: 'nothing' }] },
      { label: 'Leave them be', outcomes: [{ w: 10, type: 'nothing' }] },
    ],
  },
  {
    id: 'chest', title: '📦 A Buried Cache',
    text: 'Fresh-turned earth hides something. A cache — or a trap.',
    options: [
      { label: 'Dig it up', outcomes: [{ w: 6, type: 'loot', mag: 1.2 }, { w: 2, type: 'gold', mag: 40 }, { w: 2, type: 'damage', mag: 14 }] },
      { label: 'Pry it open from afar', outcomes: [{ w: 5, type: 'gold', mag: 20 }, { w: 5, type: 'nothing' }] },
    ],
  },
];

/** Meta-progression unlock catalogue. */
export const META_UNLOCKS = [
  { id: 'class_outlaw', type: 'class', ref: 'outlaw', name: 'Unlock: Outlaw', cost: 30, desc: 'A deadly duelist who strikes first.' },
  { id: 'class_mystic', type: 'class', ref: 'mystic', name: 'Unlock: Mystic', cost: 45, desc: 'Drains life and courts fortune.' },
  { id: 'class_revenant', type: 'class', ref: 'revenant', name: 'Unlock: Revenant', cost: 80, desc: 'Cheats death once per run.' },
  { id: 'boon_rations', type: 'boon', name: 'Traveler\'s Rations', cost: 25, desc: 'Start every run with +2 food.' },
  { id: 'boon_medkit', type: 'boon', name: 'Field Medicine', cost: 35, desc: 'Start every run with +1 potion.' },
  { id: 'boon_coin', type: 'boon', name: 'Coin Purse', cost: 20, desc: 'Start every run with +25 gold.' },
  { id: 'boon_veteran', type: 'boon', name: 'Veteran\'s Grit', cost: 60, desc: '+15 max HP on every run.' },
];

export const BACKGROUNDS = ['a disgraced knight', 'an escaped convict', 'a village orphan', 'a fallen noble', 'a wandering mercenary', 'a cursed pilgrim', 'a exiled scholar', 'a broken oathkeeper'];
export const DEATH_FLAVORS = ['Your story ends here.', 'The wilds claim another.', 'No songs will be sung.', 'Alone, and forgotten.', 'One life. It was not enough.'];
