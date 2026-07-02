# Packbound

Packbound is a browser-based, deterministic, pack-opening tactical autobattler
roguelite prototype.

This repository is intentionally engine-first. Core rules live in pure
TypeScript packages, while the React client is only a thin shell that imports
validated content, opens deterministic packs, validates a planning state, and
resolves combat into an event log.

## Workspace

- `apps/client`: Minimal Vite React debug client.
- `packages/shared`: Serializable domain types, IDs, board positions, zones,
  costs, events, and validation types.
- `packages/content`: Zod schemas plus starter Packbound card, pack, encounter,
  and starter kit content.
- `packages/rules`: Seeded RNG, deterministic pack opening, board/source
  validation, teamup counting helpers, and a minimal deterministic run-state /
  reward / encounter / starter kit progression skeleton.
- `packages/sim`: Pure deterministic combat simulation and event log output.
- `packages/sim/src/__fixtures__`: Deterministic combat fixtures used by tests to
  preserve representative event ordering and final-state summaries.

## Continuous Integration

GitHub Actions runs the same verification stack expected locally on push and
pull request: install with a frozen pnpm lockfile, then `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Commands

```sh
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

## Architecture Notes

- Game logic must stay outside React and renderer code.
- Randomness in rules and simulation flows through a seeded RNG.
- Content is declarative and validated through Zod before use.
- Combat resolves to serializable events that a future renderer can replay.
- Run progression is deterministic and serializable: seeds produce reward
  choices, pack openings, combat summaries, round advancement, and terminal
  won/lost states without renderer involvement.
- Encounter selection is deterministic content-driven run logic: each active
  round can prepare an eligible encounter by seed, with final rounds preferring
  boss encounters when available.
- Starter kits and loadout helpers let a run build player combat setup from
  `RunState`; the debug client now resolves combat from run-owned player state
  against content-driven encounters.
- Core state uses plain objects so future server validation, async ghost PvP,
  and replay tooling can share the same rules engine.

See `IMPLEMENTED_MECHANICS.md` for the current implemented versus
schema-reserved simulator mechanics.
