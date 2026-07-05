# Packbound Agent Prompt Guide

Use this guide when preparing or digesting Codex prompts for Packbound. It is a
durable orientation aid, not a replacement for the current user request. If this
guide conflicts with the active prompt, follow the active prompt and call out the
conflict in the final report.

## How To Start A Task

1. Confirm the requested baseline with `git fetch origin` and
   `git status --short --branch`.
2. Read only the files named by the prompt, plus directly relevant neighboring
   files discovered while implementing.
3. Treat repo-root docs as context:
   - `README.md`
   - `GAMEPLAY_DESIGN.md`
   - `TECHNICAL_ARCHITECTURE.md`
   - `IMPLEMENTED_MECHANICS.md`
   - `PLAYTEST_REPORT.md`
4. Before editing, identify the intended home for new logic:
   - rules logic in `packages/rules`
   - simulator logic in `packages/sim`
   - shared serializable types in `packages/shared`
   - content data in `packages/content`
   - React route wiring in `apps/client/src/routes`
   - focused view models in `apps/client/src/viewModels`
   - Pixi rendering only in `apps/client/src/components/pixi`

## Project Boundaries To Preserve

- Keep gameplay legality and deterministic state changes out of React and Pixi.
- Keep Pixi renderer-only. It can display state, selection, placement affordances,
  and replay commands, but it must not decide rules outcomes.
- Keep `App.tsx` as shell and wiring. Avoid adding new feature-specific state
  machines, validation loops, or large view-model builders there.
- Prefer small focused helpers and tests over broad refactors.
- Preserve the collapsed React/CSS debug fallback while Pixi remains under active
  validation.
- Use repo-relative paths in docs, reports, prompts, and final summaries.

## Current Client Shape

- The default route `/` is Pixi-primary for the battlefield.
- The React/CSS Hex Arena remains available as a collapsed debug fallback.
- `?scenario=renderer-lab` is a diagnostic Pixi route with replay controls, feed
  comparison, and click-to-place stress coverage.
- Default Pixi placement currently supports Pool/Bench board permanents through
  existing loadout reducer paths.
- Source Row, Spellrail, return-to-pool, and Commander controls still use
  explicit list/button panels.

## Prompt Hygiene

- Avoid embedding stale commit IDs in reusable prompt guides.
- Separate durable project guidance from one-off handoff prompts.
- If a prompt asks for a report format, use that exact structure.
- If a task is audit-only, do not commit source changes unless the user
  separately asks for a file to be added or corrected.
- Report known limitations honestly, especially when behavior is covered by
  smoke tests but not manual visual validation.

## Testing Expectations

For source changes, prefer this escalation:

1. focused unit or view-model tests for changed pure logic
2. `pnpm typecheck`
3. `pnpm test:browser` for route behavior
4. full gate when requested:
   - `pnpm format`
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
   - `pnpm balance:report`
   - `pnpm test:browser`
   - `git diff --check`

If `pnpm build` reports only the known Vite/Pixi chunk-size warning, record it
but do not fix it unless the active task asks for bundle work.

## Good Next-Task Shape

Good Packbound prompts are narrow and explicit:

- name the baseline and files to inspect
- define what must be preserved
- list non-goals
- specify targeted checks and the full gate
- require an honest final report with changed files, behavior summary, tests,
  known limitations, and the recommended next step

Avoid prompts that combine broad UI redesign, rules changes, content expansion,
and renderer changes in one pass unless the task is explicitly an audit or
manual playtest.
