# Packbound Playtest Report

## 1. Executive Summary

Packbound remains demoable as an internal systems demo at commit
`f6a5dd9f20fb38bb47dea2366ef37f42b6af7d43`. The debug client can carry each
starter through planning, inspection, legal loadout edits, combat preview,
recorded combat, reward opening, latest reward markers, reward-card inspection,
reward-card use after advancing, and round 2 combat without browser errors. UI
clarity is now enough for continued gameplay iteration: phase labels, next-action
guidance, Source Row totals, blocked reasons, card inspection, rewards, and
combat summaries all answer the main internal-playtest questions. Destroyed
triggers now read clearly when they fire because the combat summary names both
the reacting card and the destroyed Unit or Echo that caused the reaction.

Top 3 remaining blockers:

1. Browser smoke coverage is still narrower than the manual debug loop; it does
   not yet cover all starters, reward use after advancing, or trigger-source
   readability.
2. Dense list rows and duplicate card names still make repeated reward cards
   harder to track than they should be.
3. Some combat outcomes still require domain knowledge when a trigger fires but
   has no visible target, or when a queued Technique never produces a later use
   line.

Recommended next task: `test(client): expand browser smoke coverage`.

## 2. Environment And Commands

- Commit hash tested: `f6a5dd9f20fb38bb47dea2366ef37f42b6af7d43`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app Browser against local Vite
- Dev server URL: `http://127.0.0.1:5173/`
- Browser console warnings/errors: none captured
- Stale dev servers before testing: none found on ports `4173`, `5173`-`5180`
- Dev server cleanup: stopped the managed Vite listener on PID `16308`
- Common dev ports after cleanup: clear

Commands run before browser playtest:

| Command               | Status | Notes                                                |
| --------------------- | ------ | ---------------------------------------------------- |
| `pnpm format:check`   | Pass   | All matched files used Prettier style.               |
| `pnpm lint`           | Pass   | ESLint completed.                                    |
| `pnpm typecheck`      | Pass   | All workspace typechecks completed.                  |
| `pnpm test`           | Pass   | 18 test files, 182 tests.                            |
| `pnpm build`          | Pass   | Workspace build and Vite client bundle completed.    |
| `pnpm balance:report` | Pass   | No simulator warnings in reported starter/pack rows. |
| `pnpm test:browser`   | Pass   | 1 Chromium smoke test passed.                        |

## 3. Coverage Summary

| Starter            | Rounds reached   | Combat recorded     | Reward opened      | New card used                  | Notes                                                                                         |
| ------------------ | ---------------- | ------------------- | ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `ember_scrappers`  | Round 2 recorded | Yes, rounds 1 and 2 | Ember Foundry Pack | Ember Source, Cinder Tally     | Sparkcatch and Cinder Tally trigger-source lines were visible.                                |
| `rotbloom_recall`  | Round 2 recorded | Yes, rounds 1 and 2 | Rotbloom Pack      | Due Marker                     | Due Marker offered Hollow Caller, and Ash Ledger reacted twice with clear source/cause lines. |
| `cloudspire_phase` | Round 2 recorded | Yes, rounds 1 and 2 | Cloudspire Pack    | Ember Source, Vanishing Warden | Control run stayed readable; Barrier block line was clear.                                    |

## 4. Starter Notes

### Ember Scrappers

- Initial clarity: The starter opens in a readable planning state with Ember
  Scraprunner on board, Ember Source in Source Row, Sparkfall on Spellrail, and
  Signal Nest plus Sparkcatch Apprentice in the pool. The next action says
  `Next: adjust your loadout or ready combat.`
- Card inspector clarity: Ember Scraprunner, Ember Source, Sparkfall, Signal
  Nest, Sparkcatch Apprentice, Cinder Tally, and Rustline Cannon all exposed
  useful type, zone, Aspect, costs, stats, rules text, design metadata, legal
  actions, and blocked reasons.
- Source Row / Charge clarity: Source Row read `2 / 3`, then `3 / 3` after
  placing Sparkcatch Apprentice, then `3 / 6` after adding a rewarded Ember
  Source, then `5 / 6` after placing Cinder Tally. This made board Charge and
  Aspect access understandable.
- Destroyed-trigger clarity: Sparkcatch Apprentice visibly reacted when Ember
  Scraprunner was destroyed. Cinder Tally visibly triggered after Sparkcatch
  Apprentice was destroyed as the first allied death.
- Reward clarity: Ember Foundry Pack added Ember Scraprunner, Ember Source,
  Ember Scraprunner, Cinder Tally, Rustline Cannon, and Cracked Prism. The latest
  pack banner and `new` badges made the added cards easy to find.
- Combat summary clarity: Winner, damage, destroyed units, trigger damage, and
  trigger source/cause were understandable. Cinder Tally's trigger attribution
  is now strong enough for internal playtesting.
- Suspected bugs: No true Ember gameplay bug observed. One UX confusion remains:
  Sparkcatch can show a reaction line when no valid enemy remains, with no
  explicit "no target" explanation.

### Rotbloom Recall

- Initial clarity: Rotbloom opens with Hollow Caller on board, Shade Source and
  Bloom Source in Source Row, no Spellrail cards, and Sporeback Beast plus Ash
  Ledger in the pool. The empty Spellrail was not confusing because the list is
  simply empty.
- Card inspector clarity: Hollow Caller and Ash Ledger read much better than in
  the previous report. Recall wording now clearly says it recalls a Unit from
  Ashes costing 2 or less, which is clear enough for internal testing.
- Source Row / Charge clarity: Initial Source Row read `2 / 7`, Shade 1, Bloom
  1, `0.55` combat Charge/sec. After placing Ash Ledger it read `4 / 7`; after
  placing Due Marker it read `7 / 7`.
- Destroyed-trigger clarity: Ash Ledger's browser summary lines were explicit:
  it reacted when Hollow Caller was destroyed by Offering, and again when Hollow
  Caller was destroyed by Technique damage.
- Reward clarity: Rotbloom Pack added Shade Binder, Bloom Source, Cracked Prism,
  Due Marker, Thicket Colossus, and another Due Marker. Newly opened cards were
  marked and inspectable before advancing, with blocked reasons explaining that
  loadout can only be edited during planning.
- Combat summary clarity: Due Marker offered Hollow Caller at combat start,
  Ash Ledger reacted, and Hollow Caller was recalled. This is now readable from
  the summary without opening raw JSON.
- Suspected bugs: The previous Due Marker suspicion did not reproduce. Due
  Marker at support `r0 c1` correctly offered adjacent Hollow Caller at ground
  `r0 c2`.

### Cloudspire Phase

- Initial clarity: Cloudspire opens with Cloudgate Adept, Tide Source, Gleam
  Source, Phase Step, Vanishing Warden, and Mistwing Scout. It is a good control
  starter because it exercises Phase/Barrier without destroyed-trigger rewards.
- Card inspector clarity: Cloudgate Adept, Tide Source, Gleam Source, Phase
  Step, Vanishing Warden, Mistwing Scout, Ember Source, and Shade Source were
  readable. Vanishing Warden's blocked state was clear before extra Source
  capacity was added.
- Source Row / Charge clarity: Initial Source Row read `3 / 6`, Tide 1, Gleam 1,
  `0.68` combat Charge/sec. After adding rewarded Ember Source it read `5 / 9`,
  then `9 / 9` after placing Vanishing Warden.
- Destroyed-trigger clarity: No off-archetype destroyed-trigger reward card was
  naturally seen in the Cloudspire browser run. The control loop still stayed
  readable.
- Reward clarity: Cloudspire Pack added Ember Source, Mistwing Scout, Mistwing
  Scout, Cloudgate Adept, Vanishing Warden, and Shade Source. The `new` badges
  helped, though duplicate names still require scanning.
- Combat summary clarity: Phase Step was queued, Barrier blocking was clear, and
  combat winners/damage were readable. The Barrier line naming Vanishing Warden
  and Rootbrace Guardian was especially helpful.
- Suspected bugs: No true Cloudspire gameplay bug observed. A queued Technique
  that does not later show a used/effect line can still create mild uncertainty.

## 5. Destroyed-Trigger Readability

| Card                    | Seen                       | Inspected | Played | Triggered | Summary clarity                                                                                                                                   |
| ----------------------- | -------------------------- | --------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sparkcatch_apprentice` | Yes, Ember starter pool    | Yes       | Yes    | Yes       | Clear source/cause line: `Sparkcatch Apprentice reacted when Ember Scraprunner was destroyed.` The only gap is when no target remains afterward.  |
| `coal_wisp_echo`        | Balance report only        | No        | No     | No        | Not naturally seen in browser. Balance report shows Ember Foundry Pack can surface it.                                                            |
| `cinder_tally_relic`    | Yes, Ember Foundry reward  | Yes       | Yes    | Yes       | Strong clarity: `Cinder Tally triggered after Sparkcatch Apprentice was destroyed as the first ally destroyed.` Damage line followed immediately. |
| `mournscale_keeper`     | Balance report only        | No        | No     | No        | Not naturally seen in browser. Balance report shows Rotbloom Pack can surface it.                                                                 |
| `ash_ledger_relic`      | Yes, Rotbloom starter pool | Yes       | Yes    | Yes       | Strong clarity: `Ash Ledger reacted when Hollow Caller was destroyed.` Recall line followed immediately.                                          |
| `last_word_broker`      | No                         | No        | No     | No        | Not naturally seen in browser, and not present in the balance-report pack lists for this run.                                                     |

## 6. Card Inspector Evaluation

- Card names: readable and stable; duplicate names remain a list-scanning issue,
  not an inspector issue.
- Type and zone: clear enough for internal testing, for example
  `Relic | pool | Ember` and `Technique | spellrail | Ember`.
- Aspects: readable as comma-separated text. Multi-aspect cards such as
  Vanishing Warden showed `Tide, Gleam`.
- Costs: board Charge costs are understandable. Source cards correctly say
  `No board Charge cost`.
- Stats: Unit stat lines are compact and useful, for example
  `1 ATK / 2 HP / 1 speed / 2 range`.
- Source output: Source cards explain board Charge capacity, Aspect access, and
  combat Charge/sec in one line.
- Technique timing/effects: Phase Step and Sparkfall were understandable through
  combat Charge cost plus trigger timing.
- Rules text: authored rules text is now the best place to understand the card
  quickly.
- Design metadata: useful for internal iteration. Role, archetypes, complexity,
  and mechanic tags are visible without overwhelming the panel.
- Legal actions: clear. They update correctly across planning, combatReady,
  reward, and combatResolved phases.
- Blocked reasons: clear enough. Examples observed: board Charge blockers,
  non-Source/non-Technique blockers, and loadout-only-during-planning blockers.
- Normalized ability wording: much improved. Remaining clunky spots are mild:
  "as the first ally destroyed" is understandable but a little stiff, and no
  visible "no valid target" line appears when a trigger has no effect target.

## 7. Run Guidance And Loadout Clarity

- Next-action guidance: consistently useful. Observed messages included
  adjust-or-ready, review-preview-then-record, open-one-reward-pack, and
  advance-to-next-round guidance.
- Phase labels: clear. `planning`, `combatReady`, `reward`, and `combatResolved`
  matched the available buttons.
- Disabled buttons: understandable in practice. Record Combat remains disabled
  until preview exists; Advance remains disabled until after reward resolution.
- Source Row summary: strong enough for internal playtesting. Board Charge,
  Aspect Access, Combat Charge/sec, and Slots answer the important loadout
  questions.
- Board Charge used/capacity: clear during each legal action. The best examples
  were Ember moving from `3 / 3` to `3 / 6` to `5 / 6`, and Cloudspire moving
  from `5 / 6` to `5 / 9` to `9 / 9`.
- Aspect totals: understandable, especially when adding off-archetype Sources
  such as Ember Source in the Cloudspire run.
- Combat Charge/sec: visible and useful, though it is still more of an internal
  tuning number than a player-facing concept.
- Legal/illegal loadout recovery: clear. Returning active cards to pool during
  planning and blocked reasons outside planning made recovery understandable.

## 8. Reward Clarity

- Latest pack display: useful. It names the pack and lists the opened card names.
- New-card markers: useful and visibly attached to each new pool row.
- Newly opened cards are easy to find: mostly yes. The combination of the latest
  pack banner, highlighted row background, and `new` badge works.
- Newly opened cards are easy to inspect: yes. Inspect buttons remain available
  even when loadout editing is blocked.
- Usability timing: clear enough. Immediately after opening a pack, newly opened
  cards correctly show blocked reasons because the phase is `combatResolved`.
  After advancing, legal actions appear.
- Remaining issue: duplicate rewards such as two Ember Scraprunner, two Due
  Marker, or two Mistwing Scout rows are still visually dense. The `new` badge
  helps, but duplicate rows remain a likely source of misclicks or hesitation.

## 9. Combat Summary Evaluation

- Winner and damage clarity: strong. Each recorded panel states round, winner,
  damage, event count, and the readable summary title.
- Techniques used: queued and used Technique lines are useful. A queued
  Technique without a later visible use/effect line can still raise questions.
- Units destroyed: clear. Destroyed lines name the card and cause.
- Barrier blocks: clear. The summary says Barrier on Vanishing Warden blocked
  Rootbrace Guardian, which was easy to understand.
- Echo vanishing: not observed in the browser playthrough. Balance report only
  shows Echo cards can surface.
- Recall: clear. Recall lines name the recalled Unit and destination.
- Phase: queued Phase Step was visible; a clear phase out/in event was not
  naturally observed in this browser run.
- Destroyed-trigger source/cause attribution: now strong. The summary names the
  reacting card and the destroyed card that caused it.
- Raw JSON need: not needed for normal internal playtesting anymore. It remains
  useful for deep debugging or verifying exact event payloads.

Representative summary lines observed in browser:

- `Sparkcatch Apprentice reacted when Ember Scraprunner was destroyed.`
- `Cinder Tally triggered after Sparkcatch Apprentice was destroyed as the first ally destroyed.`
- `Ash Ledger reacted when Hollow Caller was destroyed.`
- `Barrier on Vanishing Warden blocked Rootbrace Guardian.`

## 10. Bugs Or Suspected Bugs

No true gameplay bugs were confirmed in this playtest.

### UX Confusion: Trigger Fires With No Visible Follow-Up Effect

- Steps to reproduce:
  1. Start `ember_scrappers`.
  2. Place Sparkcatch Apprentice.
  3. Ready and record round 1 combat.
- Observed behavior: The summary showed Sparkcatch Apprentice reacted after
  Ember Scraprunner was destroyed, but no damage line followed because no valid
  enemy target remained.
- Expected behavior: The summary could optionally say the trigger had no valid
  target, or otherwise make no-effect triggers less mysterious.
- Reproducibility: Observed once in this browser playtest.
- Severity: Low UX confusion.

### UX Confusion: Duplicate Reward Rows Require Careful Scanning

- Steps to reproduce:
  1. Open Ember Foundry Pack, Rotbloom Pack, or Cloudspire Pack.
  2. Observe duplicate card names such as Ember Scraprunner, Due Marker, or
     Mistwing Scout.
- Observed behavior: The `new` badges help, but duplicate rows are still dense,
  and selecting a specific copy requires careful scanning.
- Expected behavior: A compact reward grouping or stronger latest-pack treatment
  would make duplicate rewards easier to parse.
- Reproducibility: Observed in all three starter runs.
- Severity: Low to medium UX friction.

### UX Confusion: Queued Technique Without Later Resolution Line

- Steps to reproduce:
  1. Start `cloudspire_phase`.
  2. Keep Phase Step on the Spellrail.
  3. Ready and record combat.
- Observed behavior: The summary showed `You queued Phase Step`, but in the
  observed combats no later Phase Step use/effect line appeared.
- Expected behavior: If a Technique fizzles or never reaches its condition, a
  compact reason would help internal testers distinguish "not enough Charge",
  "no valid target", and "not implemented".
- Reproducibility: Observed in Cloudspire rounds 1 and 2.
- Severity: Low UX confusion.

## 11. Recommended Next Tasks

Do Next:

1. `test(client): expand browser smoke coverage`

Do Soon:

1. `feat(client): improve reward display`
2. `feat(client): add compact board grid/layer view`
3. `feat(client): explain no-target and fizzled Technique summary cases`
4. `feat(content): tune destroyed-trigger starter exposure`

Still Wait:

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- visual combat replay
- GitHub Pages deployment
- Vercel/Netlify deployment

## 12. Raw Notes

- Ember Scrappers:
  - Placed Sparkcatch Apprentice, then opened Ember Foundry Pack.
  - New cards: Ember Scraprunner, Ember Source, Ember Scraprunner, Cinder Tally,
    Rustline Cannon, Cracked Prism.
  - Added rewarded Ember Source and placed Cinder Tally in round 2.
  - Round 2 summary clearly attributed Cinder Tally to Sparkcatch Apprentice's
    destruction.
- Rotbloom Recall:
  - Placed Ash Ledger, opened Rotbloom Pack, then placed Due Marker in round 2.
  - New cards: Shade Binder, Bloom Source, Cracked Prism, Due Marker, Thicket
    Colossus, Due Marker.
  - Due Marker offered Hollow Caller at combat start.
  - Ash Ledger reacted and recalled Hollow Caller after both Offering and
    Technique-damage destruction.
- Cloudspire Phase:
  - Placed Mistwing Scout, opened Cloudspire Pack, added rewarded Ember Source,
    and placed rewarded Vanishing Warden in round 2.
  - New cards: Ember Source, Mistwing Scout, Mistwing Scout, Cloudgate Adept,
    Vanishing Warden, Shade Source.
  - Barrier summary line was clear.
- Not naturally seen in browser:
  - `coal_wisp_echo`
  - `mournscale_keeper`
  - `last_word_broker`
