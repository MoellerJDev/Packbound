# Packbound Playtest Report

## 1. Executive Summary

Packbound remains demoable as an internal systems demo at commit
`6f7d923141436801ebcd8299190ea601d7b36076`. The current debug client supports
the full engine-first loop: starter selection, card inspection, trait/teamup
scanning, Source Row review, legal loadout edits, combat preview, recorded
combat, gold rewards, priced pack purchases, latest reward markers, reward-card
inspection, round advancement, normal-run duplicate progress, and duplicate
upgrades through the upgrade lab.

Normal-run upgrade progress is now understandable. The Upgrade Progress panel
surfaced partial `2 / 3` groups, row badges made duplicate candidates easy to
notice, active copies were called out as non-pool copies, and duplicate Sources
or Relics explained why they are not upgrade material. The only small clarity
gap is timing: during `combatResolved` and `reward`, the blocked reason says
upgrades can only be made during planning, so the more helpful active-copy
reason is clearest after advancing.

Pack decisions feel more meaningful than before because pack price, traits, and
duplicate progress now create multiple visible reasons to choose a reward. Ember
and Cloudspire both created natural duplicate-chase incentives, Rotbloom made
non-upgradeable duplicate Relics explicit, and Source Pack's 3-gold cost still
stood out beside 4-gold archetype packs. The reward rows themselves still do not
explain pack bias, likely contents, trait relevance, or duplicate relevance.

The next task should be a compact React/HTML board grid layer view. Upgrade
visibility is now good enough for normal runs, and pack-offer explanations are
important soon, but the current list-only board is now the biggest internal demo
readability blocker for a tactical autobattler. A small grid would make ground
versus support layers, adjacency, and placement choices easier to understand
without requiring Pixi or drag-and-drop.

Top 3 remaining blockers:

1. Board and support-layer positioning are still represented as list rows with
   `r0 c2 ground` text instead of a spatial board.
2. Reward offers show cost and affordability, but not pack bias, expected role,
   duplicate relevance, or trait relevance.
3. Early economy remains generous; every tested offer was affordable, so price
   creates mild preference but not hard buy/save tension.

Recommended next task: `feat(client): add compact board grid layer view`.

## 2. Environment And Commands

- Commit hash tested: `6f7d923141436801ebcd8299190ea601d7b36076`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app Browser for manual playtest; Playwright
  Chromium for `pnpm test:browser`
- Dev server URL: `http://127.0.0.1:5173/`
- Browser console warnings/errors during manual pass: none observed
- Stale dev servers before testing: none found on ports `4173`, `5173`-`5180`
- Dev server cleanup after manual playtest: stopped Vite listener on PID `29672`
- Common dev ports after cleanup: clear
- Temporary Vite logs: removed after cleanup

| Command               | Status | Notes                                            |
| --------------------- | ------ | ------------------------------------------------ |
| `pnpm format:check`   | Pass   | All matched files used Prettier style.           |
| `pnpm lint`           | Pass   | ESLint completed.                                |
| `pnpm typecheck`      | Pass   | All workspace typechecks completed.              |
| `pnpm test`           | Pass   | 22 test files, 226 tests.                        |
| `pnpm build`          | Pass   | Workspace build and Vite client bundle passed.   |
| `pnpm balance:report` | Pass   | Deterministic report printed with no warnings.   |
| `pnpm test:browser`   | Pass   | 2 Chromium smoke tests passed.                   |
| `pnpm dev`            | Pass   | Managed Vite start succeeded on `127.0.0.1:5173` |

## 3. Coverage Summary

| Scenario         | Rounds reached        | Combat recorded | Rewards opened                  | Upgrade progress observed                                             | Notes                                                                                            |
| ---------------- | --------------------- | --------------- | ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ember Scrappers  | Round 2 reward opened | Yes, rounds 1-2 | Ember Foundry Pack, Source Pack | Ember Scraprunner `2 / 3`; active copy; duplicate Source              | Best active-vs-pool clarity after advancing to planning. Source Pack cost mattered in round 2.   |
| Rotbloom Recall  | Round 2 reward opened | Yes, rounds 1-2 | Rotbloom Pack twice             | Due Marker duplicate Relic; Bloom Source duplicate; Sporeback `2 / 3` | Non-upgradeable duplicate wording was clear. Relic/Source duplicates no longer looked like bugs. |
| Cloudspire Phase | Round 2 reward opened | Yes, rounds 1-2 | Cloudspire Pack twice           | Mistwing `2 / 3` plus active copy; Vanishing Warden `3 / 3`           | Strongest normal-run upgrade-progress case. Row badges made duplicate candidates easy to spot.   |
| Upgrade Lab      | Round 1 reward phase  | Yes, round 1    | None                            | Cinder Scout `3 / 3` ready, then Lv 1 `1 / 3`                         | Upgrade flow still works; upgraded stats and combat contribution were readable.                  |

## 4. Normal-Run Upgrade Visibility

### Ember Scrappers

- Duplicate cards appeared: yes. Ember Foundry Pack produced two Ember
  Scraprunner pool copies while the starter Ember Scraprunner stayed active.
  It also produced a duplicate Ember Source.
- Upgrade Progress panel explained them: yes. During `combatResolved`, it showed
  `Ember Scraprunner: 2 / 3 pool copies at Lv 0 (2 pool + 1 active copy). Card
upgrades can only be made during planning.` After advancing, it changed to
  `Return active copies to pool to upgrade.`
- Row badges helped: yes. The two pool Ember Scraprunner rows showed `2 / 3`,
  the active board row showed `ACTIVE COPY`, and Ember Source showed
  `DUPLICATE`.
- Inspector explained upgrade state: yes. Inspecting Ember Scraprunner showed
  `Level 0: 2 / 3 pool copies`, one active copy, and the blocked reason.
- Active versus pool copies were clear: clear after advancing to planning; less
  clear in reward/combatResolved because the phase restriction is prioritized.
- Non-upgradeable duplicates were explained: yes. Ember Source displayed
  `duplicate Source. Sources are not upgradeable yet.`
- Upgrade progress affected pack choice: yes. Seeing Ember Scraprunner at
  `2 / 3` made another Ember pack tempting, while Source Pack's lower price and
  fixing competed with that chase.

### Rotbloom Recall

- Duplicate cards appeared: yes. The first Rotbloom Pack produced two Due
  Markers and a duplicate Bloom Source. The second added a duplicate Ash Ledger,
  another Bloom Source, and a partial `Sporeback Beast: 2 / 3` Unit group.
- Upgrade Progress panel explained them: yes. It listed duplicate Relics and
  Sources with explicit non-upgradeable reasons. After the second pack,
  Sporeback Beast appeared as a partial Unit upgrade group.
- Row badges helped: yes. `DUPLICATE` badges on Due Marker, Bloom Source, and
  Ash Ledger separated duplicate awareness from actual upgrade eligibility.
  Sporeback Beast rows showed `2 / 3`.
- Inspector explained upgrade state: yes. Due Marker inspection said `Relics are
not upgradeable yet` and `Level 0: 2 owned copies`.
- Active versus pool copies were clear: no active duplicate Unit case appeared
  in this starter path, but the panel stayed clear for pool-only and
  non-upgradeable groups.
- Non-upgradeable duplicates were explained: yes, clearly for Relic and Source.
- Upgrade progress affected pack choice: moderately. Rotbloom remained the best
  archetype choice, but the panel made it clear which duplicates were upgrade
  material and which were just duplicate context.

### Cloudspire Phase

- Duplicate cards appeared: yes. Cloudspire Pack produced two Mistwing Scout
  pool copies while the starter Mistwing was active, plus partial Cloudgate
  Adept and Vanishing Warden groups. The second pack pushed Vanishing Warden to
  `3 / 3`.
- Upgrade Progress panel explained them: yes. After advancing, Mistwing Scout
  showed `2 / 3 pool copies at Lv 0 (2 pool + 1 active copy). Return active
copies to pool to upgrade.`
- Row badges helped: yes. Mistwing pool rows showed `2 / 3`, the board Mistwing
  row showed `ACTIVE COPY`, Vanishing Warden rows showed `2 / 3` and later
  `3 / 3`.
- Inspector explained upgrade state: yes. Mistwing inspection showed `Level 0:
2 / 3 pool copies`, one active copy, and a blocked reason.
- Active versus pool copies were clear: yes after returning to planning.
- Non-upgradeable duplicates were explained: no non-upgradeable duplicate was
  central in this path.
- Upgrade progress affected pack choice: yes. Seeing Mistwing at `2 / 3` and
  Vanishing Warden near or at `3 / 3` made Cloudspire Pack feel like a strong
  duplicate-chase pick.

## 5. Upgrade Lab Confirmation

The lab is still clear. Loading `/?scenario=upgrade-lab` showed three Cinder
Scout pool rows with `READY` badges and an Upgrade Progress row:

`Cinder Scout: 3 / 3 pool copies at Lv 0 -> Upgrade to Lv 1`

The 3-copy upgrade was obvious. Clicking Upgrade consumed the extra copies and
left one Lv 1 Cinder Scout in the pool.

The upgraded card was easy to identify. The pool row showed `LV 1`, and the
inspector showed:

- `2 ATK / 3 HP / 1.1 speed / 1 range`
- `Current bonus: +1 ATK / +1 HP.`
- `Level 1: 1 / 3 pool copies.`
- `Blocked: Need 3 matching pool copies; found 1.`

Placement worked. The Lv 1 Cinder Scout could be placed on the board, filling
the remaining Board Charge. Combat reflected the upgrade clearly enough in the
summary: Cinder Scout dealt 2 attack damage and destroyed the enemy Ember
Scraprunner.

## 6. Pack Choice And Economy

Pack costs are visible and readable. Reward rows show `Cost N gold`, and
affordable rows show `After purchase: N gold`.

Current gold is visible in Run State. Gold changes were easy to follow:

- Ember round 1 win: gold `0 -> 6`, opened Ember Foundry Pack for 4, then gold
  `6 -> 2`.
- Ember round 2 loss: gold `2 -> 6`, opened Source Pack for 3, then gold
  `6 -> 3`.
- Rotbloom round 1 win: gold `0 -> 6`, opened Rotbloom Pack for 4.
- Rotbloom round 2 win: gold `2 -> 8`, opened Rotbloom Pack for 4.
- Cloudspire round 1 win: gold `0 -> 6`, opened Cloudspire Pack for 4.
- Cloudspire round 2 win: gold `2 -> 8`, opened Cloudspire Pack for 4.
- Upgrade lab round 1 win: gold `0 -> 6`.

Gold earned after combat is clear because Last Recorded Combat shows
`Gold: +N`. Affordability remained generous; every tested offer was affordable,
so disabled reward states were not observed manually.

Pack choice feels like a real decision, but mostly because of traits and
duplicates rather than budget pressure. Source Pack's cheaper 3-gold price
matters because it leaves one more gold than a 4-gold archetype pack, especially
when the run wants fixing or Source Greed.

Duplicate progress now influences pack choice. Ember Foundry looked tempting
after Ember Scraprunner reached `2 / 3`; Cloudspire looked very tempting after
Mistwing reached `2 / 3` and Vanishing Warden later reached `3 / 3`.

Traits also influence pack choice. Ember pushed toward Scrapper/Echo Fodder,
Rotbloom pushed toward Ashes/Recall/Offering, and Cloudspire pushed toward
Phase/Barrier/Warden. Trait direction and duplicate progress now work together.

The next economy task should not be tuning yet. Reward rows need better pack
explanations first, then tuning can decide whether early income is too generous.

## 7. Traits / Teamups

Active traits are understandable enough for internal testing. They gave each
starter a direction:

- Ember: Ember, Echo Fodder, Scrapper.
- Rotbloom: Shade, Source Greed, Ashes, Recall.
- Cloudspire: Tide, Gleam, Source Greed, Phase.

Near traits create useful pack direction, especially when a count is one away
from the next tier. Source Greed also helped justify Source Pack and off-aspect
Source choices.

The panel is dense. It is mechanically useful, but Active and Near can repeat
the same trait when a trait is already active and also close to the next tier.
That repetition is understandable after reading it, but it is heavy in a
browser playtest.

Trait progress and duplicate progress work together well now. The player can
see both "this pack reinforces my trait lane" and "this pack might finish a
duplicate upgrade."

## 8. Board / Positioning Readability

The list-based board is still tolerable for internal rules testing but no
longer feels adequate for a tactical autobattler demo. It shows row, column, and
layer text, but spatial relationships are hard to parse. Support-layer Relics
and adjacency-dependent abilities are especially abstract.

Ground/support layers are technically understandable from `r0 c0 support` and
`r0 c2 ground`, but they do not feel intuitive. The player has to translate
text into a board in their head.

A compact React/HTML board grid should be next. It does not need Pixi,
animation, drag-and-drop, or card art. A simple grid with ground/support layer
signals would make board state, placement, adjacency, and support objects much
easier to inspect.

Board readability is now a bigger blocker than pack/upgrade clarity. Upgrade
progress is good enough for normal-run playtesting; the board is the biggest
remaining gap between "engine debug client" and "internal systems demo."

## 9. Combat And Card Readability

Combat summaries remain readable. Winner, damage, event count, warnings, and
gold are easy to scan. Trigger-source lines are helpful: Ember Scraprunner and
Sparkcatch Apprentice interactions were understandable, and Recall lines in
Rotbloom were especially useful.

Upgrade-related combat clarity is adequate in the lab. Cinder Scout's Lv 1 stat
increase was clear in the inspector, and combat showed it dealing 2 attack
damage. Normal-run partial upgrades do not affect combat yet, so their clarity
is mostly a planning UI question.

Card inspector wording is stronger after the upgrade-progress pass. It explains
level, required copies, pool copy count, active copy count, non-upgradeable card
types, and blocked reasons.

Blocked reasons are useful but can become long. The most awkward text appears
outside planning, where upgrade progress says the phase blocks upgrades before
it tells the player the active-copy fix. That is technically correct, but the
planning-phase wording is more helpful.

## 10. Bugs Or Suspected Bugs

Confirmed bugs: none observed.

UX confusion, not confirmed bugs:

- Title: Active-copy explanation is less helpful outside planning.
  Steps to reproduce: Ember or Cloudspire, create a `2 pool + 1 active` duplicate
  group, inspect it before advancing from reward/combatResolved.
  Observed behavior: panel and inspector prioritize `Card upgrades can only be
made during planning.`
  Expected behavior: this is mechanically correct, but the UI could also keep
  the active-copy fix visible because it is the more actionable explanation.
  Reproducibility: deterministic in Ember and Cloudspire paths.
  Severity: low UX.

- Title: Board layout is hard to parse from list rows.
  Steps to reproduce: any starter with multiple board cards or a support Relic.
  Observed behavior: board shows rows such as `r0 c0 support` and `r0 c2 ground`.
  Expected behavior: a compact grid should show ground and support layers
  spatially.
  Reproducibility: always.
  Severity: medium UX.

- Title: Reward offers do not explain strategic pack identity.
  Steps to reproduce: reach any reward phase.
  Observed behavior: rows show pack name, cost, affordability, and gold after
  purchase, but not pack bias, expected card roles, trait relevance, or duplicate
  relevance.
  Expected behavior: reward rows should briefly explain why the player might
  choose that pack.
  Reproducibility: always.
  Severity: medium UX.

- Title: Early reward economy rarely creates unaffordable states.
  Steps to reproduce: play the three starters through rounds 1-2 with reasonable
  legal actions.
  Observed behavior: every tested offer was affordable.
  Expected behavior: later tuning should create occasional buy/save tension
  without softlocking the run.
  Reproducibility: observed across this deterministic pass.
  Severity: low tuning/UX.

- Title: Trait panel can feel repetitive.
  Steps to reproduce: inspect Traits / Teamups after adding cards.
  Observed behavior: traits can appear in both Active and Near when active and
  close to the next tier.
  Expected behavior: a "near next tier" label or compact grouping would make the
  repetition feel intentional.
  Reproducibility: frequent.
  Severity: low UX.

## 11. Recommended Next Tasks

Do Next:

- `feat(client): add compact board grid layer view`

Do Soon:

- `feat(client): improve pack offer explanations`
- `feat(client): simplify trait/upgrade panels`
- `test(client): add stable browser coverage for one normal-run partial
duplicate group`
- `feat(rules): tune economy and affordability pressure` after pack-offer
  explanations make reward decisions easier to evaluate

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

- Ember: inspected Ember Scraprunner and Sparkcatch Apprentice; placed
  Sparkcatch Apprentice; won round 1 for `+6`; opened Ember Foundry Pack; saw
  Ember Scraprunner `2 / 3`, active copy, and duplicate Ember Source; advanced;
  added Ember Source; lost round 2 for `+4`; opened Source Pack.
- Rotbloom: inspected Hollow Caller and Ash Ledger; placed Ash Ledger support;
  won round 1 for `+6`; opened Rotbloom Pack; saw duplicate Due Marker and Bloom
  Source explanations; advanced; added Bloom Source; won round 2 for `+6`;
  opened Rotbloom Pack; saw Sporeback Beast `2 / 3` and duplicate Ash Ledger.
- Cloudspire: inspected Cloudgate Adept and Mistwing Scout; placed Mistwing;
  won round 1 for `+6`; opened Cloudspire Pack; saw Mistwing `2 / 3` with active
  copy, Cloudgate partial progress, and Vanishing Warden `2 / 3`; advanced;
  added Ember Source and Shade Source; won round 2 for `+6`; opened Cloudspire
  Pack; saw Vanishing Warden `3 / 3` while outside planning.
- Upgrade lab: loaded `/?scenario=upgrade-lab`; confirmed Cinder Scout `3 / 3`
  and `READY` badges; upgraded to Lv 1; inspector showed `2 ATK / 3 HP`,
  `Current bonus: +1 ATK / +1 HP`, and `Level 1: 1 / 3 pool copies`; placed the
  upgraded card and recorded a winning combat.
- Browser logs: no warnings or errors observed.
- Dev server lifecycle: no stale listeners before testing; Vite listener on
  `5173` stopped after manual playtest; common dev ports clear afterward.
