# Implemented Mechanics

This document tracks the current engine surface. It is not a design wishlist; it
is a snapshot of what the rules and simulator layers actually expose today.

## Implemented Encounter Shell

The rules package now includes a minimal serializable encounter match reducer:

- Encounters start in `firstMain` with the active actor holding priority.
- Empty-stack double passes advance `firstMain` to `combat`, `secondMain` to
  `end`, and `end` into the next turn.
- The active actor alternates on each new turn.
- Submitted actions enter a LIFO action stack and pass priority to the opponent.
- `main_phase_pressure` is the first real encounter main-phase action skeleton:
  the Priority Lab labels it `Prototype Pressure Technique`, it is legal during
  first main or second main priority, and it deterministically reduces the
  opposing actor's stability by 1 when it resolves.
- Queued encounter actions can optionally carry minimal source-card context:
  `cardInstanceId`, `cardDefId`, `cardName`, and `zone`. Priority Lab currently
  submits the prototype action through a rules helper that validates the source
  is a run-owned player card in Spellrail, has a known definition, and is a
  Technique. Queuing still does not consume, move, exhaust, or otherwise mutate
  that source.
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

- Only one abstract prototype card action exists. Its source is validated
  against the current player run and catalog, but it is not connected to hand,
  deck, mill, enemy AI, costs, lifecycle changes, or content-authored card
  effects yet.
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
