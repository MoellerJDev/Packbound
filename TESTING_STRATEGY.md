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

The debug client has a small Playwright smoke test for the current browser loop.
It starts the Vite client, loads the app, inspects a card, readies and records
combat, opens a reward, verifies latest reward markers, and advances the run.
CI installs Playwright Chromium and runs the same smoke test with
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
