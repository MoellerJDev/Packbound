# Card Design Guide

Packbound card design starts from the engine: every card should be a declarative
combination of card type, Aspect, cost, tags, triggers, targets, and effects.
If a card needs custom simulator code, it is a sign that the mechanic should be
implemented as a reusable rule first.

## Design Principles

- Prefer one clear ability per common.
- Commons should teach archetypes through simple bodies, clear Techniques, and
  visible keywords.
- Uncommons should connect archetypes or add timing texture.
- Rares should be build-arounds, payoffs, or unusually efficient answers.
- Keep rules text short and Packbound-native. Avoid legalistic wording.
- Do not use schema-reserved effects, interrupts, attachments, movement, or
  persistent modifier designs in playable content until the simulator implements
  and tests them.
- Avoid copying MTG names, templating, and card concepts too directly. Familiar
  strategy is fine; Packbound cards should sound like Packbound.

## Aspect Identities

- `Ember`: pressure, cheap tempo, Relics, death sparks, direct damage, and fast
  combat Charge.
- `Shade`: Ashes, Recall, Offer, disposable Units and Echoes, grind, and
  sacrifice-adjacent tension.
- `Bloom`: high-health Units, Guard, growth, healing, sustain, and board
  stabilization.
- `Tide`: Phase, timing, reposition-ready design, Airborne pressure, and
  responsive Techniques.
- `Gleam`: Barrier, protection, AntiAir, support Relics, and clean defensive
  tools.

## Card Type Roles

- `Unit`: Main combat body. Uses stats, keywords, and occasional entry or death
  triggers.
- `Technique`: Combat Charge spell on the Spellrail. Best for delayed damage,
  Phase, Recall, healing, and simple stat boosts.
- `Relic`: Support-board permanent with triggered abilities. Best for engines
  and build-around payoffs.
- `Gear`: Schema-known attachment card. Keep peripheral until Attach/Detach are
  implemented.
- `Field`: Schema-known battlefield modifier. Keep peripheral until persistent
  field behavior is implemented.
- `Source`: Planning card that grants board Charge capacity, Aspect access, and
  combat Charge rate.
- `Formation`: Schema-known build constraint. Keep peripheral until formation
  rules are implemented.
- `Echo`: Temporary Unit-like card. Echoes can fight, but destroyed Echoes do not
  enter Ashes.

## Complexity Budget

- Complexity `1`: Common teaching card. One keyword, one simple trigger, or pure
  stats.
- Complexity `2`: Uncommon connector. Timing, conditional targeting, or
  archetype bridge.
- Complexity `3`: Build-around or risky rare/uncommon. Use sparingly and add
  tests when it exercises a newer mechanic.

## Rules Text Style

- Use Packbound terms: Charge, Aspect, Unit, Technique, Relic, Gear, Field,
  Source, Echo, Ashes, Void, Phase, Recall, and Offer.
- Prefer natural sentences over legal templates.
- Name the timing first: "On entry", "At combat start", or "When destroyed".
- Mention simulator-visible behavior only. Do not promise UI treatment,
  animation, hidden choices, or unimplemented interrupts.

## Mechanics Today

Implemented effects include damage, healing, stat modification, status and
keyword changes, Echo/Unit summoning, Offer, Destroy, Phase, Recall, and combat
Charge gain/drain.

Implemented ability triggers are `OnEntry`, `OnCombatStart`, `OnDestroyed`,
`OnAllyDestroyed`, `OnEnemyDestroyed`, `WhenFirstAllyDestroyed`, and
`WhenFirstEnemyDestroyed`. `OnAllyDestroyed` excludes the destroyed source's own
destruction; first-destroyed triggers are once per source card instance per
combat. Destroyed Echoes count for these triggers but still do not enter Ashes.

Implemented Technique triggers are `AfterSeconds`, `WhenCombatChargeAtLeast`,
and `WhenFirstAllyBelowHealthPercent`.

Schema-reserved mechanics such as CopyTechnique, InterruptTechnique, Attach,
Detach, MoveUnit, MillToAshes, SendToVoid, and ReturnFromVoid should stay out of
playable content until implemented and tested. See `IMPLEMENTED_MECHANICS.md`
for the exact current simulator surface.

## Engine Support Rule

Before designing a new mechanic-heavy card, ask:

- Can this be expressed with existing trigger, condition, target, and effect
  types?
- Would another card want this same mechanic later?
- Can the behavior be serialized, replayed, and tested without React?
- Does deterministic combat produce a clear event log and warning path?

If the answer is no, implement the simulator/rules mechanic first with focused
tests, then add cards that use it.
