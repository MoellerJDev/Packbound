# Packbound Playtest Report

## 1. Executive Summary

Packbound remains demoable as an internal systems demo at commit
`840b1969adaeb8cbfbf476c5c67ea4eb48e92f4a`. The current debug client supports
the full engine-first loop: starter selection, card inspection, trait/teamup
scanning, Source Row review, legal loadout edits, combat preview, recorded
combat, gold rewards, priced pack purchases, latest reward markers, reward-card
inspection, round advancement, duplicate upgrades in the lab, and readable
combat summaries.

Priced packs improve reward decisions. The player now sees current gold, combat
gold earned, each pack cost, affordability, gold after purchase, and latest
purchase history. The Source Pack being cheaper creates the clearest early
economy decision when it appears beside 4-gold archetype packs.

Gold flow is understandable, but early income is generous. Every manually tested
reward offer was affordable after combat, so the playtest did not reach a true
unaffordable pack state. Price still created mild tension between archetype
packs, cheaper Source/fixing, duplicate chasing, and preserving gold, but it did
not yet create a hard tradeoff.

The next task should be upgrade visibility in normal runs. Economy clarity is
good enough for the next iteration, and board readability remains rough but
tolerable for internal testing. The biggest planning blocker is that duplicate
progress is exciting only when the player already knows the pool-only 3-copy
upgrade rule.

Top 3 remaining blockers:

1. Normal runs do not surface partial duplicate progress such as `2 / 3 copies`.
2. Reward offers show price but not pack bias, expected contents, duplicate
   relevance, or Source/fixing reasons.
3. Board positioning is still a list of row/column/layer text instead of a
   compact spatial board.

Recommended next task: `feat(client): improve upgrade visibility in normal runs`.

## 2. Environment And Commands

- Commit hash tested: `840b1969adaeb8cbfbf476c5c67ea4eb48e92f4a`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app Browser for manual playtest; Playwright
  Chromium for `pnpm test:browser`
- Dev server URL: `http://127.0.0.1:5173/`
- Browser console warnings/errors during manual pass: none captured
- Stale dev servers before testing: none found on ports `4173`, `5173`-`5180`
- Dev server cleanup after manual playtest: stopped managed Vite listener on PID
  `36580`
- Common dev ports after cleanup: clear
- Temp Vite logs: removed after the wrapper released file handles

| Command               | Status | Notes                                                              |
| --------------------- | ------ | ------------------------------------------------------------------ |
| `pnpm format:check`   | Pass   | All matched files used Prettier style.                             |
| `pnpm lint`           | Pass   | ESLint completed.                                                  |
| `pnpm typecheck`      | Pass   | All workspace typechecks completed.                                |
| `pnpm test`           | Pass   | 22 test files, 219 tests.                                          |
| `pnpm build`          | Pass   | Workspace build and Vite client bundle completed.                  |
| `pnpm balance:report` | Pass   | Deterministic report printed; no warnings in reported combat rows. |
| `pnpm test:browser`   | Pass   | 2 Chromium smoke tests passed.                                     |
| `pnpm dev`            | Pass   | Clean managed start succeeded on `127.0.0.1:5173`.                 |

Note: an initial managed dev-server attempt passed duplicate `--host` arguments
to a script that already sets the host and exited before opening a listener. The
clean `pnpm dev` start was used for all manual browser coverage.

## 3. Coverage Summary

| Scenario         | Rounds reached        | Combat recorded | Rewards opened                  | Gold clarity | Notes                                                                                                        |
| ---------------- | --------------------- | --------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| Ember Scrappers  | Round 2 reward opened | Yes, rounds 1-2 | Ember Foundry Pack, Source Pack | Clear        | First reward all 4-gold packs; second reward made Source Pack's cheaper 3-gold price meaningful.             |
| Rotbloom Recall  | Round 2 reward opened | Yes, rounds 1-2 | Rotbloom Pack twice             | Clear        | Due Marker duplicates created a visible lane but are Relics, so they are not upgradeable.                    |
| Cloudspire Phase | Round 2 reward opened | Yes, rounds 1-2 | Cloudspire Pack twice           | Clear        | Mistwing duplicates appeared in pool while one copy was active on board; upgrade progress remained implicit. |
| Upgrade Lab      | Round 1 reward phase  | Yes, round 1    | None                            | Clear        | Three Cinder Scout copies upgraded into one Lv 1 Unit; gold/rewards still appeared normally after combat.    |

## 4. Economy / Gold Evaluation

Current gold is visible enough. The Run State panel shows Gold alongside health,
round, status, and phase, and it updated immediately after combat and purchases.

Gold earned after combat is visible enough. The Last Recorded Combat line shows
`Gold: +N`, and the combat summary makes the win/loss/damage context visible.
Observed combat gold:

- Ember round 1 win with no damage: `+6`, gold `0 -> 6`.
- Ember round 2 loss with 2 damage taken: `+4`, gold `2 -> 6`.
- Rotbloom rounds 1-2 wins with no damage: `+6` each.
- Cloudspire rounds 1-2 wins with no damage: `+6` each.
- Upgrade lab round 1 win with no damage: `+6`.

The player can understand why gold changed at the level the debug UI currently
supports: combat says `Gold: +N`, reward rows say cost and after-purchase gold,
and latest pack history says paid cost plus before/after gold. The UI does not
break down base/win/clean bonuses, but that is acceptable for this internal
prototype.

Reward purchases clearly subtract gold. Observed purchase history:

- Ember Foundry Pack: paid 4, gold `6 -> 2`.
- Ember Source Pack: paid 3, gold `6 -> 3`.
- Rotbloom Pack: paid 4, gold `6 -> 2`, then `8 -> 4`.
- Cloudspire Pack: paid 4, gold `6 -> 2`, then `8 -> 4`.

No pack became unaffordable during this manual pass. Because each round 1 win
paid 6 gold and all current packs cost 3 or 4 gold, every offer was buyable.
The economy still created some tension when Source Pack appeared because it
left 1 more gold than the archetype packs, but it did not create a hard
"cannot buy this yet" moment.

Early gold is about right for demo flow but too generous to stress
affordability. It keeps the debug loop smooth and avoids softlocks, but economy
tuning should eventually create at least occasional save-versus-buy pressure.

## 5. Pack Choice Evaluation

Ember Scrappers:

- Offered round 1: Cloudspire Pack 4, Rotbloom Pack 4, Ember Foundry Pack 4.
- Chosen round 1: Ember Foundry Pack.
- Reason: active Ember/Scrapper/Echo Fodder traits made the archetype pack the
  obvious lane.
- Cost mattered only weakly because all offers cost 4 and left 2 gold.
- Traits influenced the choice strongly: Ember reached `4 / 6`, Echo Fodder and
  Scrapper reached `2 / 3` before the purchase.
- Duplicate progress influenced the choice after opening: two Ember
  Scraprunner copies appeared, but Available Upgrades stayed empty.
- Source/fixing mattered in round 2: Source Pack cost 3 beside 4-gold packs and
  was chosen because it preserved 1 extra gold and opened Source Greed/fixing.
- Decision quality: real but mild. Round 2 had the best price-based tradeoff.

Rotbloom Recall:

- Offered round 1: Rotbloom Pack 4, Source Pack 3, Cloudspire Pack 4.
- Chosen round 1: Rotbloom Pack.
- Reason: Shade/Ashes/Recall/Offering traits were already active or near, and
  Rotbloom promised more of that lane.
- Cost mattered but did not override archetype direction; Source Pack was
  cheaper but the run had 6 gold.
- Traits influenced the choice strongly: Shade, Ashes, Recall, Offering, Relic
  Engine, and Source Greed were all readable.
- Duplicate progress was mixed: two Due Marker copies were visible, but Due
  Marker is a Relic and not upgradeable.
- Source/fixing mattered as a cheaper alternative but felt less urgent because
  Shade/Bloom access was already strong.
- Decision quality: strategic by archetype, not forced by budget.

Cloudspire Phase:

- Offered round 1: Rotbloom Pack 4, Cloudspire Pack 4, Source Pack 3.
- Chosen round 1: Cloudspire Pack.
- Reason: Cloudspire directly supported Tide/Gleam/Phase/Barrier/Warden.
- Cost mattered but did not override duplicate/trait direction; the cheaper
  Source Pack was tempting but not necessary with 6 gold.
- Traits influenced the choice strongly: Tide, Gleam, Phase, Wisp, Barrier, and
  Warden were visible.
- Duplicate progress influenced the choice conceptually: the pack produced two
  Mistwing Scout copies while the starter Mistwing was active on board.
- Source/fixing became useful after the pack opened Ember Source and Shade
  Source, pushing Source Greed to `4 / 5`.
- Decision quality: good archetype decision, but the upgrade chase was not
  explained by the UI.

## 6. Upgrade / Duplicate Visibility

Normal runs do not surface partial duplicate progress. Ember produced two pool
Ember Scraprunner copies, Rotbloom produced two Due Marker copies, and
Cloudspire produced two pool Mistwing Scout copies while one Mistwing was active
on board. In all cases, Available Upgrades only showed the empty state until an
exact eligible 3-copy pool group existed.

Duplicate Unit and Echo cards feel like upgrade opportunities once the player
knows the rule. Mistwing Scout and Ember Scraprunner duplicates were exciting
pulls, but the UI did not say how close they were to upgrading or that active
board copies do not count while they are not in the pool.

Non-upgradeable duplicate Relics still create confusion. Rotbloom's duplicate
Due Markers looked like upgrade material at first glance, and only the inspector
explained that Relics are not upgradeable in the current prototype.

The Available Upgrades panel is enough for the exact 3-copy case. In the
upgrade lab it clearly said `Cinder Scout: 3 / 3 copies at level 0 -> upgrade to
level 1`, and the Upgrade button produced one Lv 1 Cinder Scout. The inspector
then showed `2 ATK / 3 HP` and `Current bonus: +1 ATK / +1 HP.`

The UI needs a `2 / 3 copies` progress line for normal runs. It should also say
which card types count, whether active board copies are excluded, and when a
duplicate is non-upgradeable.

Yes, the next task should improve normal-run upgrade visibility.

## 7. Traits And Pack Direction

Active and near traits are understandable enough for internal playtesting. They
made each pack choice easier: Ember leaned toward Scrapper/Echo Fodder,
Rotbloom leaned toward Ashes/Recall/Offering/Relic Engine, and Cloudspire leaned
toward Phase/Barrier/Warden.

Traits create reasons to buy specific packs. The strongest choices were
archetype-reinforcing packs, while Source Pack became attractive when its lower
cost and fixing pushed Source Greed.

Source Greed helps explain Source/fixing choices. It made the Ember Source Pack
choice and Cloudspire off-aspect Sources feel like a real direction instead of
generic capacity.

Trait thresholds are useful for pack choice, especially when a trait sits one
away from the next tier. The panel is dense, though. Active traits can also
appear under Near when they are near the next tier, which is mechanically useful
but visually repetitive.

## 8. Reward Display

Pack cost display is clear. Each reward row shows `Cost N gold`.

Affordability display is clear for affordable packs because each row shows
`After purchase: N gold`. The playtest did not produce an unaffordable offer, so
the disabled Open state and `Need N gold, have M` copy were not observed
manually.

Gold after purchase is one of the strongest clarity improvements. It made
Source Pack's 3-gold price immediately legible beside 4-gold archetype packs.

Latest pack summary is clear. It shows the pack name, `Paid N gold`, and
`Gold before -> after`, followed by the opened card names and new-card markers.

New-card markers work. Newly opened cards were easy to find and inspect, though
duplicate names still rely on repeated rows rather than grouped counts.

Pack bias and expected contents are not clear enough yet. Reward rows explain
price but not why Ember, Rotbloom, Cloudspire, or Source is strategically
different. That should be a near-term UI task after upgrade visibility.

## 9. Board / Positioning Readability

Board positioning is still a UI blocker for player-facing comprehension, but it
is not the biggest blocker for the next engine-first task. The list-based board
is tolerable for internal playtesting because row, column, and layer are
visible and legal actions work.

A compact board grid should happen after normal-run upgrade visibility and pack
offer explanations. It would make support-layer Relics, adjacency, and board
capacity easier to reason about, but it is not more urgent than making duplicate
chases readable.

## 10. Bugs Or Suspected Bugs

Confirmed bugs: none observed.

UX confusion, not confirmed bugs:

- Title: Partial upgrade progress is hidden in normal runs.
  Steps to reproduce: start Cloudspire Phase, place Mistwing Scout, record
  combat, open Cloudspire Pack, advance to round 2.
  Observed behavior: Pool Cards shows two Mistwing Scout copies and the board
  has one active Mistwing Scout, but Available Upgrades only says no pool card
  has 3 matching Unit or Echo copies.
  Expected behavior: The UI should show partial progress and explain that only
  matching pool copies count.
  Reproducibility: deterministic with this seed.
  Severity: medium UX.

- Title: Non-upgradeable duplicates can look like upgrade material.
  Steps to reproduce: start Rotbloom Recall, record combat, open Rotbloom Pack.
  Observed behavior: two Due Marker rows appear, but Due Marker is a Relic and
  cannot upgrade. The inspector explains this only after selection.
  Expected behavior: Duplicate rows or the upgrade panel should clarify
  Unit/Echo eligibility.
  Reproducibility: deterministic with this seed.
  Severity: low-medium UX.

- Title: Reward offers do not explain pack contents or strategic bias.
  Steps to reproduce: reach any reward phase.
  Observed behavior: each offer shows name, cost, affordability, and
  after-purchase gold, but not expected archetype, Source/fixing role, duplicate
  relevance, or pack bias.
  Expected behavior: Reward rows should briefly explain why a player might buy
  that pack.
  Reproducibility: always.
  Severity: medium UX.

- Title: Early economy rarely reaches unaffordable decisions.
  Steps to reproduce: play the three starters through rounds 1-2 with the
  tested legal actions.
  Observed behavior: every offered pack was affordable; no disabled Open button
  appeared.
  Expected behavior: Later tuning should create occasional buy/save pressure or
  unaffordable premium offers without softlocking the run.
  Reproducibility: observed across this deterministic manual pass.
  Severity: low tuning/UX.

- Title: Near traits repeat active traits densely.
  Steps to reproduce: inspect Traits / Teamups after adding reward cards.
  Observed behavior: traits can appear in Active and Near because they are
  active and close to the next tier.
  Expected behavior: A "near next tier" label or compact grouping would make the
  repetition feel intentional.
  Reproducibility: frequent.
  Severity: low UX.

## 11. Recommended Next Tasks

Do Next:

- `feat(client): improve upgrade visibility in normal runs`

Do Soon:

- `feat(client): improve pack offer explanations`
- `test(client): add a stable browser check for partial duplicate visibility`
- `feat(client): add compact board grid layer view`
- Tune early economy only after upgrade and pack-offer clarity make decisions
  easier to read.

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
  and Sparkcatch Apprentice; placed Sparkcatch Apprentice; won round 1 for
  `+6` gold; opened Ember Foundry Pack for 4 gold; advanced; added Ember
  Source; placed Cinder Tally; lost round 2 for `+4` gold; opened Source Pack
  for 3 gold.
- Ember notable rewards: Ember Scraprunner, Ember Source, Ember Scraprunner,
  Cinder Tally, Rustline Cannon, Cracked Prism, then Shade Source,
  Ember-Shade Conduit, Tide-Gleam Conduit, Overgrowth Spring, Mossback Tender.
- Rotbloom path: inspected Hollow Caller, Shade Source, Bloom Source,
  Sporeback Beast, and Ash Ledger; placed Ash Ledger; won round 1 for `+6`
  gold; opened Rotbloom Pack for 4 gold; advanced; added Bloom Source; placed
  Due Marker; won round 2 for `+6` gold; opened another Rotbloom Pack for 4
  gold.
- Rotbloom notable rewards: Shade Binder, Bloom Source, Cracked Prism, Due
  Marker, Thicket Colossus, Due Marker, then Ash Debt Runner, Sporeback Beast,
  Rootbrace Guardian, Ash Ledger, Debt-Bound Colossus, Bloom Source.
- Cloudspire path: inspected Cloudgate Adept, Tide Source, Gleam Source, Phase
  Step, Vanishing Warden, and Mistwing Scout; placed Mistwing Scout; won round
  1 for `+6` gold; opened Cloudspire Pack for 4 gold; advanced; added Ember
  Source and Shade Source; placed Vanishing Warden; won round 2 for `+6` gold;
  opened another Cloudspire Pack for 4 gold.
- Cloudspire notable rewards: Ember Source, Mistwing Scout, Mistwing Scout,
  Cloudgate Adept, Vanishing Warden, Shade Source, then Cracked Prism, Signal
  Wisp Echo, Skyhook Lookout, Gleam Lantern, Vanishing Warden,
  Tide-Gleam Conduit.
- Upgrade lab path: loaded `/?scenario=upgrade-lab`, inspected Cinder Scout,
  upgraded three copies into one Lv 1 Cinder Scout, inspected the upgraded card,
  placed it, and recorded combat. Reward choices appeared normally afterward.
- Browser logs: no warnings or errors captured.
- Dev server lifecycle: no stale listeners before testing; Vite listener on
  `5173` stopped after manual playtest; common dev ports clear afterward.
