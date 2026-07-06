# Two-Sided Battlefield Model Audit

## Purpose

The default route now presents the Pixi battlefield with player-facing side
labels, side-colored territory, token badges, and selected ally/enemy context.
That improves first-read clarity, but it is still presentation-only. The
canonical model remains one shared 4-row by 7-column odd-r offset hex grid.

This audit captures the migration impact before changing core board behavior.
It should be treated as a design and technical checkpoint, not an implementation
record for an 8-row board.

## Current Canonical Model

- `packages/shared/src/constants.ts` defines `BOARD_ROWS = 4` and
  `BOARD_COLS = 7`.
- `packages/shared/src/board.ts` and `packages/shared/src/utilities.ts` use
  those constants for bounds, neighbors, and position validation.
- `BoardPosition` is a plain `{ row, col, layer }` value with no side, no
  coordinate-space tag, and no distinction between deployment coordinates and
  combat coordinates.
- `positionKey` serializes only `layer:row:col`, so two sides cannot currently
  occupy the same global layer/row/col without relying on separate board
  objects before combat setup.
- Odd-r distance is already topology-correct for any row number, but current
  bounds helpers restrict legal rows to `0..3`.
- Planning validation, content validation, loadout default placement,
  Commander deployment scanning, board summaries, engagement preview, Pixi
  model generation, and simulator placement all assume this 4-row board.

## Systems That Assume The Shared 4-Row Board

### Shared Types And Helpers

- `packages/shared/src/constants.ts`: global `BOARD_ROWS` / `BOARD_COLS`.
- `packages/shared/src/board.ts`: `hexNeighbors` filters with the current
  4-row bounds.
- `packages/shared/src/utilities.ts`: `isBoardPositionInBounds` rejects row 4
  and above.
- `BoardPosition`, `BoardPlacement`, and combat events carry row/col/layer, but
  not coordinate-space metadata.

### Rules And Validation

- `packages/rules/src/loadout.ts`: `getDefaultBoardPositionForCard` scans
  `0..BOARD_ROWS - 1`; `canPlaceCardOnBoard` validates against current bounds.
- `packages/rules/src/validation.ts`: planning validation reports out-of-bounds
  with hardcoded `4x7` copy.
- `packages/rules/src/commander.ts`: legal Commander deploy cells scan the same
  4-row board.
- `packages/rules/src/boardGrid.ts`: summaries emit `rows: BOARD_ROWS`.
- `packages/rules/src/engagementPreview.ts`: range and next-move markers iterate
  the 4-row grid.
- Encounter target labels and action snapshots store the current row/col/layer
  directly.

### Content And Authoring

- `packages/content/src/catalog.ts` validates starter kit and encounter board
  placements against `BOARD_ROWS` / `BOARD_COLS`.
- `packages/content/src/sampleContent.ts` authored starter and encounter
  placements use current shared coordinates. Many fixtures place player and
  enemy Units on the same row to make early combat immediate.
- Existing content does not declare whether a row means "frontline" or
  "backline" for that side.

### Simulation

- `packages/sim/src/state.ts` imports placements directly into combat runtime
  Units without side-based coordinate transformation.
- `packages/sim/src/targeting.ts` computes target priority from shared
  `hexDistance`.
- `packages/sim/src/movement.ts` calls shared `hexStepToward` with current
  4-row bounds.
- `packages/sim/src/placement.ts` treats `Backline` as row `3` for playerA and
  row `0` for playerB inside the same 4-row coordinate system.
- Combat event metadata records current positions and would change visibly once
  combat-space coordinates expand.

### Client And Pixi

- `apps/client/src/components/pixi/pixiBattlefieldLayout.ts` sets
  `PIXI_SHARED_ROWS = BOARD_ROWS`.
- `sharedCellForBoardPosition` currently returns the native row/col for both
  `playerA` and `playerB`.
- `apps/client/src/components/pixi/pixiBattlefieldModel.ts` iterates 4 shared
  rows and offsets opposing tokens only when they share the same native
  coordinate.
- `apps/client/e2e/helpers/browserSmokeHelpers.ts` has hard-coded Pixi click
  geometry for the 700x420 4-row layout.
- Browser smoke clicks cells such as `r0 c2`, `r0 c3`, and `r0 c0` directly.

### Tests And Reports

- Shared topology tests characterize odd-r behavior and 4-row edge neighbors.
- Rules, sim, Pixi, and browser tests pin many row 0 / row 3 fixtures.
- Pixi model tests explicitly expect `model.rows` to be 4 and both sides to map
  into canonical shared coordinates.
- `PLAYTEST_REPORT.md` already says the new side labels are useful but not a
  true two-sided deployment redesign.

## Questions Answered

### 1. Should canonical `BOARD_ROWS` become 8?

Eventually the combat board should be 8 rows tall, but changing the current
global `BOARD_ROWS` constant directly would be too broad and ambiguous. The
safer migration is to introduce explicit constants:

- `LOCAL_DEPLOYMENT_ROWS = 4`
- `COMBAT_BOARD_ROWS = 8`
- `BOARD_COLS = 7` unless later playtests show width pressure

Then migrate systems by coordinate space instead of reusing `BOARD_ROWS` for
both planning and combat.

### 2. Should player and enemy use one shared 8-row coordinate system?

For simulation, yes. Movement, range, targeting, and combat events should
eventually operate in one true 8-row combat coordinate system. This avoids a
renderer-only mirror that says one thing while sim distance says another.

For planning/loadout authoring, local 4-row deployment coordinates may remain
more readable.

### 3. Which side owns which rows?

Recommended global combat orientation:

- Enemy backline: row 0
- Enemy frontline: row 3
- Engagement line: between rows 3 and 4
- Player frontline: row 4
- Player backline: row 7

This keeps row numbers top-to-bottom in display space and makes the player half
the lower half of the battlefield.

### 4. Should each side keep local 0-3 deployment rows?

Yes. Keep local deployment rows for `RunState` loadout editing and encounter
authoring if possible, then map to global combat rows at combat setup.

Recommended first mapping:

- `playerA` local row 0 -> combat row 4
- `playerA` local row 1 -> combat row 5
- `playerA` local row 2 -> combat row 6
- `playerA` local row 3 -> combat row 7
- `playerB` local row 0 -> combat row 0
- `playerB` local row 1 -> combat row 1
- `playerB` local row 2 -> combat row 2
- `playerB` local row 3 -> combat row 3

That mapping assumes local row 0 is closest to the engagement line for playerA
and local row 3 is closest to the engagement line for playerB only if content is
re-authored. Existing content is not consistent enough to migrate mechanically
without a content pass.

### 5. Should display mirror enemy placements only visually?

No, not as the final architecture. A visual-only mirror is what created the
current confusion. Display helpers can transform local deployment coordinates
for planning UI, but simulation and replay should expose true combat-space
coordinates once the migration reaches combat setup.

### 6. How should odd-r distance work across the engagement line?

Use the same odd-r hex distance over global combat rows. The current
`hexToCube` math works for row numbers beyond 3; what must change is bounds,
mapping, fixtures, and expectations.

Important implication: adjacency across the engagement line depends on odd/even
row parity. Tests should pin representative front-row distances such as
enemy row 3 to player row 4 before combat outcomes are accepted.

### 7. How should existing content migrate?

Do not blindly offset all rows. Current starter and encounter placements were
authored to make a 4-row shared field produce immediate contact. A safe content
migration should:

1. Preserve local deployment coordinates in content.
2. Add mapping tests before changing sim setup.
3. Review each starter and encounter for intended frontline/backline meaning.
4. Update expected combat outcomes and balance reports after the 8-row combat
   setup lands.

### 8. How should browser coordinate clicks stay stable?

Do not hard-code new browser coordinates during the rules migration. First move
the Pixi click helper to read exported layout constants or a tested mapping
helper. Then update route smoke tests to click stable semantic cells such as
"first player front cell" or "first legal highlighted cell" where possible.

### 9. How should Renderer Lab represent canonical vs player-facing display?

Renderer Lab should keep showing canonical coordinates for diagnostics. During
the migration, it should explicitly label whether it is showing local
deployment coordinates or global combat coordinates.

The default route can stay player-facing, but it should not contradict the
rules model. Once combat-space rows exist, the default Pixi presentation should
draw the true 8-row field rather than side-colored halves over a 4-row field.

### 10. What is the safest phased migration plan?

Use a staged migration:

1. Document and characterize the current model.
2. Add explicit coordinate-space helpers and tests without changing behavior.
3. Migrate combat setup to map local deployment rows into global combat rows.
4. Update Pixi, browser helpers, content expectations, and balance after combat
   outcomes change.

## Recommended Battlefield Model

Use two coordinate spaces:

### Local Deployment Space

- 4 rows x 7 columns per side.
- Stored in run loadout and encounter authoring.
- Used by planning validation, Source Row / Board Charge legality, Commander
  deployment, and board editing.
- Does not include opponent placements.

### Global Combat Space

- 8 rows x 7 columns.
- Created when building combatant setup for the simulator.
- Used by targeting, movement, attack range, combat events, replay, and combat
  summaries.
- Contains both sides in one odd-r coordinate system with the engagement line
  between rows 3 and 4.

This model keeps starter and encounter authoring readable while making combat
truth match what the player expects to see.

## Alternatives Considered

### Directly Change `BOARD_ROWS` From 4 To 8

Rejected for the next step. It would mix planning and combat dimensions, make
Source Row / Board Charge placement scans include both sides unless guarded,
change content validation immediately, and silently alter combat outcomes.

### Keep 4 Rows And Improve Presentation Only

Rejected as the long-term answer. The latest playtest showed that presentation
helps but does not solve the underlying "my side / enemy side" expectation.

### Maintain Two Separate 4-Row Boards Forever

Rejected for combat. Two separate boards require ad hoc distance and targeting
bridges across a conceptual gap. That would make movement, range, and replay
harder to reason about than one 8-row combat space.

### Mirror Enemy Only In Pixi

Rejected for the final model because it would preserve the mismatch between
what the player sees and what the simulator uses.

## Recommended Migration Plan

### Phase 1: Audit And Characterize Current Behavior

- Keep `BOARD_ROWS = 4`.
- Document current assumptions and migration risks.
- Add characterization tests for current bounds, odd-r distance, and shared
  same-row adjacency.
- Update playtest recommendations so the next task is a model migration step,
  not another presentation pass.

### Phase 2: Add Mapping Helpers Without Behavior Change

- Add a shared helper module such as `packages/shared/src/battlefieldModel.ts`.
- Define `LOCAL_DEPLOYMENT_ROWS = 4`, `COMBAT_BOARD_ROWS = 8`, and side row
  ranges.
- Add pure helpers:
  - `toCombatPosition(side, localPosition)`
  - `toLocalDeploymentPosition(side, combatPosition)`
  - `isPlayerSideCombatRow(row)`
  - `isEnemySideCombatRow(row)`
  - `combatRowsForSide(side)`
- Add tests for frontlines, backlines, round trips, bounds, and odd-r distance
  across rows 3 and 4.
- Keep current rules, sim, Pixi, and content behavior unchanged.

### Phase 3: Migrate Combat Setup

- Apply mapping in the rules/sim boundary before `createInitialState`.
- Keep `RunState.board` and encounter authoring in local deployment space.
- Emit combat events in global combat space.
- Update movement, targeting, engagement preview, combat summaries, and Pixi
  replay expectations.
- Update browser coordinate helpers carefully, preferably through semantic or
  exported layout helpers.
- Re-run balance smoke and update expected outcome ranges only after reviewing
  changed fights.

### Phase 4: Content And Readability Pass

- Review starter and encounter board placements for intended frontline,
  backline, support, and engagement distance.
- Tune ranges, movement pacing, and combat durations after the 8-row field
  changes outcomes.
- Manually playtest at 1280 x 720 and 1440 x 900 for vertical fit and side
  comprehension.
- Decide whether Pixi needs zoom, row compression, or a more vertical layout.

## Key Risks

- Combat outcomes will change once starting distance increases.
- Movement may become too slow if melee units begin several rows apart without
  speed/range adjustments.
- Current content row numbers are not semantically reliable.
- Browser smoke coordinate clicks will be brittle until helper-driven.
- `Backline` summon and recall behavior must be redefined for local versus
  combat space.
- Combat event and replay consumers need to know which coordinate space they are
  reading during the transition.

## Recommended Next Task

`test(shared): add battlefield coordinate-space mapping helpers`

That task should implement Phase 2 only: add tested local-to-combat mapping
helpers and documentation, but do not yet change combat setup or content.
