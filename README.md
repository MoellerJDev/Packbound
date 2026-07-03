# Packbound

Packbound is a browser-based, deterministic, pack-opening tactical autobattler
roguelite prototype.

Long term, Packbound is "MTG Limited meets TFT": packs are the shop, board
construction is tactical and resource-limited, and finite roguelite runs reward
adaptation through traits, duplicates, Sources, economy pressure, and
positioning instead of prebuilt deck optimization.

Packbound is also exploring a future persistent, recastable Commander-style
starter layer for run identity, with packs still providing the run's primary
adaptation and growth.

This repository is intentionally engine-first. Core rules live in pure
TypeScript packages, while the React client is only a thin shell that imports
validated content, opens deterministic packs, validates a planning state, and
resolves combat into an event log.

## Live Demo

The GitHub Pages build is an internal/prototype browser demo for development
sharing:

https://moellerjdev.github.io/Packbound/

Deployment happens automatically from `main` after CI verification passes. The
demo is not a finished game or public release. The default route is the
React/CSS debug client, and `?scenario=renderer-lab` exposes a Pixi-centric
renderer lab with the React/CSS board kept as a collapsed debug fallback.

GitHub Pages must be configured in the repository settings to use GitHub
Actions as the Pages source. If the repository remains private, Pages
availability may depend on the GitHub plan and repository settings. Treat Pages
sites as publicly accessible demos, and do not include secrets in the built
client.

## License

Packbound is source-visible for development transparency and prototype demo
sharing, but it is not open source. The code, game design, content, names,
rules, and project materials remain proprietary unless explicit written
permission is granted. No permission is granted to reuse, redistribute,
sublicense, or create derivative works without explicit written permission.

See `LICENSE` for the full proprietary notice.

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

On pushes to `main`, a separate deploy job runs after verification, builds the
Vite client with the GitHub Pages base path, uploads `apps/client/dist` as a
Pages artifact, and deploys through GitHub Actions Pages. Pull requests verify
the project but do not deploy.

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
- Runs now include a minimal Command Zone Commander prototype: starter-created
  runs derive one prototype Commander from existing Unit/Echo context, can
  deploy it to the board during planning, return it to Command during planning,
  and track visible deploy count plus Rebind Tax.
- Runs carry an explicit lifecycle phase (`planning`, `combatReady`,
  `combatResolved`, `reward`, `complete`) so combat, rewards, advancement, and
  loadout edits have rules-level guardrails.
- Encounters now have a minimal serializable match shell for future multi-turn
  play: first main, combat skirmish, second main, end, alternating active actors,
  true alternating priority, a LIFO action stack, and stability-based outcomes.
  The first real action is a `Prototype Pressure Technique` main-phase skeleton
  that queues from validated player Spellrail Technique source context and
  records a match-local `usedOnResolve` lifecycle event, while debug
  placeholders remain for diagnostics. Combat skirmishes still use the
  deterministic simulator result.
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
- The debug client now opens on a battlefield-first compact CSS Hex Arena with
  Ally and Enemy Inspectors, inspectable fixed-size hex tokens, compact
  ATK/HP/AS/RNG chips, Source Row resource totals, phase-aware next-action
  guidance, board-first selected Unit/Echo range, likely target, attack-now or
  out-of-range markers, next-move previews, display-only trait/teamup summaries,
  and latest reward markers for newly opened pool cards.
- The debug client also includes an opt-in PixiJS renderer lab at
  `?scenario=renderer-lab`. It keeps React as the app shell and makes Pixi the
  primary battlefield for that route, with the React/CSS Hex Arena collapsed as
  a debug fallback. Pixi uses the same canonical odd-r board coordinates as the
  rules, engagement preview, and simulator; tokens are selectable, feed the
  existing inspector, and support a minimal click-to-place flow for legal
  Pool/Bench board permanents. The default route still uses the React/CSS Hex
  Arena debug board.
- The battlefield explains the current simulator model honestly: attack, health,
  attack speed, odd-r hex range, neighboring-hex movement, distance targeting,
  Guard, Barrier, Quickstart, Airborne, and AntiAir matter today.
- Duplicate upgrades currently combine 3 matching Unit or Echo instances in the
  pool at the same level, preserve one deterministic card identity, and add +1
  ATK/+1 HP per upgrade level in combat up to level 2. The debug client also
  surfaces partial duplicate progress, active-vs-pool copy counts, and reasons
  duplicate Relics, Sources, and Techniques are not upgradeable yet.
- Run actions provide a serializable reducer/replay layer for the current loop,
  allowing the debug client and integration tests to share the same action path.
- `pnpm test:browser` runs minimal Playwright smoke tests for the battlefield
  debug loop and duplicate-upgrade regressions, not visual polish or full
  end-to-end coverage. It checks the visible Battlefield, compact Hex Arena,
  engagement preview markers, Ally Inspector, Enemy Inspector, starter token
  visibility, stat text, reward flow, priority-lab path, upgrade-lab path, and
  no horizontal arena scroll without screenshots, traces, videos, or broad UI
  snapshots. The debug-only
  `?scenario=upgrade-lab` URL seeds 3 deterministic Cinder Scout pool copies
  for that browser smoke path, while `?scenario=engagement-lab` seeds a
  deterministic out-of-range Cinder Scout preview with a visible next move, and
  `?scenario=priority-lab` shows the encounter priority/stack/phase shell.
  `?scenario=renderer-lab` mounts the Pixi battlefield canvas and verifies the
  replay controls without screenshot assertions.
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
