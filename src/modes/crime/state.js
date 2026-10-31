/* CRIME — detective profile save/load. */
import { save, loadData, remove, exists, SAVE_KEYS } from '../../engine/save.js';

export function defaultProfile() {
  return {
    v: 1,
    casesSolved: 0,
    casesFailed: 0,
    perfectCases: 0,
    reputation: 50, // 0..100
    cleanStreak: 0, // solved with no wrong accusation, consecutive
    difficulty: 1,
    currentCase: null,
    createdAt: Date.now(),
  };
}

export function saveDetective(p) { return save(SAVE_KEYS.crime, p); }
export function loadDetective() { return loadData(SAVE_KEYS.crime); }
export function hasSave() { return exists(SAVE_KEYS.crime); }
export function deleteSave() { remove(SAVE_KEYS.crime); }
