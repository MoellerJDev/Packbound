# Packbound

Packbound is a browser-based, deterministic, pack-opening tactical autobattler
roguelite prototype.

Long term, Packbound is "MTG Limited meets TFT": packs are the shop, board
construction is tactical and resource-limited, and finite roguelite runs reward
adaptation through traits, duplicates, Sources, economy pressure, and
positioning instead of prebuilt deck optimization.

This repository is intentionally engine-first. Core rules live in pure
TypeScript packages, while the React client is only a thin shell that imports
validated content, opens deterministic packs, validates a planning state, and
resolves combat into an event log.

## Workspace

- `apps/client`: Minimal Vite React debug client.
- `packages/shared`: Serializable domain types, IDs, board positions, zones,
  costs, events, and validation types.
- `packages/content`: Zod schemas plus starter Packbound card, pack, encounter,
  and starter kit content, now expanded into a first archetype micro-set with
  design metadata, display-only trait/teamup definitions, and pack costs.
- `packages/rules`: Seeded RNG, deterministic pack opening, board/source
  validation, trait/teamup summary helpers, pool-based duplicate upgrades,
  combat gold rewards, priced reward purchases, reward offer explanations, and a
  minimal deterministic run-state / reward / encounter / starter kit progression
  skeleton with explicit lifecycle phases and replayable run actions.
- `packages/sim`: Pure deterministic combat simulation and event log output.
- `packages/sim/src/__fixtures__`: Deterministic combat fixtures used by tests to
  preserve representative event ordering and final-state summaries.
- `packages/sim/src/outcomeSummary.ts`: Broad combat outcome summaries used by
  balance smoke tests and future tooling.

## Continuous Integration

GitHub Actions runs the same verification stack expected locally on push and
pull request: install with a frozen pnpm lockfile, then `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm balance:report`, and `pnpm test:browser`. CI installs Playwright
Chromium before the browser smoke step.

## Commands

```sh
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm build
pnpm balance:report
pnpm dev
```

## Architecture Notes

- Game logic must stay outside React and renderer code.
- Randomness in rules and simulation flows through a seeded RNG.
- Content is declarative and validated through Zod before use.
- Combat resolves to serializable events with card instance, definition, owner,
  and side metadata that a future renderer can replay or inspect.
- Run progression is deterministic and serializable: seeds produce reward
  choices, pack openings, combat summaries, round advancement, and terminal
  won/lost states without renderer involvement.
- Encounter selection is deterministic content-driven run logic: each active
  round can prepare an eligible encounter by seed, with final rounds preferring
  boss encounters when available.
- Starter kits and loadout helpers let a run build player combat setup from
  `RunState`; the debug client now resolves combat from run-owned player state
  against content-driven encounters.
- Runs carry an explicit lifecycle phase (`planning`, `combatReady`,
  `combatResolved`, `reward`, `complete`) so combat, rewards, advancement, and
  loadout edits have rules-level guardrails.
- The debug loop now awards deterministic combat gold, shows current gold, and
  makes reward pack choices spend their content-defined costs. Reward choices
  now show deterministic pack-cost and run-relevance explanations for traits,
  duplicate progress, Source/fixing needs, and pack bias.
- Loadout movement preserves full card instance data when cards move between
  pool, board, Source Row, and Spellrail. Board positions remain separate from
  the active card instance store.
- The debug client now supports an ugly playable loop: pick a starter kit, edit
  legal loadout moves, mark combat ready, record deterministic combat, open a
  reward pack, and advance until the run is won or lost.
- The debug client renders a readable combat summary panel from existing combat
  event data while keeping raw events available behind debug details.
- The debug client includes a card inspection panel for readable card details,
  clearer normalized ability text, legal loadout actions, and blocked-action
  reasons, including upgrade progress and why duplicates may be blocked.
- The debug client now opens on a battlefield-first board view with Ally and
  Enemy Inspectors, compact ATK/HP/AS/RNG chips, Source Row resource totals,
  phase-aware next-action guidance, display-only trait/teamup summaries, and
  latest reward markers for newly opened pool cards.
- The battlefield explains the current simulator model honestly: attack, health,
  attack speed, distance targeting, Guard, Barrier, Quickstart, Airborne, and
  AntiAir matter today; range is displayed for card identity but is not yet a
  maximum attack-distance gate.
- Duplicate upgrades currently combine 3 matching Unit or Echo instances in the
  pool at the same level, preserve one deterministic card identity, and add +1
  ATK/+1 HP per upgrade level in combat up to level 2. The debug client also
  surfaces partial duplicate progress, active-vs-pool copy counts, and reasons
  duplicate Relics, Sources, and Techniques are not upgradeable yet.
- Run actions provide a serializable reducer/replay layer for the current loop,
  allowing the debug client and integration tests to share the same action path.
- `pnpm test:browser` runs minimal Playwright smoke tests for the battlefield
  debug loop and duplicate-upgrade regressions, not visual polish or full
  end-to-end coverage. It checks the visible Battlefield, Ally Inspector, Enemy
  Inspector, stat text, reward flow, and upgrade-lab path without screenshots,
  traces, videos, or broad UI snapshots. The debug-only `?scenario=upgrade-lab`
  URL seeds 3 deterministic Cinder Scout pool copies for that browser smoke
  path.
- Property-based invariant tests cover generated seeds, legal loadout action
  sequences, card instance preservation, replay determinism, and mutation safety.
- Core state uses plain objects so future server validation, async ghost PvP,
  and replay tooling can share the same rules engine.

See `IMPLEMENTED_MECHANICS.md` for the current implemented versus
schema-reserved simulator mechanics.
See `TESTING_STRATEGY.md` for the testing pyramid, invariant-test guidance, and
future Codex testing expectations.
See `CARD_DESIGN_GUIDE.md` for Packbound card design principles, terminology,
and current mechanic boundaries.
See `ARCHETYPE_MATRIX.md` for the first micro-set archetypes, card roles,
starter-kit implications, and pack implications.
See `BALANCE_SMOKE_GUIDE.md` for broad content confidence fixtures, pack
usability checks, and how to update expectations without overfitting exact logs.

`pnpm balance:report` prints a deterministic text report for manual review of
starter-vs-encounter outcomes and aggregate pack usability. It is not a
pass/fail balance oracle; use it to spot outliers before or after content
changes.
