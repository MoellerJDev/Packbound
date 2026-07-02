# Packbound Playtest Report 2

## 1. Executive Summary

- The prototype is clearer than the previous playtest. The card inspector turns
  card names into evaluable game objects: type, zone, Aspect, cost, stats,
  rules text, design metadata, legal actions, and blocked reasons are now
  visible from the debug client.
- The card inspector is useful enough for internal playtesting. It is not final
  UX, but it is strong enough to support tactical evaluation and mechanic
  debugging.
- The combat summary is useful enough for internal playtesting. It clearly
  reports winner, damage, warnings, key attacks, destroyed units, Recall, Phase,
  and Barrier blocks without requiring raw JSON for normal reading.
- The next step can be a narrow mechanics pass. More clarity work is still
  valuable, but the UI now exposes enough cause-and-effect to implement and
  inspect `OnAllyDestroyed` / `OnEnemyDestroyed`.
- Top remaining blockers:
  1. Disabled topbar buttons and phase transitions still lack explicit next-step
     guidance.
  2. Reward cards are listed by name, but their immediate usability still
     requires manual inspection and comparison.
  3. Echo and unsupported card-type inspection could not be verified from the
     browser loop because those card instances were not directly exposed in the
     tested run states.

## 2. Environment And Commands

- Commit hash: `235c041687e151345be8f7a840fd442cf19b61fc`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell
  `5.1.26100.8655`
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Dev server URL: `http://127.0.0.1:5174/`
- Browser/tool used: Codex in-app Browser with its Playwright control surface
- Browser console logs: no console log entries returned during the session
- Screenshots committed: none

Commands run before browser playtest:

- `pnpm format:check`: pass
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 15 test files / 157 tests
- `pnpm build`: pass, including Vite production build
- `pnpm balance:report`: pass
- `pnpm dev`: pass. Vite reported port `5173` in use and served the app at
  `http://127.0.0.1:5174/`.

Commands run after writing this report:

- `pnpm format:check`: initial fail on `PLAYTEST_REPORT_2.md`
- `pnpm exec prettier --write PLAYTEST_REPORT_2.md`: pass
- `pnpm format:check`: pass

Balance report highlights were unchanged in kind from the previous confidence
pass: no warnings, starter-vs-encounter rows completed, boss rows remained
dangerous, and pack usability listed recognizable archetype/source coverage.

## 3. Coverage

### `ember_scrappers`

- Rounds reached: round 2 planning
- Cards inspected: Ember Scraprunner, Ember Source, Sparkfall, Signal Nest,
  Cinder Scout
- Legal actions tried: placed Cinder Scout on board
- No-action case inspected: Signal Nest initially had no legal action because
  board Charge would exceed Source Row capacity
- Reward pack opened: Cloudspire Pack
- Reward cards inspected: Tide Source, Cracked Prism, Mistwing Scout
- New card used: Tide Source was added to Source Row in round 2
- Combat recorded: yes
- Notes: the inspector made the Signal Nest decision much clearer than before.
  It showed that the Relic was blocked by board Charge, not by Aspect.

### `rotbloom_recall`

- Rounds reached: round 2 planning
- Cards inspected: Hollow Caller, Shade Source, Bloom Source, Sporeback Beast,
  Contract Husk
- Legal actions tried: placed Sporeback Beast on board
- No-action case inspected: after opening rewards and advancing, Thicket
  Colossus and Due Marker showed Charge blockers
- Reward pack opened: Rotbloom Pack
- Reward cards inspected: Shade Binder, Bloom Source, Contract Husk
- New card used: Shade Binder was added to Spellrail in round 2
- Combat recorded: yes
- Notes: Recall is now readable in combat summary form. The summary line
  `You recalled Ember Scraprunner from Ashes` is a major improvement over raw
  event JSON.

### `cloudspire_phase`

- Rounds reached: round 2 planning
- Cards inspected: Cloudgate Adept, Tide Source, Gleam Source, Phase Step,
  Vanishing Warden, Mistwing Scout
- Legal actions tried: returned Cloudgate Adept to pool, then placed Vanishing
  Warden
- No-action case inspected: Vanishing Warden initially had no legal action
  because board Charge would exceed Source Row capacity
- Reward pack opened: Rotbloom Pack
- Reward cards inspected: Rootbrace Guardian, Shade Binder, Contract Husk
- New card used: Ember-Shade Conduit was added to Source Row in round 2
- Combat recorded: yes
- Notes: this was the best confusing-case test. Returning Cloudgate Adept made
  Vanishing Warden legal, and the inspector made the Charge reason explicit.

## 4. Card Inspector Evaluation

The inspector now shows enough information for most internal card evaluation:

- Name: yes
- Type: yes
- Zone: yes
- Aspect: yes
- Charge/cost: yes
- Stats: yes for Unit cards
- Source output: yes, including board Charge, Aspect access, and combat Charge
  rate
- Technique timing/cost/effect: yes
- Keywords: yes
- Rules text: yes
- Design role/archetypes: yes
- Legal actions: yes
- Blocked reasons: yes, when the card is truly blocked

Observed strengths:

- Signal Nest displayed Relic details, combat-start summon text, design role,
  and all three blocked reasons.
- Ember Source and Tide Source displayed Source Row value in plain language:
  board Charge, Aspect access, and combat Charge/sec.
- Sparkfall, Phase Step, and Shade Binder displayed Technique cost, trigger,
  effect, and target.
- Vanishing Warden made the high-cost blocker obvious before and after returning
  Cloudgate Adept.

Missing or confusing items:

- Severity: Medium
  - Where observed: all starters, topbar and card rows
  - Why it matters: card rows say `No legal action`, but the player must click
    Inspect to learn why. Disabled topbar buttons have no explanation.
  - Suggested improvement: add one compact row-level reason or tooltip for the
    most important blocked action, and add phase helper text near the topbar.

- Severity: Medium
  - Where observed: Source Row decisions
  - Why it matters: individual Source cards are clear, but total board Charge
    used/capacity and Aspect access totals are still not summarized in one
    place.
  - Suggested improvement: add a small Source Row summary such as
    `Board Charge 5 / 6; Aspects: Shade 1, Bloom 1`.

- Severity: Low
  - Where observed: Echo and unsupported type coverage
  - Why it matters: the inspector helper supports broad card definitions, but
    the browser run did not expose an Echo card instance or unsupported card
    type instance to inspect directly.
  - Suggested improvement: add a debug-only way to inspect generated Echoes or
    catalog definitions later, or include an Echo in a visible test scenario.

## 5. Loadout Decision Clarity

- Can you decide what to put on the board? Mostly yes. Costs, stats, roles, and
  legal actions make decisions substantially more understandable.
- Can you understand board Charge capacity? Yes after inspecting blocked cards,
  but not at a glance.
- Can you understand Aspect access? Yes for Sources and card costs, but totals
  are not summarized.
- Can you understand why high-cost cards are blocked? Yes. Signal Nest,
  Vanishing Warden, Thicket Colossus, and Due Marker all showed explicit
  `Board uses X Charge, but the Source Row provides Y` messages.
- Can you understand why unsupported types are blocked? Partly. The inspector
  clearly says non-Source cards are not Sources and non-Techniques are not
  Techniques. Unsupported schema types were not exposed in this browser run.
- Can you recover from making a bad loadout edit? Yes. Active board, Source Row,
  and Spellrail cards show `Return to Pool`, and the planning check stays
  visible.

## 6. Reward Pack Clarity

- Is it obvious which pack was opened? Yes. The Pool Cards panel shows
  `Latest pack: <pack name>`.
- Is it obvious which cards were newly added? Mostly. The latest pack summary
  lists names, and the new cards appear in the pool, but individual rows are not
  visually highlighted.
- Can you inspect newly opened cards easily? Yes. Every new pool row has
  Inspect.
- Can you tell which reward cards are immediately usable? Not immediately after
  opening, because the run is not in planning and new cards expose no legal
  action until advancing. After advancing, legal buttons appear.
- Do rewards feel like decisions or just new names in a pool? Closer to
  decisions, but still name-heavy. The inspector helps, but the player must
  inspect several cards manually to understand the pack impact.

Reward observations:

- Ember opened Cloudspire Pack and later used Tide Source.
- Rotbloom opened Rotbloom Pack and later used Shade Binder.
- Cloudspire opened Rotbloom Pack and later used Ember-Shade Conduit.

## 7. Combat Summary Evaluation

- Can you tell who won? Yes. Both preview and recorded panels show titles like
  `You win combat`.
- Can you tell how much damage the player took? Yes. `Damage to you` and
  `Damage to enemy` are visible.
- Can you tell which Techniques were used? Yes. Queued and used Technique lines
  are visible for Sparkfall and Phase Step.
- Can you tell which Units were destroyed? Yes. Destroyed-unit lines are shown.
- Can you understand Barrier blocks, Echo vanishing, Phase, or Recall when they
  occur? Barrier and Recall were clear in this session. Cloudspire showed
  `Barrier on Vanishing Warden blocked Ember Scraprunner`. Rotbloom showed
  `You recalled Ember Scraprunner from Ashes`. Echo vanishing and Phase-in/out
  were not prominent in the tested summaries, but the display helper has lines
  for those event types.
- Is raw JSON still needed during normal internal playtesting? No. Raw debug
  events are still useful for engineering, but the normal read is now the
  summary panel.

Representative observed combat rows:

- Ember: `You win combat`, damage to you `0`, damage to enemy `1`, 11 events,
  no warnings.
- Rotbloom: `You win combat`, damage to you `0`, damage to enemy `3`, 34
  events, no warnings. Recall was understandable.
- Cloudspire: `You win combat`, damage to you `0`, damage to enemy `1`, 43
  events, no warnings. Barrier blocking was understandable.

## 8. Remaining UX Issues

### Critical

None found. The browser prototype completed all three starter loops.

### High

Title: Next-action guidance is still implicit

- Severity: High
- Steps to reproduce: record combat, open a reward, or advance phases
- Observed behavior: the player infers next action from enabled buttons and
  phase labels
- Expected clearer behavior: a short phase line says what to do next and why
- Recommended fix: add phase-aware guidance near the topbar

### Medium

Title: Row-level no-action reasons require an extra click

- Severity: Medium
- Steps to reproduce: inspect Signal Nest, Vanishing Warden, Thicket Colossus,
  or Due Marker while their row says `No legal action`
- Observed behavior: the reason is available only after clicking Inspect
- Expected clearer behavior: the row or a tooltip previews the primary blocker
- Recommended fix: surface the first blocked reason inline for no-action cards

Title: Source Row totals are not summarized

- Severity: Medium
- Steps to reproduce: compare high-cost cards against available Sources
- Observed behavior: individual Source cards show output, but totals require
  mental math
- Expected clearer behavior: show board Charge used/capacity and Aspect access
  totals
- Recommended fix: add a small Source Row summary panel

Title: Reward cards are not visually marked in the pool

- Severity: Medium
- Steps to reproduce: open any reward pack
- Observed behavior: latest pack names are listed, but the pool rows themselves
  are not marked as new
- Expected clearer behavior: newly opened rows are highlighted until the next
  combat or next reward
- Recommended fix: add a `new` marker or temporary highlight to latest pack
  cards

### Low

Title: Echo and unsupported card-type inspection not directly covered

- Severity: Low
- Steps to reproduce: run the current three-starter browser loop
- Observed behavior: no direct Echo or unsupported type card instance appears
  for inspection
- Expected clearer behavior: internal playtest can inspect every schema-relevant
  display case
- Recommended fix: add a future debug catalog inspector or explicit fixture
  state, not new gameplay content just for this report

Title: Inspector formatting is dense

- Severity: Low
- Steps to reproduce: inspect cards with several metadata sections
- Observed behavior: information is complete but compact
- Expected clearer behavior: slightly more scannable grouping
- Recommended fix: defer until after the mechanics pass unless it blocks
  reading longer cards

## 9. Mechanics Readiness

The project is ready for a narrow next mechanic pass.

- Is it now reasonable to implement `OnAllyDestroyed` / `OnEnemyDestroyed`? Yes.
  The inspector already formats those trigger names, combat summaries already
  show destroyed units, and the debug loop can now explain affected cards well
  enough for internal validation.
- Would the UI be able to explain those triggers after the current clarity work?
  Mostly yes. Card text can show the trigger, and combat summary lines can show
  the destroyed unit. If the mechanic emits or reuses clear events when the
  triggered ability resolves, the current UI should be able to make it
  understandable.
- What must be fixed first, if anything? Nothing must block the simulator pass.
  The one useful companion task is to ensure tests and combat summaries make the
  trigger cause visible enough for debugging.

## 10. Recommended Next Tasks

### Do Next

`feat(sim): add ally destroyed triggers`

Keep it narrow: implement and test `OnAllyDestroyed` / `OnEnemyDestroyed` in the
simulator/rules layer, then verify the existing card inspector and combat
summary can explain the result. Do not add broad content or balance changes in
the same pass.

### Do Soon

1. `feat(client): add next-action guidance`
2. `feat(client): improve legal-action blocked reasons`
3. `feat(client): improve reward display`
4. Add focused combat-summary coverage for ally/enemy destroyed trigger lines
   once the mechanic exists

### Still Wait

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- visual combat replay

## 11. Raw Notes

- Browser playthrough was completed in the Codex in-app Browser at
  `http://127.0.0.1:5174/`.
- `5173` was already in use, so Vite selected `5174`.
- No screenshots were committed.
- The browser session completed all required starter coverage.
- The first automated note capture under-reported blocked reasons because of a
  capture-helper issue, so key no-action cases were rechecked directly in the
  browser inspector.

Abbreviated notes:

```txt
ember_scrappers:
- Initial: Ember Scraprunner / Ember Source / Sparkfall.
- Pool: Signal Nest, Cinder Scout.
- Inspected Signal Nest: no action because board would use 4 Charge with only 3 provided.
- Placed Cinder Scout.
- Preview and recorded combat both showed You win combat, 0 damage to you, no warnings.
- Opened Cloudspire Pack.
- Inspected Tide Source, Cracked Prism, Mistwing Scout.
- Advanced to round 2 and added Tide Source to Source Row.
```

```txt
rotbloom_recall:
- Initial: Hollow Caller / Shade Source / Bloom Source / no Spellrail.
- Pool: Sporeback Beast, Contract Husk.
- Placed Sporeback Beast.
- Combat summary showed Recall: Ember Scraprunner returned from Ashes.
- Opened Rotbloom Pack.
- Inspected Shade Binder, Bloom Source, Contract Husk.
- Advanced to round 2 and added Shade Binder to Spellrail.
- Rechecked Thicket Colossus and Due Marker as true no-action high-cost cards.
```

```txt
cloudspire_phase:
- Initial: Cloudgate Adept / Tide Source / Gleam Source / Phase Step.
- Pool: Vanishing Warden, Mistwing Scout.
- Vanishing Warden initially blocked by Charge: board would use 7, Sources provide 6.
- Returned Cloudgate Adept, then Vanishing Warden became legal and was placed.
- Combat summary showed Barrier blocking Ember Scraprunner.
- Opened Rotbloom Pack.
- Inspected Rootbrace Guardian, Shade Binder, Contract Husk.
- Advanced to round 2 and added Ember-Shade Conduit to Source Row.
```
