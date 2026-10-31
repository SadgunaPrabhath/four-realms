/* ============================================================
   MYTHOS — original fantasy RPG data.
   Inspired by the AESTHETICS of Indian epics; all names, lore,
   weapons and characters are ORIGINAL FICTION and are NOT
   presented as religious scripture.
   ============================================================ */

export const STATS = {
  str: { name: 'Strength', icon: '💪', desc: 'Melee damage & heavy attacks.' },
  agi: { name: 'Agility', icon: '🏃', desc: 'Dodge chance & attack speed.' },
  vit: { name: 'Vitality', icon: '❤️', desc: 'Maximum health.' },
  int: { name: 'Intellect', icon: '🧠', desc: 'Astra (special) power.' },
  wis: { name: 'Wisdom', icon: '🕯️', desc: 'Stamina & meditation.' },
  cha: { name: 'Charisma', icon: '✨', desc: 'Companion loyalty & prices.' },
};

/** Starting archetypes. */
export const CLASSES = [
  { id: 'warrior', name: 'Warrior of the Ash Plains', icon: '⚔️', desc: 'A peerless swordhand. Hits hard, endures more.', stats: { str: 8, agi: 5, vit: 8, int: 3, wis: 4, cha: 5 }, weapon: 'ironfang' },
  { id: 'archer', name: 'Ranger of the Silent Wood', icon: '🏹', desc: 'Death from afar. Swift and precise.', stats: { str: 5, agi: 9, vit: 5, int: 5, wis: 5, cha: 4 }, weapon: 'windbow' },
  { id: 'ascetic', name: 'Ascetic of the High Peaks', icon: '🕯️', desc: 'Master of inner fire and celestial astras.', stats: { str: 4, agi: 5, vit: 5, int: 9, wis: 8, cha: 3 }, weapon: 'emberstaff' },
];

/**
 * Weapons & Astras (celestial weapons). Each has a special ability
 * usable in combat for stamina. Rarity gates power.
 */
export const WEAPONS = {
  ironfang:   { name: 'Ironfang Blade', icon: '🗡️', type: 'sword', rarity: 'common', dmg: 8, ability: { name: 'Cleaving Strike', stam: 3, mult: 1.8, desc: 'A brutal overhead cut.' }, lore: 'A soldier\'s blade, notched from a hundred battles.' },
  windbow:    { name: 'Whisperwind Bow', icon: '🏹', type: 'bow', rarity: 'common', dmg: 7, ability: { name: 'Twin Shot', stam: 3, mult: 1.6, hits: 2, desc: 'Loose two arrows in a heartbeat.' }, lore: 'Strung with sinew that hums in the wind.' },
  emberstaff: { name: 'Emberheart Staff', icon: '🔥', type: 'staff', rarity: 'common', dmg: 6, ability: { name: 'Ember Bolt', stam: 4, mult: 2.0, element: 'fire', desc: 'A lance of living flame.' }, lore: 'A coal from an eternal hearth burns at its tip.' },
  // Celestial astras (unlockable)
  suryastra:  { name: 'Suryara, the Dawnfire Bow', icon: '☀️', type: 'astra', rarity: 'legendary', dmg: 22, element: 'fire', ability: { name: 'Solar Lance', stam: 6, mult: 3.2, element: 'fire', desc: 'A spear of dawnlight that sears all it touches.' }, lore: 'Forged from the first light of a fictional dawn-god of the Ember Court. Blinds the unworthy.', unlock: 'Defeat the Ashfiend in the Emberwastes.' },
  vayustra:   { name: 'Vayara, the Tempest Chakram', icon: '🌪️', type: 'astra', rarity: 'legendary', dmg: 20, element: 'wind', ability: { name: 'Cyclone Rend', stam: 6, mult: 2.6, hits: 3, element: 'wind', desc: 'A whirling storm that strikes thrice.' }, lore: 'A ring of hardened storm-glass, gift of the fictional Windmother Vaeli.', unlock: 'Clear the Skyreach Sanctum.' },
  varunastra: { name: 'Varunya, the Tidecaller Trident', icon: '🌊', type: 'astra', rarity: 'legendary', dmg: 24, element: 'water', ability: { name: 'Drowning Surge', stam: 7, mult: 3.0, element: 'water', desc: 'A wave that crushes and chills.' }, lore: 'Drawn from the depths of the fictional Sunless Sea by the pilgrim-king Aravan.', unlock: 'Reach the Sunken Temple of Naganya.' },
  agneyastra: { name: 'Agnara, the Pyre Sword', icon: '🔱', type: 'astra', rarity: 'divine', dmg: 30, element: 'fire', ability: { name: 'Funeral Pyre', stam: 8, mult: 3.6, element: 'fire', desc: 'Wreathes the blade in unquenchable fire.' }, lore: 'A blade said to hold the last breath of a fallen fire-titan of legend.', unlock: 'Slay the Guardian of the Molten Gate.' },
  indrastra:  { name: 'Indira, the Thunder Vajra', icon: '⚡', type: 'astra', rarity: 'divine', dmg: 34, element: 'storm', ability: { name: 'Skyfall', stam: 9, mult: 4.0, element: 'storm', desc: 'Calls down a bolt to shatter the heavens.' }, lore: 'A sceptre of crystallized lightning, the ultimate celestial arsenal-piece.', unlock: 'Defeat the final Guardian, Vritraxis.' },
};

export const ASTRA_IDS = ['suryastra', 'vayustra', 'varunastra', 'agneyastra', 'indrastra'];

/** Regions form the main-story path (index order). */
export const REGIONS = [
  { id: 'ashplains', name: 'The Ash Plains', icon: '🌾', desc: 'Windswept grasslands where your journey begins.', enemies: ['bandit', 'wolf'], boss: null },
  { id: 'silentwood', name: 'The Silent Wood', icon: '🌲', desc: 'An ancient forest where the trees seem to watch.', enemies: ['bandit', 'spider', 'wolf'], boss: 'woodwraith', astra: null },
  { id: 'emberwastes', name: 'The Emberwastes', icon: '🌋', desc: 'A scorched desert of black glass and ember-storms.', enemies: ['skeleton', 'firehound'], boss: 'ashfiend', astra: 'suryastra' },
  { id: 'skyreach', name: 'The Skyreach Peaks', icon: '🏔️', desc: 'Frozen mountains piercing the clouds.', enemies: ['harpy', 'skeleton'], boss: 'skyreach_guardian', astra: 'vayustra' },
  { id: 'sunkentemple', name: 'The Sunken Temple', icon: '🏛️', desc: 'A drowned ruin beneath the Sunless Sea.', enemies: ['naga', 'spider'], boss: 'naganya', astra: 'varunastra' },
  { id: 'moltengate', name: 'The Molten Gate', icon: '🔥', desc: 'The threshold of a titan\'s tomb.', enemies: ['firehound', 'skeleton', 'naga'], boss: 'molten_guardian', astra: 'agneyastra' },
  { id: 'heavenspire', name: 'The Heavenspire', icon: '⚡', desc: 'Where earth ends and the final trial waits.', enemies: ['harpy', 'naga'], boss: 'vritraxis', astra: 'indrastra' },
];

/** Enemy templates. Weakness = element that deals +50%. */
export const ENEMIES = {
  bandit:   { name: 'Road Bandit', icon: '🗡️', hp: 26, atk: 6, def: 2, xp: 12, gold: [8, 18], weak: null, boss: false },
  wolf:     { name: 'Dire Wolf', icon: '🐺', hp: 22, atk: 8, def: 1, xp: 10, gold: [3, 8], weak: 'fire', boss: false },
  spider:   { name: 'Gloomweaver', icon: '🕷️', hp: 30, atk: 7, def: 3, xp: 15, gold: [5, 12], weak: 'fire', boss: false },
  skeleton: { name: 'Risen Warrior', icon: '💀', hp: 34, atk: 9, def: 5, xp: 18, gold: [10, 20], weak: 'storm', boss: false },
  firehound:{ name: 'Ember Hound', icon: '🔥', hp: 32, atk: 12, def: 3, xp: 20, gold: [8, 16], weak: 'water', boss: false },
  harpy:    { name: 'Gale Harpy', icon: '🦅', hp: 30, atk: 11, def: 2, xp: 20, gold: [10, 22], weak: 'storm', boss: false },
  naga:     { name: 'Deepcoil Naga', icon: '🐍', hp: 40, atk: 13, def: 6, xp: 26, gold: [14, 30], weak: 'wind', boss: false },
  // Bosses
  woodwraith:       { name: 'The Wood Wraith', icon: '👻', hp: 120, atk: 14, def: 6, xp: 80, gold: [40, 60], weak: 'fire', boss: true, intro: 'A shape of bark and shadow unfolds from the oldest tree.' },
  ashfiend:         { name: 'The Ashfiend', icon: '🔥', hp: 180, atk: 20, def: 8, xp: 140, gold: [60, 90], weak: 'water', boss: true, intro: 'Cinders coalesce into a towering fiend of living fire.' },
  skyreach_guardian:{ name: 'The Skyreach Guardian', icon: '🗿', hp: 240, atk: 24, def: 12, xp: 200, gold: [80, 120], weak: 'storm', boss: true, intro: 'An ancient stone sentinel grinds awake, eyes blazing blue.' },
  naganya:          { name: 'Naganya, Queen of the Deep', icon: '🐲', hp: 300, atk: 28, def: 14, xp: 260, gold: [100, 150], weak: 'wind', boss: true, intro: 'The drowned queen rises, crowned in coral and malice.' },
  molten_guardian:  { name: 'Guardian of the Molten Gate', icon: '🌋', hp: 380, atk: 32, def: 18, xp: 340, gold: [130, 180], weak: 'water', boss: true, intro: 'A colossus of magma bars the titan\'s tomb.' },
  vritraxis:        { name: 'Vritraxis, the Skydevourer', icon: '🐉', hp: 500, atk: 40, def: 22, xp: 500, gold: [200, 300], weak: 'storm', boss: true, intro: 'The world-serpent uncoils across the sky. This is the final trial.' },
};

/** Recruitable companions. */
export const COMPANIONS = {
  kavi:  { name: 'Kavi the Bold', icon: '🛡️', role: 'Shield-brother', dmg: 6, desc: 'A warrior who fights at your flank, adding steel to every blow.', personality: 'A boisterous, loyal soul who laughs in the face of death.', region: 'silentwood', quest: 'Recover his fallen sister\'s blade from the Wood Wraith.' },
  meera: { name: 'Meera Duskarrow', icon: '🏹', role: 'Sharpshooter', dmg: 8, desc: 'An archer whose arrows find the gaps in any guard.', personality: 'Quiet, watchful, quick to judge and slow to trust.', region: 'emberwastes', quest: 'Avenge her village, razed by the Ashfiend.' },
  ravan: { name: 'Ravan the Seer', icon: '🕯️', role: 'Mystic', dmg: 5, heal: 8, desc: 'A blind seer whose chants mend wounds between blows.', personality: 'Speaks in riddles; sees more without eyes than most do with them.', region: 'skyreach', quest: 'Reach the Skyreach Sanctum he saw in a vision.' },
};

export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };

/** Side & bounty quests (non-linear flavour + reward). */
export const SIDE_QUESTS = [
  { id: 'sq_herbs', type: 'exploration', name: 'The Healer\'s Request', region: 'ashplains', desc: 'Gather sunpetal herbs from the plains for an old healer.', reward: { gold: 30, xp: 25, potion: 2 } },
  { id: 'sq_bounty1', type: 'bounty', name: 'Bounty: The Red Fox', region: 'silentwood', desc: 'A notorious bandit chief hides in the Silent Wood. Bring him down.', combat: 'bandit', hpMult: 2, reward: { gold: 60, xp: 50 } },
  { id: 'sq_relic', type: 'exploration', name: 'The Sunken Relic', region: 'emberwastes', desc: 'Legends speak of a relic buried in the black glass.', reward: { gold: 80, xp: 40, item: 'uncommon' } },
  { id: 'sq_bounty2', type: 'bounty', name: 'Bounty: The Coilfather', region: 'sunkentemple', desc: 'A monstrous naga terrorises pilgrims. End it.', combat: 'naga', hpMult: 2.5, reward: { gold: 120, xp: 90 } },
];
