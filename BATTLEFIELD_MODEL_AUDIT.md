# Two-Sided Battlefield Model Audit

## Purpose

The default route now presents the Pixi battlefield with player-facing side
labels, side-colored territory, token badges, selected ally/enemy context, and a
true 8-row combat surface. The implementation is no longer presentation-only:
combat setup maps each side's local 4-row deployment board into one global
8-row by 7-column odd-r combat board.

This audit captures the split model that now exists after Phase 3. Planning,
loadout editing, Commander deployment, starter content, and encounter authoring
remain in local 4-row deployment space. Combat setup, simulator movement/range,
combat events, Pixi rendering, Pixi click helpers, and default/renderer
engagement previews now use global combat coordinates.

Phase 2 implementation note: `packages/shared/src/battlefieldModel.ts`
defines the future local deployment and global combat coordinate-space constants,
row ownership helpers, bounds helpers, and local-to-combat mapping helpers. They
are exported from `packages/shared` and covered by focused unit tests.

Phase 3 implementation note: `packages/rules/src/loadout.ts` and
`packages/rules/src/encounters.ts` now apply those mapping helpers at the
rules/sim boundary. Player run boards map to `playerA` combat rows 4-7. Enemy
encounter boards mirror into `playerB` combat rows 3-0 so local row 0 is the
frontline for both sides. Simulator movement and
summon/recall placement use combat-space bounds and side row ranges. Pixi maps
local board summaries into the same global rows and keeps click-to-place
returning player-local positions for reducer actions.

## Current Model After Phase 3

- `packages/shared/src/constants.ts` still defines `BOARD_ROWS = 4` and
  `BOARD_COLS = 7` for local deployment and legacy local board helpers.
- `packages/shared/src/battlefieldModel.ts` defines
  `LOCAL_DEPLOYMENT_ROWS = 4`, `COMBAT_BOARD_ROWS = 8`, and
  `COMBAT_BOARD_COLS = 7`.
- `RunState.board`, starter kit board placements, encounter board placements,
  board summaries, Commander planning actions, and loadout validation remain
  local deployment-space data.
- `buildCombatantSetupForRun` maps player local placements into combat rows
  4-7. `buildCombatantSetupForEncounter` maps encounter local placements into
  mirrored combat rows 3-0.
- The simulator now receives already-mapped global combat boards. Movement,
  range, targeting, combat events, and combat replay positions are global
  combat positions.
- `BoardPosition` remains a plain `{ row, col, layer }` value with no embedded
  coordinate-space tag. Callers must be clear about whether a position is local
  deployment space or global combat space.
- `positionKey` still serializes only `layer:row:col`; this is acceptable
  because local boards are side-owned before setup and combat boards use one
  global coordinate space.
- Odd-r distance is topology-correct across the engagement line between rows 3
  and 4, and tests pin representative adjacency.

## Systems By Coordinate Space

### Local Deployment Space

- `packages/shared/src/constants.ts`: `BOARD_ROWS` remains local deployment
  height.
- `packages/shared/src/utilities.ts`: `isBoardPositionInBounds` still rejects
  row 4 and above for planning/content validation.
- `packages/rules/src/loadout.ts`: loadout actions and legal board placement
  continue to validate local 4-row player positions.
- `packages/rules/src/validation.ts`: planning validation remains local.
- `packages/rules/src/commander.ts`: legal Commander deploy cells scan local
  deployment rows and then enter the normal board-placement reducer path.
- `packages/rules/src/boardGrid.ts`: board summaries emit local row/col values.
- `packages/content/src/catalog.ts`: starter kit and encounter placements are
  still authored and validated in local deployment coordinates.
- React/CSS debug boards and full loadout lists remain local planning/debug
  views.

### Global Combat Space

- `packages/rules/src/loadout.ts`: `buildCombatantSetupForRun` maps player
  placements to global combat rows.
- `packages/rules/src/encounters.ts`: `buildCombatantSetupForEncounter` maps
  encounter placements to global combat rows.
- `packages/sim/src/state.ts`: imports mapped combat placements directly into
  runtime Units.
- `packages/sim/src/movement.ts`: passes combat-space bounds into shared
  movement stepping.
- `packages/sim/src/placement.ts`: uses combat-space row ranges for Backline,
  FirstOpen, adjacent-to-source, summon, recall, and phase-in placement.
- `packages/sim/src/targeting.ts`: computes target priority with global
  combat-space `hexDistance`.
- Combat event metadata records global combat positions.
- `packages/rules/src/engagementPreview.ts`: remains local by default, but
  default and renderer routes opt into combat-space preview generation.
- `apps/client/src/components/pixi/pixiBattlefieldLayout.ts`: now lays out 8
  shared rows.
- `apps/client/src/components/pixi/pixiBattlefieldModel.ts`: maps local board
  summaries into global combat rows and maps clicked player-side combat cells
  back to local positions for loadout reducers.
- `apps/client/e2e/helpers/browserSmokeHelpers.ts`: uses the 700x650 8-row
  Pixi geometry for stable browser smoke clicks.

### Tests And Reports

- Shared tests cover mapping helpers, bounds, inverse mapping, and row 3/4
  odd-r adjacency.
- Rules tests cover combat setup mapping, no mutation of local run/encounter
  boards, and preservation of local placement validation.
- Content tests prove starter and encounter authoring still rejects row 4.
- Simulator tests cover global setup positions, row 3/4 targeting geometry,
  combat-space summon/recall placement, and deterministic fixture outcomes.
- Pixi model and browser smoke tests cover 8-row rendering, player-local
  click-to-place mapping, and single-canvas stability.

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

Implemented mapping:

- `playerA` local row 0 -> combat row 4
- `playerA` local row 1 -> combat row 5
- `playerA` local row 2 -> combat row 6
- `playerA` local row 3 -> combat row 7
- `playerB` local row 0 -> combat row 3
- `playerB` local row 1 -> combat row 2
- `playerB` local row 2 -> combat row 1
- `playerB` local row 3 -> combat row 0

That mapping means local row 0 is the frontline for both sides, which keeps
starter and encounter authoring readable while putting enemy melee units near
the engagement line instead of in the visual back row.

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

- Added shared helper module `packages/shared/src/battlefieldModel.ts`.
- Defined `LOCAL_DEPLOYMENT_ROWS = 4`, `COMBAT_BOARD_ROWS = 8`, and side row
  ranges.
- Added pure helpers:
  - `toCombatPosition(side, localPosition)`
  - `toLocalDeploymentPosition(side, combatPosition)`
  - `isPlayerSideCombatRow(row)`
  - `isEnemySideCombatRow(row)`
  - `combatRowsForSide(side)`
- Added tests for frontlines, backlines, round trips, bounds, and odd-r distance
  across rows 3 and 4.
- Kept current rules, sim, Pixi, and content behavior unchanged until Phase 3.

### Phase 3: Migrate Combat Setup

- Applied mapping in the rules/sim boundary before `createInitialState`.
- Kept `RunState.board` and encounter authoring in local deployment space.
- Combat events now use global combat space.
- Updated movement, targeting, engagement preview, combat fixture expectations,
  Pixi model expectations, and browser click geometry.
- Browser smoke still uses helper-driven cell clicks, now against the 8-row
  Pixi layout.
- Balance smoke and balance report still run, but starter and encounter
  placements have not received a dedicated retune pass yet.

### Phase 4: Content And Readability Pass

- Review starter and encounter board placements for intended frontline,
  backline, support, and engagement distance.
- Tune ranges, movement pacing, and combat durations after the 8-row field
  changes outcomes.
- Manually playtest at 1280 x 720 and 1440 x 900 for vertical fit and side
  comprehension.
- Decide whether Pixi needs zoom, row compression, or a more vertical layout.

## Key Risks

- Combat outcomes changed where direct simulator fixtures previously relied on
  compressed same-row starts. The Signal Nest fixture now ends in a draw because
  the echo and enemy trade on the larger combat board.
- Movement may feel too slow if melee units begin several rows apart without
  speed/range/content tuning.
- Current content row numbers were authored for the earlier shared field. Enemy
  row 0 now behaves as frontline, but starter and encounter pacing still need a
  broader frontline/backline review.
- Browser smoke coordinate clicks are helper-driven, but future Pixi layout
  changes should continue to update the helper rather than individual tests.
- `Backline` summon and recall behavior is now combat-space side-aware, but it
  still needs manual pacing validation across starters.
- Combat event and replay consumers should treat simulator positions as global
  combat coordinates from this point forward.

## Recommended Next Task

`test(playtest): manually validate 8-row Pixi/default battlefield readability`

Phase 3 is implemented in code and automated tests. The next useful step is to
play the default route and renderer lab at 1280 x 720 and 1440 x 900, compare
combat preview/replay readability against the text summaries, and decide whether
the larger board needs content pacing tweaks, Pixi scale changes, or a focused
frontline/backline content pass.
