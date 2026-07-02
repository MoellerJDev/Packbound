# Implemented Mechanics

This document tracks the current engine surface. It is not a design wishlist; it
is a snapshot of what the simulator actually resolves today.

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
- `OnAllyDestroyed`
- `OnEnemyDestroyed`
- `OnSummoned`
- `OnTechniqueUsed`
- `OnTakeDamage`
- `OnDealDamage`
- `OnAttack`
- `OnKill`
- `OnCombatChargeGained`
- `WhenFirstAllyDestroyed`
- `WhenFirstEnemyDestroyed`
- `WhenFirstEnemyUsesTechnique`

## Known Simulator Limitations

- Movement/pathing is not implemented; units attack from their submitted tiles.
- Pierce, Airborne, and AntiAir are only partially represented through targeting.
- Phase uses scheduled return events, but phased-out units do not count as active
  units while gone.
- Recall restores the first valid Unit/Echo in Ashes by deterministic order.
- Technique interruption and copying are schema-reserved only.
- Relics and Fields can provide triggered abilities, but persistent modifier
  systems are still minimal.
- Combat warnings are intentionally emitted for schema-valid unsupported effects.
