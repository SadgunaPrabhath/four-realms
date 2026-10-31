/* ============================================================
   CRIME — data pools for the procedural case generator.
   ============================================================ */

export const VICTIMS = [
  { name: 'Lord Aldric Vayne', occ: 'a wealthy landowner', pronoun: 'his' },
  { name: 'Madame Corvina Bell', occ: 'a celebrated opera singer', pronoun: 'her' },
  { name: 'Professor Elias Thorn', occ: 'a reclusive scholar', pronoun: 'his' },
  { name: 'Miss Rosalind Ashe', occ: 'a society heiress', pronoun: 'her' },
  { name: 'Mr. Gideon Marlowe', occ: 'a shipping magnate', pronoun: 'his' },
  { name: 'Dr. Helena Frost', occ: 'a physician', pronoun: 'her' },
];

export const LOCATIONS = [
  { name: 'Blackthorn Manor', scene: 'the study', spots: ['the writing desk', 'the fireplace', 'the bookshelf', 'the window', 'the wine cabinet'] },
  { name: 'the Gilded Theatre', scene: 'the dressing room', spots: ['the vanity', 'the costume rack', 'the mirror', 'the doorway', 'the settee'] },
  { name: 'Ravenscroft Estate', scene: 'the conservatory', spots: ['the fountain', 'the flowerbeds', 'the glass panes', 'the garden bench', 'the tool shed'] },
  { name: 'the Harborside Townhouse', scene: 'the drawing room', spots: ['the mantel', 'the card table', 'the drapes', 'the liquor tray', 'the hearthrug'] },
];

/** Murder methods. Each implies an access profile. */
export const METHODS = [
  { id: 'poison', name: 'poisoning', clue: 'a faint bitter-almond scent', access: ['physician', 'apothecary', 'cook', 'servant'], weapon: 'a tainted glass of wine' },
  { id: 'blade', name: 'a stabbing', clue: 'a single deep wound', access: ['soldier', 'butcher', 'rival', 'gambler'], weapon: 'a slender letter-opener' },
  { id: 'blunt', name: 'a blunt-force blow', clue: 'a shattered ornament', access: ['laborer', 'rival', 'guard', 'gambler'], weapon: 'a heavy brass candlestick' },
  { id: 'strangle', name: 'strangulation', clue: 'bruising at the throat', access: ['soldier', 'laborer', 'guard'], weapon: 'a length of curtain cord' },
];

export const TIMES = ['a quarter past nine', 'the stroke of midnight', 'half past ten', 'the early evening', 'just before dawn'];

/** Suspect archetypes. `role` maps to method access. */
export const SUSPECTS = [
  { name: 'Sebastian Crane', occ: 'the family physician', role: 'physician', personality: 'composed' },
  { name: 'Vivienne Larkspur', occ: 'the estranged sister', role: 'rival', personality: 'defiant' },
  { name: 'Cornelius Pike', occ: 'the business partner', role: 'gambler', personality: 'nervous' },
  { name: 'Beatrice Holloway', occ: 'the head housekeeper', role: 'servant', personality: 'evasive' },
  { name: 'Major Reginald Ash', occ: 'a retired soldier', role: 'soldier', personality: 'blunt' },
  { name: 'Silas Grimm', occ: 'the groundskeeper', role: 'laborer', personality: 'sullen' },
  { name: 'Ophelia Wren', occ: 'the young ward', role: 'rival', personality: 'tearful' },
  { name: 'Barnaby Dunn', occ: 'the wine merchant', role: 'apothecary', personality: 'jovial' },
  { name: 'Mrs. Agatha Vole', occ: 'the cook', role: 'cook', personality: 'stern' },
  { name: 'Lucian Vex', occ: 'the private secretary', role: 'gambler', personality: 'smooth' },
];

/** Motives with flavour. Strength is narrative only — NOT a solution shortcut. */
export const MOTIVES = [
  { type: 'inheritance', text: 'stood to inherit a fortune upon the death', strength: 3 },
  { type: 'debt', text: 'owed a crushing debt the victim was about to call in', strength: 3 },
  { type: 'jealousy', text: 'harbored a bitter jealousy over a spurned affection', strength: 2 },
  { type: 'revenge', text: 'nursed a grudge over an old betrayal', strength: 2 },
  { type: 'blackmail', text: 'was being blackmailed by the victim', strength: 3 },
  { type: 'rivalry', text: 'was locked in a ruinous professional rivalry', strength: 2 },
  { type: 'scandal', text: 'feared exposure of a shameful secret', strength: 2 },
];

/** Alibi locations suspects claim (away from the scene). */
export const ALIBIS = [
  'at the tavern across town', 'attending the evening service at the chapel', 'away visiting relatives',
  'asleep in their quarters', 'walking alone in the gardens', 'at the card tables of the Crimson Club',
  'meeting a creditor in the city', 'tending the horses in the stables',
];

/** Personalities alter interrogation tone / cracking difficulty. */
export const PERSONALITY_LINES = {
  composed: { deny: 'I have nothing to hide, detective. Ask what you will.', crack: 'The composure cracks. "…You misunderstand. Let me explain."' },
  defiant: { deny: 'How dare you. I will not be spoken to like a common criminal.', crack: 'The defiance drains away. "…Fine. FINE. You want the truth?"' },
  nervous: { deny: 'I-I don\'t know what you mean. I wasn\'t— I mean—', crack: 'They go white as a sheet. "Oh God. Oh God, you know, don\'t you?"' },
  evasive: { deny: 'I couldn\'t say, I\'m sure. I keep to my duties.', crack: 'The evasions collapse. "…I suppose there\'s no use pretending now."' },
  blunt: { deny: 'Say your piece plainly. I\'ve no patience for riddles.', crack: 'The soldier\'s jaw tightens. "…Aye. I\'ll not deny it any longer."' },
  sullen: { deny: 'Don\'t much like questions.', crack: 'The sullen mask breaks. "…Alright. You caught me out."' },
  tearful: { deny: 'Please, I could never— *sob* —how could you think it?', crack: 'The weeping stops, cold and sudden. "…Clever. Too clever."' },
  jovial: { deny: 'Ha! Me? Detective, you flatter my ambitions.', crack: 'The smile freezes. "…Ah. Well. This is awkward, isn\'t it."' },
  stern: { deny: 'I run a clean kitchen and a clean conscience.', crack: 'The sternness falters. "…Lord forgive me."' },
  smooth: { deny: 'I\'m sure we can clear this up like reasonable people.', crack: 'The polish vanishes. "…You\'re better at this than I hoped."' },
};

/** Detective rank progression by cases solved. */
export const RANKS = [
  { solved: 0, title: 'Constable' },
  { solved: 2, title: 'Detective Sergeant' },
  { solved: 4, title: 'Detective Inspector' },
  { solved: 7, title: 'Chief Inspector' },
  { solved: 11, title: 'Master Detective' },
];
