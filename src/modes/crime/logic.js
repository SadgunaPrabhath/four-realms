/* ============================================================
   CRIME — investigation logic. Pure, deterministic.
   ============================================================ */
import { PERSONALITY_LINES, RANKS } from './data.js';

export function suspectById(c, id) { return c.suspects.find((s) => s.id === id); }
export function foundEvidence(c) { return c.evidence.filter((e) => e.found); }
export function keyEvidence(c) { return c.evidence.filter((e) => e.key); }
export function foundKeyCount(c) { return c.evidence.filter((e) => e.key && e.found).length; }
export function allSpots(c) { return c.location.spots; }

/** Search a scene spot; reveal any evidence hidden there. */
export function searchSpot(c, spot) {
  const already = !!c.searched[spot];
  c.searched[spot] = true;
  const here = c.evidence.filter((e) => e.spot === spot);
  const newlyFound = [];
  for (const e of here) { if (!e.found) { e.found = true; newlyFound.push(e); } }
  return { newlyFound, empty: here.length === 0, already };
}

/** Interrogation base statements for a suspect. */
export function interrogate(c, id) {
  const s = suspectById(c, id);
  s.questioned = true;
  const lines = PERSONALITY_LINES[s.personality] || PERSONALITY_LINES.composed;
  return {
    alibi: `"At ${c.time}? I was ${s.claimedAlibi}. You can hardly suspect me."`,
    relation: `"My relationship with ${c.victim.name}? We had our... history. Everyone did."`,
    deny: `"${lines.deny}"`,
    motiveHint: s.motiveKnown ? `They ${s.motive.text} of ${c.victim.name}.` : null,
  };
}

/**
 * Present a piece of evidence to a suspect.
 * Returns { outcome, text, contradiction, cleared, brokeAlibi }.
 *   - 'contradiction' : evidence breaks this suspect's (false) alibi → they are the culprit-shaped lie.
 *   - 'cleared'       : false-lead evidence explained by innocent's secret → they are cleared.
 *   - 'nothing'       : evidence unrelated to this suspect.
 */
export function presentEvidence(c, suspectId, evidenceId) {
  const s = suspectById(c, suspectId);
  const e = c.evidence.find((x) => x.id === evidenceId);
  const lines = PERSONALITY_LINES[s.personality] || PERSONALITY_LINES.composed;
  if (!e || !e.found) return { outcome: 'nothing', text: 'You have not recovered that evidence yet.' };

  // The decisive contradiction: presence evidence vs the culprit's false alibi.
  if (e.contradictsAlibiOf === suspectId) {
    if (!s.alibiBroken) {
      s.alibiBroken = true;
      s.motiveKnown = true;
      return {
        outcome: 'contradiction',
        contradiction: true,
        brokeAlibi: true,
        text: `You lay ${e.name} before ${s.name}. "You claim you were ${s.claimedAlibi}. Yet THIS places you at ${c.location.scene} at ${c.time}. Explain that." ${lines.crack}`,
      };
    }
    return { outcome: 'contradiction', contradiction: true, text: `${s.name}'s broken alibi hangs in the air. They have no answer.` };
  }

  // A false lead pointed at an innocent → they explain it, clearing themselves.
  if (e.type === 'false' && e.implicates === suspectId) {
    s.secretRevealed = true;
    s.cleared = true;
    return {
      outcome: 'cleared',
      cleared: true,
      text: `${s.name} flushes. "That? Yes, it's mine. But it's not what you think — I ${s.secret}" — a secret, but not murder. Their account checks out.`,
    };
  }

  // Motive evidence naming this suspect → reveals motive but not guilt.
  if (e.type === 'motive' && e.implicates === suspectId) {
    s.motiveKnown = true;
    return { outcome: 'motive', text: `"So you've found the letter." ${s.name} looks away. "A motive is not a murder, detective."` };
  }

  // Otherwise: nothing incriminating.
  return { outcome: 'nothing', text: `${s.name} studies the evidence. "I fail to see what this has to do with me."` };
}

/** Make an accusation. Returns result + updates case state. */
export function accuse(c, suspectId) {
  c.accusationsMade++;
  const correct = suspectId === c.culpritId;
  if (correct) {
    c.solved = true;
    const culprit = suspectById(c, suspectId);
    const perfect = c.wrongAccusations === 0 && foundKeyCount(c) === keyEvidence(c).length && culprit.alibiBroken;
    c.perfect = perfect;
    return { correct: true, perfect, culprit };
  }
  c.wrongAccusations++;
  // After too many wrong accusations, the case is lost (suspect flees / dept distrust).
  if (c.wrongAccusations >= 2) { c.failed = true; }
  return { correct: false, failed: c.failed, remaining: 2 - c.wrongAccusations };
}

/** Reward for solving, scaled by cleanliness + difficulty. */
export function caseReward(c) {
  const base = 40 + c.difficulty * 20;
  const perfectBonus = c.perfect ? 60 : 0;
  const penalty = c.wrongAccusations * 15;
  return { xp: Math.max(15, base + perfectBonus - penalty), rep: c.perfect ? 3 : c.wrongAccusations ? 1 : 2 };
}

export function rankFor(solvedCount) {
  let r = RANKS[0];
  for (const rank of RANKS) if (solvedCount >= rank.solved) r = rank;
  return r.title;
}

/** Deduction confidence hint (does not reveal the answer). */
export function deductionHint(c) {
  const brokenSuspects = c.suspects.filter((s) => s.alibiBroken);
  const foundAllKey = foundKeyCount(c) === keyEvidence(c).length;
  if (brokenSuspects.length === 1 && foundAllKey) return { level: 'ready', text: 'One suspect\'s alibi is shattered and all key evidence is in hand. You are ready to accuse.' };
  if (brokenSuspects.length === 1) return { level: 'close', text: 'A broken alibi points the way — but gather all the evidence before you accuse.' };
  if (foundAllKey) return { level: 'mid', text: 'You hold all the key evidence. Now break the guilty one\'s alibi in interrogation.' };
  return { level: 'early', text: 'Search the scene for evidence, then confront the suspects with what you find.' };
}
