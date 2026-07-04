# Implemented Mechanics

This document tracks the current engine surface. It is not a design wishlist; it
is a snapshot of what the rules and simulator layers actually expose today.

## Implemented Command Zone Commander Prototype

The rules package now has a minimal, rules-first Commander lifecycle prototype.

- `RunState` can carry one `commander` object with a normal `CardInstance`, a
  `deployCount`, raw `rebindTax`, `rebindTaxDiscount`, and serializable upgrade
  history plus lifecycle history.
- The shared zone list includes `command`, and starter-created runs derive one
  prototype Commander from an existing starter Unit/Echo definition. This is
  prototype sourcing, not final Commander content.
- The Commander starts in Command Zone.
- During planning, `deployCommander` can place the Commander onto a legal board
  tile through the same planning validation used by normal board cards. A
  successful deploy creates a normal board placement, creates a board-zone
  active card, and increments `deployCount`.
- During planning, `returnCommanderToCommand` can remove the deployed Commander
  from board/active cards, return its card to Command Zone, and increment
  `rebindTax` by 1.
- When combat is recorded, a matching player Commander `UnitDestroyed` event
  returns the deployed Commander to Command Zone, removes it from board/active
  cards, increments `rebindTax` once, and preserves `deployCount`.
- Rebind Tax is enforced as generic Board Charge when the Commander is deployed
  or being deployed. It adds no Aspect requirements and does not alter the
  Commander's printed cost. Effective Rebind Tax is
  `max(0, rebindTax - rebindTaxDiscount)`.
- Reward-phase Commander upgrade choices are implemented as a separate bucket
  from pack rewards. The player can apply at most one Commander upgrade per
  reward round. `Combat Training` increases only the Commander card's
  `upgradeLevel` by 1, and `Rebind Calibration` adds 1 Rebind Tax discount for
  future deployments.
- Commander lifecycle history is stored as structured run-state metadata for
  creation, deployment, voluntary return, combat destruction-to-Command, and
  upgrade application. Each entry records round, phase, source, zone movement,
  deploy count, raw/effective Rebind Tax, discount, upgrade level deltas, and
  relevant destruction event metadata when present.
- The encounter shell can validate and queue one deployed-Commander action,
  `commander_rally` / `Commander Rally`, during first main or second main when
  the player has priority. This action is sourced from the deployed Commander
  and is once per encounter through match-local source lifecycle state.
- Encounter actions now use a minimal static cost/effect contract in the rules
  layer. The contract declares action kind, label, timing, source lifecycle,
  target requirement, costs, and match-local effects for the current prototype
  actions.
- Planning/reward Commander actions are replayable run actions, deterministic,
  immutable, and JSON-serializable. Commander Rally is deterministic and
  JSON-serializable as match-local encounter state.
- The debug client shows a Command Zone panel on the default route and
  renderer-lab, including Commander name, zone, deploy count, raw/effective
  Rebind Tax, discount, deploy cost, Board Charge after deploy, blocked
  reasons, Inspect, Deploy Commander, and Return to Command controls. It also
  shows a simple Commander Upgrades panel during reward flow and a compact
  newest-first Commander Lifecycle trail.

Current Commander prototype limitations:

- There are no authored Commander card definitions yet; the prototype reuses
  existing Unit/Echo definitions from starter context.
- Commander upgrades are mechanical placeholders only. There are no authored
  Commander cards, Signature Relics, encounter-phase Commander deploy/return
  actions, enemy Commanders, hand/deck/mill sourcing, counterspells, authored
  Commander effects, or enemy AI.
- Combat simulation remains unchanged. Commander destruction-to-Command is a
  run-progression replacement applied while recording combat results, not a
  simulator behavior change.
- Commander lifecycle history is an audit trail only. It does not yet drive
  quests, achievements, encounter actions, analytics export, or richer log
  filtering.

## Implemented Encounter Shell

The rules package now includes a minimal serializable encounter match reducer:

- Encounter action definitions are static, JSON-serializable contracts. Current
  contracts cover `debug_noop`, `debug_pressure`, `main_phase_pressure`, and
  `commander_rally`.
- Contract timing drives legality. Debug actions use `anyPriority`, while
  `Prototype Pressure Technique` and `Commander Rally` use main-phase timing.
- Contract costs currently support `none`, match-local Combat Charge payment,
  and source-used-on-resolve lifecycle. Combat Charge is paid on submission and
  source lifecycle is still recorded on resolution; neither path moves or
  consumes `RunState` cards.
- Encounter setup can build a serializable Combat Charge profile from the run's
  Source Row. It sums valid Source cards' `combatChargePerSecond`, rounds the
  total to four decimals, and uses `Math.ceil(total)` as starting match-local
  player Combat Charge.
- Contract targets currently support only no target or match-local Stability
  targets. The prototype pressure actions derive and store the opposing actor's
  Stability target when they are submitted.
- Contract effects currently support target-based match-local Stability deltas
  only. The two prototype real actions reduce their stored Stability target by 1.
- Encounters start in `firstMain` with the active actor holding priority.
- Empty-stack double passes advance `firstMain` to `combat`, `secondMain` to
  `end`, and `end` into the next turn.
- The active actor alternates on each new turn.
- Submitted actions enter a LIFO action stack and pass priority to the opponent.
- Encounter match state tracks `playerCombatCharge`, `enemyCombatCharge`, and
  serializable cost payment events.
- Priority Lab initializes player Combat Charge from the Source Row-derived
  profile. Its extra charge for exercising both current paid actions is an
  explicitly labeled lab-only debug top-up, not hidden rules behavior.
- `main_phase_pressure` is the first real encounter main-phase action skeleton:
  the Priority Lab labels it `Prototype Pressure Technique`, it is legal during
  first main or second main priority, pays 1 match-local Combat Charge when
  queued, and deterministically reduces the stored opposing Stability target by
  1 when it resolves.
- `commander_rally` is the first Commander-sourced encounter action skeleton:
  the Priority Lab labels it `Commander Rally`, validates that the run player's
  Commander is deployed on the board, queues it through the same stack/pass flow,
  pays 1 match-local Combat Charge when queued, resolves against the stored enemy
  Stability target for -1, and records its source as used when resolved.
- Queued encounter actions can optionally carry minimal source-card context:
  `cardInstanceId`, `cardDefId`, `cardName`, and `zone`. Priority Lab currently
  submits the prototype action through a rules helper that validates the source
  is a run-owned player card in Spellrail, has a known definition, and is a
  Technique. `Prototype Pressure Technique` marks that source as
  `usedOnResolve`; when the stack item resolves, the match records a
  serializable source lifecycle event and prevents that same source from being
  queued again during the encounter. This still does not consume, move, exhaust,
  or otherwise mutate that source in `RunState`.
- Queued encounter actions can also carry minimal target context. Current
  submitted pressure actions store a JSON-serializable Stability target such as
  `Enemy Stability` or `Player Stability`; resolution validates and applies
  effects through that stored target metadata.
- Debug placeholder actions still exist for reducer diagnostics and backward
  compatibility with focused tests.
- Two consecutive passes with a non-empty stack resolve the top action and
  return priority to the active actor.
- The combat phase records one deterministic skirmish from a combat-result-like
  payload, stores a compact skirmish record, applies stability pressure, and
  advances to `secondMain` unless stability reaches zero.
- Encounter state, stack items, action logs, skirmish records, and outcomes are
  plain JSON-serializable data.

Current encounter shell limitations:

- Only two abstract prototype main-phase actions exist: one Spellrail Technique
  source and one deployed Commander source. Their sources are validated against
  the current player run and catalog and record match-local lifecycle events,
  but they are not connected to hand, deck, mill, enemy AI, RunState zone
  changes, target selection UI, or content-authored card effects yet.
- The action contract is not a full authored effect engine. It has no Combat
  Charge refunds, real-time generation, Source exhaustion, cross-encounter
  persistence, arbitrary unit/board/card targeting, effect graphs, interrupts,
  or RunState mutation hooks.
- There are no real card timing windows, counterspells, manual blockers, hidden
  intent choices, deck/hand/mill zones, multiplayer networking, backend
  persistence, or new cards attached to this shell yet.
- Combat skirmishes still use the existing deterministic simulator and do not
  add randomness or real-time player input.

## Implemented Effects

- `DealDamage`
- `Heal`
- `ModifyStats`
- `ApplyStatus`
- `RemoveStatus`
- `GrantKeyword`
- `RemoveKeyword`
- `SummonEcho`
- `SummonUnit`
- `Offer`
- `Destroy`
- `Phase`
- `Recall`
- `GainCombatCharge`
- `DrainCombatCharge`

## Schema-Reserved Effects

These parse as valid content and currently emit explicit `UNIMPLEMENTED_EFFECT`
simulator warnings if resolved:

- `SendToVoid`
- `ReturnFromVoid`
- `MoveUnit`
- `Attach`
- `Detach`
- `CopyTechnique`
- `InterruptTechnique`
- `MillToAshes`

## Implemented Triggers

Ability triggers currently resolved by the simulator:

- `OnEntry`
- `OnCombatStart`
- `OnDestroyed`
- `OnAllyDestroyed`
- `OnEnemyDestroyed`
- `WhenFirstAllyDestroyed`
- `WhenFirstEnemyDestroyed`

Destroyed-unit trigger behavior:

- `OnDestroyed` resolves for the destroyed Unit/Echo itself.
- `OnAllyDestroyed` resolves for surviving allied Unit/Echo sources and allied
  Relic/Field permanents after another allied Unit/Echo is destroyed. It
  excludes the destroyed source's own destruction.
- `OnEnemyDestroyed` resolves for surviving enemy Unit/Echo sources and enemy
  Relic/Field permanents when an opposing Unit/Echo is destroyed.
- `WhenFirstAllyDestroyed` and `WhenFirstEnemyDestroyed` are tracked once per
  source card instance per combat, not once per side.
- Echo destruction counts for ally/enemy destroyed triggers and
  destroyed-this-combat conditions, but Echoes still do not enter Ashes.
- `AllyDestroyedThisCombat` and `EnemyDestroyedThisCombat` use real
  destroyed-unit tracking from the source side's perspective.
- Destroyed-trigger ability resolutions emit `AbilityTriggered` combat events
  with source card metadata and the destroyed Unit/Echo that caused the trigger.

Technique triggers currently resolved by the simulator:

- `AfterSeconds`
- `WhenCombatChargeAtLeast`
- `WhenFirstAllyBelowHealthPercent`

## Schema-Reserved Triggers

These are available in content schemas but are not yet wired into the combat
loop:

- `OnCombatEnd`
- `OnLeaveBoard`
- `OnOffered`
- `OnSummoned`
- `OnTechniqueUsed`
- `OnTakeDamage`
- `OnDealDamage`
- `OnAttack`
- `OnKill`
- `OnCombatChargeGained`
- `WhenFirstEnemyUsesTechnique`

## Known Simulator Limitations

- Attack, health, attack speed, board distance, Guard, Barrier, Quickstart,
  Airborne, AntiAir, support-layer trigger positions, odd-r hex range,
  neighboring-hex movement, and Technique combat Charge affect combat today.
- Range is enforced for basic attacks as maximum hex distance on the odd-r
  offset board.
- Basic movement is implemented as deterministic one-hex ground movement toward
  the selected target when a Unit or Echo is ready to attack but out of range.
  Occupied ground cells block movement, while support and terrain layers do not.
- Movement is grid-based engagement only, not full pathfinding, obstacle
  routing, collision physics, or an ability-card movement system.
- Pierce, Airborne, and AntiAir are only partially represented through targeting.
- Phase uses scheduled return events, but phased-out units do not count as active
  units while gone.
- Recall restores the first valid Unit/Echo in Ashes by deterministic order.
- Technique interruption and copying are schema-reserved only.
- Relics and Fields can provide triggered abilities, but persistent modifier
  systems are still minimal.
- Position-based ability targeting can use either a Unit source position or a
  Relic/Field permanent placement position.
- Combat warnings are intentionally emitted for schema-valid unsupported effects.
