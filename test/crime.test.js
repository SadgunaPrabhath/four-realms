import { describe, it, expect } from 'vitest';
import { generateCase } from '../src/modes/crime/generator.js';
import * as L from '../src/modes/crime/logic.js';

function solvePathExists(c) {
  // Search everywhere to collect all evidence
  for (const spot of c.location.spots) L.searchSpot(c, spot);
  return c;
}

describe('crime: case generation consistency', () => {
  it('every case has exactly one culprit among its suspects', () => {
    for (let s = 1; s <= 200; s++) {
      const c = generateCase(s * 13, 3);
      const culprits = c.suspects.filter((x) => x.isCulprit);
      expect(culprits).toHaveLength(1);
      expect(c.culpritId).toBe(culprits[0].id);
    }
  });

  it('culprit is NOT always the same suspect index (no fixed pattern)', () => {
    const indices = new Set();
    for (let s = 1; s <= 100; s++) {
      const c = generateCase(s * 7 + 3, 4);
      indices.add(c.suspects.findIndex((x) => x.isCulprit));
    }
    expect(indices.size).toBeGreaterThan(2); // varied culprit positions
  });

  it('the culprit is the UNIQUE suspect whose alibi can be broken by evidence', () => {
    for (let s = 1; s <= 150; s++) {
      const c = generateCase(s * 29, 3);
      const breakable = c.suspects.filter((sus) =>
        c.evidence.some((e) => e.contradictsAlibiOf === sus.id));
      expect(breakable).toHaveLength(1);
      expect(breakable[0].isCulprit).toBe(true);
    }
  });

  it('every culprit has means access', () => {
    for (let s = 1; s <= 100; s++) {
      const c = generateCase(s * 17 + 1, 5);
      const culprit = c.suspects.find((x) => x.isCulprit);
      expect(culprit.hasMeansAccess).toBe(true);
    }
  });

  it('innocents have truthful alibis and are never contradicted by evidence', () => {
    for (let s = 1; s <= 100; s++) {
      const c = generateCase(s * 41, 4);
      for (const sus of c.suspects) {
        if (!sus.isCulprit) {
          expect(sus.alibiTruthful).toBe(true);
          const contradicted = c.evidence.some((e) => e.contradictsAlibiOf === sus.id);
          expect(contradicted).toBe(false);
        }
      }
    }
  });

  it('presence + means + motive key evidence always exist and are findable', () => {
    for (let s = 1; s <= 80; s++) {
      const c = generateCase(s * 53, 3);
      expect(c.evidence.some((e) => e.type === 'presence' && e.key)).toBe(true);
      expect(c.evidence.some((e) => e.type === 'means' && e.key)).toBe(true);
      expect(c.evidence.some((e) => e.type === 'motive' && e.key)).toBe(true);
      // all evidence sits in a real scene spot
      for (const e of c.evidence) expect(c.location.spots).toContain(e.spot);
    }
  });
});

describe('crime: investigation flow', () => {
  it('searching a spot reveals its evidence', () => {
    const c = generateCase(12345, 2);
    const presence = c.evidence.find((e) => e.type === 'presence');
    expect(presence.found).toBe(false);
    L.searchSpot(c, presence.spot);
    expect(presence.found).toBe(true);
  });

  it('presenting presence-evidence to the culprit breaks their alibi', () => {
    const c = generateCase(9876, 3);
    solvePathExists(c);
    const culprit = c.suspects.find((x) => x.isCulprit);
    const presence = c.evidence.find((e) => e.contradictsAlibiOf === culprit.id);
    const res = L.presentEvidence(c, culprit.id, presence.id);
    expect(res.contradiction).toBe(true);
    expect(culprit.alibiBroken).toBe(true);
  });

  it('presenting the same evidence to an innocent does NOT break an alibi', () => {
    const c = generateCase(555, 3);
    solvePathExists(c);
    const culprit = c.suspects.find((x) => x.isCulprit);
    const innocent = c.suspects.find((x) => !x.isCulprit);
    const presence = c.evidence.find((e) => e.contradictsAlibiOf === culprit.id);
    const res = L.presentEvidence(c, innocent.id, presence.id);
    expect(res.contradiction).toBeFalsy();
    expect(innocent.alibiBroken).toBe(false);
  });

  it('accusing the culprit solves the case', () => {
    const c = generateCase(2024, 3);
    solvePathExists(c);
    const culprit = c.suspects.find((x) => x.isCulprit);
    const res = L.accuse(c, culprit.id);
    expect(res.correct).toBe(true);
    expect(c.solved).toBe(true);
  });

  it('two wrong accusations fail the case', () => {
    const c = generateCase(4040, 3);
    const innocents = c.suspects.filter((x) => !x.isCulprit);
    L.accuse(c, innocents[0].id);
    expect(c.failed).toBe(false);
    L.accuse(c, innocents[1] ? innocents[1].id : innocents[0].id);
    expect(c.failed).toBe(true);
  });

  it('perfect solve requires all key evidence + broken alibi + no wrong accusation', () => {
    const c = generateCase(7, 3);
    solvePathExists(c);
    const culprit = c.suspects.find((x) => x.isCulprit);
    const presence = c.evidence.find((e) => e.contradictsAlibiOf === culprit.id);
    L.presentEvidence(c, culprit.id, presence.id);
    const res = L.accuse(c, culprit.id);
    expect(res.correct).toBe(true);
    expect(res.perfect).toBe(true);
  });
});
