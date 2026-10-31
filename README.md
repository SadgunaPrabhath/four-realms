# ⚔️ THE FOUR REALMS

### A Living World of Power, Mystery, Survival & Legend

Four genuinely different games inside one premium launcher — sharing a design system, save infrastructure, achievements, codex, and audio, but each with its own gameplay systems and progression.

| Realm | Genre | Core loop |
|---|---|---|
| 👑 **Kingdom** | Deep management sim | Build → economy → diplomacy → war → grow Village → Empire |
| 🕉️ **Mythos** | Original fantasy RPG | Explore → turn-based combat → level up → unlock celestial astras |
| 🕵️ **Crime** | Procedural mystery | Search scene → interrogate → break alibis → accuse the culprit |
| 💀 **Last Life** | Permadeath roguelike | One life, procedural runs, survival, meta-progression |

---

## ▶ How to run

```bash
npm install       # install Vite + Vitest (+ jsdom for DOM tests)
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build → http://localhost:4173
npm test          # run the full test suite (81 tests)
```

Requires **Node 18+** (developed on Node 24). No other setup needed — the game runs entirely in the browser with no backend.

---

## 🏗️ Architecture

Vanilla JavaScript + ES modules, bundled by **Vite**. No UI framework — a tiny hyperscript helper (`h()`) keeps rendering declarative while game logic stays framework-free and unit-testable. **Game logic is strictly separated from UI**: every mode has a pure, deterministic `logic.js` (fully tested) that the `ui.js` renders.

```
src/
  engine/        # reusable world engine
    rng.js         deterministic seeded RNG (all procedural gen)
    store.js       global profile, settings, cross-mode stats, account XP
    save.js        storage abstraction (localStorage now; swap driver for cloud)
    achievements.js  definitions + event-driven unlocks
    codex.js       dynamically-unlocked lore
    audio.js       fully synthesized SFX + procedural ambient music (Web Audio)
    bus.js         cross-system event bus
    narrative.js   OPTIONAL AI flavour layer with local fallback
    dom.js / format.js
  ui/            # shared UI: hub, meta screens, widgets, feedback (toasts/modals/particles)
  modes/
    kingdom/  mythos/  crime/  lastlife/    # each: data.js · logic.js · state.js · ui.js
  styles/        # cinematic dark-fantasy design system (tokens/base/components/layout/screens)
test/          # 81 tests — logic + DOM smoke tests
```

### Determinism
All game-critical numbers (economy, combat, case solutions, loot) run through the seeded `RNG` — never `Math.random`. This makes runs reproducible and testable, and (per the design brief) ensures **no AI can alter critical game values** — the optional AI layer only ever returns decorative text.

---

## ✨ Major features

- **Kingdom:** 15 buildings with real effects, 5 unit types, scaling costs, employment/happiness/loyalty/crime systems, 3 policy categories, 4 AI factions with personality-driven diplomacy (alliance/trade/threaten/war), a battle-resolution system, 9 decision events, and Village→Empire progression with win/lose states.
- **Mythos:** 3 classes, 6 attributes + 6 skills, turn-based combat (light/heavy/special/block/dodge/potion) with stamina & elemental weaknesses, 5 unlockable celestial astras, 7 regions with bosses, recruitable companions that fight alongside you, main + side/bounty quests, permadeath-free defeat handling.
- **Crime:** a procedural case generator that **guarantees a logically-consistent, reasoning-solvable culprit** (verified across 200 generated cases in tests). Search the scene, interrogate suspects by personality, present evidence to break the guilty one's alibi, use the deduction board, and accuse — wrong accusations have consequences. Difficulty and detective rank scale as you solve.
- **Last Life:** true permadeath (the run save is deleted on death), 6 classes (3 meta-unlocked), procedural encounters (combat/events/merchants/camps/ruins/bosses), hunger & survival, 5 escalating regions, and a **Sanctum of Souls** meta-progression that grants *new* runs advantages — never resurrection.
- **Shared:** cinematic hub, 22 achievements, dynamic codex, lifetime statistics, robust save/load with JSON export/import, full settings (audio, difficulty, motion, text size), synthesized audio + ambient music, and responsive desktop/tablet/mobile layouts.

---

## ⚡ Cheats

26 cheats across the realms, with an in-game **Cheats & Codes** screen (main menu → ⚡ Cheats) that explains every one. During play, open the glowing **⚡ button** (bottom-right) or press **`C`** to apply them to your current game.

- **Toggles** (stay on until turned off): God Mode, Free Construction (Kingdom), Boundless Spirit (Mythos infinite stamina), Never Hungry (Last Life).
- **One-shot codes**: unlock all achievements, grant account levels; Kingdom (5k gold, +1000 resources, +500 pop, max morale, +50 troops, ally everyone); Mythos (full heal, +5 levels, unlock all astras, +gold/potions); Crime (find all evidence, break the guilty alibi, reveal the culprit); Last Life (full heal, supplies, stat boost, skip region, +999 fragments, unlock all classes).

Cheats only ever touch the UI layer — the deterministic game logic and its tests are unaffected.

## 🔐 Environment variables

None are required. One optional variable enables the AI narrative layer:

| Variable | Purpose |
|---|---|
| `VITE_AI_PROXY_URL` | URL of a backend proxy **you** control that holds your LLM key server-side and returns `{ "text": "..." }`. If unset, the game uses deterministic local flavour text. |

Copy `.env.example` → `.env` to configure. **Never** place a raw API key in a `VITE_*` variable — Vite inlines those into the client bundle; only ever store a proxy URL.

---

## ⚠️ A note on the Mythos realm

Mythos draws on the *aesthetics and themes* of Indian mythology, but all lore, weapons, characters and events are **original fiction** and are **not** presented as religious scripture. The in-game briefing states this explicitly.

---

## 🧪 Testing

`npm test` runs 81 tests: pure-logic tests for each mode's economy/combat/case-consistency/permadeath, engine tests (RNG determinism, save round-trip), and jsdom **smoke tests** that mount every screen and play through core flows to catch UI runtime errors.

## 🔎 Known limitations & future upgrades

- Combat re-renders the whole battle view each action (fine at this scale; could diff for micro-optimisation).
- AI narrative is architected with a working local fallback but ships without a bundled proxy server.
- Saves are local to one browser; the `save.js` driver abstraction is ready for a cloud backend.
- Future: hex/tile world maps, more events & cases, faction espionage depth, and audio asset packs to layer over the synthesized score.
