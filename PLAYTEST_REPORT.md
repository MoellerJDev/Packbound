# Packbound Playtest Report

## 1. Executive Summary

Packbound remains demoable as an internal systems demo at commit
`bec7dc0b4296a4e722d2ef6990cefdd6940ccfeb`. The debug client supports the full
current loop: starter selection, starter-card inspection, trait/teamup scanning,
Source Row review, legal planning actions, combat preview, recorded combat,
reward opening, latest reward markers, reward-card inspection, round advance,
reward use, and a second recorded combat. No browser console warnings or errors
were captured during the manual pass.

Duplicate upgrades are understandable when the upgrade lab forces the exact
3-copy case. The Available Upgrades row clearly says what will happen, the button
collapses three Cinder Scout copies into one Lv 1 copy, the row badge makes the
surviving card identifiable, the inspector shows `2 ATK / 3 HP` and
`Current bonus: +1 ATK / +1 HP.`, and combat reflects the upgraded attack value.

Normal rewards feel more meaningful than before because duplicates and traits now
create visible build direction. Ember Foundry produced two Ember Scraprunner
copies, Rotbloom produced two Due Marker copies, and Cloudspire produced two
Mistwing Scout copies plus another Cloudgate/Vanishing Warden line. The missing
piece is progress visibility: normal runs do not explain "2 of 3" upgrade chases,
and non-upgradeable duplicate Relics can look like upgrade material until
inspected.

Traits/teamups help decision-making. They made the Ember run become a clear
Ember/Scrapper/Echo Fodder lane, the Rotbloom run become a Shade/Bloom/Offering
Relic lane, and the Cloudspire run become a Tide/Gleam/Phase/Barrier lane. The
panel is useful for internal iteration, though repeated active traits in the
Near section make it dense.

Top 3 remaining blockers:

1. Pack choice still lacks stakes because reward packs are free and show little
   cost or expected-value information.
2. Normal runs do not surface partial duplicate progress, so upgrade chasing is
   exciting only after the player already knows the rules.
3. Board positioning is still abstract list text; row/column/layer labels are
   serviceable for engineers but not intuitive for a player-facing demo.

Recommended next task: `feat(rules): add priced pack rewards and gold economy`.

## 2. Environment And Commands

- Commit hash tested: `bec7dc0b4296a4e722d2ef6990cefdd6940ccfeb`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app Browser against local Vite; Playwright
  Chromium for `pnpm test:browser`
- Dev server URL: `http://127.0.0.1:5173/`
- Browser console warnings/errors during manual pass: none captured
- Stale dev servers before testing: none found on ports `4173`, `5173`-`5180`
- Stale listeners after `pnpm test:browser`: none found
- Dev server cleanup after manual playtest: stopped the managed Vite listener on
  PID `4284`
- Common dev ports after cleanup: clear

| Command               | Status | Notes                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `pnpm format:check`   | Pass   | All matched files used Prettier style.                                |
| `pnpm lint`           | Pass   | ESLint completed.                                                     |
| `pnpm typecheck`      | Pass   | All workspace typechecks completed.                                   |
| `pnpm test`           | Pass   | 21 test files, 212 tests.                                             |
| `pnpm build`          | Pass   | Workspace build and Vite client bundle completed.                     |
| `pnpm balance:report` | Pass   | Deterministic starter and pack-usability report printed; no warnings. |
| `pnpm test:browser`   | Pass   | 2 Chromium tests passed, including the upgrade lab smoke path.        |

## 3. Coverage Summary

| Scenario         | Rounds reached | Combat recorded | Reward opened      | Upgrade tested | Notes                                                                |
| ---------------- | -------------- | --------------- | ------------------ | -------------- | -------------------------------------------------------------------- |
| Ember Scrappers  | Round 2 reward | Yes, rounds 1-2 | Ember Foundry Pack | No             | Two Ember Scraprunner reward copies; Cinder Tally trigger was clear. |
| Rotbloom Recall  | Round 2 reward | Yes, rounds 1-2 | Rotbloom Pack      | No             | Two Due Marker reward copies; Offering/Recall lane became readable.  |
| Cloudspire Phase | Round 2 reward | Yes, rounds 1-2 | Cloudspire Pack    | No             | Two Mistwing Scout copies; Phase/Barrier/Warden direction was clear. |
| Upgrade Lab      | Round 1 reward | Yes, round 1    | Not needed         | Yes            | Three Cinder Scout copies upgraded into one Lv 1 combat-ready Unit.  |

## 4. Upgrade Lab Evaluation

The scenario loaded clearly at `/?scenario=upgrade-lab`. It used the Ember
starter and added three Cinder Scout pool rows. The Available Upgrades panel
appeared immediately and read:
`Cinder Scout: 3 / 3 copies at level 0 -> upgrade to level 1`.

The duplicate cards were visible in Pool Cards before upgrading. Inspecting one
copy showed level 0, `1 ATK / 2 HP / 1.1 speed / 1 range`, and the upgrade rule:
combine 3 matching pool copies at this level. That was enough context to trust
the Upgrade button.

The upgrade button did what was expected. After clicking it, the pool had one
Cinder Scout row with a Lv 1 badge, and the Available Upgrades panel returned to
the empty state. The upgraded card was easy to identify because it was the only
Cinder Scout row and showed `LV 1` in the row text.

The inspector showed the upgrade level and bonus clearly:
`2 ATK / 3 HP / 1.1 speed / 1 range`, `Level 1. Combine 3 matching pool copies at this level to upgrade.`,
and `Current bonus: +1 ATK / +1 HP.` The upgraded card could be placed legally,
used 1 of the remaining board Charge, and made sense in combat. Its recorded
attack dealt 2 damage, so the power increase was understandable in both the
inspector and combat summary.

Before upgrades appear naturally in normal runs, the UI should show partial
progress such as `Mistwing Scout: 2 / 3 pool copies` and should clarify that only
Unit and Echo cards count. The lab proves the mechanic; normal runs still need a
breadcrumb that teaches players to chase the third copy.

## 5. Normal Run Upgrade / Duplicate Observations

Ember Scrappers:

- Duplicate opportunities appeared naturally. Ember Foundry Pack produced two
  new Ember Scraprunner rows, and the starter already had an active Ember
  Scraprunner.
- The pack suggested a future upgrade chase, but only implicitly. Available
  Upgrades stayed empty because there were not three matching pool copies.
- Duplicates were easy to notice because duplicate names sat near each other and
  had `new` markers, but they were not summarized as upgrade progress.
- Traits helped evaluate the pack. After adding Ember Source and Cinder Tally,
  Ember reached `6 / 6`, Scrapper reached `3 / 5`, and Echo Fodder reached
  `3 / 3`, making the Ember/Scrapper direction obvious.
- Upgrade mechanics improved the feel of reward decisions, but the run still
  needed the upgrade lab knowledge to understand why two Ember Scraprunner rows
  might matter later.

Rotbloom Recall:

- Duplicate opportunities appeared as two Due Marker rows from Rotbloom Pack.
- The duplicate looked like a chase hook at first glance, but Due Marker is a
  Relic and is not upgradeable in the current prototype. The inspector explains
  that, but the row itself does not.
- Duplicates were easy to scan because the names were adjacent and marked new.
  The meaning was less clear because duplicate Relics are not upgrade material.
- Traits were very helpful. Due Marker, Ash Ledger, Hollow Caller, Sporeback
  Beast, and an extra Bloom Source produced a readable Shade/Bloom/Offering/
  Recall/Relic Engine board.
- Upgrade mechanics did not directly affect this run, but the existence of the
  mechanic made duplicate pack outputs feel more worth noticing.

Cloudspire Phase:

- Duplicate opportunities appeared naturally. Cloudspire Pack produced two
  Mistwing Scout pool copies, plus another Cloudgate Adept and Vanishing Warden.
- The pack strongly suggested a future Phase/Wisp/Warden chase. Because one
  Mistwing Scout was already active on the board, the player sees three total
  copies in the run but not three matching pool copies.
- Duplicates were easy to notice in the Pool Cards list, but the Available
  Upgrades panel only says no pool card has 3 copies. It does not explain that
  active board copies do not count.
- Traits helped decide the pack was valuable. After adding Ember Source, Shade
  Source, and Vanishing Warden, the run showed Tide `5 / 6`, Source Greed
  `4 / 5`, Barrier `2 / 3`, Phase `4 / 3`, and Warden `2 / 3`.
- Upgrade mechanics made Mistwing duplicates feel more promising, but the UI
  needs partial-progress wording before the promise is fully legible.

## 6. Traits And Pack Direction

Active and near traits are understandable enough for internal iteration. The
labels and threshold text create a useful read of the current board without
requiring raw card inspection. They also create reasons to chase pack families:
Ember wanted more Scrapper/Echo Fodder, Rotbloom wanted more Offering/Recall/
Relic Engine, and Cloudspire wanted more Phase/Barrier/Warden pieces.

The trait panel helps archetype identity more than any other current planning
panel. It answers "what am I becoming?" after each reward use. It also made
off-aspect Source choices understandable: adding extra Sources to Cloudspire
made Source Greed visible as a real direction instead of just more capacity.

Interlocking traits are visible, but the panel is dense. Active traits can also
appear in Near when they are close to their next tier, which is mechanically
useful but visually repetitive. The biggest trait-display improvements would be
to label near rows as "next tier", compact contributor lists, and distinguish
active-but-near-next-tier from inactive-near-first-tier.

## 7. Reward And Economy Readiness

Rewards still feel somewhat free and flat because packs have no price, no gold
budget, and no opportunity cost beyond choosing one of the offered packs. The
cards inside packs now matter more because duplicates and traits can point toward
a build, but the reward choice itself is not yet an economy decision.

Priced packs would improve decision-making now. The current UI already gives
enough downstream information to make a player care about cheap duplicate-heavy
packs, Source/fixing packs, and archetype packs. What is missing is a reason not
to always take the most exciting-looking pack.

Pack/economy information that should be shown:

- current gold
- pack cost
- pack family or archetype bias
- rough duplicate/Unit/Echo relevance
- Source/fixing likelihood
- whether the player can afford one premium pack or multiple cheaper packs

The project is ready for a small economy/priced-pack pass. Keep it narrow:
starting gold, pack costs, deterministic reward affordability, and enough UI
text to make the tradeoff readable.

## 8. Positioning / Board Readability

The board is still too abstract for a polished player demo. Row, column, and
layer labels explain positioning to an engineer, and support versus ground is
internally understandable after inspecting Relics like Cinder Tally, Ash Ledger,
and Due Marker. It is still hard to build spatial intuition from a list.

A simple React/HTML board grid would help more than the current list for
positioning, adjacency, and support-layer understanding. However, economy is the
bigger blocker to pack choice right now. The board grid should be a near-term UI
task after the pack-pricing pass, not a Pixi or visual-combat task.

Support and ground layers are understandable through text once inspected. They
would become much clearer if a compact grid stacked or annotated support cards
on the same coordinate as ground Units.

## 9. Combat And Card Readability

Combat summaries remain readable. Winner, damage, event count, warnings,
attacks, damage, destroyed events, recalls, Offering, and Barrier lines all
worked during this pass.

Destroyed-trigger summaries are clear. Cinder Tally's line,
`triggered after Sparkcatch Apprentice was destroyed as the first ally destroyed`,
made its source and cause readable. Ash Ledger's lines,
`reacted when Hollow Caller was destroyed` and
`reacted when Sporeback Beast was destroyed`, were also easy to follow.

Upgraded stats are reflected clearly enough. Cinder Scout's inspector showed the
stat increase, and combat showed Cinder Scout dealing 2 attack damage. That is
strong enough for internal upgrade iteration.

The card inspector is sufficient for the current prototype. It shows type, zone,
aspects, cost, stats, upgrade text, upgrade bonus, source output, technique
timing, tags, traits, rules text, normalized ability text, design metadata,
legal actions, and blocked reasons.

Remaining confusing wording is minor:

- Some trigger lines still do not explicitly say when a trigger had no valid
  target or no visible effect.
- `as the first ally destroyed` is understandable but slightly stiff.
- Duplicate rows rely on repeated names rather than grouped counts.

## 10. Bugs Or Suspected Bugs

Confirmed bugs: none observed.

UX confusion, not confirmed bugs:

- Title: Partial upgrade progress is hidden in normal runs.
  Steps to reproduce: start Cloudspire Phase, place Mistwing Scout, record
  combat, open Cloudspire Pack, advance to round 2.
  Observed behavior: Pool Cards shows two new Mistwing Scout rows and the board
  has one active Mistwing Scout, but Available Upgrades only says no pool card
  has 3 matching Unit or Echo copies.
  Expected behavior: The UI should show partial pool progress and explain that
  active board copies do not count until returned to the pool.
  Reproducibility: deterministic with this seed.
  Severity: medium UX.

- Title: Non-upgradeable duplicates can look like upgrade material.
  Steps to reproduce: start Rotbloom Recall, open Rotbloom Pack.
  Observed behavior: two Due Marker rows appear, but Relics are not upgradeable.
  The inspector explains this after selection.
  Expected behavior: Rows or the upgrade panel should make Unit/Echo eligibility
  more obvious.
  Reproducibility: deterministic with this seed.
  Severity: low-medium UX.

- Title: Near traits repeat active traits densely.
  Steps to reproduce: inspect Traits / Teamups after any tested starter uses
  reward cards.
  Observed behavior: traits can appear in both Active and Near because they are
  active and one away from the next tier.
  Expected behavior: A "near next tier" label or compact grouping would make the
  repetition feel intentional.
  Reproducibility: frequent.
  Severity: low UX.

- Title: Board position remains list-based and abstract.
  Steps to reproduce: inspect Board after placing support and ground cards.
  Observed behavior: row/column/layer text is accurate but hard to visualize.
  Expected behavior: a compact board grid would make adjacency and layers
  easier to understand.
  Reproducibility: always.
  Severity: low UX for internal testing, higher for external demos.

## 11. Recommended Next Tasks

Do Next:

- `feat(rules): add priced pack rewards and gold economy`

Do Soon:

- `feat(client): improve upgrade visibility in normal runs`
- `feat(client): add compact board grid layer view`
- `test(client): expand upgrade browser smoke coverage`
- Add partial duplicate-count copy for Unit/Echo pool cards.
- Add pack-choice UI text for archetype bias, duplicate likelihood, and Source
  likelihood.

Still Wait:

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- full visual combat replay
- board resources
- deployment

## 12. Raw Notes

- Ember path: inspected Ember Scraprunner, Ember Source, Sparkfall, Signal Nest,
  and Sparkcatch Apprentice; placed Sparkcatch Apprentice; opened Ember Foundry
  Pack; inspected six new reward cards; advanced; added Ember Source; placed
  Cinder Tally; recorded round 2.
- Ember notable rewards: Ember Scraprunner, Ember Source, Ember Scraprunner,
  Cinder Tally, Rustline Cannon, Cracked Prism.
- Rotbloom path: inspected Hollow Caller, Shade Source, Bloom Source, Sporeback
  Beast, and Ash Ledger; placed Ash Ledger; opened Rotbloom Pack; inspected six
  new reward cards; advanced; placed Due Marker, added Bloom Source, placed
  Sporeback Beast; recorded round 2.
- Rotbloom notable rewards: Shade Binder, Bloom Source, Cracked Prism, Due
  Marker, Thicket Colossus, Due Marker.
- Cloudspire path: inspected Cloudgate Adept, Tide Source, Gleam Source, Phase
  Step, Vanishing Warden, and Mistwing Scout; placed Mistwing Scout; opened
  Cloudspire Pack; inspected six new reward cards; advanced; added Ember Source,
  added Shade Source, placed Vanishing Warden; recorded round 2.
- Cloudspire notable rewards: Ember Source, Mistwing Scout, Mistwing Scout,
  Cloudgate Adept, Vanishing Warden, Shade Source.
- Upgrade lab path: loaded `/?scenario=upgrade-lab`, inspected Cinder Scout
  before upgrade, clicked Upgrade, inspected Lv 1 Cinder Scout, placed it, and
  recorded combat.
- Browser logs: no warnings or errors captured.
- Dev server lifecycle: no stale listeners before testing; Vite listener on
  `5173` stopped after manual playtest; common dev ports clear afterward.
