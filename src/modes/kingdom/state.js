/* KINGDOM — save/load + event choice application. */
import { save, loadData, remove, exists, SAVE_KEYS } from '../../engine/save.js';
import { RNG } from '../../engine/rng.js';

export function saveGame(gs) { return save(SAVE_KEYS.kingdom, gs); }
export function loadGame() { return loadData(SAVE_KEYS.kingdom); }
export function hasSave() { return exists(SAVE_KEYS.kingdom); }
export function deleteSave() { remove(SAVE_KEYS.kingdom); }

/** Apply an event choice: runs its effect with a deterministic per-turn rng. */
export function applyChoice(gs, event, choice) {
  const rng = new RNG((gs.seed ^ (gs.turn * 2654435761)) >>> 0);
  const msg = choice.effect(gs, rng) || '';
  gs.history.push({ turn: gs.turn, event: event.id, choice: choice.label });
  gs.lastEventId = event.id;
  gs.pendingEvent = null;
  return msg;
}
