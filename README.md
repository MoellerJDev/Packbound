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
- `packages/content`: Zod schemas plus starter Packbound card and pack content.
- `packages/rules`: Seeded RNG, deterministic pack opening, board/source
  validation, and teamup counting helpers.
- `packages/sim`: Pure deterministic combat simulation and event log output.

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
- Core state uses plain objects so future server validation, async ghost PvP,
  and replay tooling can share the same rules engine.
