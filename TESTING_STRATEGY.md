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

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm test:coverage`, and `pnpm build` before shipping source changes. These
catch style drift, import mistakes, type holes, unit regressions, coverage
regressions, and package boundary issues.

### Coverage

Run `pnpm test:coverage` locally for the Vitest V8 coverage report. CI runs the
same command through `pnpm test:coverage:ci` after the normal unit test step and
before build. Reports are written to `coverage/`, which is intentionally ignored
by git.

Coverage currently includes source under `packages/rules/src`,
`packages/sim/src`, `packages/content/src`, and `apps/client/src`. It excludes
tests, Playwright specs, config/build files, generated output, scripts,
declarations, `dist`, `coverage`, and `node_modules`.

The initial thresholds are deliberately conservative and are rounded down from
the measured baseline:

- Statements: 55%
- Lines: 55%
- Branches: 80%
- Functions: 90%

These thresholds are meant to prevent large accidental regressions, not to
pretend the client has mature unit coverage. The first measured baseline was
about 58.65% statements/lines, 80.88% branches, and 91.93% functions, with pure
rules/content/sim packages much healthier than React component coverage. Raise
thresholds only after adding meaningful pure tests or extracting testable view
models. Do not raise a threshold above the latest stable measured baseline, and
avoid writing low-value tests just to move a percentage.

### Coverage-Guided Hardening Notes

The July 2026 hardening pass used `pnpm test:coverage` plus file-size scans
before editing. The highest-value pure gaps were board-only teamup activation
and combat targeting edge behavior, so new tests cover `calculateTeamups`
thresholds, support placements, unknown trait/card ignores, Guard vs AntiAir
target priority, Airborne target ordering, clamped range checks, placement-origin
targeting, and alive-only tag selectors.

That pass intentionally did not chase React component coverage by adding shallow
render tests. Instead, `DefaultRunRoute.tsx` was split into focused route
components while preserving browser smoke coverage. Future client hardening
should continue extracting pure view-model helpers when behavior is worth
testing directly, and should use Playwright only for stable route wiring that a
player can observe. The post-pass measured baseline was about 58.8%
statements/lines, 80.84% branches, and 91.32% functions, so thresholds stayed
at 55/55/80/90.

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

Board-topology tests should cover odd-r hex distance, six-neighbor adjacency,
edge/corner filtering, one-hex movement, and the rule that occupied ground cells
block movement while support and terrain layers do not.

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

The debug client has small Playwright smoke tests for the current browser loop,
engagement lab, priority lab, renderer lab, and duplicate-upgrade path. CI
installs Playwright Chromium and runs the same smoke tests with
`pnpm test:browser`. Keep this layer focused on stable text and roles. Avoid
screenshots, broad brittle snapshots, animation timing, and visual assertions.

The default-route smoke is intentionally split across focused tests instead of
one large end-to-end tour. Keep `/` coverage divided between the concise Pixi
playtest surface, Pixi edit controls, Commander controls, and the combat/reward
loop so each test stays well below the 30-second CI timeout. Rapid Pixi replay
edge cases and detailed view-model behavior should live in unit tests or focused
diagnostic-route smoke, not in the default-route playtest loop.

CI runs browser smoke with `pnpm test:browser:ci`, which forces one Playwright
worker. Local `pnpm test:browser` may still use Playwright's local worker
default, but CI should keep Pixi/WebGL smoke serial because canvas-heavy route
tests have shown actionability contention under parallel load on GitHub Actions.

Current browser smoke structure:

- `apps/client/e2e/default-playtest.spec.ts` covers `/` by workflow.
- `apps/client/e2e/labs.spec.ts` covers engagement, priority, renderer, and
  upgrade labs.
- `apps/client/e2e/helpers/browserSmokeHelpers.ts` holds small shared test-only
  helpers such as browser error capture, panel lookup, Pixi cell clicks, and
  default-route setup.

The default first-screen smoke should stay a route sanity check: current
decision, Loadout Tray, Pixi canvas, collapsed Advanced Debug, compact
inspectors, no renderer-lab controls on `/`, and horizontal overflow. Deep
interactions such as expanding full card details belong in separate focused
tests. Renderer Lab should likewise stay split between load/control presence,
Commander diagnostics, placement/token coordinate clicks, and replay controls.
Keep coordinate-click coverage isolated and re-locate elements after state
changes.

If a browser smoke test approaches 20 seconds locally, split or tighten it
before it reaches CI's 30-second per-test timeout. Increasing Playwright
timeouts should be a last resort after removing redundant assertions, isolating
expensive Pixi coordinate-click paths, and moving pure behavior into unit tests.
Future mechanics should start with rules, simulator, content, or view-model
tests before adding one stable browser check for the user-visible route wiring.

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
