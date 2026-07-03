# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound is in a better browser-prototype state than
the previous report described. The default deterministic run loop, starter
selection, battlefield inspectors, engagement preview overlays, combat preview,
combat recording, pack reward purchase, run advancement, priority lab, and
duplicate upgrade lab all worked during this pass.

The old top blocker, horizontal hex-board scrolling at normal desktop width, is
fixed in the current build. At the 1280 x 720 in-app browser viewport, the page
and Hex Arena viewport both reported `scrollWidth === clientWidth`; no
horizontal arena scroll was needed.

The old missing range/target-preview blocker is also substantially fixed.
Selected Unit/Echo cells, range cells, likely target cells, attack-now or
out-of-range state, and next-move cells are now represented both in the
Engagement Preview panel and directly on the hex board.

Implementation update after this report: the follow-up rules task has added a
first abstract encounter main-phase action skeleton,
`Prototype Pressure Technique`, so the previous debug-only limitation is no
longer literally true. The remaining blocker is making encounter actions come
from real card zones and authored card context instead of a single lab-only
prototype.

Top remaining issues:

1. Priority lab explains the state machine to developers and now separates log
   metadata from sentence text, but the prototype action is still abstract and
   not sourced from card context.
2. Ally Hex Board and Enemy Hex Board still read as two stacked submitted boards,
   not one shared tactical arena.
3. Combat summaries are readable for short fights, but longer fights still need
   grouping, filtering, or a compact timeline.

Recommended next task:

`feat(rules): source encounter actions from minimal card context`

## 2. Environment And Commands

- Commit tested: `520ad035d31a8d93512553b50c88907cbb92fecd`
- Baseline: `main`, up to date with `origin/main`
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.18.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app browser against local Vite, plus Playwright
  browser smoke tests
- Dev server URL: `http://127.0.0.1:5173/`
- Screenshot file created: no. I inspected transient browser screenshots only;
  no repo screenshot file was written.
- Stale dev servers before testing: none found on ports `4173`, `5173-5180`
- Dependency install: skipped because `node_modules` was already present
- Dev server cleanup: stopped only the Packbound dev-port listener after testing
- Report file behavior: `PLAYTEST_REPORT.md` was overwritten, not duplicated

| Command                                         | Status  | Notes                                                             |
| ----------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `git status`                                    | Pass    | Clean worktree on `main`, up to date with `origin/main`.          |
| Packbound dev-port listener check               | Pass    | No listeners found before starting Vite.                          |
| `pnpm install`                                  | Skipped | Dependencies were already installed.                              |
| `pnpm format:check`                             | Pass    | Prettier check passed before editing.                             |
| `pnpm lint`                                     | Pass    | ESLint passed.                                                    |
| `pnpm typecheck`                                | Pass    | All workspace project typechecks passed.                          |
| `pnpm test`                                     | Pass    | 29 test files, 288 tests passed.                                  |
| `pnpm build`                                    | Pass    | Workspace build and Vite client build passed.                     |
| `pnpm balance:report`                           | Pass    | Printed starter/encounter and pack usability report, no warnings. |
| `pnpm test:browser`                             | Pass    | 4 Chromium smoke tests passed.                                    |
| `pnpm dev`                                      | Pass    | Served Vite on `http://127.0.0.1:5173/`.                          |
| `pnpm exec prettier --write PLAYTEST_REPORT.md` | Pass    | Report formatted after overwrite.                                 |
| `pnpm format:check`                             | Pass    | Final formatting check passed.                                    |
| `git diff --check`                              | Pass    | No whitespace errors.                                             |

## 3. Scenarios Covered

| Scenario                   | Manual result | Notes                                                                 |
| -------------------------- | ------------- | --------------------------------------------------------------------- |
| Default route `/`          | Pass          | Starter selection, inspectors, combat, reward pack, and advance work. |
| `?scenario=engagement-lab` | Pass          | Out-of-range melee and in-range ranged previews are understandable.   |
| `?scenario=priority-lab`   | Pass          | Priority, stack, combat skirmish, and second main transitions work.   |
| `?scenario=upgrade-lab`    | Pass          | Duplicate combine and Lv 1 Cinder Scout inspection/placement work.    |

No browser console warnings or errors were captured during the manual pass.

## 4. Default Route `/`

The main run loop still teaches what to do next. The Run State panel and top
phase strip showed:

- Planning: `Next: adjust your loadout or ready combat.`
- Combat ready: `Next: review the preview, then record combat.`
- Reward: `Next: open one reward pack.`
- Combat resolved: `Next: advance to the next round.`

Starter selection works. Switching from Ember Scrappers to Rotbloom Recall
changed the inspected ally to Hollow Caller, changed the encounter to Bloomhide
Stomper, and changed the engagement preview to Hollow Caller attacking a Guard
target. Switching back restored Ember Scrappers.

Ally Inspector and Enemy Inspector are useful. They show card type, zone,
aspect, cost, stats, upgrade text, keywords, tags, traits, combat stat chips,
combat-model explanations, rules text, ability text, and design metadata. Ally
Inspector additionally shows legal actions and blocked reasons; Enemy Inspector
correctly suppresses legal actions.

The Hex Arena shows occupied cells and relevant preview state without horizontal
scroll. At 1280 x 720, the document width was `1265 / 1265`, and the Hex Arena
viewport was `672 / 672` for client width and scroll width. The selected ally
occupied cell was immediately visible. The enemy occupied cell and target marker
can sit near or just below the first vertical fold, so vertical framing still
needs work, but this is no longer a horizontal-scroll issue.

Selecting an ally board Unit showed selected, range, likely-target, and
attack-now markers. Selecting the enemy board Unit flipped the selected and
target sides correctly while preserving the two inspectors for comparison. The
Engagement Preview panel text was clear:

- `Ember Scraprunner can attack Ember Scraprunner now.`
- `Distance 1, range 1.`
- `Likely target: nearest valid enemy.`

The combat loop worked:

- `Ready Combat` produced an Upcoming Combat Preview.
- Round 1 preview showed a draw, 11 events, and no warnings.
- `Record Combat` moved the run to reward phase and awarded +5 gold.
- Reward choices were affordable and explained pack cost, remaining gold, trait
  fit, duplicate/teamup relevance, pack bias, and cheapest-offer status.
- I opened the first reward, Cloudspire Pack, for 4 gold.
- The pool showed 6 new cards with `new` markers and a gold transition of
  `5 -> 1`.
- `Advance` moved the run to round 2, planning phase, against Ash Debt
  Collector.

## 5. `?scenario=engagement-lab`

The melee out-of-range preview is clear in the panel and mostly clear on the
board. Cinder Scout started selected and showed:

- `Out of range`
- `Cinder Scout cannot attack yet.`
- `Target is 3 hexes away, range 1.`
- `Next move: r2 c1 to r2 c2.`
- `Likely target: nearest valid enemy.`

Board marker counts confirmed selected, range, likely target, out-of-range, and
next-move states were present. The selected, range, and next-move badges were
visible in the first viewport. The target/out-of-range badge was on the enemy
board lower in the arena, so it may require vertical scroll at 1280 x 720.

The ranged preview is clearer. Selecting Sparkcatch Apprentice showed:

- `Attack now`
- `Sparkcatch Apprentice can attack from 2 hexes away.`
- `Distance 2, range 2.`
- No next-move marker, which is correct because the selected ranged Unit can
  attack immediately.

Recording the engagement-lab combat produced a player win, 29 events, and no
warnings. The combat summary included understandable one-hex movement:

- `Your Cinder Scout moved one hex from r2 c1 ground to r2 c2 ground toward Ember Scraprunner.`
- `Enemy Ember Scraprunner moved one hex from r0 c3 ground to r1 c2 ground toward Cinder Scout.`

## 6. `?scenario=priority-lab`

Priority lab successfully demonstrates the future encounter shell:

- Initial state: turn 1, first main, active actor Player, priority holder
  Player, stability 5/5, empty stack, in-progress outcome.
- At the time of this manual pass, `Submit Debug Action` put `Debug pressure` on
  the stack and passed priority to Enemy. The current implementation now uses
  `Queue Prototype Technique` / `Prototype Pressure Technique` for this lab
  path.
- `Enemy Pass` returned priority to Player with one consecutive pass and the
  stack still full.
- `Pass Priority` resolved the stack action, emptied the stack, and reduced
  enemy stability from 5 to 4.
- Empty-stack player/enemy passes advanced the phase to Combat skirmish.
- `Run Combat Skirmish` recorded skirmish 1 and advanced to Second main.

This is enough to teach the developer-facing model: turn, phase, active actor,
priority holder, consecutive passes, LIFO stack, action log, skirmish records,
stability, and outcome are all visible in one panel.

It is not yet enough to teach a player-facing encounter model. The current lab
now has one prototype action instead of a debug-only button, but that action is
still abstract, not sourced from a card zone, and not attached to authored card
content. Stability changes are visible but not explained as a real gameplay
decision yet.

Priority-lab readability issue found during the manual pass: Action Log metadata
was visually jammed onto the log sentence. In the browser it read like
`Match started with Player active.Turn 1 | First main | Stack 0` and
`Player submitted Debug pressure.Turn 1 | First main | Stack 1`. The current
prototype action changes the action text, and a follow-up UI fix now renders the
metadata as a separate muted row below each log sentence.

## 7. `?scenario=upgrade-lab`

Duplicate upgrade flow works.

Initial Upgrade Progress showed:

`Cinder Scout: 3 / 3 pool copies at Lv 0 -> Upgrade to Lv 1`

The pool showed three ready Cinder Scout copies with `ready` badges and `Place
on Board` actions. Clicking `Upgrade` consumed the three Lv 0 pool copies and
left one Lv 1 Cinder Scout.

The upgraded card is understandable in the pool inspector:

- Zone: pool
- Stats: `2 ATK / 3 HP / 1.1 speed / 1 range`
- Upgrade: `Level 1`
- Upgrade bonus: `Current bonus: +1 ATK / +1 HP.`
- Progress: `Level 1: 1 / 3 pool copies.`
- Blocked reason: needs 3 matching Lv 1 pool copies, found 1

The upgraded card is also understandable on the board. After placing it, the
Board panel showed `Cinder Scout Lv 1` at `r0 c0 ground`, the Hex Arena token
showed `2 ATK`, `3 HP`, `1.1 AS`, `1 RNG`, and `Lv 1`, and Ally Inspector
changed to `Unit | board | Ember` with `Return to Pool` as the legal action.

## 8. Stale Report Items Rechecked

| Old report item                               | Current status       | Current finding                                                                  |
| --------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| Hex board has horizontal scroll               | Fixed                | No horizontal page or arena scroll at 1280 x 720.                                |
| Occupied cells hidden to the right            | Fixed horizontally   | Occupied cells fit width; vertical framing can still hide enemy markers.         |
| Missing range/target preview                  | Fixed substantially  | Selected, range, target, attack/out-of-range, and next-move markers are present. |
| Two boards do not feel like one arena         | Still true           | `Ally Hex Board` and `Enemy Hex Board` still read as stacked separate boards.    |
| Long combat summaries need grouping/filtering | Still true           | Short fights are readable, but the UI still has no grouping/filtering.           |
| Priority shell is not visible                 | Fixed for developers | Priority lab makes the shell visible, but actions are placeholder-only.          |

## 9. Bugs Or Confusions

No confirmed gameplay or simulator bugs were found.

### Resolved UX Confusion: Priority Action Log Text Ran Together

- Steps: Open `?scenario=priority-lab`, submit a debug action, pass priority,
  and inspect Action Log.
- Observed: Log sentence and metadata are adjacent, for example
  `active.Turn 1` and `pressure.Turn 1`.
- Expected: Metadata should read as a separated detail line or column.
- Current status: Fixed by rendering each Action Log entry as primary sentence
  text plus a separate muted metadata row.

### UX Confusion: Target Markers Can Fall Below The First Fold

- Steps: Open `?scenario=engagement-lab` at 1280 x 720.
- Observed: The Cinder Scout selected/range/next-move markers are immediately
  visible, while the out-of-range target marker sits on the enemy board lower in
  the arena.
- Expected: For preview labs, the selected Unit, likely target, and next move
  should be visible together whenever practical.
- Severity: Low to medium. The panel text prevents confusion, but the board
  preview is less immediate than it could be.

### UX Confusion: Two Boards Still Do Not Feel Like One Battlefield

- Steps: Play any route with the Hex Arena.
- Observed: Ally and enemy sides are visually clear, but the presentation reads
  as two separate boards joined by an `Engagement Line`.
- Expected: The battlefield should eventually communicate one shared tactical
  engagement space.
- Severity: Medium UX issue, but no longer the top blocker.

### UX Risk: Long Combat Summaries Still Need Structure

- Steps: Record any combat and inspect Last Recorded Combat.
- Observed: Short 11-event and 29-event fights were readable. The display still
  renders a flat sequence with no grouping, filters, or timeline compression.
- Expected: Longer fights should let players collapse movement, attacks,
  triggers, raw debug details, and outcome highlights.
- Severity: Low now, likely medium once combats grow longer.

## 10. Known Limitations

- Priority lab now has one abstract prototype main-phase action, but no real
  hand/deck/mill/card-zone source exists yet.
- Debug placeholder reducer actions still exist for diagnostics, but the
  browser lab emphasizes the prototype action.
- Combat skirmishes still use the existing deterministic simulator result.
- The priority shell has no hand, deck, mill, counterspell, hidden intent,
  multiplayer, backend persistence, or real card timing windows.
- Traits/teamups are display-only.
- Duplicate upgrades are generic Unit/Echo combines with +1 ATK/+1 HP per level.
- The Hex Arena is still React/CSS debug UI, not Pixi, animation, drag/drop, or
  final battlefield rendering.
- The two-board presentation remains a debug framing, not a finished shared
  arena.
- Raw debug event details are available behind disclosure, but the compact
  combat summary is still not a full replay tool.

## 11. Recommended Next Tasks

Do next:

`feat(rules): source encounter actions from minimal card context`

Why: after the prototype action skeleton and action-log readability fix, the
next useful rules step is proving how an encounter action is sourced from a
minimal card-like context without jumping into full hand/deck/mill,
counterspells, enemy AI, or normal run-loop integration.

Do soon:

- `feat(client): keep selected target and next move visible together in preview labs`
- `feat(client): group or filter long combat summary events`
- `feat(client): improve one-arena battlefield framing`

Still wait:

- Pixi
- Drag/drop
- Animations
- Backend
- Multiplayer
- Hand/deck/mill
- Counterspells
- Broad card or mechanic expansion
