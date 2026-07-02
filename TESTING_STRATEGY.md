# Packbound Testing Strategy

Packbound is built as a deterministic rules engine first. Tests should protect
that architecture before they try to prove that the game is fun.

## Principles

- Rules and simulation must be deterministic for the same inputs and seeds.
- Game logic belongs in pure packages, not React or renderer code.
- Rules and simulator code must not use `Math.random()`.
- Core state, content, and run actions must stay plain JSON-serializable data.
- Content validation should fail early through Zod and catalog reference checks.
- Specific mechanics need focused example tests.
- Shared invariants need property-based tests with small generated cases.
- Combat fixtures should preserve representative event ordering and final-state
  summaries.
- Balance smoke tests should use broad ranges to catch content outliers without
  pretending to solve balance.
- Full-loop integration tests should prove run actions can be replayed from an
  initial run.
- Manual playtesting is still required for fun, readability, pacing, balance,
  and UX.

## Test Pyramid

```txt
Static checks
Content validation
Unit tests
Property/invariant tests
Integration/replay tests
Combat fixtures
Balance smoke tests
UI smoke tests
Manual playtesting checklist
```

## Current Layers

### Static Checks

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` before
shipping changes. These catch style drift, import mistakes, type holes, and
package boundary issues.

### Content Validation

Content schemas and catalog validation should reject malformed card, pack,
encounter, and starter kit definitions. Reference-bearing effects should be
validated centrally so future effect types can be added without scattered checks.

### Unit Tests

Use focused unit tests for deterministic helpers and specific mechanics:

- pack opening
- reward offer explanations
- planning validation
- starter kit creation
- loadout movement
- run lifecycle phases
- encounter selection
- individual simulator mechanics

Every new mechanic should get unit tests that cover the smallest meaningful
behavior.

### Property Tests

Use `fast-check` for generated invariant tests. Keep generated cases small and
based on sample content unless a task specifically expands the content model.

Current property-test priorities:

- generated seeds create serializable runs
- legal loadout action sequences do not mutate previous states
- card instances keep identity and modifiers through zone round trips
- a card instance cannot live in more than one run zone at once
- replaying the same action list from the same initial run is deterministic
- debug-facing helpers such as validation and combat setup do not mutate runs

Every new zone or run action should add or extend invariant tests.

### Integration And Replay Tests

Run actions are the bridge between UI, future server validation, and saved run
replays. Integration tests should build an initial run, apply a serializable
action list through the reducer, replay that action list, and assert identical
final state.

Action history is intentionally kept outside `RunState` for now. Some actions
can contain combat event logs, so embedding history in every run snapshot would
duplicate large data. External `RunActionLogEntry` values are serializable and
can be persisted or replayed by future tooling without bloating core run state.

### Combat Fixtures

Combat fixture tests should cover representative boards and preserve stable
event ordering, warning codes, event metadata, and final summaries. Combat event
metadata is part of replay, report, and debugging confidence. Add fixtures when
a simulator change affects multiple systems or when a bug is easiest to prevent
with a saved scenario.

### Balance Smoke Tests

Balance smoke tests sit between replay integration and manual playtesting. They
should exercise starter kits, encounters, packs, and broad combat outcomes with
deterministic seeds. They should assert categories and ranges such as allowed
winners, maximum warnings, required event types, maximum duration, starter
survivability, boss danger, and aggregate pack archetype coverage.

Do not pin exact full event logs or exact event counts in balance smoke tests.
If a content change makes a fixture fail because the new outcome is intentional
and healthier, update the expectation range. If it fails because a starter,
encounter, or pack became impossible or nonsensical, fix the content.

See `BALANCE_SMOKE_GUIDE.md` for current fixture expectations and update
guidance.

The `pnpm balance:report` script is observational tooling for manual review. It
prints the same kind of broad outcome and pack-usability data, while smoke tests
remain the automated pass/fail guardrails.

### UI Smoke Tests

The debug client has small Playwright smoke tests for the current browser loop
and the duplicate-upgrade path. They start the Vite client, load the app,
inspect a card, ready and record combat, open a reward, verify latest reward
markers, advance the run, and use a debug-only upgrade lab scenario to click an
actual Unit upgrade, inspect the upgraded stats, and verify the Upgrade Progress
panel/inspector wording for that stable duplicate scenario. The debug-loop smoke
also checks that reward explanations render, and that compact player and enemy
board grids can inspect board cards without asserting exact visual layout. CI
installs Playwright Chromium and runs the same smoke tests with
`pnpm test:browser`. Keep this layer focused on stable text and roles. Avoid
screenshots, broad brittle snapshots, animation timing, and visual assertions.

### Manual Playtesting

Automated tests cannot answer whether a run feels good. Manual checks should
cover:

- pack choices feel understandable
- loadout decisions are visible
- validation errors are readable
- combat logs/replays communicate what happened
- pacing between reward, planning, and combat feels clear
- balance outliers are noted, not silently normalized by tests

## Future Systems Test Guidance

Traits/teamups should start with content coverage tests. Each starter, pack
family, and intended cross-trait bridge should have at least one fixture that
proves the teamup can be activated or nearly activated from real content.
The first display-only trait layer covers trait definition validity, card trait
references, starter trait summaries, active/near-active calculation, and Source
Row contribution.

Duplicate upgrades need property tests before broad content usage. Important
invariants include preserving card identity where intended, consuming duplicate
instances deterministically, keeping card instances in only one zone, preserving
serializability, replaying the same combine actions to the same result, and
keeping helper output clear about pool copies versus active or non-pool copies.

Economy and pack pricing should be modeled as replayable RunActions. Tests
should cover deterministic pack prices, gold changes, discounts, rerolls later,
reward generation, and failure cases such as trying to buy an unaffordable pack.
The first economy MVP specifically needs coverage for combat gold formulas,
pack-cost content validation, reward affordability, purchase spending,
reward-history gold bookkeeping, no-mutation guarantees, replay determinism, and
normal-flow no-softlock affordability.
Reward offer explanations should stay deterministic, JSON-serializable, and
rules-side. Test them through helper output for affordability, trait/teamup fit,
duplicate progress, Source/fixing relevance, pack bias, and non-upgradeable
duplicate warnings.

Board resources need deterministic fixture tests before browser coverage.
Fixtures should prove tile resource generation, extraction timing, denial,
spending, and event-log summaries without relying on animation or wall-clock
timing.

Once implemented, browser smoke coverage can include one stable debug-loop
interaction for each new pillar: one trait/teamup activation, one duplicate
upgrade, one economy purchase or discount, and one board-resource extraction.
Keep those checks role/text based, not screenshot based.

## Future Implementation Sequence

Recommended order for the next major gameplay systems:

1. Trait/teamup data model and display.
2. Duplicate upgrade rules for Units and pets/Echoes.
3. Pack pricing and gold economy.
4. Economy cards that trade immediate power for future value.
5. Board resource prototype with deterministic tile extraction.
6. Richer visual board/Pixi work only after those rules create interesting
   planning and event-log behavior.

## Guidance For Future Codex Sessions

- Add or update tests alongside every rules change.
- Every new mechanic gets focused unit tests.
- Every new zone, run action, or state transition gets invariant coverage.
- Every schema-reserved mechanic must be documented when added or left reserved.
- Prefer deterministic fixtures and pure helper tests over UI snapshots.
- Avoid flaky tests, wall-clock timing, animation timing, network dependence, or
  environment-specific assumptions.
- Keep React tests focused on wiring only; gameplay behavior should be proven in
  packages.
- When a bug is found, add the narrowest regression test that would have caught
  it.
