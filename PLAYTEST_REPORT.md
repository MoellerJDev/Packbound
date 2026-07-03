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

The biggest Pixi finding is replay accuracy/coverage, not layout. Damage numbers
and destroyed markers are visible, but attack beams are easy to miss, movement
was not visually confirmed on a visible token during this pass, and Rotbloom's
recall event appeared in the text feed without a new recalled token appearing in
the canvas. Pixi should stay opt-in until the replay can materialize
summoned/recalled/appearing units from combat events and the token labels/effects
are easier to read.

Recommended next task:

`fix(client): render recalled Pixi replay units from combat events`

## 2. Environment And Commands

- Commit tested: `00e4c64711a2acdc8e7abf4bb1de92475e3a26ce`
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

| Command                                         | Status | Notes                                                                  |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `git fetch origin`                              | Pass   | Fetched before testing.                                                |
| `git status`                                    | Pass   | Clean worktree on `main`, aligned with `origin/main`.                  |
| Commit ancestry check                           | Pass   | Local `main` includes `00e4c64711a2acdc8e7abf4bb1de92475e3a26ce`.      |
| Dependency check                                | Pass   | `node_modules` present; Pixi installed; `pnpm install` skipped.        |
| `pnpm typecheck`                                | Pass   | All workspace project typechecks passed.                               |
| `pnpm test:browser`                             | Pass   | 5 Chromium smoke tests passed before manual playtest.                  |
| `pnpm build`                                    | Pass   | Build passed with the expected Pixi/Vite chunk-size warning.           |
| `pnpm dev -- --host 127.0.0.1`                  | Pass   | Served Vite on `http://127.0.0.1:5173/` for manual playtesting.        |
| `pnpm exec prettier --write PLAYTEST_REPORT.md` | Pass   | Report formatted after overwrite.                                      |
| `pnpm format:check`                             | Pass   | Final formatting check passed.                                         |
| `pnpm test:browser`                             | Pass   | Re-run after report edit because route wording/selectors were checked. |
| `git diff --check`                              | Pass   | No whitespace errors.                                                  |

Build warning observed and not fixed in this task:

- Vite reported `(!) Some chunks are larger than 500 kB after minification`.
- Largest listed chunk: `assets/index-17-9XDWW.js`, `714.13 kB`, gzip
  `210.92 kB`.

## 3. Scenarios Covered

| Scenario                   | Manual result | Notes                                                               |
| -------------------------- | ------------- | ------------------------------------------------------------------- |
| Default route `/`          | Pass          | React/CSS Hex Arena remains default; full run loop still works.     |
| `?scenario=renderer-lab`   | Mixed pass    | Mount/lifecycle good; visual/replay gaps keep it lab-only.          |
| `?scenario=engagement-lab` | Pass          | Out-of-range melee and in-range ranged previews are understandable. |
| `?scenario=priority-lab`   | Pass          | Prototype action, source context, stack, log, skirmish flow work.   |
| `?scenario=upgrade-lab`    | Pass          | Duplicate combine and Lv 1 pool-card inspection work.               |

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

Renderer lab loads below the default React/CSS Hex Arena. The page explicitly
says the React Hex Arena remains above as the debug fallback, which accurately
sets expectations. The fallback board remains available, and the Pixi section
does not affect the normal route.

Basic renderer lifecycle checks passed:

- Exactly one `.pixi-renderer-host canvas` mounted.
- The page had no horizontal overflow at 1280 x 720.
- The lab exposed `Play Replay` and `Reset Replay`.
- `Play -> Reset -> Play` kept exactly one canvas and one host child.
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
- Ally and enemy ownership are clear through cyan and red side tinting.
- The center engagement line is clear and reinforces the shared-field concept.
- Hex outlines and occupied tokens are legible enough to understand board
  positions.
- Selected/range/target overlays are understandable in the static model.
- Damage numbers are visible during replay.
- Destroyed markers are visible at replay end.

What is confusing or too subtle:

- Token initials are readable, but token names and stat chips are very small at
  1280 x 720.
- The overall canvas is dark. It looks coherent, but the empty hex grid and
  destroyed dim state can become subdued.
- Attack lines are fast enough that they are easy to miss.
- The final destroyed `X` state works, but dimmed destroyed units could be more
  obvious.
- The feed says `Visualized move, attack, damage, destroyed`, but the lab does
  not yet communicate which event types were actually visible in the current
  replay.
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
- Important issue: the feed said `You recalled Ember Scraprunner from Ashes`,
  but I did not see a new Ember token appear in the Pixi canvas. The recalled
  unit also appears to be the mover in the feed, so movement direction was not
  visually confirmed on the canvas.
- Likely cause from observed behavior: replay commands can include appear/move
  events for a card that is not in the initial Pixi model token map.

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
- Long replays like Rotbloom's 111 events need step/pause/scrub controls or
  event grouping before the canvas can be a reliable debugging tool.

### Default-Renderer Decision

Pixi should remain lab-only for now. The single-arena direction is promising,
but the current implementation is not ready to replace the React/CSS Hex Arena
until off-model appear/recalled units render correctly, movement can be observed
reliably, labels/stats are larger or otherwise inspectable, and replay controls
make long combats understandable.

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

| Old report item                               | Current status       | Current finding                                                                 |
| --------------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| Hex board has horizontal scroll               | Fixed                | No horizontal page overflow at 1280 x 720 on tested routes.                     |
| Occupied cells hidden to the right            | Fixed horizontally   | Occupied cells fit width; vertical density remains a separate issue.            |
| Missing range/target preview                  | Fixed substantially  | Selected, range, target, attack/out-of-range, and next-move markers work.       |
| Two boards do not feel like one arena         | Partially addressed  | Default still has two boards; Pixi lab gives a stronger one-arena prototype.    |
| Long combat summaries need grouping/filtering | Still true           | Especially visible in Rotbloom's 111-event renderer-lab feed.                   |
| Priority shell is not visible                 | Fixed for developers | Priority lab now shows stack, source context, stability, skirmish, second main. |
| Priority action log metadata runs together    | Fixed                | Metadata is rendered as a separate muted row below each sentence.               |
| Renderer lab not manually evaluated           | Fixed by this report | Pixi lab has now been manually tested across lifecycle, viewport, and replay.   |

## 10. Bugs Or Confusions

### Bug: Rotbloom Recall Event Did Not Produce A Visible Pixi Token

- Steps: Open `?scenario=renderer-lab`, select Rotbloom Recall, play the replay.
- Observed: Renderer Feed included `You recalled Ember Scraprunner from Ashes`
  and later move events for Ember Scraprunner, but no new Ember token appeared in
  the Pixi canvas during the pass.
- Expected: Recalled/summoned/appearing units should materialize as replay
  tokens even when they are not in the initial board model.
- Severity: Medium for the renderer lab. This blocks Pixi from being a trusted
  replay view for mechanics that create or return units mid-combat.

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

### UX Confusion: Two Presentations Coexist

- Steps: Open `?scenario=renderer-lab`.
- Observed: React/CSS fallback sits above the Pixi lab. This is good for
  debugging but makes the route feel like a comparison harness rather than a
  single product screen.
- Expected: Keep this relationship while Pixi is experimental; revisit once the
  renderer is accurate enough to replace the fallback.
- Severity: Low for the lab, expected by current design.

## 11. Known Limitations

- Pixi renderer lab is opt-in only and is not the default battlefield.
- The default React/CSS Hex Arena remains the reliable debug battlefield.
- Pixi uses generated shapes and text, not final art assets.
- Pixi has no drag/drop, hit-target inspection, hover tooltips, or board editing.
- Replay controls are limited to Play and Reset.
- Recalled/summoned/off-model replay units were not visually materialized in
  this pass.
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

## 12. Recommended Next Tasks

Do next:

`fix(client): render recalled Pixi replay units from combat events`

Why: Rotbloom's recall/move events are exactly the kind of mechanics the replay
lab needs to prove. If the text feed says a unit appeared or moved but the canvas
does not show it, the renderer cannot become the default battlefield yet.

Do soon:

- `feat(client): improve Pixi token label/stat readability`
- `feat(client): add Pixi replay pause/step controls`
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
