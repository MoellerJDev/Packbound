# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound's normal browser prototype still works, and
the default route now uses the Pixi battlefield as its primary board. Renderer
Lab remains the opt-in diagnostics route for replay controls, feed comparison,
and click-to-place stress testing.

The default route keeps starter selection, dual inspectors, readying combat,
combat recording, reward pack purchase, run advancement, engagement preview
overlays, priority lab, and duplicate upgrade lab intact. The React/CSS Hex
Arena remains available as a collapsed debug fallback rather than the primary
default battlefield.

The old stale issues are no longer the right top blockers:

1. Horizontal hex-board scroll at normal desktop width appears fixed. At the
   default 1280 x 720 in-app browser viewport, the default route, renderer lab,
   engagement lab, priority lab, and upgrade lab all reported no horizontal page
   overflow.
2. Missing selected range/target preview is fixed substantially. The React/CSS
   Hex Arena shows selected cells, range cells, likely target, attack-now or
   out-of-range state, and next-move markers clearly enough for debug play.
3. The two-board battlefield presentation is fixed for the primary default
   battlefield. `/` and `?scenario=renderer-lab` now use the shared Pixi field,
   while the old React/CSS two-board view remains available only as a collapsed
   debug fallback.

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

Implementation update after this task: the default route now mounts the Pixi
battlefield as the primary `Battlefield` view. It keeps Ally Inspector, Enemy
Inspector, Engagement Preview, compact run stats, and Combat Model Notes, but
does not render Renderer Lab's replay buttons, Renderer Feed, Combat Feed
Sample, or click-to-place lab panels. The old React/CSS Hex Arena is still
available inside a collapsed `React/CSS Debug Board` fallback on `/`.

Implementation update after this task: the default Pixi battlefield now has a
minimal board-placement affordance. A legal board-placeable Pool card can be
selected with `Select Board Cell`, Pixi highlights legal cells using the same
placeable-position model as Renderer Lab, and clicking a highlighted cell places
the card through the existing `placeCardOnBoard` reducer path. The original
list-button `Place on Board` workflow remains available.

Implementation update after this task: the default Pixi placement hint now
distinguishes idle, ready, selected-card blocked, and blocked-cell states. With
no selected Pool card it explains the expected flow, with a selected placeable
card it names the card and points to highlighted cells, and when a non-placeable
cell is clicked it names the target coordinate/layer and surfaces the existing
placement validation reason instead of a generic failure.

Implementation update after this task: default Pixi placement state and hint
building have been extracted out of `App.tsx` into a focused placement
view-model and hook. The battlefield now shows a small board-edit control strip
that reports Inspect vs Place mode, the selected placement card, the current
placement status, and a `Cancel Placement` action. Browser smoke covers the
idle control state, selecting a Pool card, canceling placement, verifying a
post-cancel Pixi cell click is a no-op, blocked-cell copy, token inspection, and
placing through a highlighted Pixi cell.

Maintenance update after this task: route-neutral Pixi placement wiring now uses
Pixi/shared names instead of old Renderer Lab-only names in `App.tsx` and
`RendererLabRoute`. The reusable `PACKBOUND_AGENT_PROMPT_GUIDE.md` has also
been added as a general Packbound agent guide, replacing the stale one-off
default-Pixi handoff prompt that had been copied into the working tree during
the audit.

Implementation update after this task: the default Pixi battlefield now has a
compact `Loadout` control strip for selected Pool cards. It uses existing legal
loadout actions to expose `Add to Source Row` for selected Sources and
`Add to Spellrail` for selected Techniques, while showing clear idle and
no-zone-action copy for other Pool cards. Browser smoke returns the starter
Source and Technique to Pool, moves them back through the Pixi-adjacent
controls, and then verifies the existing board placement mode still works.

Implementation update after this task: the default Pixi-adjacent controls now
also cover return-to-pool and Commander lifecycle affordances. Selecting an
ordinary Board, Source Row, or Spellrail card shows its zone and the existing
legal `Return to Pool` action in the primary battlefield control strip.
Commander inspect, deploy, and return-to-Command controls now sit beside the
Pixi battlefield as a compact companion to the existing Command Zone panel.
Browser smoke exercises Source Row return, Spellrail return, Board return after
Pixi placement, Commander inspect/deploy/return, and verifies Renderer Lab replay
controls remain absent on `/`.

Implementation update after this task: `/` is now the Pixi-focused 10-minute
playtest route rather than the old debug-grid landing surface. The default run
uses a shared default-playtest setup extracted from the upgrade-lab duplicate
fixture, so a new run opens with an immediate Cinder Scout upgrade/build
decision while preserving starter selection, Pixi board placement, Source Row
and Spellrail moves, return-to-pool, Commander controls, ready/record combat,
reward pack opening, Commander upgrades, post-pack suggestions, and Advance.
The old default debug grid remains available inside collapsed `Advanced Debug
Panels`, while `?scenario=upgrade-lab` remains a separate diagnostic route.
Automated coverage now includes the deterministic default playtest setup and a
default combat expectation against that setup.

Implementation update after this task: combat summaries now include deterministic
`Key Moments` grouping built in `packages/sim` beside the existing display
summary helper. Default-route upcoming and recorded combat panels show the
grouped winner, damage, destroyed, major damage, attacks, Techniques, special
events, warnings, and event-count/hidden-count text immediately, while the full
combat event feed remains available behind the existing collapsed details.
Renderer Lab's Combat Feed Sample uses the same summary object and keeps the raw
line feed visible for diagnostics.

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
a fresh manual visual pass after any substantial future Pixi visual change.

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
stored metadata.

Implementation update after this task: encounter action targets now also support
prototype board-card target snapshots. Priority Lab exposes `Target Probe`, a
main-phase no-source action that costs 1 match-local Combat Charge, targets the
selected current encounter enemy board card, enters the normal stack/pass flow,
and resolves by appending a match-local board-card effect event that marks the
target as `probed`. The Priority Lab debug UI now lists available enemy
board-card targets, shows the selected target, queues the probe against that
selection, and displays the resulting Target Effects event. This proves
serializable board-card target/effect metadata for future authored actions. It
is not unit damage, real statuses, Pixi click targeting, board-cell targeting UI,
or a full effect engine.

Implementation update after this task: encounter actions now have a minimal
match-local Combat Charge paid-cost prototype. `Target Probe`,
`Prototype Pressure Technique`, and `Commander Rally` each pay 1 Combat Charge
when submitted. Priority Lab seeds enough player Combat Charge to exercise all
three actions, and paid cost events show before/after charge totals separately
from source-used-on-resolve events. This does not spend or exhaust `RunState`
Sources yet.

Implementation update after this task: encounter Combat Charge setup now has a
rules-layer Source Row bridge. `buildEncounterCombatChargeProfileForRun` sums
valid Source Row Combat Charge/sec and rounds up to deterministic starting
match-local player Combat Charge. Priority Lab now shows the source-derived
starting charge, Source Row Combat Charge/sec, current match-local charge, and
an explicitly labeled +2 debug top-up used only so the lab can queue Target
Probe, Commander Rally, and Prototype Pressure Technique in one smoke flow.

Implementation update after this task: the renderer-lab replay controller and
Pixi renderer now guard replay command completions with the current reset
generation and session-scoped busy state. Browser smoke covers `Step -> Reset ->
Play`, `Play -> Reset -> Play`, repeated reset/play, single-canvas safety, and
console/page-error capture. The previously observed replay stall is fixed in
automated coverage.

Vertical-slice audit update after this task: the default route is now closer to
a playable 3-fight run than an engine-only lab. The manual pass played Ember
Scrappers through round 1 combat, reward pack purchase, Commander upgrade,
round advance, loadout improvement, and round 2 combat. The loop produces real
decisions and a readable story, especially once packs feed the next planning
round and the Commander can deploy, die, return to Command, and tax future
deployment. This task made only small client/report changes: clearer run-path
copy, a less self-deprecating topbar, reward/combat consequence notes, no raw
event JSON on the default route, a quieter default Commander Upgrade panel, and
clearer "inspect for blocked reason" text on cards with no immediate move.

Default-route bloat-reduction update after this task: `/` now has a compact
player-facing flow. The top visible dashboard starts with `What now?` and the
five-step loop: prepare loadout, start combat, review combat, choose rewards,
and advance. Legal Planning Check, opponent loadout internals, display-only
Traits / Teamups, idle duplicate Upgrade Progress, run seed/status metadata,
full Commander lifecycle history, combat model notes, reward rationale details,
and long combat event feeds are now collapsed by default on `/`. Labs keep their
verbose diagnostic surfaces.

Implementation update after this task: the default route now shows compact
post-pack loadout suggestions after a reward pack is opened. The rules layer
builds a deterministic `Suggested next edits` summary from only the latest
opened pack and existing legal loadout actions. The panel stays locked during
reward/combat-resolved phases, then after Advance it can apply legal Source Row,
Spellrail, or board placement actions through the same reducer path as the Pool
buttons. This is a clarity layer, not a new mechanic or broad recommendation
engine.

Implementation update after this task: reward pack explanations now rank
concrete reasons ahead of broad overlap. Unaffordable warnings remain first,
visible duplicate upgrade progress beats softer synergy text, duplicate
Unit/Echo potential beats broad pack bias, Source/fixing pressure gets a
stronger headline, and near-trait-only overlap now uses cautious copy instead of
claiming a pack is likely to support the current trait direction.

Maintenance update after this task: `App.tsx` panel and route extraction is
broader now. Earlier focused components cover the run guide, Command Zone,
reward choices, post-pack suggestions, combat result/preview panels, Commander
upgrades, and the default-route Board, Source Row, Spellrail, Upgrade Progress,
and Pool Cards sections. Renderer Lab now lives in `RendererLabRoute`, Priority
Lab route-specific action-source, target, can-submit, unavailable-text,
combat-charge, and callback wiring live in `PriorityLabRoute`, and this pass
extracted Battlefield / Hex Arena rendering into `BattlefieldSection` and
`HexArenaView`. This pass moved the default debug-grid route composition into
`DefaultRunRoute`, including Run Guide, Command Zone, Commander Upgrades,
Opponent Details, Planning Check, Traits / Teamups, Reward Choices, post-pack
suggestions, loadout zones, combat panels, and current encounter details.
`App.tsx` dropped from about 2309 lines before the panel extraction work to
about 1528 lines now, including about 164 lines removed in this DefaultRunRoute
pass. No gameplay, rules, routes, lab behavior, copy, reward ranking, post-pack
suggestions, combat preview logic, board/engagement math, Pixi behavior,
Priority Lab mechanics, action contracts, stack behavior, target probe behavior,
source lifecycle behavior, or Pixi-default behavior changed. Targeted typecheck
and browser smoke passed during the pass. Remaining client bloat is mostly
renderer-lab state/controller setup and top-level App state coordination.

Implementation update after this task: the default Pixi playtest route has a
tighter presentation pass. Ally and Enemy inspectors now show compact
name/type/stat/cost summaries with `Full card details` collapsed by default,
the Pixi board action controls are grouped into one compact strip below the
canvas, the initial combat area shows a `Combat Preview` status card instead of
an empty recorded-combat panel, and the decision panel uses denser spacing. This
is a layout-only/client presentation pass; rules, combat, loadout legality,
rewards, content, and Pixi renderer behavior did not change.

Manual playtest update after this task: the tightened default Pixi route was
played through the intended 10-minute path on July 6, 2026 at 1440 x 900, then
checked at 1280 x 720. The route is close to showable: the immediate upgrade
decision, Pixi board, compact inspectors, Combat Preview, Key Moments, rewards,
Commander upgrade, Advance, and post-pack suggestions form a coherent loop. The
largest remaining friction is that key loadout-editing lists still live under
`Advanced Debug Panels`, while the Pixi action strip sits below the canvas and
falls below the first fold at 1280 x 720. A first-time player can understand the
loop with light narration, but the route is not yet a cold-start demo.

Implementation update after this task: `/` now has a compact first-fold
`Loadout Tray` between the Current Decision card and the Pixi battlefield. The
tray surfaces Pool, Board, Source Row, and Spellrail rows with the same existing
legal `Inspect`, `Select Board Cell`, `Add to Source Row`, `Add to Spellrail`,
and `Return to Pool` actions used by the full loadout lists. Full loadout lists
remain available under `Advanced Debug Panels`, but ordinary editing no longer
requires opening that panel first.

Implementation update after this task: the first-fold `Loadout Tray` now carries
short education copy for the confusing loadout constraints. It explains that
Units/Echoes use the ground layer, Relics/Fields use support, Board Charge
limits deployed board cards, Source slots limit Sources, Sources add Combat
Charge/sec, and Techniques live in Spellrail slots. This is a UI clarity pass
only; rules, validation, loadout actions, Pixi placement, combat, content, and
rewards did not change.

Implementation update after this task: post-pack suggestions now group duplicate
latest-pack copies that have the same useful recommendation. The displayed row
shows copy count, such as `Cracked Prism x2`, and applies one representative
legal action while preserving all actual card instances in the pool. Suggestions
with the same card name but different action availability stay separate, so the
copy does not hide blocked or different-action cases.

The biggest remaining Pixi/default-route findings are no longer the absence of
replay controls, tiny first-pass labels, unvalidated readability, default-route
confidence, basic default-route edit affordances, an ungrouped default combat
feed, a debug-grid first screen, or always-expanded inspector detail. Now that
`/` opens on a tighter Pixi-focused playtest surface with an immediate build
decision, a first-fold Loadout Tray, and grouped duplicate post-pack
suggestions, the next gaps are richer direct-manipulation polish such as
drag/drop or canvas-native zone editing, stronger post-pack blocked-reason copy,
scrub or speed controls in Renderer Lab, and checking that grouped combat copy
scales beyond the current starter fights.

Recommended next task:

`feat(client): improve post-pack blocked-reason copy for Source capacity and board layers`

## 2. Environment And Commands

- Baseline before this vertical-slice audit:
  `5ed0df4b9c9767f982aa1670b9c36effe90c286a`
- Branch: `main`, aligned with `origin/main` before edits
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.18.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app browser against local Vite, plus Playwright
  browser smoke tests
- Dev server URL: `http://127.0.0.1:5173/`
- Manual viewport coverage: default in-app browser viewport, approximately
  1280 x 720
- Screenshot file created: no. No screenshots, traces, videos, browser reports,
  generated balance reports, or raw logs were added to the repo.
- Dependency install: skipped because `node_modules` was already present.

| Command                                                        | Status | Notes                                                                            |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `git fetch origin`                                             | Pass   | Fetched before testing.                                                          |
| `git status --short --branch`                                  | Pass   | Clean worktree before edits; local `main` aligned with `origin/main`.            |
| Commit ancestry check                                          | Pass   | Local `main` included `5ed0df4b9c9767f982aa1670b9c36effe90c286a`.                |
| `pnpm dev -- --host 127.0.0.1`                                 | Pass   | Served Vite on `http://127.0.0.1:5173/` for manual playtesting.                  |
| Manual default route playtest                                  | Pass   | Played Ember Scrappers through round 2 combat after reward/loadout improvement.  |
| Manual Priority Lab / Renderer Lab / Upgrade Lab sweep         | Pass   | Routes loaded, no horizontal overflow seen, and no console/page errors captured. |
| `pnpm typecheck`                                               | Pass   | Targeted pre-full-gate typecheck passed.                                         |
| `pnpm test -- packages/rules/src/__tests__/runClarity.test.ts` | Pass   | Repository script ran the Vitest suite; 38 files / 383 tests passed.             |
| `pnpm test:browser`                                            | Pass   | Targeted browser smoke pass: 5 Chromium tests passed.                            |
| `pnpm format`                                                  | Pass   | Prettier wrote/confirmed formatting.                                             |
| `pnpm format:check`                                            | Pass   | All matched files use Prettier style.                                            |
| `pnpm lint`                                                    | Pass   | ESLint passed.                                                                   |
| `pnpm typecheck`                                               | Pass   | Full-gate typecheck passed.                                                      |
| `pnpm test`                                                    | Pass   | Full Vitest suite passed; 38 files / 383 tests.                                  |
| `pnpm build`                                                   | Pass   | Build passed with the known Pixi/Vite chunk-size warning.                        |
| `pnpm balance:report`                                          | Pass   | Deterministic balance text report command passed.                                |
| `pnpm test:browser`                                            | Pass   | Full-gate browser smoke pass: 5 Chromium tests passed.                           |

Build warning observed and not fixed in this task:

- Vite reported `(!) Some chunks are larger than 500 kB after minification`.
- Largest listed chunk: `assets/index-vW2mnqT0.js`, `764.47 kB`, gzip
  `222.86 kB`.

## 3. Scenarios Covered

| Scenario                   | Manual result | Notes                                                                                                                                 |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Default route `/`          | Pass          | Pixi battlefield is now primary; full run loop still works and React/CSS remains collapsed as a debug fallback.                       |
| `?scenario=renderer-lab`   | Lab pass      | Pixi readability is manually validated; reset/play stall is fixed in smoke coverage.                                                  |
| `?scenario=engagement-lab` | Pass          | Out-of-range melee and in-range ranged previews are understandable.                                                                   |
| `?scenario=priority-lab`   | Pass          | Commander Rally, Prototype Technique, Target Probe, contract text, target metadata, source lifecycle, stack, log, skirmish flow work. |
| `?scenario=upgrade-lab`    | Pass          | Duplicate combine and Lv 1 pool-card inspection work.                                                                                 |

Browser console result: no warnings or errors captured across the manual pass.

## Vertical Slice Playability Audit

### Tightened Default Pixi Route Manual Playtest - July 6, 2026

Viewport coverage:

- Main pass: 1440 x 900 explicit browser viewport. The measured content width
  was 1425 px after scrollbar space, with no horizontal overflow.
- Sanity pass: 1280 x 720 explicit browser viewport. The measured content width
  was 1265 px after scrollbar space, with no horizontal overflow.

Manual path played:

1. Read the `Current Decision` panel and applied the immediate Cinder Scout
   duplicate upgrade.
2. Inspected the Pixi battlefield, clicked an ally token and enemy token, and
   opened then closed `Full card details`.
3. Opened `Advanced Debug Panels` to reach loadout lists, round-tripped Ember
   Source through Pool back to Source Row, and round-tripped Sparkfall through
   Pool back to Spellrail.
4. Used the compact Commander controls to inspect, deploy, and return
   Sparkcatch Apprentice to Command. The resulting Rebind Tax block was clear:
   redeploy needed 4 total Board Charge while Source Row provided 3.
5. Selected Sparkcatch Apprentice from Pool, clicked a highlighted Pixi cell,
   and confirmed board charge moved to 3 / 3.
6. Readied combat, reviewed Combat Preview, recorded combat, read Key Moments,
   opened a reward pack, applied Rebind Calibration, advanced to round 2, and
   applied one post-pack suggestion.
7. Briefly loaded Renderer Lab, Priority Lab, Engagement Lab, and Upgrade Lab;
   all loaded, had no horizontal overflow, and produced no browser console
   warnings or errors in the pass.

Scorecard:

| Category                         | Score | Finding                                                                                                                                       |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| First-screen clarity             | 4 / 5 | `Current Decision` and the immediate upgrade are clear, but "tune your board" points to controls that are below the fold or inside debug UI.  |
| Battlefield readability          | 4 / 5 | Pixi is visually central, tokens/stats are readable at both tested sizes, and compact inspectors help, but support/ground layers need help.   |
| Action/control clarity           | 3 / 5 | Inspect/Place/Loadout/Commander modes work and blocked reasons are good, but the source lists are hidden under `Advanced Debug Panels`.       |
| Combat understanding             | 4 / 5 | Combat Preview and Key Moments explain winner, damage, destroyed units, and triggers well enough without opening the full feed.               |
| Reward/advance clarity           | 4 / 5 | Pack cost, after-purchase gold, Commander upgrade, Advance, and post-pack suggestions are understandable, though duplicate suggestions recur. |
| Overall 10-minute demo viability | 4 / 5 | Close to showable with light narration; not yet a cold first-time demo because core editing affordances still feel tucked away.               |

What worked:

- The route opens with an actual decision rather than a lab wall. Cinder Scout's
  duplicate upgrade is understandable and satisfying as a first click.
- Pixi now owns attention. At 1440 x 900 and 1280 x 720, the board reads as the
  primary arena and there is no horizontal page overflow.
- Compact inspectors are a net improvement. ATK/HP/AS/RNG and Cost/Stats/Upgrade
  are visible without flooding the first minute, and `Full card details` is
  discoverable when deeper simulator/legal text is needed.
- Source Row, Spellrail, return-to-pool, Commander, and Pool-to-board placement
  all work through the compact Pixi-adjacent control strip once a card is
  selected.
- Combat Preview is useful before commitment. In the tested path it predicted a
  player win, 12 events, 0/1 damage, destroyed units, major damage, and a
  Sparkcatch trigger.
- Recorded Key Moments are readable enough to explain the fight without opening
  the full event feed.
- Rewards and Commander upgrades are understandable. Pack costs and remaining
  gold are clear, Rebind Calibration made sense after voluntarily returning the
  Commander, and Advance became the obvious next button.
- Post-pack suggestions are useful after Advance. Applying Cracked Prism moved
  Source capacity from 3 to 5 and made the next planning step feel productive.

What felt confusing:

- The first screen says to tune board, Sources, Spellrail, and Commander, but a
  new player does not see the Pool Cards, Source Row, Spellrail, or Board lists
  until they open `Advanced Debug Panels`.
- The Pixi action strip is helpful, but it sits below the canvas. At 1280 x 720,
  the first viewport shows the top of the board and inspectors, while the
  action strip and placement hint are below the fold.
- `Advanced Debug Panels` now contains core playtest actions, not just advanced
  debugging. The label is accurate historically but misleading for a first-time
  playtest.
- Support/ground layering is still more learned through blocked placement
  messages than explained up front.
- Repeated Source suggestions can look odd when a pack contains duplicate Source
  cards. It is legal and deterministic, but the recommendation list could group
  duplicate names.
- `Sparkcatch Apprentice triggered` is useful in Key Moments, but it does not
  explain why the trigger happened unless the player already inspected the card.

Verdict:

- Overall status: close, not cold-start showable.
- Biggest success: the combat/reward/advance loop now feels coherent once the
  player finds the loadout controls.
- Biggest UI friction: core loadout lists are hidden behind `Advanced Debug
Panels`, and the Pixi action strip is below the first fold at 1280 x 720.
- Biggest gameplay friction: board layers and triggered effects are visible in
  results but not taught strongly enough during planning.
- Smallest next improvement: surface a compact first-fold loadout tray for the
  selected Pool/Board/Source/Spellrail card so normal editing no longer depends
  on opening `Advanced Debug Panels`.

Manual path played for this audit:

1. Started the default route with Ember Scrappers.
2. Read the starter board, Source Row, Spellrail, Command Zone, inspectors, and
   next-action text.
3. Readied round 1 combat, inspected the upcoming preview, recorded combat, and
   reviewed the result.
4. Applied `Combat Training`, opened an Ember Foundry Pack, saw new pool cards,
   and advanced to round 2.
5. Improved the loadout by adding Cracked Prism, placing Signal Nest, deploying
   the upgraded Commander, and recording round 2 combat.
6. Quickly checked Priority Lab, Renderer Lab, and Upgrade Lab for route health,
   horizontal overflow, and console/page errors.

## Default Route Bloat Reduction

Current status: implemented as a client-only streamlining pass. No rules,
combat, Commander, encounter, card, or Pixi-default behavior changed.

### Player-Facing By Default

- The default route now opens below the battlefield with a compact `What now?`
  panel that names the current next action and shows the intended loop:
  prepare loadout, start combat, review combat, choose rewards, and advance.
- The visible core remains the run header, starter selector, Ready / Record /
  Advance controls, Pixi battlefield, Ally Inspector, Enemy Inspector,
  compact Command Zone, Board, Source Row, Spellrail, Pool Cards, reward choices
  when relevant, Commander upgrades when relevant, and compact combat result
  summaries.
- Command Zone stays actionable: Commander name, zone, deploy count, effective
  Rebind Tax, deploy cost, Board Charge after deploy, Inspect, Deploy Commander,
  Return to Command, and blocked reasons remain visible.
- Combat result panels now prioritize winner, damage taken/dealt, gold gained,
  event count, and whether the Commander returned to Command.
- After a pack is opened, `Suggested next edits` summarizes the latest pack and,
  once the run advances back to planning, surfaces legal Source Row, Spellrail,
  and board placement actions from those new cards.

### Collapsed Or Hidden On `/`

- Full Commander lifecycle history is under `Commander History`.
- Current Encounter internals moved under `Opponent Details`; the battlefield is
  still the primary enemy-inspection surface.
- Legal Planning Check is collapsed by default and expands only when the player
  wants validation detail; illegal states still surface visibly.
- Display-only Traits / Teamups are collapsed because they do not yet drive
  combat effects.
- Idle duplicate Upgrade Progress is collapsed unless an actual combine is
  ready.
- Reward offer rationale lists are collapsed behind their headline.
- Long combat event feeds and combat model facts are collapsed.
- Run seed/status metadata is under `Run details`.

### Intentionally Lab-Only

- Priority Lab keeps priority holder, phase, stack, action contracts, source
  lifecycle, Combat Charge, target probe, skirmish, and action-log detail.
- Renderer Lab keeps Pixi replay controls, renderer feed, Combat Feed Sample,
  click-to-place panels, and the collapsed React/CSS fallback.
- Engagement Lab keeps range/target preview diagnostics.
- Upgrade Lab keeps duplicate-upgrade diagnostics visible.

### Still Blocking Spike Viability

- The default route is clearer, but non-board zone management still relies on
  compact buttons rather than canvas-native direct manipulation.
- New pack cards are still only movable after advancing back to planning. The
  new post-pack suggestions explain that timing and apply legal next edits, but
  they are intentionally not automatic and not available during reward choice.
- Support/ground layering is still more implied than taught.
- The primary default battlefield now reads as one shared Pixi arena; the
  collapsed React/CSS debug fallback still reads as two stacked boards.
- Long combat feeds are collapsed, not yet grouped or filtered.

### What Currently Feels Like A Game

- The core loop is real: choose starter, inspect board, ready combat, record a
  deterministic fight, claim a pack plus Commander upgrade, improve the loadout,
  and move into a harder second fight.
- Round 1 creates a readable mini-story. Sparkfall queues, both Ember
  Scraprunner units trade, combat ends in a draw, and the player gains gold.
- Reward choices matter more once the player sees duplicate progress and pack
  costs. In the tested run, Ember Foundry Pack clearly chased Ember Scraprunner
  duplicates, while Source Pack offered cheaper fixing.
- The Commander prototype now contributes to the playable spine instead of just
  being a lab note. `Combat Training` made Sparkcatch Apprentice Lv 1, it
  deployed in round 2, fought, died, returned to Command Zone, and increased
  Rebind Tax.
- Loadout improvement is understandable when it works: Cracked Prism increases
  capacity/aspect access, Signal Nest occupies support, Sparkcatch occupies
  ground, and the Planning Check stays legal.

### What Still Feels Like A Debug Lab

- Card inspectors are compact by default now, but the expanded `Full card
details` view is still verbose when simulator facts, legal actions, blocked
  reasons, design metadata, and upgrade context are all open at once.
- Source Row, Spellrail, return-to-pool, and Commander lifecycle actions now
  have compact Pixi-adjacent controls, but they are still button-driven. They
  are playable, but still feel like a debug loadout editor rather than a
  board-first game interface.
- Current Encounter, legal Planning Check, display-only Traits / Teamups, idle
  Upgrade Progress, and long combat feeds are now collapsed on `/`, but the
  collapsed labels still reveal that this is a prototype shell.
- Priority Lab remains valuable for rules development, but it should not leak
  into the mental model for a normal 10-minute run.

### What Is Confusing In The Default Route

- Before this task, the topbar called the build an "Ugly playable deterministic
  run loop." The new copy is less self-deprecating and more player-facing.
- Before this task, raw combat JSON was visible as a default-route disclosure.
  It is now hidden on `/` and kept for lab routes.
- New reward cards are only movable after advancing back to planning. The Pool
  summary and Suggested next edits panel now state whether new cards can be
  moved now or after `Advance`.
- Cards with no available move used to say only `No legal action`; they now say
  `Inspect for blocked reason`, which points players toward the inspector.
- Support and ground cards can share row/column coordinates, but the default UI
  does not explicitly explain layers well enough during loadout edits.

### Meaningful Decisions

- Starter kit identity is meaningful because each starter changes board,
  Sources, Spellrail, pool, and the prototype Commander source.
- Pack choice is meaningful when it is tied to duplicates, fixing, affordability,
  or current board gaps.
- Commander upgrade choice is meaningful in the current small way: strengthen
  the Commander now or reduce future effective Rebind Tax.
- Source Row changes are meaningful because they change Board Charge capacity,
  Aspect access, and encounter Combat Charge setup.
- Board/support placement is meaningful because combat preview and simulator
  output respond to occupied cells, range, movement, support triggers, and
  target selection.

### Fake Or Noisy Decisions

- Traits / Teamups do not affect combat yet.
- Reward explanations are more honest now, but they still summarize pack-level
  odds rather than showing exact opened-card outcomes. Near-trait overlap is
  cautious, while duplicate progress and fixing pressure get priority.
- Upgrade Progress can show lots of not-yet-actionable context before the player
  has enough copies.
- Commander lifecycle history is useful for debugging but noisy as a primary
  player panel.
- Raw stack/target/contract concepts belong in Priority Lab, not in the normal
  default loop.

### Useful Panels

- Battlefield, Engagement Preview, Ally Inspector, and Enemy Inspector are the
  most useful first-screen surfaces.
- Command Zone is useful because it shows a real deploy action, tax, and zone
  state.
- Reward Choices are useful because they expose costs, affordability, pack bias,
  and duplicate/fixing hints.
- Pool Cards are useful after a pack because new cards are marked and can be
  inspected.
- Suggested next edits is useful after a pack because it narrows the latest
  pack to a few legal Source Row, Spellrail, or board edits without hiding the
  normal Pool actions.
- Last Recorded Combat is useful when it starts with outcome, gold, and a compact
  event story.

### Panels To Hide Or Collapse Outside Labs

- Current Encounter zone lists should probably collapse behind an opponent
  details disclosure on the default route.
- Planning Check can shrink to a compact legal/blocked banner when legal.
- Traits / Teamups should be collapsed or visually marked as "display-only" until
  trait effects matter.
- Upgrade Progress should collapse when no upgrade is ready.
- Commander Lifecycle should default to one latest event, with the full audit
  trail behind details.

### What Blocks A 10-Minute Playable Run

- The default route still feels like a dashboard below the battlefield rather
  than a guided run screen.
- Post-pack suggestions reduce scanning after a reward pack, but they do not
  yet teach board layers, source replacement tradeoffs, or duplicate-upgrade
  timing as clearly as a final UI should.
- Reward explanations now favor duplicate progress, duplicate potential,
  fixing/resource pressure, active traits, and economy before near-trait or broad
  bias text. They still do not preview exact pack contents.
- Long combat summaries still need grouping/filtering so the player can see the
  few important swing events.
- The collapsed React/CSS fallback still reads as two boards rather than one
  arena, even though it remains functional and horizontally stable.

### Top 5 Small Fixes To Make The Current Game More Fun

1. Collapse default-route debug panels: Current Encounter details, legal Planning
   Check, display-only Traits, idle Upgrade Progress, and full Commander
   lifecycle.
2. Make post-pack suggestions explain why an otherwise interesting new card is
   blocked by Source capacity, Board Charge, or layer occupancy.
3. Group combat summaries into headline beats: Techniques, first deaths,
   Commander lifecycle, winner/damage, and hidden details.
4. Add layer copy near Board/Pixi placement so ground/support sharing is
   understandable without reading architecture docs.
5. Add a compact "why this pack" detail state that can show duplicate/fixing
   reasons without reopening the full reward explanation list.

### Changes Made In This Pass

- Replaced the topbar subtitle with player-facing loop copy.
- Made next-action guidance call out board, Sources, Spellrail, Commander,
  preview, rewards, and advancing more concretely.
- Hid raw event JSON disclosures on the default route while preserving them for
  lab scenarios.
- Hid the default Commander Upgrades panel until reward choices or upgrade
  history exist.
- Added combat-result consequence text and clearer latest-pack movement timing.
- Changed no-action card rows to point players toward inspector blocked reasons.
- Added post-pack suggestions that use existing legal loadout actions for the
  latest opened pack.
- Tightened reward explanation ranking so concrete duplicate and fixing reasons
  beat broad trait/bias overlap.

## 4. Default Route `/`

The default route still teaches what to do next. The visible top controls and
Run State guidance moved through the expected loop:

- Planning: ready combat is enabled.
- Combat ready: `Record Combat` becomes enabled after `Ready Combat`.
- Reward: recording combat produces reward choices and disables advance until a
  pack is opened and the one Commander upgrade bucket is resolved.
- Combat resolved: resolving both reward buckets enables `Advance`.
- Advancing moves to round 2 planning against Ash Debt Collector.

The default route now mounts exactly one Pixi battlefield canvas as the primary
board. It produced no replay controls, no Renderer Feed, and no duplicate Pixi
canvases on the default page. The React/CSS Hex Arena stayed available inside a
collapsed `React/CSS Debug Board` fallback.

Ally Inspector and Enemy Inspector remain useful. They expose type, zone,
aspect, cost, stats, upgrade state, keywords, tags, traits, combat stat chips,
rules text, ability text, design metadata, and legal actions where relevant.
The selected ally and selected enemy can be compared at the same time.

The Pixi battlefield shows the relevant occupied tokens immediately and has no
horizontal overflow at the default 1280 x 720 browser size. The first selected
Ember Scraprunner preview showed:

- `Attack now`
- `Ember Scraprunner can attack Ember Scraprunner now.`
- `Distance 1, range 1.`
- `Likely target: nearest valid enemy.`

Default Pixi placement now has a small direct-manipulation path. Selecting a
legal Pool card with `Select Board Cell` shows highlighted Pixi cells, names the
card in the battlefield hint, and clicking a highlighted cell places the card
through the existing loadout reducer. Clicking a non-highlighted board cell while
placing shows the selected card name, target coordinate/layer, and existing
placement validation reason. The list button `Place on Board` path still works
and remains visible.

The normal debug loop worked end to end. I readied combat, recorded the round 1
draw, reached reward phase, opened a reward pack, saw a new pool card marker and
gold drop from 5 to 1, then advanced to round 2 planning.

Remaining default-route UX note: the primary battlefield now reads as one shared
arena and supports Pool-to-board cell placement plus selected Pool-card Source
Row and Spellrail moves, but return-to-pool and Commander actions still happen
through list buttons below the board.

## 5. `?scenario=renderer-lab`

Renderer lab is now Pixi-centric. The React/CSS Hex Arena is hidden by default
inside a collapsed `React/CSS Debug Board` fallback, and Pixi is the first
battlefield view on the route. It now matches the default route's primary
renderer, while keeping replay controls and feed diagnostics lab-only.

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

- The renderer reads like one shared battlefield on both `/` and Renderer Lab.
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

Pixi is now the primary default-route battlefield. Coordinate semantics match
combat truth, token inspection works, and the readability pass addresses the
most obvious label/stat/effect issues. Renderer Lab should remain the place for
replay controls, feed comparison, click-to-place diagnostics, and longer Pixi
debug workflows until those surfaces are polished enough for player-facing use.

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
2. The Target Probe section showed `Target Probe Target`,
   `Selected target: Ember Scraprunner (enemy ground r0 c3)`, `Available
targets`, `Cost: Pay 1 Combat Charge.`, `Target: Enemy board card`, and
   `Effect: Mark target as probed.`
3. Browser smoke selected the visible enemy target, queued Target Probe, asserted
   stack target metadata, paid 1 Combat Charge, resolved it through enemy/player
   passes, and confirmed `Target Probe: probed Ember Scraprunner (enemy ground r0
c3)` in Target Effects.
4. The Commander Action section showed Sparkcatch Apprentice in `command` and
   blocked `Queue Commander Rally` with
   `Commander must be deployed to use Commander Rally.`
5. Deploying the Commander through the existing Command Zone panel updated the
   Commander Action source to `Sparkcatch Apprentice (board)`.
6. `Queue Commander Rally` queued `Commander Rally` from Sparkcatch Apprentice
   and passed priority to Enemy.
7. Enemy passed priority, then Player passed priority. `Commander Rally`
   resolved and changed enemy stability from 5 to 4.
8. Used Sources recorded `Sparkcatch Apprentice used by Commander Rally`, and
   the Commander Action section reported that Rally was already used this
   encounter.
9. `Queue Prototype Technique` then queued `Prototype Pressure Technique` from
   Sparkfall and passed priority to Enemy.
10. The action resolved through the same enemy/player pass sequence and changed
    enemy stability from 4 to 3.
11. Used Sources recorded `Sparkfall used by Prototype Pressure Technique`.
12. Empty-stack player/enemy passes advanced to combat.
13. `Run Combat Skirmish` recorded skirmish 1 and advanced to second main.

The previous action-log readability issue is fixed. Log sentences and metadata
now render separately. For example:

- `Player queued Prototype Pressure Technique from Sparkfall.`
- `Turn 1 | First main | Stack 1`

The action text is now backed by a minimal encounter action contract. Priority
Lab shows this directly:

- Prototype Pressure Technique:
  `Cost: Pay 1 Combat Charge. Uses Sparkfall on resolve.`,
  `Target: Enemy Stability`, and `Effect: Enemy Stability -1.`
- Commander Rally: `Cost: Pay 1 Combat Charge. Uses Commander on resolve.`,
  `Target: Enemy Stability`, and `Effect: Enemy Stability -1.`
- Target Probe: `Cost: Pay 1 Combat Charge.`, `Target: Enemy board card`, and
  `Effect: Mark target as probed.`

The lab is no longer debug-action-only in the UI. It now has one Spellrail
Technique prototype action, one deployed-Commander prototype action, and one
board-card target probe. The source actions have minimal source context,
contract timing/target/effect metadata, and match-local source lifecycle. Target
Probe has serialized board-card target metadata and a match-local `probed`
target-effect event. The action economy is now easier to read because Priority
Lab separates `Source-derived starting Combat Charge: 1`,
`Source Row Combat Charge/sec: 0.35`, `Priority Lab debug top-up: +2`, and
current player Combat Charge. Known limitation: these are still abstract
prototype actions with only starting-charge setup from Source Row, no
hand/deck/mill sourcing, Pixi click targeting, board-cell targeting UI, RunState
card movement, enemy action choice, real-time charge generation, refunds,
board-card damage, real statuses, or authored effect system.

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
| Two boards do not feel like one arena          | Fixed on primary UI  | Default and renderer lab now use Pixi; the old two-board view is collapsed.     |
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
- Severity: Medium for default-route polish.

### Partially Addressed: Pixi Attack And Destroyed Effects

- Steps: Play Ember or Cloudspire renderer-lab replay.
- Previous observation: damage numbers were readable, but attack lines were easy
  to miss and destroyed markers could blend into the dark field.
- Current status: attack beams, damage badges, destroyed markers, appear cues,
  recall cues, and phase cues are brighter/larger/longer lasting in the renderer
  implementation. Damage, destroyed, and recalled-token visuals were manually
  visible in this pass.
- Remaining concern: attack beams remain quick enough to miss without Step.
- Severity: Low for current play, medium for replay readability polish.

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

### UX Confusion: Two Presentations Coexist

- Steps: Open `/` or `?scenario=renderer-lab`.
- Observed: Pixi is now the primary battlefield, and the React/CSS board is
  collapsed as a fallback. Renderer Lab still has the broader replay/debug grid,
  so it remains a diagnostic route rather than a final combat screen.
- Expected: Keep the fallback while Pixi is experimental; revisit once replay
  controls, token readability, and direct board editing mature.
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

- Pixi is now the primary default battlefield, but it still uses generated
  shapes and text rather than final art assets.
- The tightened default Pixi route has now had a fresh 10-minute manual pass at
  1440 x 900 plus a 1280 x 720 sanity pass. It is close to showable with light
  narration, and the first-fold `Loadout Tray` now exposes ordinary
  Pool/Board/Source Row/Spellrail editing without opening Advanced Debug Panels.
  It now carries short layer/resource education, but it is still not a
  cold-start demo because those controls are compact, capped, button-driven
  affordances rather than board-native manipulation.
- The React/CSS Hex Arena remains available as a collapsed debug fallback on `/`
  and `?scenario=renderer-lab`.
- The default route now hides/collapses most developer bloat and supports
  minimal Pool-to-board Pixi placement with Inspect/Place mode controls, cancel,
  blocked-cell copy, selected Pool-card Source Row / Spellrail moves,
  return-to-pool for selected active loadout cards, and compact Commander
  controls near the battlefield. These are still button affordances rather than
  final drag/drop or canvas-native zone editing.
- Post-pack suggestions are deterministic and use existing legal actions only.
  They look only at the latest opened pack, group duplicate same-action copies
  for display, suggest at most a few forward edits, and do not reason about
  long-term build quality, source swaps, duplicate upgrade timing, or
  board-layer education beyond short copy.
- Reward explanations now rank duplicate progress, duplicate potential, fixing
  pressure, active trait matches, and economy ahead of near-trait and broad bias
  text, but they are still lightweight pack-level hints rather than a full draft
  recommendation system.
- Default-route panel rendering, renderer-lab route rendering, Priority Lab
  route wiring, Battlefield / Hex Arena rendering, and default debug-grid route
  composition have been extracted from `App.tsx`, but the file still owns
  renderer-lab state/controller setup and top-level run state coordination.
- Pixi labels, stat chips, rings, and combat effects have been strengthened, but
  long names and dense adjacent rows can still crowd.
- Pixi has click-to-select token inspection, minimal click-to-place from
  Pool/Bench on both `/` and Renderer Lab, and default-route Source Row,
  Spellrail, return-to-pool, and Commander controls beside the primary
  battlefield, but no drag/drop, hover tooltips, or full board-editing polish.
- Default Pixi placement hints use existing placement validation reasons for
  selected-card and clicked-cell failures, but they still show only one concise
  reason at a time.
- Replay controls now cover Play/Resume, Pause, Step, and Reset, but there is no
  scrubber, speed control, or filtered command list yet.
- Step advances one visual command when playback is idle or paused. If clicked
  while a paused command animation is still settling, the renderer waits for that
  command to settle and then advances one additional deterministic command.
- Default-route Source Row, Spellrail, and return-to-pool controls use selected
  cards, first-fold tray rows, and existing legal actions; they are not Pixi
  canvas drop zones.
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
  deployed Commander. It also has `Target Probe`, a no-source prototype that
  validates and stores an enemy board-card target snapshot. These actions now
  use a minimal static contract for timing, labels, source-used-on-resolve
  lifecycle, Stability targets, board-card target metadata, match-local
  Stability effects, board-card mark events, and Combat Charge payment. They pay
  match-local Combat Charge on submission from Source Row-derived starting
  charge, with a Priority Lab-only debug top-up to exercise all three paid
  actions. They still have no Pixi click targeting, board-cell targeting UI,
  hand/deck/mill, source card movement, RunState mutation on resolution,
  real-time charge generation, refunds, enemy AI, interrupts, counterspells,
  board-card damage, real statuses, or authored card effect resolution.
- Combat simulation remains deterministic and unchanged.
- Traits/teamups remain display-only.
- Duplicate upgrades remain generic +1 ATK/+1 HP combines.
- Combat summaries now have deterministic key-moment grouping, but the copy has
  not had a broad manual pass across many longer future fights.

## 13. Recommended Next Tasks

Do next:

`feat(client): improve post-pack blocked-reason copy for Source capacity and board layers`

Why: the tightened `/` route now has first-fold loadout editing, concise layer
and resource education, and grouped duplicate post-pack suggestions. The next
clarity gap is when suggestions are unavailable: the current copy still points
players toward inspection instead of explaining common blockers such as Source
capacity, Board Charge, or occupied ground/support layers.

Do soon:

- `feat(client): add Pixi replay scrub/speed controls`
- `test(playtest): manually validate grouped combat key moments across starters`
- `feat(rules): evaluate expanding the canonical board to 6 rows x 10-12 columns`
- `feat(client): tune Pixi combat effect timing after manual readability pass`
- `feat(client): keep selected target and next move visible together in preview labs`

Still wait:

- New encounter action effect hooks
- More target contract layers
- More prototype actions
- Signature Relics
- Authored effect engine
- Pixi final-art presentation
- Drag/drop
- Backend
- Multiplayer
- Hand/deck/mill
- Counterspells
- Broad card or mechanic expansion
