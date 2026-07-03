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

The biggest remaining Pixi findings are compact readability and effect timing,
not missing replay controls. Damage numbers and destroyed markers are visible,
but attack beams are still easy to miss, long combat feeds still need
grouping/filtering, and token names/stat chips are small at 1280 x 720. Pixi
should stay opt-in until those readability controls improve.

Recommended next task:

`feat(client): improve Pixi token label/stat readability`

## 2. Environment And Commands

- Commit tested before renderer-lab fix: `b8656401e653ab97f2f7de79aaf637e23f6b7a7d`
- Implementation verified: local working tree for
  `feat(client): make renderer lab Pixi-centric`
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

| Scenario                   | Manual result | Notes                                                                     |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| Default route `/`          | Pass          | React/CSS Hex Arena remains default; full run loop still works.           |
| `?scenario=renderer-lab`   | Mixed pass    | Pixi is now primary for the route; replay pacing still keeps it lab-only. |
| `?scenario=engagement-lab` | Pass          | Out-of-range melee and in-range ranged previews are understandable.       |
| `?scenario=priority-lab`   | Pass          | Prototype action, source context, stack, log, skirmish flow work.         |
| `?scenario=upgrade-lab`    | Pass          | Duplicate combine and Lv 1 pool-card inspection work.                     |

Browser console result: no warnings or errors captured across the manual pass.

## 4. Default Route `/`

The default route still teaches what to do next. The visible top controls and
Run State guidance moved through the expected loop:

- Planning: ready combat is enabled.
- Combat ready: `Record Combat` becomes enabled after `Ready Combat`.
- Reward: recording combat produces reward choices and disables advance until a
  pack is opened.
- Combat resolved: opening a pack enables `Advance`.
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
- Damage numbers are visible during replay.
- Destroyed markers are visible at replay end.

What is confusing or too subtle:

- Token initials are readable, and labels are slightly clearer, but token names
  and stat chips are still small at 1280 x 720.
- The overall canvas is dark. It looks coherent, but the empty hex grid and
  destroyed dim state can become subdued.
- Attack lines are fast enough that they are easy to miss.
- The final destroyed `X` state works, but dimmed destroyed units could be more
  obvious.
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
- Effects need stronger timing for manual comprehension, especially attack
  lines.
- Long replays like Rotbloom's 111 events can now be paused and stepped through,
  but they still need scrub controls or event grouping before the canvas can be a
  reliable debugging tool.

### Default-Renderer Decision

Pixi should remain lab-only for now. The route is now a better playable
viewpoint, coordinate semantics match combat truth, and token inspection works,
but the current implementation is not ready to replace the React/CSS Hex Arena
on `/` until labels/stats are larger and replay controls make long combats
understandable.

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

Manual flow tested:

1. Initial state: turn 1, first main, active actor Player, priority holder
   Player, stability 5/5, empty stack.
2. `Queue Prototype Technique` queued `Prototype Pressure Technique` from
   Sparkfall and passed priority to Enemy.
3. Action Stack showed `Prototype Pressure Technique` with
   `Source: Sparkfall (spellrail)`.
4. Enemy passed priority.
5. Player passed priority.
6. The action resolved and changed enemy stability from 5 to 4.
7. Used Sources recorded `Sparkfall used by Prototype Pressure Technique`.
8. Empty-stack player/enemy passes advanced to combat.
9. `Run Combat Skirmish` recorded skirmish 1 as a draw and advanced to second
   main.

The previous action-log readability issue is fixed. Log sentences and metadata
now render separately. For example:

- `Player queued Prototype Pressure Technique from Sparkfall.`
- `Turn 1 | First main | Stack 1`

The lab is no longer debug-action-only in the UI. It now has a real prototype
card-like action with minimal source context. Known limitation: this is still an
abstract prototype action with no cost payment, hand/deck/mill sourcing,
RunState card movement, enemy action choice, or authored effect system.

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

### UX Confusion: Pixi Token Text Is Too Small

- Steps: Open `?scenario=renderer-lab` at 1280 x 720.
- Observed: Initials are readable, but names and stat chips are small. This is
  especially noticeable when watching effects.
- Expected: A user should be able to identify token name, ownership, and key
  stats without relying on the side feed or React fallback.
- Severity: Medium before Pixi can become default.

### UX Confusion: Pixi Attack And Destroyed Effects Are Too Subtle

- Steps: Play Ember or Cloudspire renderer-lab replay.
- Observed: Damage numbers are readable. Attack lines are easy to miss, and
  destroyed markers can blend into the dark field.
- Expected: Attack direction and death state should be readable at a glance.
- Severity: Low for lab, medium for default-renderer readiness.

### UX Risk: Long Combat Replays Need Controls

- Steps: Select Rotbloom Recall in renderer lab and play the 111-event replay.
- Observed: The text feed truncates additional lines, and the canvas replay
  cannot be stepped, paused, scrubbed, or filtered.
- Expected: Longer fights should expose event grouping and playback control.
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
4. Confirm the React fallback board is still visible above.
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
- Priority Lab has one real prototype action with Sparkfall source context, but
  no real cost, hand/deck/mill, source card movement, enemy AI, interrupts,
  counterspells, or authored card effect resolution.
- Combat simulation remains deterministic and unchanged.
- Traits/teamups remain display-only.
- Duplicate upgrades remain generic +1 ATK/+1 HP combines.
- Combat summaries and feeds still need grouping/filtering for longer fights.

## 13. Recommended Next Tasks

Do next:

`feat(client): improve Pixi token label/stat readability`

Why: the replay-control gap is now covered, so the next practical blocker is
whether users can identify tokens and key stats without leaning on the side
panel. At 1280 x 720, initials are readable, but token names and stat chips are
still too small for Pixi to replace the React/CSS debug board.

Do soon:

- `feat(client): improve Pixi token label/stat readability`
- `feat(client): add Pixi replay scrub/speed controls`
- `feat(rules): evaluate expanding the canonical board to 6 rows x 10-12 columns`
- `feat(client): strengthen Pixi attack and destroyed effect timing`
- `feat(client): keep selected target and next move visible together in preview labs`
- `feat(client): group or filter long combat summary events`
- `feat(rules): add encounter action cost and effect contract`

Still wait:

- Pixi as the default renderer
- Drag/drop
- Backend
- Multiplayer
- Hand/deck/mill
- Counterspells
- Broad card or mechanic expansion
