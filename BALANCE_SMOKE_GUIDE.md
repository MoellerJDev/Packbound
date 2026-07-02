# Balance Smoke Guide

Balance smoke tests are confidence checks, not proof of perfect balance. They
exist to catch impossible starts, wildly broken encounters, unplayable packs,
bad reward pools, unexpected simulator warnings, and content regressions that
make the first micro-set stop functioning.

They should complement, not replace:

- focused simulator mechanic tests
- combat fixtures with selected event ordering
- property-based rules invariants
- replay integration tests
- manual playtesting for fun, pacing, readability, and UX

## What To Assert

Use broad categories and ranges:

- allowed winners, such as `["playerA", "playerB", "draw"]`
- max or min damage to the run player
- max warning count, usually zero for normal content
- max combat duration
- required event types, such as `CombatStarted`, `DamageDealt`, or
  `CombatEnded`
- required participating card tags, Aspects, design roles, or archetypes
- expected boss difficulty, such as "boss wins or deals player damage"

Avoid exact full event logs, exact event counts, and exact damage timelines.
Those belong in focused simulator fixtures only when ordering is the behavior
under test.

## Fixture Guidance

Good balance smoke fixtures should:

- use deterministic seeds
- cover each starter kit against at least one early encounter
- cover each starter kit against the boss
- assert no unexpected warnings
- assert combat ends before max duration
- verify summaries are JSON-serializable
- check that packs can produce cards for their intended archetypes across
  several fixed seeds

## Interpreting Failures

If content changes intentionally alter outcomes, update the fixture expectation
with a note in the change summary.

If a fixture fails because the game is more fun, widen the expected range or
category rather than forcing content back to the old result.

If a fixture fails because the content is impossible, nonsensical, warning-heavy,
or no longer teaches its archetype, fix the content.

If a fixture fails because a simulator mechanic changed, add or update a focused
mechanic test before adjusting balance smoke expectations.

## Current Intent

For the first micro-set:

- early normal encounters should not annihilate every starter kit
- boss encounters should feel dangerous, but not every starter must lose every
  time
- pack rewards should aggregate into recognizable archetype cards across fixed
  seeds
- Source Pack should reliably expose Source or fixing cards
- no playable sample content should rely on schema-reserved effects or triggers

## Balance Report

Run `pnpm balance:report` when changing starter kits, encounters, packs, card
stats, or design metadata. The report prints broad deterministic
starter-vs-encounter rows and aggregate pack usability rows using the same
summary style as smoke tests.

Use the report for manual review:

- scan winners, player damage, durations, and warning codes
- check which Techniques were used and which Units survived or were destroyed
- confirm packs expose expected archetypes, roles, Sources, and fixing cards

The report is observational tooling. Smoke tests remain the pass/fail
guardrails; the report helps decide whether those guardrails and the content
still make sense.
