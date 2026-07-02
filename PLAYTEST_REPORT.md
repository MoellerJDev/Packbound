# Packbound Playtest Report

## Environment

- Commit hash: `85755101704fde17edc02e5e9931e487e4e1e529`
- Date/time: `2026-07-02T11:02:55.9134912-05:00`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell `5.1.26100.8655`
- Node/pnpm versions: Node `v24.14.0` from the bundled Codex runtime, pnpm `11.7.0`
- Browser or automation method: Playwright package from the bundled runtime driving installed Microsoft Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Browser URL: `http://127.0.0.1:5173/`
- Screenshot/artifact directory, not committed: `C:\Users\josht\AppData\Local\Temp\packbound-playtest-2026-07-02`
- Console state: Vite connect logs, React DevTools info, and one 404 resource load. No page JavaScript errors observed.

The in-app browser connector was attempted first, but its runtime failed on a filesystem permission error outside the repo. No permanent Playwright dependency was added to the project.

## Executive Summary

The app is demoable as an ugly systems demo: it loads, starter selection works, legal loadout actions mutate run state, deterministic combat records, rewards open, and rounds advance. The engine loop is clearly present.

The main blocker is comprehension. The UI exposes raw state, but it rarely explains why an action is legal, why an action is unavailable, what a card does, how Charge/Aspect requirements are being satisfied, or what happened in combat. A player can operate the loop by pressing visible buttons, but cannot make confident tactical decisions from the UI alone.

The next best work should not be polish or new mechanics. It should be a readable combat summary panel and a card inspection panel, followed by explicit next-action and legal-action explanations.

## Coverage

- Starters tested: `ember_scrappers`, `rotbloom_recall`, `cloudspire_phase`
- Rounds reached: each starter completed two combats and ended at round 2, phase `combatResolved`
- Encounters seen: `Ember Pressure Crew`, `Bloomhide Stomper`, `Ash Debt Collector`
- Reward packs opened:
  - `ember_scrappers`: Cloudspire Pack, then Ember Foundry Pack
  - `rotbloom_recall`: Rotbloom Pack, then Cloudspire Pack
  - `cloudspire_phase`: Rotbloom Pack, then Cloudspire Pack
- Cards moved or attempted:
  - `ember_scrappers`: returned Ember Scraprunner, placed Signal Nest, placed Cinder Scout, added Tide Source
  - `rotbloom_recall`: returned Hollow Caller, placed Sporeback Beast, placed Contract Husk, added Shade Binder to Spellrail
  - `cloudspire_phase`: returned Cloudgate Adept, placed Vanishing Warden, placed Mistwing Scout, added Ember-Shade Conduit
- Runs won/lost: no full run reached terminal won/lost state. Combat results varied by round; no starter died within two rounds.

Important coverage note: the playtest intentionally clicked `Return to Pool` on each starter's initial active unit, then used legal alternatives. These browser outcomes are therefore real UI outcomes, but not stock starter-kit baseline outcomes.

## Command Results

- `pnpm install`: pass, already up to date
- `pnpm format:check`: initial environment attempt failed because project scripts could not find `node`; rerun with bundled Node on PATH passed
- `pnpm lint`: pass
- `pnpm typecheck`: pass across `shared`, `content`, `rules`, `sim`, and `client`
- `pnpm test`: pass, 13 files / 140 tests
- `pnpm build`: pass, including Vite production build
- `pnpm balance:report`: pass
- `pnpm dev`: pass, Vite ready at `http://127.0.0.1:5173/`

## Balance Report Summary

Starter-vs-encounter smoke rows:

- `ember_scrappers` vs `early_ember_pressure`: draw, 0 player damage, 100ms, no warnings
- `ember_scrappers` vs `ledger_champion`: playerB wins, 1 player damage, no warnings
- `rotbloom_recall` vs `early_ember_pressure`: playerA wins, 0 player damage, no warnings
- `rotbloom_recall` vs `ledger_champion`: draw, no damage, boss used `sparkfall`, no warnings
- `cloudspire_phase` vs `early_ember_pressure`: playerB wins, 1 player damage, no warnings
- `cloudspire_phase` vs `ledger_champion`: playerB wins, 1 player damage, both sides used Techniques, no warnings

Pack usability looked healthy at a broad smoke-test level. Ember Foundry, Rotbloom, Cloudspire, and Source packs all opened recognizable archetype, role, and Source/fixing cards across fixed seeds. Source Pack was heavily Source-weighted: 25 Sources out of 30 opened cards.

Browser impressions diverged from balance report expectations because the playtest changed loadouts through visible legal actions. For example, stock `cloudspire_phase` looks fragile in the balance report, but the browser run won early fights after swapping into Vanishing Warden and Mistwing Scout. The UI did not explain why that change mattered.

## Browser Playthrough Notes By Starter

### ember_scrappers

- First impression: easiest starter to operate because it begins with a Unit, Source, Technique, and two visible pool cards.
- Loadout clarity: returning Ember Scraprunner was allowed and left the plan legal. Signal Nest and Cinder Scout became legal board plays, but Ember Scraprunner later showed `No legal action` with no reason.
- Combat clarity: round 1 preview showed useful event types: `TechniqueQueued`, `UnitSummoned`, `UnitAttacked`, `DamageDealt`, `UnitDestroyed`, `CombatEnded`. It was still raw JSON and used ids/defIds rather than player-facing prose.
- Reward clarity: Cloudspire Pack visibly added cards to the pool, but the UI only showed a seed string above the pool and did not mark which cards were new.
- Problems observed: support and ground cards shared `r0 c0` coordinates, which is legal but visually reads like overlap. Reward cards could not be used immediately after opening because the run was in `combatResolved`, not `planning`.
- Good signs: legal actions did prevent invalid moves; adding Tide Source in round 2 was clear enough mechanically from the button label.
- Suggested improvements: show board Charge capacity/use, Aspect access totals, card details, and legal-action reasons directly next to each card.

### rotbloom_recall

- First impression: mechanically distinct because it starts with Shade/Bloom Sources and no initial Spellrail card.
- Loadout clarity: the starter's Recall identity was not visible from the UI. Hollow Caller, Sporeback Beast, and Contract Husk names appeared, but no stats, triggers, or Ashes explanation appeared.
- Combat clarity: round 1 against Bloomhide Stomper produced 69 events, but the UI preview showed only early `CombatChargeGained` events before meaningful combat. That made the fight look like nothing was happening.
- Reward clarity: Rotbloom Pack added Shade Binder, Bloom Source, Contract Husk, Ember-Shade Conduit, Thicket Colossus, and Due Marker. Shade Binder had an `Add to Spellrail` action after advancing, but the UI did not explain what it would do.
- Problems observed: `No legal action` on high-impact cards such as Thicket Colossus and Due Marker did not explain whether the blocker was cost, type support, Aspect access, slot limit, or unimplemented card type.
- Good signs: adding Shade Binder to Spellrail worked and remained legal.
- Suggested improvements: add card inspection and legal-action explanations before adding more Recall/Ashes mechanics.

### cloudspire_phase

- First impression: strongest thematic promise because it begins with Tide/Gleam Sources and Phase Step, but the UI gives no explanation of Phase, Barrier, Airborne, or Anti-Air.
- Loadout clarity: Vanishing Warden initially had `No legal action`, then became legal after returning Cloudgate Adept, implying capacity or aspect pressure. The reason was not visible.
- Combat clarity: round 1 showed Barrier being consumed via `StatusRemoved` and a `DamageDealt` amount of 0. That is useful simulator data, but a player-facing summary should say the Barrier blocked the hit.
- Reward clarity: Rotbloom Pack gave off-plan cards. Ember-Shade Conduit could be added to Source Row and made the build broader, but the value of splashing was not explained.
- Problems observed: in round 2 `combatReady`, the `Latest Combat` header still displayed the previous combat's winner/event count while the JSON preview below belonged to the upcoming combat. This mixes old and new information.
- Good signs: Phase Step queued properly, Source Row additions worked, and the browser flow did not break.
- Suggested improvements: summarize Technique behavior and status changes in prose before building any visual replay.

## UI/UX Clarity Problems

Critical: none observed that fully blocked play.

High: `Latest Combat` mixes previous summary with current preview.

- Repro steps: record round 1, open a reward, advance to round 2, mark combat ready.
- Expected behavior: the combat panel clearly separates previous recorded combat from upcoming preview.
- Actual behavior: the header shows the previous winner/event count while the JSON preview belongs to the new combat.
- Suggested fix: split into `Last Recorded Combat` and `Upcoming Combat Preview`, or hide the previous summary while previewing.

High: card inspection is missing.

- Repro steps: inspect any board, pool, Source Row, or Spellrail card.
- Expected behavior: show name, type, Aspect, Charge cost, stats, keywords, rules text, and role-relevant metadata.
- Actual behavior: only name, zone/position, and action buttons are visible.
- Suggested fix: add a focused card inspection panel before more UI polish.

High: legal and illegal action reasons are mostly invisible.

- Repro steps: inspect cards labeled `No legal action` or disabled topbar buttons.
- Expected behavior: explain why the card/button cannot be used and what would make it legal.
- Actual behavior: `No legal action` has no reason; disabled buttons have no reason.
- Suggested fix: expose `LoadoutActionCheck.reason` style messages in the UI.

High: combat outcome is opaque.

- Repro steps: mark combat ready and read `Latest Combat`, then record combat.
- Expected behavior: see a human-readable result: winner, damage taken, key kills, Techniques used, status blocks, and why the fight ended.
- Actual behavior: raw JSON preview plus a terse winner/event count.
- Suggested fix: create a readable combat summary panel from the existing event log and outcome summary.

Medium: next action is not always obvious.

- Repro steps: after recording combat, after opening a reward, or after advancing.
- Expected behavior: the current phase tells the player what to do next.
- Actual behavior: phase is visible, but the required next action must be inferred from enabled buttons.
- Suggested fix: add a small phase helper such as `Open one reward pack` or `Advance to planning`.

Medium: reward impact is hard to see.

- Repro steps: open a reward pack.
- Expected behavior: show pack name, opened cards, and highlight new pool cards.
- Actual behavior: pool grows, but the only persistent clue is a long seed string.
- Suggested fix: show latest pack name and opened cards separately; mark newly opened cards until the next combat.

Medium: board layers are technically visible but not intuitive.

- Repro steps: place Signal Nest and Cinder Scout; both can occupy `r0 c0` on different layers.
- Expected behavior: clearly communicate ground/support layering.
- Actual behavior: same row/column reads like accidental overlap unless the player notices `support` versus `ground`.
- Suggested fix: group board cards by layer or render a small grid/layer label.

Low: missing resource produced a 404.

- Repro steps: load the app in the browser.
- Expected behavior: no console errors in the debug shell.
- Actual behavior: one `Failed to load resource: 404` console message.
- Suggested fix: add or ignore the missing favicon/static resource.

## Gameplay/System Problems

Starter kits are meaningfully different in data: Ember has early pressure plus a Technique, Rotbloom has Shade/Bloom setup, and Cloudspire has Phase/Barrier/Tide/Gleam identity. The UI does not yet teach those differences.

Packs create options mechanically, but not decisions visually. The player sees new names and legal buttons, not why a card is useful, off-plan, expensive, or synergistic.

Source Row and Charge are not understandable from the UI. Source cards are listed, but total capacity, spent capacity, Aspect access, and combat Charge generation are not summarized.

Cards are too hard to evaluate. A player cannot see stats, costs, keywords, or rules text, so choices like Tide Source versus Cracked Prism, Shade Binder versus Contract Husk, or Vanishing Warden versus Cloudgate Adept are guesswork.

Rewards can be useful, but the app does not distinguish useful from unplayable. `No legal action` may indicate a temporary resource issue, an unsupported card type, a full slot, or an impossible card; the player cannot tell.

Encounters are readable at the name/opponent-board level, but not at the threat level. Difficulty is shown, yet there is no preview of enemy stats, Techniques, or why an elite is dangerous.

Combat feels fair only if the player trusts the engine. The event log contains enough structured facts for a tool to explain the fight, but the UI does not yet translate those facts.

## Combat Log / Outcome Readability

The current log is developer-readable, not player-readable. It includes useful event types and ids, but it is shown as raw JSON. Card defIds such as `phase_step` and `ember_scraprunner` are understandable to developers but should be displayed as card names.

Damage sources are present in event metadata, but a player has to parse `sourceDefId`, `targetDefId`, `damageType`, and `amount`. Destroyed units are present through `UnitDestroyed` events, but there is no short kill list. Techniques are visible through `TechniqueQueued` and sometimes later `TechniqueUsed`, but the UI does not explain trigger timing or effect.

The 28-event preview limit can hide the first meaningful action in slower fights. Rotbloom round 1 displayed only combat Charge ticks in the visible preview even though the final combat had 69 events.

Before a visual replay exists, the UI needs at minimum: winner, player damage, enemy damage, Techniques used, units destroyed by side, important status changes, and warnings. Barrier consumption should read like `Barrier blocked Ember Scraprunner's attack`, not `StatusRemoved` plus `DamageDealt: 0`.

Representative browser combat rows:

- `ember_scrappers` vs Ember Pressure Crew: playerA won, damage 0/2, 11 events. Key preview events: `TechniqueQueued`, `UnitSummoned`, `UnitAttacked`, `DamageDealt`, `UnitDestroyed`, `CombatEnded`.
- `rotbloom_recall` vs Bloomhide Stomper: playerA won, damage 0/2, 69 events. Visible preview mostly showed `CombatChargeGained`, hiding the useful part of the fight.
- `cloudspire_phase` vs Ember Pressure Crew: playerA won, damage 0/2, 33 events. Key preview events included `TechniqueQueued`, `StatusRemoved`, and `DamageDealt`, but the Barrier story was not stated in prose.

## Card Inspection Needs

The UI should show:

- name
- type
- Aspect
- Charge cost
- stats
- keywords
- rules text
- role/archetype metadata if useful
- legal action reason
- why card cannot be played

This should be available for pool, board, Source Row, Spellrail, reward cards, and enemy board cards.

## Recommended Next Tasks

1. Readable combat summary panel
   - Why it matters: combat is currently the most opaque part of the loop.
   - Suggested scope: summarize winner, damage, Techniques used, units destroyed, status blocks, warnings, and the final reason combat ended from existing result/event data.
   - What not to include: no animation system, no Pixi, no balance tuning.

2. Card inspection panel
   - Why it matters: the player cannot evaluate loadout or reward decisions.
   - Suggested scope: click or focus any card to show type, cost, Aspects, stats, keywords, text, and current zone.
   - What not to include: no drag-and-drop, no card art, no new card designs.

3. Next-action guidance / phase helper
   - Why it matters: players must infer the loop from enabled buttons.
   - Suggested scope: one small phase-aware line that says what action is next and why.
   - What not to include: no full tutorial, no onboarding flow, no UI polish pass.

4. Improved legal action explanations
   - Why it matters: `No legal action` blocks learning and causes wrong decisions.
   - Suggested scope: surface the first blocking reason for board, Source Row, Spellrail, and return actions.
   - What not to include: no new validation rules unless required to expose existing reasons.

5. Later: ally/enemy destroyed triggers
   - Why it matters: several archetype identities, especially Offering and Ashes, need destruction triggers to feel distinct.
   - Suggested scope: implement and test `OnAllyDestroyed` / `OnEnemyDestroyed` when the UI can explain them.
   - What not to include: no broad trigger-system refactor unless tests prove it is necessary.

6. Later: Playwright smoke test
   - Why it matters: the browser loop now has enough stable surface to prevent obvious regressions.
   - Suggested scope: start a run, mark ready, record combat, open a reward, advance, and assert no console errors except known static-resource misses.
   - What not to include: no brittle screenshots, no animation timing, no permanent browser dependency unless the project accepts it.

## Raw Observations Appendix

- Screenshot/artifact directory: `C:\Users\josht\AppData\Local\Temp\packbound-playtest-2026-07-02`
- Observation JSON: `C:\Users\josht\AppData\Local\Temp\packbound-playtest-2026-07-02\observations.json`
- Useful screenshots:
  - `ember_scrappers-initial-planning.png`
  - `rotbloom_recall-round-2-after-pool-action.png`
  - `cloudspire_phase-round-2-after-ready.png`

Abbreviated event snippets observed:

```txt
ember_scrappers round 1:
CombatStarted -> TechniqueQueued(sparkfall) -> UnitSummoned(signal_wisp_echo)
-> UnitAttacked(cinder_scout -> ember_scraprunner)
-> DamageDealt(attack) -> UnitDestroyed(ember_scraprunner)
-> DamageDealt(trigger) -> CombatEnded(playerA)
```

```txt
rotbloom_recall round 1 visible preview:
CombatStarted -> repeated CombatChargeGained events
Final summary still reported playerA win, damage 0/2, 69 events.
```

```txt
cloudspire_phase round 1:
CombatStarted -> TechniqueQueued(phase_step, sparkfall)
-> UnitAttacked(ember_scraprunner -> vanishing_warden)
-> StatusRemoved(Barrier, consumed)
-> DamageDealt(amount 0, attack)
```
