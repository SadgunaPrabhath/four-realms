/* ============================================================
   CRIME — procedural case generator.

   DESIGN GUARANTEE (logical consistency):
   1. The TRUTH is built first: a culprit is chosen at random,
      placed at the scene, given access to the murder method.
   2. The culprit CLAIMS a false alibi. Exactly ONE piece of
      "presence" evidence physically contradicts that alibi.
   3. Innocents have TRUTHFUL alibis; no presence evidence
      contradicts them. Any evidence that seems to implicate an
      innocent is a "false lead" fully explained by their secret.
   => The culprit is the unique suspect whose alibi is broken by
      hard evidence AND who had means. The case is solvable by
      cross-referencing evidence with alibis — never arbitrary,
      and the culprit is not tied to a fixed suspect index.
   ============================================================ */
import { RNG } from '../../engine/rng.js';
import { VICTIMS, LOCATIONS, METHODS, TIMES, SUSPECTS, MOTIVES, ALIBIS, METHODS as M } from './data.js';

let caseCounter = 0;

export function generateCase(seed, difficulty = 1) {
  const rng = new RNG(seed);
  const numSuspects = Math.min(5, 3 + Math.floor(difficulty / 2)); // 3..5
  const numFalseLeads = Math.min(numSuspects - 1, 1 + Math.floor(difficulty / 2));

  const victim = rng.pick(VICTIMS);
  const location = rng.pick(LOCATIONS);
  const method = rng.pick(METHODS);
  const time = rng.pick(TIMES);

  // Choose distinct suspects
  const chosen = rng.sample(SUSPECTS, numSuspects);
  const motives = rng.shuffle(MOTIVES).slice(0, numSuspects);
  const alibiPool = rng.shuffle(ALIBIS);

  // Ensure at least one suspect has method access to be a valid culprit
  let culpritIdx = rng.int(0, numSuspects - 1);
  // Prefer a culprit whose role grants method access; if none, grant it.
  const accessIdxs = chosen.map((s, i) => (method.access.includes(s.role) ? i : -1)).filter((i) => i >= 0);
  if (accessIdxs.length) culpritIdx = rng.pick(accessIdxs);

  const suspects = chosen.map((s, i) => {
    const isCulprit = i === culpritIdx;
    const motive = motives[i];
    const claimedAlibi = alibiPool[i] || rng.pick(ALIBIS);
    return {
      id: 's' + i,
      name: s.name,
      occ: s.occ,
      role: s.role,
      personality: s.personality,
      motive: { ...motive },
      claimedAlibi,
      // TRUTH:
      isCulprit,
      trueLocation: isCulprit ? 'the scene' : claimedAlibi,
      alibiTruthful: !isCulprit,
      hasMeansAccess: method.access.includes(s.role) || isCulprit,
      // interrogation state
      questioned: false,
      alibiBroken: false,
      secretRevealed: false,
      cleared: false,
      // red-herring secret (unrelated to murder) for some innocents
      secret: null,
    };
  });

  const culprit = suspects[culpritIdx];

  // ---- Build evidence, consistent with the truth ----
  const evidence = [];
  const spots = rng.shuffle(location.spots);
  let spotIdx = 0;
  const nextSpot = () => spots[spotIdx++ % spots.length];

  // (A) The KEY presence evidence — places the culprit at the scene,
  //     contradicting their false alibi. Always findable, always decisive.
  const presenceKinds = [
    { name: 'a torn scrap of fabric', desc: `A torn scrap of ${describeCloth(rng)} caught on ${'#SPOT#'} — matching a garment worn by SUSPECT.` },
    { name: 'a distinctive boot-print', desc: `A muddy boot-print by #SPOT#, of a size and tread matching SUSPECT's boots.` },
    { name: 'a dropped personal token', desc: `A monogrammed token dropped near #SPOT#, bearing SUSPECT's initials.` },
    { name: 'a strand of hair', desc: `A strand of hair at #SPOT#, of a colour and length matching SUSPECT.` },
  ];
  const pk = rng.pick(presenceKinds);
  const presenceSpot = nextSpot();
  evidence.push({
    id: 'e_presence',
    name: pk.name,
    desc: pk.desc.replace('#SPOT#', presenceSpot).replace('SUSPECT', culprit.name),
    spot: presenceSpot,
    type: 'presence',
    implicates: culprit.id,
    contradictsAlibiOf: culprit.id,
    key: true,
    found: false,
  });

  // (B) Means evidence — the weapon/method clue.
  const meansSpot = nextSpot();
  evidence.push({
    id: 'e_means',
    name: method.weapon,
    desc: `The instrument of death: ${method.weapon}, revealing ${method.clue}. Only someone with the knowledge or access of ${accessRoleText(method)} would wield it so.`,
    spot: meansSpot,
    type: 'means',
    implicates: null,
    key: true,
    found: false,
  });

  // (C) Motive evidence — a document revealing the culprit's motive (and maybe one innocent's, as noise).
  const motiveSpot = nextSpot();
  evidence.push({
    id: 'e_motive',
    name: 'a hidden letter',
    desc: `A concealed letter revealing that ${culprit.name} ${culprit.motive.text} of ${victim.name}. A powerful reason for murder.`,
    spot: motiveSpot,
    type: 'motive',
    implicates: culprit.id,
    key: true,
    found: false,
  });

  // (D) False leads — implicate innocents, but each is explained by that
  //     innocent's TRUTHFUL alibi/secret (revealed under interrogation).
  const innocents = suspects.filter((s) => !s.isCulprit);
  const falseTargets = rng.sample(innocents, Math.min(numFalseLeads, innocents.length));
  falseTargets.forEach((inn, k) => {
    const secretPool = [
      { hint: 'a gambling debt', explain: `was secretly at ${inn.claimedAlibi}, settling ${'a gambling debt'} — shameful, but true, and confirmed by a witness there.` },
      { hint: 'a forbidden romance', explain: `was meeting a secret lover at ${inn.claimedAlibi}. Embarrassing, but it holds — the lover has vouched for them.` },
      { hint: 'petty theft from the pantry', explain: `had pilfered from the pantry that night and feared being blamed — but was nowhere near ${'the scene'}.` },
    ];
    const sec = rng.pick(secretPool);
    inn.secret = sec.explain;
    const spot = nextSpot();
    evidence.push({
      id: 'e_false' + k,
      name: rng.pick(['a suspicious debt-note', 'an anxious hand-written note', 'a misplaced trinket', 'a smear of something dark']),
      desc: `Something that seems to point to ${inn.name} — a hint of ${sec.hint}. It looks damning at first glance.`,
      spot,
      type: 'false',
      implicates: inn.id,
      contradictsAlibiOf: null, // does NOT actually break their alibi
      key: false,
      found: false,
    });
  });

  // (E) A witness statement — corroborates an attribute of the culprit (consistent hint).
  const witnessClue = pk.name.includes('fabric')
    ? `I saw someone in ${describeCloth(rng)} slip toward ${location.scene} near ${time}.`
    : `Someone was lurking near ${location.scene} around ${time} — I couldn't see the face, but they moved with purpose.`;
  evidence.push({
    id: 'e_witness',
    name: 'a witness account',
    desc: `A servant's testimony: "${witnessClue}"`,
    spot: nextSpot(),
    type: 'witness',
    implicates: null,
    key: false,
    found: false,
  });

  caseCounter++;
  return {
    id: 'case_' + seed,
    seed,
    difficulty,
    number: caseCounter,
    title: caseTitle(rng, victim, location),
    victim,
    location,
    method,
    time,
    suspects,
    evidence,
    culpritId: culprit.id, // internal truth — never shown until solved
    // player progress
    accusationsMade: 0,
    wrongAccusations: 0,
    solved: false,
    failed: false,
    searched: {}, // spot -> true
    intro: `${victim.name}, ${victim.occ}, was found dead in ${location.scene} of ${location.name}, at ${time}. The cause: ${method.name}. The household is in uproar — and everyone has something to hide.`,
  };
}

function describeCloth(rng) { return rng.pick(['a deep green cloak', 'a crimson shawl', 'a grey travelling coat', 'a midnight-blue scarf', 'a tan riding jacket']); }
function accessRoleText(method) { return method.access.slice(0, 2).map((r) => 'a ' + r).join(' or '); }
function caseTitle(rng, victim, loc) {
  const t = rng.pick(['The Affair at', 'A Death at', 'The Shadow over', 'Murder at', 'The Secret of']);
  return `${t} ${loc.name}`;
}

/** Reset counter (for deterministic tests). */
export function _resetCounter() { caseCounter = 0; }
