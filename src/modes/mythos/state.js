/* MYTHOS — save/load. */
import { save, loadData, remove, exists, SAVE_KEYS } from '../../engine/save.js';

export function saveHero(hero) { return save(SAVE_KEYS.mythos, hero); }
export function loadHero() { return loadData(SAVE_KEYS.mythos); }
export function hasSave() { return exists(SAVE_KEYS.mythos); }
export function deleteSave() { remove(SAVE_KEYS.mythos); }
