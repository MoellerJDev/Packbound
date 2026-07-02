# Packbound Playtest Report

## 1. Executive Summary

- The prototype is still demoable as an internal systems demo. The loop loads,
  starter selection works, planning edits are legal-state gated, combat can be
  previewed and recorded, rewards open, and rounds advance.
- The new destroyed-trigger cards are partially understandable. The card
  inspector makes the authored rules text readable, and the combat summary shows
  the visible consequences. The missing piece is explicit trigger-source
  attribution in combat.
- Ember Scrappers and Shade Ashes feel more distinct in data and in play when
  their new cards appear. Ember now has death-spark rewards and Shade can show
  death into Recall. The distinction is strongest in the inspector and weaker in
  combat summaries.
- The combat summary is good enough to show that something happened, but not
  always why it happened. For example, it showed `Cinder Tally dealt 1 trigger
damage to Hollow Caller` after Sparkcatch Apprentice died, but did not say
  Cinder Tally reacted to that death.
- Top remaining blockers:
  1. Combat summaries need explicit trigger-source lines for destroyed triggers.
  2. Some normalized ability text is clunky, especially Recall and Offer text.
  3. Reward cards are listed, but not highlighted in rows; new cards still take
     manual scanning and inspecting.
- Recommended next task: `feat(client): add explicit trigger-source combat
summary lines`.

## 2. Environment And Commands

- Commit hash: `dd39fb23936c5f38709b7c614b8ca8ce02f06fa5`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
  `5.1.26100.8655`
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Dev server URL: `http://127.0.0.1:5175/`
- Browser/tool used: Codex in-app Browser control against the local Vite app
- Browser console logs: none returned during the session

Commands run before browser playtest:

- `pnpm format:check`: pass
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 17 test files / 173 tests
- `pnpm build`: pass
- `pnpm balance:report`: pass
- `pnpm dev --host 127.0.0.1`: pass. Vite reported ports `5173` and `5174`
  already in use and served this session at `http://127.0.0.1:5175/`.

Balance report highlights:

- Starter-vs-encounter rows completed with no warnings.
- Ember Foundry Pack surfaced `cinder_tally_relic`, `coal_wisp_echo`, and
  `sparkcatch_apprentice` across aggregate seeds.
- Rotbloom Pack surfaced `ash_ledger_relic` and `mournscale_keeper` across
  aggregate seeds, though not all appeared in this browser run.
- Boss rows still looked dangerous in the smoke report, though the browser
  Rotbloom run beat the boss after Ash Ledger repeatedly recalled Hollow Caller.

## 3. Destroyed-Trigger Card Coverage

| Card                    | Seen                               | Inspected | Played | Triggered | Clarity notes                                                                                                                                                     |
| ----------------------- | ---------------------------------- | --------- | ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sparkcatch_apprentice` | Yes, starter pool                  | Yes       | Yes    | No        | Inspector was clear: `Whenever another ally is destroyed...`; it was destroyed before it could react in the played combats.                                       |
| `coal_wisp_echo`        | No                                 | No        | No     | No        | Did not appear naturally in the browser reward flow. Balance report shows Ember Foundry Pack can surface it.                                                      |
| `cinder_tally_relic`    | Yes, Ember Foundry reward          | Yes       | Yes    | Yes       | Inspector was clear and Charge blocker was clear. Combat showed `Cinder Tally dealt 1 trigger damage`, but did not say it reacted to Sparkcatch Apprentice dying. |
| `mournscale_keeper`     | No                                 | No        | No     | No        | Did not appear naturally in the browser reward flow. Balance report shows Rotbloom Pack can surface it.                                                           |
| `ash_ledger_relic`      | Yes, starter pool and later reward | Yes       | Yes    | Yes       | Inspector rules text was understandable. Combat showed Recall after ally deaths, but did not name Ash Ledger as the reacting source.                              |
| `last_word_broker`      | No                                 | No        | No     | No        | Did not appear naturally in the browser reward flow or aggregate balance-report card list for this seed set.                                                      |

Coverage note: cards not seen through the browser flow were not manually forced
into the run. They should be covered by future targeted browser smoke fixtures
or a debug catalog/card search tool.

## 4. Starter Notes

### Ember Scrappers

- `sparkcatch_apprentice` was immediately visible in the starter pool.
- Its inspector was strong enough for internal testing:
  - type, zone, Aspect, cost, stats, tags, rules text, design metadata, and legal
    actions were visible
  - normalized ability text said `when an ally is destroyed: deal 1 damage on
nearest enemy`
- It was legal to place on the board alongside Ember Scraprunner.
- First combat did not make the death-spark gameplay visible. Enemy Ember
  Scraprunner died first, then the player's Ember Scraprunner died after no
  enemy target remained, so Sparkcatch had no visible trigger moment.
- Ember Foundry Pack appeared as a reward and opened `Cinder Tally`. It was
  initially blocked by board Charge:
  - `Board uses 5 Charge, but the Source Row provides 3.`
  - After adding the rewarded Ember Source, Cinder Tally became legal and was
    placed.
- Round 2 made the death-trigger payoff visible:
  - Sparkcatch Apprentice died.
  - The summary then showed `Cinder Tally dealt 1 trigger damage to Hollow
Caller`.
- Combat-summary gap: the summary showed Cinder Tally's damage, but did not say
  it triggered because Sparkcatch Apprentice was destroyed.
- Echo/death fodder was understandable in docs and tests, but `coal_wisp_echo`
  did not show up in this browser run.

### Rotbloom Recall

- `ash_ledger_relic` was immediately visible in the starter pool.
- It was legal to place on the support layer with Hollow Caller.
- Its authored rules text was clear:
  - `Whenever another ally is destroyed, recalls a small Unit from Ashes with 1
health.`
- Its normalized ability line was clunky:
  - `when an ally is destroyed: Recall a card costing 2 or less on card in Ashes
costing 2 or less`
- Round 1 did not trigger Ash Ledger because the starter won without an allied
  death.
- Rotbloom Pack was opened twice. Browser rewards showed cards such as Shade
  Binder, Due Marker, Ash Debt Runner, Rootbrace Guardian, another Ash Ledger,
  and Debt-Bound Colossus, but did not show Mournscale Keeper or Last-Word
  Broker.
- Boss combat made Ash Ledger visible:
  - Hollow Caller died to Sparkfall and was recalled from Ashes.
  - Hollow Caller died again to Debt-Bound Colossus and was recalled again.
- Combat-summary gap: the Recall lines were readable, but the summary did not
  say Ash Ledger caused them.
- Shade payoffs are understandable after inspection, but the browser run needed
  a boss fight before Ash Ledger's trigger became visible.

### Cloudspire Phase

- The general loop still works as a control case.
- The starter reached combat, recorded a loss against Ember Pressure Crew, and
  opened a reward without errors.
- The first control reward offered Rotbloom Pack, which opened off-archetype
  Shade/Bloom cards: Rootbrace Guardian, Shade Binder, Contract Husk,
  Ember-Shade Conduit, Thicket Colossus, and Due Marker.
- No new destroyed-trigger cards appeared in the Cloudspire reward flow.
- Off-archetype cards remain understandable only after inspection. The latest
  pack summary lists new card names, but the pool rows are not visually marked as
  new.
- The new content did not make the general loop more confusing, but it did not
  solve the existing reward-scanning problem.

## 5. Combat Summary Evaluation

- You can tell which Unit died. Destroyed lines are readable and use card names.
- You can tell what the payoff did when the payoff emits damage or Recall:
  - `Cinder Tally dealt 1 trigger damage to Hollow Caller.`
  - `You recalled Hollow Caller from Ashes to r3 c1 ground.`
- You cannot reliably tell why that payoff happened without mentally correlating
  adjacent event lines.
- Trigger consequences are visible as damage and Recall lines.
- The current summary is not quite enough for destroyed-trigger cards. It should
  add explicit trigger-source lines.

Suggested explicit lines:

- `Cinder Tally reacted when Sparkcatch Apprentice was destroyed.`
- `Ash Ledger reacted when Hollow Caller was destroyed.`
- `Sparkcatch Apprentice reacted when Coal Wisp Echo vanished.`
- `Last-Word Broker triggered after the first enemy was destroyed.`

These should supplement, not replace, the existing damage, destroyed, and Recall
lines.

## 6. Card Inspector Evaluation

- Destroyed-trigger cards show readable authored rules text.
- `OnAllyDestroyed` and first-destroyed triggers are understandable through
  authored text:
  - `Whenever another ally is destroyed...`
  - `When your first ally is destroyed each combat...`
- Normalized trigger labels are mostly useful but sometimes engine-flavored:
  - Good: `when an ally is destroyed: deal 1 damage on nearest enemy`
  - Good enough: `when the first ally is destroyed: deal 1 damage on nearest
enemy`
  - Needs work: `Recall a card costing 2 or less on card in Ashes costing 2 or
less`
  - Needs work: `Offer the target on adjacent allies`
- Blocked reasons are clear when Charge is the blocker. Cinder Tally's exact
  blocker was excellent: `Board uses 5 Charge, but the Source Row provides 3.`
- Cost, Aspect, and Charge constraints are understandable in the inspector, but
  not at a glance from the row.
- Wording improvements:
  - Use `When another ally is destroyed` instead of exposing `OnAllyDestroyed`.
  - Use `When your first ally dies each combat` or `First ally destroyed each
combat` for first-destroyed payoffs.
  - For Recall effects, say `Recall a Unit from Ashes costing 2 or less`.
  - For Offer effects, say `Offer an adjacent ally`.

## 7. Balance/Pacing Observations

- Browser Ember felt more fragile after adding Sparkcatch because the payoff body
  can die before it reacts. That may be acceptable, but it means Cinder Tally was
  the clearer death-spark card in this playtest.
- Browser Rotbloom with Ash Ledger looked strong in the boss round. Hollow
  Caller was recalled twice after dying, and the run beat Ledger Champion with no
  player damage. This is only one browser run, not a balance conclusion.
- Balance report still has no warnings and still shows boss danger in aggregate:
  Ember and Cloudspire lose to the boss rows, while Rotbloom draws the boss row
  in the smoke report.
- Packs appear to surface the new archetype cards in aggregate:
  - Ember Foundry Pack list included `cinder_tally_relic`, `coal_wisp_echo`, and
    `sparkcatch_apprentice`.
  - Rotbloom Pack list included `ash_ledger_relic` and `mournscale_keeper`.
- Browser rewards did not show every new card. This is expected for a small
  seeded playtest and should not be overread.

## 8. Bugs Or Suspected Bugs

### Suspected Bug: Due Marker Did Not Offer Adjacent Ally

- Steps:
  1. Start `rotbloom_recall`.
  2. Place `ash_ledger_relic`.
  3. Record round 1, open Rotbloom Pack, advance.
  4. Place `due_marker_relic` on support `r0 c1` adjacent to Hollow Caller at
     ground `r0 c2`.
  5. Record combat.
- Observed behavior:
  - No `UnitDestroyed` line with reason `Offering`.
  - No ally was offered at combat start.
  - Combat proceeded normally with Hollow Caller and recalled Ember Scraprunner.
- Expected behavior:
  - Due Marker should offer an adjacent allied Unit at combat start, or the UI
    should explain that Relic adjacency is unsupported.
- Reproducibility:
  - Observed once in this browser playtest. Needs a focused simulator/content
    test before treating it as confirmed.

### UX Confusion: Trigger Source Is Not Attributed

- Steps:
  1. Place Cinder Tally in Ember Scrappers.
  2. Record combat where Sparkcatch Apprentice dies.
- Observed behavior:
  - Summary shows Sparkcatch Apprentice was destroyed.
  - Summary then shows Cinder Tally dealt trigger damage.
- Expected behavior:
  - Summary should add a line explaining that Cinder Tally reacted to Sparkcatch
    Apprentice being destroyed.
- Reproducibility:
  - Reproduced in Ember round 2.

## 9. Recommended Next Tasks

Do Next:

1. `feat(client): add explicit trigger-source combat summary lines`

Do Soon:

1. `fix(sim): support Relic adjacency targets or retire Due Marker adjacency`
2. `feat(client): improve destroyed-trigger ability text formatting`
3. `feat(client): improve reward-row highlighting`
4. `test(client): add browser smoke test for debug loop`

Still Wait:

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- visual combat replay

## 10. Raw Notes

- Ember Scrappers initial state:
  - Sparkcatch Apprentice appeared in the pool and was legal to place.
  - Signal Nest was blocked by board Charge until more Source capacity was
    available.
- Sparkcatch Apprentice inspector:
  - Cost: `1 Charge (1 generic)`
  - Stats: `1 ATK / 2 HP / 1 speed / 2 range`
  - Rules: `Whenever another ally is destroyed, sparks the nearest enemy.`
  - Ability text: `when an ally is destroyed: deal 1 damage on nearest enemy`
- Ember round 1:
  - Sparkcatch was played.
  - Sparkcatch did not visibly trigger.
  - Ember Scraprunner death spark was visible, but not the new payoff.
- Ember Foundry reward:
  - Opened cards: Ember Scraprunner, Ember Source, Ember Scraprunner, Cinder
    Tally, Rustline Cannon, Cracked Prism.
  - Cinder Tally was blocked until Ember Source was added.
- Ember round 2:
  - Sparkcatch Apprentice died to combat damage.
  - Cinder Tally dealt 1 trigger damage to Hollow Caller.
  - Summary did not directly connect those two facts.
- Rotbloom initial state:
  - Ash Ledger appeared in the pool and was legal to place.
  - Ash Ledger rules text was readable.
- Rotbloom round 1:
  - Hollow Caller recalled Ember Scraprunner from Ashes.
  - No allied death happened, so Ash Ledger did not trigger.
- Rotbloom rewards:
  - First Rotbloom Pack opened Shade Binder, Bloom Source, Cracked Prism, Due
    Marker, Thicket Colossus, Due Marker.
  - Second Rotbloom Pack opened Ash Debt Runner, Sporeback Beast, Rootbrace
    Guardian, Ash Ledger, Debt-Bound Colossus, Bloom Source.
  - Mournscale Keeper and Last-Word Broker were not seen in browser.
- Rotbloom boss:
  - Hollow Caller died to Sparkfall and was recalled.
  - Hollow Caller died to Debt-Bound Colossus and was recalled again.
  - Ash Ledger was the likely source, but the summary did not name it.
- Cloudspire control:
  - Round 1 recorded normally.
  - Rotbloom reward opened off-plan cards, but no new destroyed-trigger card.
  - No browser console logs were reported.
