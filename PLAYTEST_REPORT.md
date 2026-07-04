# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound's normal browser prototype still works, and
the new opt-in Pixi renderer lab is a useful proof of direction but should remain
lab-only for now.

The default route still uses the React/CSS Hex Arena. Starter selection, dual
inspectors, readying combat, combat recording, reward pack purchase, run
advancement, engagement preview overlays, priority lab, and duplicate upgrade lab
all worked during this pass. No browser console warnings or errors were captured
while manually testing the requested routes.

The old stale issues are no longer the right top blockers:

1. Horizontal hex-board scroll at normal desktop width appears fixed. At the
   default 1280 x 720 in-app browser viewport, the default route, renderer lab,
   engagement lab, priority lab, and upgrade lab all reported no horizontal page
   overflow.
2. Missing selected range/target preview is fixed substantially. The React/CSS
   Hex Arena shows selected cells, range cells, likely target, attack-now or
   out-of-range state, and next-move markers clearly enough for debug play.
3. The two-board battlefield presentation is only partially addressed. The
   default route still reads as two stacked boards joined by an engagement line.
   `?scenario=renderer-lab` presents a better single shared battlefield, but it
   is still a generated-shape lab with readability and replay-coverage gaps.

The Pixi renderer lab passes its basic lifecycle checks: one canvas mounts, Play
and Reset are clickable, repeated `Play -> Reset -> Play` did not create
duplicate canvases, navigating away unmounted the canvas, navigating back
remounted exactly one canvas, and the route produced no console errors.

Implementation update after this report: Pixi replay commands now carry
deterministic token descriptors for `UnitSummoned`, `UnitRecalled`, and
`UnitPhasedIn`, and the renderer creates missing replay tokens from those
descriptors. A follow-up manual Rotbloom pass confirmed that the recalled Ember
token now appears, moves, takes damage, can be destroyed, and does not duplicate
after `Reset Replay` / `Play Replay`.

Implementation update after the Pixi-centric renderer-lab pass:
`?scenario=renderer-lab` now hides the React/CSS Hex Arena behind a collapsed
`React/CSS Debug Board` fallback, uses Pixi as the primary battlefield, renders
both sides in the same canonical odd-r row/column coordinate space used by the
rules, and exposes token click selection into the existing inspector. The route
also has clearer Loadout Resources, Board, Source Row, Spellrail, and
Pool/Bench panels. Pool/Bench board permanents can be selected, legal Pixi cells
are highlighted, and clicking a highlighted cell places the card through the
existing loadout reducer.

Implementation update after this task: `?scenario=renderer-lab` now has
React-owned replay controls for Play/Resume, Pause, Step, and Reset. The UI
shows replay status, visual command index, total visualized command count, and
the latest command summary. Browser smoke now clicks `Play -> Pause -> Step ->
Reset -> Play` and checks the text state plus single-canvas safety.

Planning update after the Commander design refactor: design docs now frame a
future Commander / Command Zone / Rebind Tax / Signature Relic direction as a
real card-like run identity layer, not a hero-power button. This task adds the
first minimal Command Zone prototype while leaving authored Commander content
and Signature Relics as future work. Packs remain the primary adaptation engine.

Implementation update after the Pixi readability pass: Renderer Lab tokens now
use larger unit circles, stronger support plates, clearer nameplates, larger
ATK/HP/RNG chips, stronger selected/target/range/placeable rings, wider
same-coordinate offsets, and brighter/longer attack, damage, destroyed, appear,
and phase cues. Browser smoke still avoids pixel assertions, so this should get
a fresh manual visual pass before Pixi becomes the default.

Manual validation update after this task: the latest Pixi readability pass has
now been checked at 1280 x 720 and briefly at 1440 x 900. Pixi remained primary,
the React/CSS fallback stayed collapsed, there was no horizontal overflow, token
names and ATK/HP/RNG chips were readable enough for the lab, player/enemy colors
were clear, placeable cells were easy to see, damage/destroyed/recall visuals
worked, token click inspection worked, and Pool/Bench click-to-place still used
the reducer. No console warnings or errors appeared. Remaining Pixi concerns:
long names can truncate or crowd in adjacent nameplates, attack beams are still
fast.

Implementation update after this task: `RunState` now has a minimal Command Zone
Commander prototype. Starter-created runs get one prototype Commander sourced
from existing starter Unit/Echo context. The Commander starts in Command Zone,
can deploy to a legal board tile during planning, can return to Command during
planning, tracks deploy count and visible Rebind Tax, appears on the board/Pixi
when deployed, and is inspectable from the debug client. Rebind Tax is
enforced as generic Board Charge while the Commander is deployed or being
deployed.

Implementation update after this task: recording combat now applies the
Commander destruction-to-Command replacement in run progression. If the player's
deployed Commander is destroyed in combat, `recordCombatResult` returns it to
Command Zone, removes it from board/active cards, preserves deploy count,
increments Rebind Tax once, and leaves combat history/summary intact. The
simulator output is unchanged.

Implementation update after this task: the reward phase now has a minimal
Commander upgrade choice prototype. Pack rewards and Commander upgrades are
separate one-per-round buckets. `Combat Training` increases only the current
Commander card's upgrade level by 1, while `Rebind Calibration` adds 1 Rebind
Tax discount and lowers effective future deploy tax. The choices are
deterministic, serializable, replayable run actions and are visible in the
default route and renderer-lab debug UI.

Implementation update after this task: `RunState.commander` now records a
structured lifecycle history for Commander creation, planning deploy, voluntary
return, combat destruction-to-Command, and reward upgrade application. The
Command Zone panel shows a compact newest-first Commander Lifecycle trail with
round, source, phase, zone movement, deploy count, Rebind Tax, discount,
effective tax, and upgrade-level deltas.

Implementation update after this task: Priority Lab now exposes the first
Commander-sourced encounter main-phase action skeleton. `Commander Rally`
requires the player Commander to be deployed, enters the existing priority stack
during first main or second main with player priority, resolves through pass/pass
priority, reduces enemy Stability by 1, and records the Commander source as used
for that encounter. This is match-local and does not mutate `RunState`.

Implementation update after this task: encounter actions now use a minimal
static cost/effect contract in the rules layer. `Prototype Pressure Technique`
and `Commander Rally` declare main-phase timing, source-used-on-resolve
lifecycle, labels, and opposing Stability -1 effects through the contract
registry. Priority Lab now shows contract-driven Cost and Effect text for both
actions.

Implementation update after this task: encounter action contracts now also
declare minimal target requirements. The prototype pressure actions derive and
store explicit `Enemy Stability` or `Player Stability` target metadata on queued
stack items, and resolution applies target-based Stability deltas through that
stored metadata. This is still Stability-only targeting, not unit, board-cell,
card, or target-selection UI.

Implementation update after this task: the renderer-lab replay controller and
Pixi renderer now guard replay command completions with the current reset
generation and session-scoped busy state. Browser smoke covers `Step -> Reset ->
Play`, `Play -> Reset -> Play`, repeated reset/play, single-canvas safety, and
console/page-error capture. The previously observed replay stall is fixed in
automated coverage.

The biggest remaining Pixi findings are no longer the absence of replay controls,
tiny first-pass labels, or unvalidated readability. The lab still needs the
event grouping/filtering for long feeds, scrub or speed controls, and final
default-route confidence. Pixi should stay opt-in until those are addressed.

Recommended next task:

`feat(rules): add encounter action paid-cost prototype`

## 2. Environment And Commands

- Commit tested before renderer-lab fix: `b8656401e653ab97f2f7de79aaf637e23f6b7a7d`
- Baseline before Commander upgrade prototype:
  `851ee27ec8e19600cc1fe2c1d679109036dc7bf1`
- Baseline before Commander encounter action skeleton:
  `d0cc4bfab678d39ab65c5fb7de3b14fc9ca0e76e`
- Baseline before encounter action targeting contract:
  `8ef4e4def59ae048ee214a6e5bf96674ed4025b4`
- Implementation verified: local working tree for
  `feat(rules): add commander encounter action skeleton`
- Baseline: `main`, aligned with `origin/main`
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.18.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app browser against local Vite, plus Playwright
  browser smoke tests
- Dev server URL: `http://127.0.0.1:5173/`
- Manual viewport coverage: default in-app browser viewport, 1280 x 720, and
  temporary 1440 x 900
- Screenshot file created: no. I inspected transient in-app browser screenshots
  only; no repo screenshot file was written.
- Dependency install: skipped because `node_modules` was already present and
  `pixi.js@8.19.0` was installed for `@packbound/client`
- Dev server cleanup: stopped only the Packbound `pnpm dev` wrapper and its Vite
  child listener on port 5173 after manual testing
- Report file behavior: `PLAYTEST_REPORT.md` was overwritten, not duplicated

| Command                                                                                                                              | Status | Notes                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| `git fetch origin`                                                                                                                   | Pass   | Fetched before testing.                                                |
| `git status`                                                                                                                         | Pass   | Clean worktree on `main`, aligned with `origin/main`.                  |
| Commit ancestry check                                                                                                                | Pass   | Local `main` includes `00e4c64711a2acdc8e7abf4bb1de92475e3a26ce`.      |
| Dependency check                                                                                                                     | Pass   | `node_modules` present; Pixi installed; `pnpm install` skipped.        |
| `pnpm typecheck`                                                                                                                     | Pass   | All workspace project typechecks passed.                               |
| `pnpm test -- apps/client/src/components/pixi/pixiCombatReplay.test.ts apps/client/src/components/pixi/pixiBattlefieldModel.test.ts` | Pass   | Focused Pixi replay/model tests passed after the fix.                  |
| `pnpm test:browser`                                                                                                                  | Pass   | 5 Chromium smoke tests passed before manual playtest.                  |
| `pnpm build`                                                                                                                         | Pass   | Build passed with the expected Pixi/Vite chunk-size warning.           |
| `pnpm dev -- --host 127.0.0.1`                                                                                                       | Pass   | Served Vite on `http://127.0.0.1:5173/` for manual playtesting.        |
| `pnpm exec prettier --write PLAYTEST_REPORT.md`                                                                                      | Pass   | Report formatted after overwrite.                                      |
| `pnpm format:check`                                                                                                                  | Pass   | Final formatting check passed.                                         |
| `pnpm test:browser`                                                                                                                  | Pass   | Re-run after report edit because route wording/selectors were checked. |
| `git diff --check`                                                                                                                   | Pass   | No whitespace errors.                                                  |

Build warning observed and not fixed in this task:

- Vite reported `(!) Some chunks are larger than 500 kB after minification`.
- Largest listed chunk: `assets/index-17-9XDWW.js`, `714.13 kB`, gzip
  `210.92 kB`.

## 3. Scenarios Covered

| Scenario                   | Manual result | Notes                                                                                                  |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| Default route `/`          | Pass          | React/CSS Hex Arena remains default; full run loop still works.                                        |
| `?scenario=renderer-lab`   | Lab pass      | Pixi readability is manually validated; reset/play stall is fixed in smoke coverage.                   |
| `?scenario=engagement-lab` | Pass          | Out-of-range melee and in-range ranged previews are understandable.                                    |
| `?scenario=priority-lab`   | Pass          | Commander Rally, Prototype Technique, contract text, source lifecycle, stack, log, skirmish flow work. |
| `?scenario=upgrade-lab`    | Pass          | Duplicate combine and Lv 1 pool-card inspection work.                                                  |

Browser console result: no warnings or errors captured across the manual pass.

## 4. Default Route `/`

The default route still teaches what to do next. The visible top controls and
Run State guidance moved through the expected loop:

- Planning: ready combat is enabled.
- Combat ready: `Record Combat` becomes enabled after `Ready Combat`.
- Reward: recording combat produces reward choices and disables advance until a
  pack is opened and the one Commander upgrade bucket is resolved.
- Combat resolved: resolving both reward buckets enables `Advance`.
- Advancing moves to round 2 planning against Ash Debt Collector.

The default route did not mount Pixi. It used the React/CSS Hex Arena, with
`canvasCount: 0`, and produced no Pixi errors on the default page.

Ally Inspector and Enemy Inspector remain useful. They expose type, zone,
aspect, cost, stats, upgrade state, keywords, tags, traits, combat stat chips,
rules text, ability text, design metadata, and legal actions where relevant.
The selected ally and selected enemy can be compared at the same time.

The Hex Arena shows relevant occupied cells immediately and has no horizontal
overflow at the default 1280 x 720 browser size. The first selected Ember
Scraprunner preview showed:

- `Attack now`
- `Ember Scraprunner can attack Ember Scraprunner now.`
- `Distance 1, range 1.`
- `Likely target: nearest valid enemy.`

The normal debug loop worked end to end. I readied combat, recorded the round 1
draw, reached reward phase, opened a reward pack, saw a new pool card marker and
gold drop from 5 to 1, then advanced to round 2 planning.

Remaining default-route UX note: the two-board Hex Arena still reads as two
submitted boards rather than one battlefield. This is a presentation issue, not
a blocker for the current debug loop.

## 5. `?scenario=renderer-lab`

Renderer lab is now Pixi-centric. The React/CSS Hex Arena is hidden by default
inside a collapsed `React/CSS Debug Board` fallback, and Pixi is the first
battlefield view on the route. This does not affect the normal `/` route, which
still uses the React/CSS Hex Arena.

Basic renderer lifecycle checks passed:

- Exactly one `.pixi-renderer-host canvas` mounted.
- The page had no horizontal overflow at 1280 x 720.
- The lab exposed `Play Replay`, `Pause Replay`, `Step Replay`, and
  `Reset Replay`.
- Clicking a Pixi enemy token updated the inspector to the encounter card.
- Selecting Sparkcatch Apprentice from Pool/Bench highlighted legal Pixi cells;
  clicking a highlighted cell placed it on the board through the existing
  loadout action path.
- `Play -> Pause -> Step -> Reset -> Play` kept exactly one canvas and one host
  child.
- Navigating to `?scenario=engagement-lab` removed the canvas.
- Navigating back to `?scenario=renderer-lab` remounted exactly one canvas.
- No browser console warnings or errors appeared.

At 1280 x 720, the Pixi lab canvas was visible below the fallback arena and fit
within the page width. At 1440 x 900, the lab fit more comfortably, still with no
horizontal overflow. The full Pixi section remains vertically tall, so the
canvas plus feed is still a scrollable lab view rather than a first-fold final
combat screen.

### Visual Readability

What works:

- The renderer reads much more like one shared battlefield than the default
  two-board Hex Arena.
- The Pixi field now uses native board coordinates. A player unit at `r0 c2`
  and enemy unit at `r0 c3` render as adjacent, matching range and targeting
  truth.
- Range cells can extend into enemy-occupied coordinates, and likely target
  rings land on the actual target coordinate.
- Opposing tokens that share a native coordinate are kept visible with a small
  deterministic side-aware offset.
- Ally and enemy ownership are clear through cyan and red side tinting.
- Hex outlines and occupied tokens are legible enough to understand board
  positions.
- Selected/range/target overlays are understandable in the static model.
- Unit tokens now have larger circular bodies, backed nameplates, and larger
  ATK/HP/RNG chips.
- Support and Relic-style permanents now use larger support plates with a
  distinct support label.
- Selected and likely-target tokens now also get token-level rings, not only
  cell overlays.
- Damage numbers are visible during replay.
- Attack, damage, destroyed, appear, and phase cues have been strengthened in
  the renderer code.
- Destroyed markers are visible at replay end.

What is confusing or too subtle:

- Manual 1280 x 720 validation passed for lab use, but some longer names still
  truncate or crowd when adjacent tokens overlap.
- The overall canvas is dark. It looks coherent, but the empty hex grid and
  destroyed dim state can become subdued.
- Attack lines and destroyed markers are stronger than before, but they are not
  final default-renderer polish. Attack beams are still quick enough to miss.
- The feed says `Visualized appear/recall, move, attack, damage, destroyed`.
  It still does not distinguish supported event types from event types observed
  in the current replay.
- I did not observe a support-layer/relic token in the tested renderer-lab
  starter states, so support readability remains unverified.

### Replay Clarity

Ember Scrappers:

- Feed: 2 shared field units, 11 replay events, draw.
- Observed: damage numbers and destroyed markers.
- Not clearly observed: attack beam, because it resolves quickly.
- Movement was not expected in this short melee mirror.

Rotbloom Recall:

- Feed: 2 shared field units, 111 replay events, player win.
- Text feed included `recall`, `move`, `attack`, `damage`, and `destroyed`
  events.
- Fixed follow-up result: `You recalled Ember Scraprunner from Ashes` now
  materializes an Ember Scraprunner token on the ally side, and later movement
  events visibly move that same token across the canvas.
- Damage and destroyed visuals still worked after the recalled token was created.
- `Reset Replay` followed by `Play Replay` restarted cleanly with one canvas and
  no stale duplicate token.

Cloudspire Phase:

- Feed: 2 shared field units, 25 replay events, enemy win.
- The model updated to Cloudgate Adept versus Ember Scraprunner.
- `Phase Step` appeared as queued text in the combat feed.
- I did not observe phase-in or phase-out visuals during this pass.
- Damage and destroyed state remained visible.

Replay pacing:

- Short replays are quick and understandable if watched closely.
- Effects are more readable than before, but attack lines still need either
  longer timing or easier replay inspection.
- Long replays like Rotbloom's 111 events can now be paused and stepped through,
  but they still need scrub controls or event grouping before the canvas can be a
  reliable debugging tool.
- `Step -> Reset -> Play`, `Play -> Reset -> Play`, repeated reset/play, and
  reset/step cycles are now covered by browser smoke and pure replay-controller
  tests. The previously observed `playing` at `0 / N` stall is fixed in
  automated coverage.

### Default-Renderer Decision

Pixi should remain lab-only for now. The route is now a better playable
viewpoint, coordinate semantics match combat truth, token inspection works, and
the readability pass addresses the most obvious label/stat/effect issues. It is
still not ready to replace the React/CSS Hex Arena on `/` until long combat
feeds are grouped or filtered and replay scrub/speed controls exist.

## 6. `?scenario=engagement-lab`

The out-of-range melee preview remains clear in the panel and on the board.
Cinder Scout starts selected and shows:

- `Out of range`
- `Cinder Scout cannot attack yet.`
- `Target is 3 hexes away, range 1.`
- `Next move: r2 c1 to r2 c2.`
- `Likely target: nearest valid enemy.`

Board marker counts confirmed one selected marker, five range markers, one
target label, one target status, one next-move marker, and out-of-range target
state. There was no horizontal overflow.

The ranged preview also remains clear. Selecting Sparkcatch Apprentice changed
the panel to:

- `Attack now`
- `Sparkcatch Apprentice can attack from 2 hexes away.`
- `Distance 2, range 2.`
- `Likely target: nearest valid enemy.`

The ranged case removed next-move markers and showed in-range target state. This
is the clearest proof that the old missing range/target-preview issue is stale.

## 7. `?scenario=priority-lab`

Priority Lab still explains the developer-facing encounter model well. The panel
shows turn, phase, active actor, priority holder, consecutive passes, player and
enemy stability, outcome, action buttons, stack, used sources, skirmish records,
and action log.

Current Priority Lab flow covered by browser smoke and reflected in this report:

1. Initial state: turn 1, first main, active actor Player, priority holder
   Player, stability 5/5, empty stack.
2. The Commander Action section showed Sparkcatch Apprentice in `command` and
   blocked `Queue Commander Rally` with
   `Commander must be deployed to use Commander Rally.`
3. Deploying the Commander through the existing Command Zone panel updated the
   Commander Action source to `Sparkcatch Apprentice (board)`.
4. `Queue Commander Rally` queued `Commander Rally` from Sparkcatch Apprentice
   and passed priority to Enemy.
5. Enemy passed priority, then Player passed priority. `Commander Rally`
   resolved and changed enemy stability from 5 to 4.
6. Used Sources recorded `Sparkcatch Apprentice used by Commander Rally`, and
   the Commander Action section reported that Rally was already used this
   encounter.
7. `Queue Prototype Technique` then queued `Prototype Pressure Technique` from
   Sparkfall and passed priority to Enemy.
8. The action resolved through the same enemy/player pass sequence and changed
   enemy stability from 4 to 3.
9. Used Sources recorded `Sparkfall used by Prototype Pressure Technique`.
10. Empty-stack player/enemy passes advanced to combat.
11. `Run Combat Skirmish` recorded skirmish 1 and advanced to second main.

The previous action-log readability issue is fixed. Log sentences and metadata
now render separately. For example:

- `Player queued Prototype Pressure Technique from Sparkfall.`
- `Turn 1 | First main | Stack 1`

The action text is now backed by a minimal encounter action contract. Priority
Lab shows this directly:

- Prototype Pressure Technique: `Cost: Uses Sparkfall on resolve.`,
  `Target: Enemy Stability`, and `Effect: Enemy Stability -1.`
- Commander Rally: `Cost: Uses Commander on resolve.`,
  `Target: Enemy Stability`, and `Effect: Enemy Stability -1.`

The lab is no longer debug-action-only in the UI. It now has one Spellrail
Technique prototype action and one deployed-Commander prototype action, both
with minimal source context, contract timing/target/effect metadata, and
match-local source lifecycle. Known limitation: these are still abstract
prototype actions with no paid resource cost, hand/deck/mill sourcing, target
selection, RunState card movement, enemy action choice, or authored effect
system.

## 8. `?scenario=upgrade-lab`

Duplicate upgrade flow still works.

Initial Upgrade Progress showed ready duplicate progress for Cinder Scout, and
the pool exposed an enabled `Upgrade` button. Clicking `Upgrade` consumed the
ready Lv 0 pool copies and left one `Cinder Scout Lv 1` pool card.

Inspecting the upgraded pool card was understandable:

- Zone: `pool`
- Stats: `2 ATK / 3 HP / 1.1 speed / 1 range`
- Upgrade: `Level 1`
- Upgrade bonus: `Current bonus: +1 ATK / +1 HP.`
- Progress: `Level 1: 1 / 3 pool copies.`
- Blocked reason: needs 3 matching Lv 1 pool copies, found 1
- Legal action: `Place on Board`

No horizontal overflow appeared in the upgrade lab.

## 9. Stale Report Items Rechecked

| Old report item                                | Current status       | Current finding                                                                 |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| Hex board has horizontal scroll                | Fixed                | No horizontal page overflow at 1280 x 720 on tested routes.                     |
| Occupied cells hidden to the right             | Fixed horizontally   | Occupied cells fit width; vertical density remains a separate issue.            |
| Missing range/target preview                   | Fixed substantially  | Selected, range, target, attack/out-of-range, and next-move markers work.       |
| Two boards do not feel like one arena          | Partially addressed  | Default still has two boards; Pixi lab gives a stronger one-arena prototype.    |
| Pixi split player/enemy rows from combat truth | Fixed in lab         | Pixi now uses native row/col coordinates with only visual offsets for overlaps. |
| Long combat summaries need grouping/filtering  | Still true           | Especially visible in Rotbloom's 111-event renderer-lab feed.                   |
| Priority shell is not visible                  | Fixed for developers | Priority lab now shows stack, source context, stability, skirmish, second main. |
| Priority action log metadata runs together     | Fixed                | Metadata is rendered as a separate muted row below each sentence.               |
| Renderer lab not manually evaluated            | Fixed by this report | Pixi lab has now been manually tested across lifecycle, viewport, and replay.   |
| Rotbloom recall token missing from Pixi replay | Fixed                | Recalled Ember token now appears, moves, and can be damaged/destroyed.          |

## 10. Bugs Or Confusions

### Fixed: Rotbloom Recall Event Now Produces A Visible Pixi Token

- Steps: Open `?scenario=renderer-lab`, select Rotbloom Recall, play the replay.
- Observed before fix: Renderer Feed included
  `You recalled Ember Scraprunner from Ashes` and later move events for Ember
  Scraprunner, but no new Ember token appeared in the Pixi canvas.
- Observed after fix: the recalled Ember token appears in the ally field, then
  moves across later replay commands and shows damage/destroyed state.
- Current status: fixed for the tested Rotbloom recall path. `UnitSummoned` and
  `UnitPhasedIn` now use the same token-descriptor path, but they were covered
  by unit tests rather than manually observed in this pass.

### Partially Addressed: Pixi Token Text And Stats

- Steps: Open `?scenario=renderer-lab` at 1280 x 720.
- Previous observation: initials were readable, but names and stat chips were
  too small to use during replay.
- Current status: the renderer now has larger unit bodies, backed nameplates,
  larger ATK/HP/RNG chips, stronger support plates, and stronger token-level
  selected/target rings. Manual 1280 x 720 validation found the tokens readable
  enough for renderer-lab use.
- Remaining concern: long names such as `Cloudgate Adept` can truncate, and
  adjacent nameplates can still crowd in dense rows.
- Severity: Medium before Pixi can become default.

### Partially Addressed: Pixi Attack And Destroyed Effects

- Steps: Play Ember or Cloudspire renderer-lab replay.
- Previous observation: damage numbers were readable, but attack lines were easy
  to miss and destroyed markers could blend into the dark field.
- Current status: attack beams, damage badges, destroyed markers, appear cues,
  recall cues, and phase cues are brighter/larger/longer lasting in the renderer
  implementation. Damage, destroyed, and recalled-token visuals were manually
  visible in this pass.
- Remaining concern: attack beams remain quick enough to miss without Step.
- Severity: Low for lab, medium for default-renderer readiness.

### Fixed: Reset Then Play No Longer Stalls Replay Index

- Steps: Open `?scenario=renderer-lab`, play or step a replay, click
  `Reset Replay`, then click `Play Replay`.
- Previous observation: one tested `Step -> Reset -> Play` sequence left replay
  status at `playing` while the command index stayed at `0 / 5` and latest
  command stayed `No command visualized yet.`
- Current status: fixed in implementation and browser smoke. Reset invalidates
  stale replay completions, Pixi busy state is scoped to the current replay
  session, and `Step -> Reset -> Play` plus `Play -> Reset -> Play` now advance
  from command 0 without adding duplicate canvases.

### UX Risk: Long Combat Replays Need Scrub And Grouping

- Steps: Select Rotbloom Recall in renderer lab and play the 111-event replay.
- Observed: Play/Resume, Pause, Step, and Reset now work, and the UI reports
  command index, total commands, replay status, and the latest command summary.
- Remaining concern: the text feed still truncates additional lines, and there
  is no scrubber, speed control, event grouping, or filtered command list.
- Expected: Longer fights should expose event grouping and playback controls
  that make a specific move, attack, recall, or destroyed event easy to revisit.
- Severity: Medium as soon as Pixi is used for debugging non-trivial combats.

### UX Confusion: Two Presentations Coexist, But Renderer Lab Is Cleaner

- Steps: Open `?scenario=renderer-lab`.
- Observed: Pixi is now the primary route view, and the React/CSS board is
  collapsed as a fallback. The broader debug grid still exists below the lab,
  so the route is still a debug/prototype surface rather than a final combat
  screen.
- Expected: Keep the fallback while Pixi is experimental; revisit once replay
  controls and token readability improve.
- Severity: Low for the lab.

## 11. How To Manually Test The Pixi Renderer Lab

### Setup

1. Open a terminal in the repo.
2. Run `git pull --rebase origin main`.
3. Run `pnpm install` only if dependencies are missing.
4. Run `pnpm dev -- --host 127.0.0.1`.
5. Open `http://127.0.0.1:5173/?scenario=renderer-lab`.

### What You Are Looking At

- The Pixi Renderer Lab is the primary battlefield on this route.
- The React/CSS Hex Arena is available in the collapsed `React/CSS Debug Board`
  fallback.
- The Pixi field uses one canonical board coordinate space. Enemy and ally
  tokens at nearby row/column positions appear near each other.
- Cyan/blue means player/ally side.
- Ember/red means enemy side.
- Glowing cells show selected/range/target/next-move overlays from the existing
  engagement preview.
- Circular tokens are units. Smaller/support-looking tokens are
  support/relic-style permanents if present.
- Small chips and labels are compact stat/name information.
- Renderer Feed shows shared field units, replay events, winner, and the event
  types currently visualized.
- Combat Feed Sample is the text truth source to compare against the Pixi
  replay.

### Basic Route Check

1. Confirm the page says `Pixi Renderer Lab`.
2. Confirm exactly one canvas appears.
3. Confirm there is no horizontal page scroll.
4. Confirm the collapsed `React/CSS Debug Board` fallback is still available.
5. Click `Play Replay`.
6. Click `Pause Replay`.
7. Click `Step Replay` several times and confirm the replay command count and
   latest command summary advance one visual command at a time.
8. Click `Reset Replay`.
9. Click `Play Replay` again.
10. Compare the Pixi replay with the Combat Feed Sample.
11. Watch for movement, attack beams, damage numbers, destroyed markers, and
    appear/recall tokens.
12. Click a player or enemy token and confirm the Pixi Inspector changes.
13. Select a Pool/Bench board card such as Sparkcatch Apprentice.
14. Confirm legal Pixi cells highlight, then click one to place the card.
15. Confirm the replay restarts cleanly and does not duplicate canvases or stale
    effects.

### Starter-Specific Checks

Use the Starter dropdown in the top bar to switch kits.

- Ember Scrappers: short/simple combat. Verify attacks, damage, and destroyed
  markers are readable.
- Rotbloom Recall: most important check. Watch Combat Feed Sample for `recall`,
  then confirm the recalled Ember token appears in the Pixi canvas and its later
  movement is visible.
- Cloudspire Phase: if phase events occur, watch for fade/appear behavior. If
  they do not occur in that run, note that phase support exists in the replay
  command path but was not triggered in the manual pass.

### What To Report If Something Looks Wrong

Note:

- Route.
- Starter kit.
- Clicked sequence.
- Whether the text combat feed showed the event.
- Whether Pixi showed the same event.
- Whether the issue happened before or after `Reset Replay`.
- Browser console errors, if any.
- Whether there was horizontal scroll or clipping.

## 12. Known Limitations

- Pixi renderer lab is opt-in only and is not the default battlefield.
- The default React/CSS Hex Arena remains the reliable debug battlefield.
- Pixi uses generated shapes and text, not final art assets.
- Pixi labels, stat chips, rings, and combat effects have been strengthened, but
  long names and dense adjacent rows can still crowd.
- Pixi has click-to-select token inspection and minimal click-to-place from
  Pool/Bench, but no drag/drop, hover tooltips, or full board-editing polish.
- Replay controls now cover Play/Resume, Pause, Step, and Reset, but there is no
  scrubber, speed control, event grouping, or filtered command list yet.
- Step advances one visual command when playback is idle or paused. If clicked
  while a paused command animation is still settling, the renderer waits for that
  command to settle and then advances one additional deterministic command.
- Click-to-place only covers legal Pool/Bench board permanents; Source Row and
  Spellrail still use explicit buttons.
- Newly materialized appear/recall tokens use event metadata; if a card is not
  in the initial board model, stat chips, traits, and keywords are currently
  empty.
- Renderer Feed's `Shared field units` count reflects the initial shared field,
  not dynamic replay-created tokens.
- Summoned and phased-in off-model tokens use the same descriptor path as
  recalled units, but they were not manually observed in this pass.
- Phase-in/phase-out visuals are supported in the command model but were not
  observed in the tested Cloudspire replay.
- Support/relic token readability was not observed in the tested renderer-lab
  starter states.
- The Vite chunk-size warning remains.
- The Command Zone Commander prototype exists in `RunState`, but it reuses
  existing starter Unit/Echo definitions and has no authored Commander content.
- Rebind Tax is enforced as generic Board Charge while the Commander is deployed
  or being deployed, and Rebind Calibration can discount effective tax. There
  are still no alternate costs or encounter-phase Commander deploy/return
  actions.
- Commander lifecycle history is visible in the debug Command Zone panel, but it
  is still a compact audit trail with no filtering, export, or event grouping.
- Commander upgrades are implemented only as two mechanical prototype choices.
  Signature Relics, enemy Commanders, authored Commander cards, and authored
  Commander effects are not implemented.
- Normal non-Commander unit death cleanup into Ashes is not implemented in
  run-progression state by this Commander-specific replacement.
- Priority Lab has two real prototype actions with source context:
  `Prototype Pressure Technique` from Sparkfall and `Commander Rally` from a
  deployed Commander. They now use a minimal static contract for timing, labels,
  source-used-on-resolve lifecycle, explicit Stability target metadata, and
  match-local Stability effects. They still have no paid resource cost, target
  selection UI, hand/deck/mill, source card movement, RunState mutation on
  resolution, enemy AI, interrupts, counterspells, arbitrary unit/board/card
  targeting, or authored card effect resolution.
- Combat simulation remains deterministic and unchanged.
- Traits/teamups remain display-only.
- Duplicate upgrades remain generic +1 ATK/+1 HP combines.
- Combat summaries and feeds still need grouping/filtering for longer fights.

## 13. Recommended Next Tasks

Do next:

`feat(rules): add encounter action paid-cost prototype`

Why: Priority Lab now has two source-validated, stack-resolving prototype
actions: `Prototype Pressure Technique` from Spellrail and `Commander Rally`
from the deployed Commander, and both now share a minimal cost/effect contract.
The target contract now makes their Stability targets explicit and serializable.
The next narrow slice should make one action pay a real match-local resource
cost, likely a small Combat Charge prototype, without adding hand/deck/mill,
enemy Commanders, broad timing, counterspells, arbitrary targeting, RunState
mutation, or a full authored effect engine.

Do soon:

- `feat(client): add Pixi replay scrub/speed controls`
- `feat(rules): evaluate expanding the canonical board to 6 rows x 10-12 columns`
- `feat(client): tune Pixi combat effect timing after manual readability pass`
- `feat(client): keep selected target and next move visible together in preview labs`
- `feat(client): group or filter long combat summary events`
- `feat(rules): add encounter action unit/board target prototype`

Still wait:

- Pixi as the default renderer
- Drag/drop
- Backend
- Multiplayer
- Hand/deck/mill
- Counterspells
- Broad card or mechanic expansion
