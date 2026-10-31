/* ============================================================
   Optional AI narrative layer.

   The game is FULLY playable without any AI. Core game state is
   always deterministic (see modes/ * /logic.js) — the AI only ever
   decorates FLAVOUR TEXT, never game values.

   - narrateLocal(): always-available, deterministic procedural
     flavour. Used everywhere by default.
   - narrate(): if the player enabled AI narration AND a backend
     PROXY url is configured (VITE_AI_PROXY_URL), it asks the proxy
     for richer prose; otherwise it silently falls back to local.

   SECURITY: no API key ever lives in the frontend. You point
   VITE_AI_PROXY_URL at a small server you control that holds the
   key and forwards requests to your LLM provider. If it is unset,
   the game just uses local flavour.
   ============================================================ */
import { RNG } from './rng.js';
import { state } from './store.js';

const PROXY_URL = import.meta.env?.VITE_AI_PROXY_URL || '';

const RUMORS = [
  'They say the old empires drowned in their own gold.',
  'A blade is only as loyal as the hand that feeds it.',
  'The dead keep better secrets than the living.',
  'Every crown is heavier than it looks.',
  'Some doors, once opened, cannot be closed.',
  'The wilds do not hate you. They simply do not care.',
  'Truth is patient. It waits for the clever.',
  'Legends are only survivors with good chroniclers.',
];

/** Deterministic local flavour — always works, no network. */
export function narrateLocal(kind, ctx = {}) {
  const seed = (ctx.seed ?? Date.now()) ^ hashKind(kind);
  const rng = new RNG(seed);
  switch (kind) {
    case 'rumor': return rng.pick(RUMORS);
    default: return ctx.fallback || rng.pick(RUMORS);
  }
}

function hashKind(k) { let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return h >>> 0; }

/** Whether the optional AI layer is actually available & enabled. */
export function aiAvailable() { return !!PROXY_URL && !!state.settings?.aiNarration; }

/**
 * Async narration with graceful fallback. Never throws; always
 * resolves to a usable string. Returns local flavour instantly
 * when AI is unavailable.
 */
export async function narrate(kind, ctx = {}) {
  const local = narrateLocal(kind, ctx);
  if (!aiAvailable()) return local;
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, context: ctx }),
    });
    if (!res.ok) return local;
    const data = await res.json();
    return (typeof data?.text === 'string' && data.text.trim()) ? data.text.trim() : local;
  } catch {
    return local; // network/AI failure → seamless fallback
  }
}
