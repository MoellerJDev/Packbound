# Packbound Technical Architecture

## Purpose of This Document

This document defines the initial code architecture for **Packbound**, a browser-based pack-opening tactical autobattler roguelite.

It is meant to sit at the root of the repo and guide Codex or any other coding agent during development.

For gameplay goals, mechanics, terminology, archetypes, and design direction, see `GAMEPLAY_DESIGN.md`.

## Architecture Goal

Build Packbound as a deterministic rules engine first and a visual game second.

The game should initially ship as singleplayer, but the architecture should support future multiplayer without a rewrite.

The core architectural requirements are:

1. Deterministic simulation
2. Data-driven cards and packs
3. Pure rules packages independent of rendering
4. Serializable run state
5. Event-log-based combat replay
6. Strong unit tests
7. Browser-first client
8. Multiplayer-capable server boundary later
9. Original Packbound terminology in code and content

## Recommended Tech Stack

Use a TypeScript monorepo.

Recommended tools:

- TypeScript
- pnpm workspaces
- Vite
- React
- PixiJS
- Vitest
- Zod
- Node.js server later
- Colyseus later for multiplayer rooms
- PostgreSQL later for accounts, run history, ghost boards, and leaderboards

Do not start with live multiplayer.

Do not start with real 3D.

Do not put gameplay rules inside React or Pixi components.

## Repository Structure

Create this structure:

```txt
apps/
  client/
  server/
  tools/

packages/
  shared/
  content/
  rules/
  sim/
```

### `apps/client`

Browser game client.

Responsibilities:

- Main menu
- Run UI
- Pack opening UI
- Pool/binder UI
- Board builder UI
- Tooltips
- Validation display
- Combat replay display
- Pixi battlefield renderer
- Debug views

The client may call `packages/rules` and `packages/sim`, but it must not duplicate gameplay logic.
The default route now uses Pixi as the primary battlefield presentation while
keeping the React/CSS Hex Arena as a collapsed debug fallback. Pixi receives
rules-derived board summaries, engagement preview markers, and placeable-cell
affordances; it does not decide placement legality or combat outcomes. The
React/CSS fallback still visualizes discrete board positions and layers with
inspectable fixed-size hex tokens for debugging. Ally and Enemy Inspectors render
stat and combat-model facts from rules/simulator helper data, including selected
Unit/Echo engagement previews. Range, selected, target, attack-now,
out-of-range, blocked, and next-move markers remain debug visualization states,
not simulation state.

### `apps/server`

Future authoritative game server.

Initial implementation may be omitted or minimal.

Future responsibilities:

- Create runs
- Store run snapshots
- Validate submitted actions
- Simulate combat authoritatively
- Return combat event logs
- Serve ghost boards
- Support co-op or live rooms

### `apps/tools`

Developer tools.

Possible future responsibilities:

- Card database viewer
- Pack simulator
- Balance simulator
- Combat replay viewer
- Content validation CLI
- Board test-case editor

### `packages/shared`

Shared types and helpers.

Should contain:

- ID types
- enums
- branded types
- serialized state types
- event log types
- deterministic RNG types
- constants shared across packages

This package should not know about React, Pixi, or Node server details.

### `packages/content`

Raw game content and content validation.

Should contain:

- Card definitions
- Pack definitions
- Set definitions
- Teamup definitions
- Keyword definitions
- Starter kit definitions
- Enemy definitions
- Boss definitions later
- Zod schemas for content
- Content loader

All content should be validated at load/build/test time.

### `packages/rules`

Non-combat game rules.

Responsibilities:

- Pack generation
- Pack collation
- Run reward generation
- Run progression
- Board legality validation
- Source Row validation
- Spellrail validation
- Teamup calculation
- Upgrade/fusion rules
- Encounter match phase, priority, stack, and stability rules
- Starter kit creation
- Enemy board generation later

This package may depend on `shared` and `content`.

It should not depend on React, Pixi, or browser APIs.

Current upgrade rules live entirely in this package. They are replayable
RunActions that combine eligible pool card instances deterministically without
mutating card definitions.

Current engagement preview rules also live in this package. The helper is pure
and serializable, reuses shared odd-r hex topology and simulator-compatible
targeting/movement ordering, and returns only UI-facing range cells, likely
target, next step, blocked movement, and explanation data without changing
simulation behavior. Debug scenarios may seed showcase boards such as
`?scenario=engagement-lab`, but they still use existing cards and normal combat
resolution.

Current encounter match rules also live in this package. `createEncounterMatch`,
`submitEncounterAction`, `passEncounterPriority`, `advanceEncounterPhase`, and
`recordEncounterCombatSkirmish` are pure reducers over serializable state. The
match shell owns first main, combat, second main, end, next-turn advancement,
alternating active actors, alternating priority, a LIFO action stack, action log,
skirmish records, and stability-based outcomes. It accepts a combat-result-like
object for combat skirmishes instead of importing `packages/sim`, preserving the
one-way package boundary.

Run-sourced encounter action helpers bridge current run state into match-local
stack submission without giving the match reducer ownership of `RunState`.
`submitPrototypePressureActionFromRun` validates a Spellrail Technique source,
and `submitCommanderRallyActionFromRun` validates the run player's deployed
Commander source. Once queued, resolution remains pure `EncounterMatchState`
work: source context, resolved target metadata, Stability changes, board-card
effect events, and source lifecycle events are match-local and do not move cards,
alter Commander lifecycle history, or mutate run zones. Board-card target helpers
separately read the run or encounter board plus catalog, then submit a serialized
snapshot with side, card instance id, definition id, owner id, position, and
label.

Encounter resource setup is a separate rules-layer bridge. It reads the
`RunState` Source Row plus catalog, sums valid Source cards'
`combatChargePerSecond`, returns a serializable resource profile, and lets the
client or future encounter setup pass `startingCombatCharge` into
`createEncounterMatch`. The match reducer still stores only match-local Combat
Charge and does not import `RunState` or content catalog data.

Encounter action definitions live as static rules-layer contracts. They declare
action kind, label, timing, source lifecycle, target requirement, costs, and
effects for the current prototype actions. Combat Charge costs are paid from
match-local actor charge on submission and recorded as serializable cost payment
events. Source-used-on-resolve remains a separate resolution-time lifecycle
event. Effects currently mutate only match-local Stability through stored target
metadata or append match-local board-card effect events. `Target Probe` validates
and logs a board-card target, then records a serializable `probed` mark event for
that target. The contract registry is deliberately not an authored card-effect
engine, does not exhaust or refund Source Row charge, does not apply board-card
damage or real statuses, and does not mutate `RunState`.

### `packages/sim`

Pure deterministic combat simulator.

Responsibilities:

- Combat state initialization
- Unit attack and movement logic
- Target selection
- Technique trigger resolution
- Relic trigger resolution
- status ticking
- damage and death processing
- Ashes/Void zone changes during combat
- teamup effects during combat
- event log generation

This package must be deterministic and heavily tested.

No React.
No Pixi.
No DOM.
No animation code.
No unseeded randomness.

Current simulator stat audit: attack determines basic-attack damage, health
determines survival, attack speed feeds the attack timer, board distance affects
target priority, Guard and AntiAir can override target choice, Airborne changes
target sorting, Barrier blocks one damage instance, and Quickstart starts the
first attack timer ready. Range is enforced as maximum odd-r hex distance for
basic attacks. When a ready Unit or Echo has no selected target in range, it
attempts one deterministic neighboring ground-hex step toward that target and
emits a `UnitMoved` event. Movement remains discrete simulation state; it has no
physics, renderer, Pixi, canvas, server, or real-3D dependency.

## Core Rule: Simulation Does Not Render

Combat should be resolved as a pure function:

```ts
const result = resolveCombat({
  playerA,
  playerB,
  seed,
  rulesVersion
});
```

The result should include:

```ts
type CombatResult = {
  winner: PlayerSide | "draw";
  damageToPlayerA: number;
  damageToPlayerB: number;
  finalState: CombatState;
  events: CombatEvent[];
  warnings: SimulationWarning[];
};
```

The client should replay `events` visually.

The renderer may interpolate, animate, shake, glow, rotate, and add particles, but none of that changes rules.

## Determinism Requirements

The same input state and same seed must always produce the same output event log.

Required practices:

- Use a seeded RNG object.
- Never call `Math.random()` in gameplay code.
- Use stable sort order when resolving simultaneous events.
- Give every entity a deterministic instance ID.
- Avoid frame-rate-dependent logic.
- Use fixed timestep simulation.
- Keep floating point usage minimal and deterministic.
- Store rules version in run/combat state.

Example deterministic test:

```ts
it("resolves the same board the same way for the same seed", () => {
  const a = resolveCombat(testCombatInput, "seed-1");
  const b = resolveCombat(testCombatInput, "seed-1");
  expect(b.events).toEqual(a.events);
  expect(b.winner).toEqual(a.winner);
});
```

## Naming and IP Safety in Code

Use Packbound terminology in code and content.

Prefer:

- Charge
- Aspect
- Unit
- Technique
- Relic
- Gear
- Field
- Source
- Ashes
- Void
- Phase
- Recall
- Offer
- Echo
- Airborne
- AntiAir
- Pierce
- Quickstart
- Siphon
- Bane
- Aegis
- Guard
- Barrier

Avoid naming core systems after any one existing trading card game.

Do not add card names, ability names, keyword names, or rules text copied from existing games.

If comments need analogy, use a short comment such as:

```ts
// Similar strategic role to graveyard recursion, but implemented as Packbound Ashes/Recall.
```

Do not put copied card text or protected names in fixtures or tests.

## Domain Model

### IDs

Use explicit ID types.

```ts
type CardDefId = string;
type CardInstanceId = string;
type UnitInstanceId = string;
type PlayerId = string;
type RunId = string;
type CombatId = string;
```

Optional later: use branded TypeScript types.

### Aspects

```ts
type Aspect = "Ember" | "Shade" | "Bloom" | "Tide" | "Gleam";
```

### Rarity

```ts
type Rarity = "common" | "uncommon" | "rare" | "mythic";
```

### Card Types

```ts
type CardType =
  "Unit" | "Technique" | "Relic" | "Gear" | "Field" | "Source" | "Formation" | "Echo";
```

### Zones

```ts
type Zone =
  | "pack"
  | "pool"
  | "bench"
  | "board"
  | "spellrail"
  | "sourceRow"
  | "ashes"
  | "void"
  | "removed";
```

### Board Layers

```ts
type BoardLayer = "ground" | "air" | "support" | "terrain";
```

MVP should implement `ground` and `support`.

Keep `air` and `terrain` in types so the architecture is ready for future mechanics.

### Board Position

```ts
type BoardPosition = {
  row: number;
  col: number;
  layer: BoardLayer;
};
```

### Board Slot

```ts
type BoardSlot = {
  ground?: UnitInstanceId;
  air?: UnitInstanceId;
  support?: PermanentInstanceId;
  terrain?: TerrainInstanceId;
};
```

Use rectangular row/column storage for MVP, interpreted as an odd-r offset hex
board for distance, adjacency, movement, and rendering offsets.

Recommended constants:

```ts
const BOARD_ROWS = 4;
const BOARD_COLS = 7;
```

## Card Definition Schema

Card definitions should be data-driven.

Use JSON or YAML content validated by Zod.

Example Unit:

```json
{
  "id": "ember_scraprunner",
  "name": "Ember Scraprunner",
  "set": "ember_foundry",
  "rarity": "common",
  "cardType": "Unit",
  "aspects": ["Ember"],
  "cost": {
    "generic": 1,
    "aspect": {
      "Ember": 1
    }
  },
  "tags": ["Scrapper", "Tinkerer"],
  "stats": {
    "attack": 2,
    "health": 1,
    "attackSpeed": 1.2,
    "range": 1
  },
  "keywords": ["Quickstart"],
  "abilities": [
    {
      "trigger": { "type": "OnDestroyed" },
      "condition": { "type": "Always" },
      "target": { "type": "NearestEnemy" },
      "effect": { "type": "DealDamage", "amount": 1 }
    }
  ]
}
```

Example Technique:

```json
{
  "id": "phase_step",
  "name": "Phase Step",
  "set": "cloudspire",
  "rarity": "common",
  "cardType": "Technique",
  "aspects": ["Tide"],
  "cost": {
    "generic": 1,
    "aspect": {
      "Tide": 1
    }
  },
  "technique": {
    "combatChargeCost": 3,
    "trigger": {
      "type": "WhenFirstAllyBelowHealthPercent",
      "percent": 40
    },
    "target": {
      "type": "LowestHealthAlliedUnit"
    },
    "effect": {
      "type": "Phase",
      "returnTiming": "AfterDelay",
      "delayMs": 1000,
      "clearNegativeStatuses": true,
      "retriggerEntryEffects": true
    }
  }
}
```

Example Source:

```json
{
  "id": "ember_source",
  "name": "Ember Source",
  "set": "core_sources",
  "rarity": "common",
  "cardType": "Source",
  "source": {
    "boardChargeCapacity": 1,
    "aspectAccess": ["Ember"],
    "combatChargePerSecond": 0.25
  }
}
```

## Card Instances

Definitions are static. Instances represent actual cards in a run.

```ts
type CardInstance = {
  instanceId: CardInstanceId;
  defId: CardDefId;
  ownerId: PlayerId;
  zone: Zone;
  modifiers: CardModifier[];
  upgradeLevel: number;
  createdBy?: CardInstanceId;
  isEcho?: boolean;
};
```

A card instance should preserve identity as it moves between zones unless a rule explicitly creates a new instance.

## Runtime Unit Instances

A Unit on the board should have runtime state.

```ts
type UnitInstance = {
  unitId: UnitInstanceId;
  cardInstanceId: CardInstanceId;
  ownerId: PlayerId;
  position: BoardPosition;
  attack: number;
  maxHealth: number;
  currentHealth: number;
  attackSpeed: number;
  range: number;
  keywords: Keyword[];
  statuses: ActiveStatus[];
  attachments: CardInstanceId[];
  attackTimerMs: number;
  summonedThisCombat: boolean;
};
```

Do not mutate card definitions during combat. Runtime modifications apply to instances.

## Run State

Run state must be serializable.

```ts
type RunState = {
  runId: RunId;
  seed: string;
  rulesVersion: string;
  round: number;
  playerHealth: number;
  gold: number;
  pool: CardInstance[];
  bench: CardInstance[];
  board: BoardState;
  spellrail: SpellrailState;
  sourceRow: SourceRowState;
  ashes: CardInstance[];
  void: CardInstance[];
  relics: RelicInstance[];
  seenCardDefIds: CardDefId[];
  packHistory: PackOpenResult[];
  combatHistory: CombatSummary[];
};
```

Avoid non-serializable objects in run state.

## Charge and Validation

The validation system should answer whether the player’s planned board is legal.

Validate:

- Board Charge Capacity is not exceeded.
- Aspect access requirements are satisfied.
- Board slots are legal.
- Spellrail slot limit is not exceeded.
- Source Row slot limit is not exceeded.
- Formation limit is not exceeded.
- Gear has legal attachment target.
- Field has legal placement/target.
- Unique restrictions later, if any.

Example validation result:

```ts
type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

type ValidationError = {
  code: string;
  message: string;
  cardInstanceId?: CardInstanceId;
  position?: BoardPosition;
};
```

Validation should produce user-readable error messages.

Example:

```txt
Ember Scraprunner requires Ember access, but your Source Row does not provide Ember.
```

## Ability Framework

Do not implement every card as bespoke code.

Use a composable ability model:

```txt
Trigger -> Condition -> Target -> Effect
```

### Triggers

Initial trigger types:

```ts
type TriggerType =
  | "OnCombatStart"
  | "OnCombatEnd"
  | "OnEntry"
  | "OnLeaveBoard"
  | "OnDestroyed"
  | "OnOffered"
  | "OnAllyDestroyed"
  | "OnEnemyDestroyed"
  | "OnSummoned"
  | "OnTechniqueUsed"
  | "OnTakeDamage"
  | "OnDealDamage"
  | "OnAttack"
  | "OnKill"
  | "OnCombatChargeGained"
  | "WhenCombatChargeAtLeast"
  | "WhenFirstAllyDestroyed"
  | "WhenFirstEnemyDestroyed"
  | "WhenFirstEnemyUsesTechnique"
  | "WhenFirstAllyBelowHealthPercent"
  | "AfterSeconds";
```

### Conditions

Initial condition types:

```ts
type ConditionType =
  | "Always"
  | "HasTag"
  | "HasKeyword"
  | "IsDamaged"
  | "IsAdjacent"
  | "IsInRow"
  | "IsInColumn"
  | "HasStatus"
  | "CombatChargeAvailable"
  | "AshesHasCard"
  | "AllyDestroyedThisCombat"
  | "EnemyDestroyedThisCombat";
```

### Targets

Initial target types:

```ts
type TargetType =
  | "Self"
  | "Source"
  | "NearestEnemy"
  | "LowestHealthEnemy"
  | "HighestAttackEnemy"
  | "RandomEnemy"
  | "AdjacentAllied"
  | "AdjacentEnemy"
  | "SameRowEnemy"
  | "SameColumnEnemy"
  | "AllAllied"
  | "AllEnemies"
  | "AlliedUnitWithTag"
  | "EnemyUnitWithTag"
  | "EmptyAdjacentTile"
  | "EmptyBacklineTile"
  | "CardInAshes"
  | "CardInVoid";
```

### Effects

Initial effect types:

```ts
type EffectType =
  | "DealDamage"
  | "Heal"
  | "ModifyStats"
  | "ApplyStatus"
  | "RemoveStatus"
  | "GrantKeyword"
  | "RemoveKeyword"
  | "SummonEcho"
  | "SummonUnit"
  | "Offer"
  | "Destroy"
  | "SendToVoid"
  | "ReturnFromVoid"
  | "Phase"
  | "Recall"
  | "MoveUnit"
  | "Attach"
  | "Detach"
  | "GainCombatCharge"
  | "DrainCombatCharge"
  | "CopyTechnique"
  | "InterruptTechnique"
  | "MillToAshes";
```

MVP priority effects:

1. DealDamage
2. Heal
3. ModifyStats
4. ApplyStatus
5. SummonEcho
6. Offer
7. Destroy
8. Phase
9. Recall
10. GainCombatCharge
11. InterruptTechnique

## Zone Change Rules

Zone changes are central to Packbound and must be implemented carefully.

### Destroyed Unit Flow

When a Unit is destroyed:

```txt
1. Emit UnitDestroyed event.
2. Remove Unit from board.
3. If it is an Echo, remove it unless rules say Echoes enter Ashes.
4. If it is not an Echo, move its CardInstance to Ashes.
5. Fire OnDestroyed triggers from the destroyed Unit.
6. Fire OnAllyDestroyed / OnEnemyDestroyed triggers.
7. Resolve queued triggers deterministically.
```

Track destruction reason:

```ts
type DestructionReason =
  | "combatDamage"
  | "techniqueDamage"
  | "offered"
  | "effectDestroy"
  | "poison"
  | "burning"
  | "unknown";
```

### Offer Flow

When a card is Offered:

```txt
1. Validate the card can be Offered.
2. Emit UnitOffered or PermanentOffered event.
3. Remove it from board.
4. Move it to Ashes unless it is an Echo.
5. Fire OnOffered triggers.
6. Fire destruction triggers if Offering counts as destruction for that effect.
```

Default rule: Offering counts as destruction.

Effects may specifically care about `reason === "offered"`.

### Phase Flow

When a Unit Phases:

```txt
1. Emit UnitPhasedOut event.
2. Remove Unit from board.
3. Move its CardInstance/runtime state to Void.
4. Optionally clear negative statuses.
5. Schedule return event.
6. On return, try original tile.
7. If original tile is occupied, use fallback placement.
8. Emit UnitPhasedIn event.
9. Fire OnEntry triggers if the Phase effect allows entry retriggers.
```

Phase effects should carry options:

```ts
type PhaseOptions = {
  delayMs: number;
  clearNegativeStatuses: boolean;
  retriggerEntryEffects: boolean;
  returnPreference: "originalTile" | "nearestOpenTile" | "backline";
};
```

### Recall Flow

When a card is Recalled from Ashes:

```txt
1. Select a valid CardInstance in Ashes.
2. Remove it from Ashes.
3. Restore or create a UnitInstance.
4. Apply Recall modifiers.
5. Place it on a valid board tile.
6. Emit UnitRecalled event.
7. Fire OnEntry triggers.
```

Recall modifiers may include:

- reduced health
- reduced attack
- temporary status
- becomes Echo
- cannot be Recalled again this combat

## Combat Simulation

Use fixed timestep simulation.

Recommended timestep:

```ts
const COMBAT_TICK_MS = 100;
```

This can be tuned later.

Combat loop outline:

```txt
1. Build CombatState from submitted board states.
2. Apply start-of-combat teamups and Fields.
3. Apply OnCombatStart triggers.
4. Initialize attack timers and Technique triggers.
5. Tick until combat ends or max duration is reached.
6. Each tick:
   a. Generate Combat Charge.
   b. Update status timers.
   c. Resolve scheduled events.
   d. Check Technique triggers.
   e. Process unit movement/targeting.
   f. Process attacks.
   g. Resolve deaths and triggered effects.
   h. Append events.
7. End combat when one side has no Units or time expires.
8. Return CombatResult.
```

Recommended caps:

```ts
const MAX_TRIGGER_DEPTH = 20;
const MAX_COMBAT_EVENTS = 5000;
const MAX_COMBAT_DURATION_MS = 90000;
```

If a cap is reached, emit a warning and end or safely continue according to a deterministic rule.

## Combat Events

Events should be serializable and replayable.

Initial event union:

```ts
type CombatEvent =
  | { type: "CombatStarted"; timeMs: number }
  | {
      type: "TraitActivated";
      timeMs: number;
      playerId: PlayerId;
      traitId: string;
      tier: number;
    }
  | { type: "CombatChargeGained"; timeMs: number; playerId: PlayerId; amount: number }
  | {
      type: "UnitMoved";
      timeMs: number;
      unitId: UnitInstanceId;
      from: BoardPosition;
      to: BoardPosition;
    }
  | {
      type: "UnitAttacked";
      timeMs: number;
      attackerId: UnitInstanceId;
      targetId: UnitInstanceId;
    }
  | {
      type: "DamageDealt";
      timeMs: number;
      sourceId?: string;
      targetId: UnitInstanceId;
      amount: number;
      damageType: DamageType;
    }
  | {
      type: "StatusApplied";
      timeMs: number;
      targetId: UnitInstanceId;
      status: StatusEffectType;
      durationMs?: number;
    }
  | {
      type: "UnitDestroyed";
      timeMs: number;
      unitId: UnitInstanceId;
      reason: DestructionReason;
    }
  | {
      type: "UnitSummoned";
      timeMs: number;
      unitId: UnitInstanceId;
      cardInstanceId: CardInstanceId;
      position: BoardPosition;
    }
  | {
      type: "UnitRecalled";
      timeMs: number;
      unitId: UnitInstanceId;
      from: "ashes";
      position: BoardPosition;
    }
  | { type: "UnitPhasedOut"; timeMs: number; unitId: UnitInstanceId }
  | {
      type: "UnitPhasedIn";
      timeMs: number;
      unitId: UnitInstanceId;
      position: BoardPosition;
    }
  | { type: "TechniqueQueued"; timeMs: number; cardInstanceId: CardInstanceId }
  | {
      type: "TechniqueUsed";
      timeMs: number;
      cardInstanceId: CardInstanceId;
      targets: string[];
    }
  | {
      type: "TechniqueInterrupted";
      timeMs: number;
      cardInstanceId: CardInstanceId;
      byCardInstanceId?: CardInstanceId;
    }
  | { type: "CombatEnded"; timeMs: number; winner: PlayerSide | "draw" };
```

Add events as needed, but keep them stable and documented.

## Pack Generation

Pack generation must be deterministic and data-driven.

Pack definition example:

```json
{
  "id": "ember_foundry_pack",
  "name": "Ember Foundry Pack",
  "setWeights": {
    "ember_foundry": 8,
    "core_sources": 2
  },
  "slots": [
    { "rarity": "common", "count": 5 },
    { "rarity": "uncommon", "count": 2 },
    {
      "rarity": "rare",
      "count": 1,
      "mythicUpgradeChance": 0.125
    },
    { "slotType": "sourceOrSupport", "count": 1 },
    { "slotType": "foilWildcard", "count": 1 }
  ],
  "tagBias": {
    "Scrapper": 4,
    "Tinkerer": 2,
    "Relic": 2,
    "Ember": 3
  }
}
```

Pack open result:

```ts
type PackOpenResult = {
  packId: string;
  seed: string;
  cards: CardInstance[];
  slots: PackSlotResult[];
};
```

Tests should verify:

- Same seed produces same pack.
- Rarity slots are respected.
- Mythic upgrade chance is deterministic.
- Tag bias affects eligible selection.
- Invalid pack definitions fail validation.

## Teamup Calculation

Teamups should be calculated from the active board, not the entire pool.

Inputs:

- active Units
- active Relics if relevant
- active Fields if relevant
- active Formations if relevant

Output:

```ts
type ActiveTeamup = {
  teamupId: string;
  count: number;
  tier: number;
  sourceInstanceIds: CardInstanceId[];
};
```

Teamup effects should be converted into modifiers or start-of-combat triggers.

Do not hardcode teamups into individual cards.

## Future System Architecture Implications

These systems include a mix of current prototype surface and future direction.
Expand them only through focused rules/content tasks with tests.

### Pack Market, Roster, Bench, And Shared Pool

The current prototype reward flow buys a pack into a pending pick-limited Pack
Offer instead of adding every opened card to `RunState.pool`. Committed picks
enter the run pool; unpicked offer cards are recorded as released metadata and
do not become owned. Later work can layer finite shared-pool availability on top
of the same ownership boundary.

Future ownership boundaries:

- `packages/content` owns declarative pack definitions, pack-family costs,
  future reveal/pick counts, and optional solo faction pressure metadata on
  encounters, routes, bosses, or reward profiles.
- `packages/rules` currently owns serializable pending Pack Offer state on
  `RunState`, deterministic offer generation from pack opening, pick validation,
  picked/released offer history, and replayable run actions. Future genuinely
  cross-package shared-pool data can move to `packages/shared` when needed.
- `packages/rules` also owns future offer reservation/release in solo runs,
  roster/bench capacity, duplicate-copy accounting, sell/recycle rules, and
  replayable run actions.
- `apps/client` presents the Pack Market, offer picks, roster/bench capacity,
  and suggested loadout edits. It must not decide card availability,
  reservation, pick legality, or shared-pool copy accounting.
- A future `apps/server` owns authoritative shared-pool state for live rooms,
  including simultaneous reservation, commit, release, expiry, reconnect, and
  retry semantics.

Implemented first slice:

- Pick-limited Pack Offers landed before bench limits or shared-pool scarcity.
- Pack generation remains deterministic, normal offers reveal up to 5 cards and
  require up to 2 picks, and only chosen cards enter the current run pool/roster.
- Chosen and unchosen cards are recorded in run history so future shared-pool
  and analytics work can reason about released or consumed copies.
- Post-pack suggestions remain advisory and run only after picks are committed.

Future shared-pool shape:

```ts
type SharedCardPoolEntry = {
  cardDefId: CardDefId;
  totalCopies: number;
  availableCopies: number;
  reservedCopies: number;
  committedCopies: number;
};

type PackOfferReservation = {
  offerId: string;
  playerId: PlayerId;
  runId: RunId;
  round: number;
  cardDefId: CardDefId;
  copyCount: number;
  expiresAt?: string;
};
```

Those types should stay plain JSON-serializable data. In solo, they can be
modeled locally or deferred while the first pick-limited offer flow lands. In
live multiplayer, they belong behind server validation and must be idempotent.

Roster and bench direction:

- Treat current `RunState.pool` as the implemented owned inactive card store.
  Player-facing copy may gradually call this the Roster.
- Add a capacity-aware Bench only after pick-limited pack offers make card
  acquisition meaningful.
- Prefer type-aware capacity lanes over one tiny universal bench: Combat Bench
  for Units/Echoes/Relics/Fields, Source Rack for Sources, and Technique Binder
  for Techniques.
- Active Board, Source Row, Spellrail, Command Zone, Ashes, and Void should not
  count against inactive bench capacity unless a later rule explicitly says so.

Solo faction pressure should be modeled as content/rules data, not fake rival
player state. Encounter or route pressure can bias offers, tax pack families,
reserve copies, or visibly withhold archetype slices without simulating seven
complete AI drafters.

### Commander, Command Zone, And Rebind

- The current prototype stores one Commander in serializable `RunState` with a
  normal `CardInstance`, `deployCount`, raw `rebindTax`,
  `rebindTaxDiscount`, doctrine state, legacy upgrade history, and structured
  lifecycle history.
- Command Zone is a real shared zone value. Starter-created runs currently
  derive a prototype Commander from existing Unit/Echo starter context rather
  than authored Commander content.
- Commander deployment and return are replayable run actions owned by
  `packages/rules`. Default-route Commander deployment uses
  `getLegalCommanderDeployPositions` to highlight legal hexes before dispatching
  `deployCommander`; Pixi and React do not decide Commander placement legality.
  Rebind Tax is enforced as a generic Board Charge surcharge through planning
  validation while the Commander is deployed or being deployed. Effective tax
  uses raw tax minus discount and never creates Aspect requirements. Future
  actions should cover any Signature Relic lifecycle.
- Commander deployment should validate through the same loadout, Board Charge,
  Source Row, and future encounter main-phase action boundaries as other card
  actions.
- Recording combat applies the deployed player Commander destruction replacement
  in run progression by reading `UnitDestroyed` event metadata. The simulator
  still emits normal combat events; the run reducer removes the Commander from
  board/active cards, returns it to Command Zone, and increments Rebind Tax once.
- Commander Doctrine choices are deterministic rules/reward-state data, not
  client-only UI. The current reward phase can keep pack rewards and Commander
  doctrine unlocks as separate one-per-round buckets. Combat recording awards a
  doctrine point, `applyCommanderDoctrineUnlock` spends one point on an
  available rules-defined node, and the node unlock history stays on
  `CommanderState`. The old `applyCommanderUpgradeChoice` path remains as
  compatibility/diagnostic history but is no longer the player-facing reward
  surface.
- Ash Ledger persistence is a run-progression effect, not simulator behavior.
  `recordCombatResult` applies a rules helper after Commander combat lifecycle
  replacement; when Ash Ledger is unlocked, that helper turns `UnitDestroyed`
  events into deterministic `RunState.ashRecords` display/progression metadata
  and deduplicates by destroyed-event identity. It does not mutate combat
  events, `RunState.ashes`, or combat setup.
- Battlefield Layers display data is pure rules-layer clarity data. It can read
  persistent `RunState.ashRecords`, existing `RunState.ashes`, or optional
  last-combat `UnitDestroyed` events to build an Ashes summary. Ash Ledger
  records are labeled as doctrine-tracked state; existing Ash-zone cards remain
  persistent run state; last-combat destroyed events are labeled as temporary
  context. The same view currently exposes Walls / Edges as empty scaffolding
  without changing combat, pathing, or board legality.
- The current encounter action bridge validates deployed Commander context for
  `Commander Rally` and then queues a match-local action. This is deliberately
  separate from Commander lifecycle run actions; resolving Rally does not mutate
  `RunState`. The action itself is described by the same static encounter action
  contract registry used by the Spellrail prototype action.
- Commander lifecycle logging is structured run/progression metadata, not
  renderer behavior. Entries capture creation, deploy, voluntary return,
  destruction replacement, doctrine unlocks, legacy upgrade application, and
  their key before/after tax, deploy, zone, and progression values.
- Signature Relics should be modeled as explicit card instances or linked
  persistent objects with clear ownership, zone, and lifecycle. They should not
  bypass normal Relic, Source, and board validation rules unless a focused rules
  task adds and tests that exception.
- Do not add hand/deck/mill, counterspells, enemy Commander AI, or broad
  instant-speed windows just to prove the Commander spine.

### Traits And Teamups

- The first foundation is implemented as display-only trait summaries:
  definitions live in `packages/content`, card metadata uses explicit `traits`,
  and `packages/rules` computes active and near-active loadout summaries.
- Define traits/teamups as content data, not hardcoded card behavior.
- Compute active traits in `packages/rules` from active board permanents,
  Source Row rules where relevant, and future infrastructure objects.
- Return enough structured data for the client to show counts, tiers,
  contributing card instances, and inactive near-misses.
- Test trait coverage with content fixtures so each starter, pack family, and
  cross-archetype bridge has at least one visible path.
- Trait thresholds do not apply combat modifiers yet; future trait effects
  should convert definitions into explicit modifiers or combat-start triggers.

### Duplicate Upgrades

- Use `CardInstance.upgradeLevel` and `CardModifier` for combine results.
- Keep combine rules deterministic and replayable through serializable
  RunActions.
- Preserve card instance identity where possible, and document when a combine
  consumes or creates instances.
- Prefer generic upgrade definitions over bespoke simulator code per card.
- Add property tests for zone uniqueness, instance preservation, and replay
  determinism before content depends on upgrades.

### Economy And Pack Pricing

- `RunState` carries `playerGold`; economy work extends run rules rather than
  client-only state.
- Pack prices live in content as serializable pack definition costs.
- Combat gold is awarded deterministically when `recordCombatResult` is applied
  and stored on the combat summary.
- Pack reward choices derive affordability from current run gold.
- Pack purchases are replayable RunActions through `applyPackReward`; successful
  purchases spend gold and record cost, gold before, and gold after in reward
  history.
- Pack Market purchase is split from ownership: buying a pack creates a
  pick-limited pending offer, and only committed picks enter the run roster.
- Future discounts and rerolls should remain generated from seeded run state.
- Balance reports should include broad economy signals such as gold earned,
  pack affordability, pick pressure, released cards, discount frequency, and
  greed failure cases.

### Board Resources

- The board model should remain a discrete 2D odd-r offset hex grid with layers.
  Use the existing terrain/resource-layer direction before considering any
  richer renderer.
- Resource extraction and denial must be resolved by rules/sim code, not React
  or future visual rendering.
- Combat events should explain extraction, spending, denial, and resource-based
  buffs so debug summaries remain useful.
- Avoid real-time inputs, physics, or pathfinding dependencies for resource
  collection.

### User-Facing Text And Localization

- Do not implement full localization yet.
- New user-facing rules text should gradually move toward structured message
  keys or stable codes with English fallback.
- Core rules and simulator events should prefer structured metadata over
  hardcoded English where practical.

## Modifiers

Use a general modifier system for stats, keywords, costs, and continuous effects.

Possible modifier categories:

```ts
type ModifierType =
  | "StatModifier"
  | "KeywordGrant"
  | "CostModifier"
  | "ChargeGenerationModifier"
  | "DamageModifier"
  | "TargetingModifier"
  | "TriggerModifier";
```

Modifiers should include:

- source ID
- duration
- stacking rule
- affected target

Stacking rule examples:

```ts
type StackingRule = "stack" | "highestOnly" | "refreshDuration" | "uniqueBySource";
```

## Status Effects

Initial statuses:

```ts
type StatusEffectType =
  | "Stunned"
  | "Rooted"
  | "Slowed"
  | "Poisoned"
  | "Burning"
  | "Silenced"
  | "Frozen"
  | "Marked"
  | "Barrier";
```

MVP statuses:

- Stunned
- Slowed
- Poisoned
- Barrier

Status effects should be data objects:

```ts
type ActiveStatus = {
  type: StatusEffectType;
  sourceId?: string;
  remainingMs?: number;
  stacks?: number;
  metadata?: Record<string, unknown>;
};
```

## Rendering Architecture

Use React for UI and PixiJS for battlefield rendering.

React owns:

- screen routing
- pack opening menus
- card panels
- pool/bench views
- board builder controls
- validation messages
- trait panels
- run rewards

Pixi owns:

- isometric board
- Unit sprites/standees
- support Relics
- attacks
- movement
- effects
- event-log replay

The Pixi renderer receives a `CombatEvent[]` and visual state snapshots. It does not determine outcomes.

Renderer positions are derived from board positions:

```ts
type RenderPosition = {
  x: number;
  y: number;
  zIndex: number;
  scale: number;
  visualOffsetX?: number;
  visualOffsetY?: number;
};
```

Visual offsets mirror the odd-r hex topology but never override simulation
distance or adjacency helpers.

## Client Development Strategy

The first client should be ugly and functional.

Minimum client screens:

1. Start run
2. Choose starter kit
3. Open pack
4. View pool
5. Place Units/Sources/Techniques
6. Validate board
7. Start combat
8. View event log/combat result
9. Choose next reward

Do not block core engine work on visual polish.

## Server Boundary for Future Multiplayer

Even before multiplayer exists, design actions as if they could be sent to a server.

Example actions:

```ts
type GameAction =
  | { type: "ChooseStarterKit"; starterKitId: string }
  | { type: "ChoosePackReward"; rewardId: string }
  | { type: "MoveCardToBoard"; cardInstanceId: CardInstanceId; position: BoardPosition }
  | { type: "MoveCardToSourceRow"; cardInstanceId: CardInstanceId }
  | { type: "MoveCardToSpellrail"; cardInstanceId: CardInstanceId; slotIndex: number }
  | {
      type: "AttachGear";
      gearInstanceId: CardInstanceId;
      targetUnitCardInstanceId: CardInstanceId;
    }
  | { type: "LockBoard" }
  | { type: "StartCombat" };
```

A future server can validate and apply these actions.

The client should avoid directly mutating state in uncontrolled ways.

## Multiplayer Readiness

Future multiplayer modes:

1. Async ghost PvP
2. Co-op sealed runs
3. Live lobby PvP

### Async Ghost PvP

Store serialized board snapshots from previous runs.

A ghost opponent includes:

```ts
type GhostBoard = {
  ghostId: string;
  round: number;
  approximatePower: number;
  board: BoardState;
  spellrail: SpellrailState;
  sourceRow: SourceRowState;
  activeTeamups: ActiveTeamup[];
  rulesVersion: string;
};
```

This is the best first multiplayer-like feature.

### Co-op

Future co-op may require:

- shared pack choices
- card trading
- linked combat outcomes
- two boards against a boss
- shared or separate health

Do not implement yet.

### Live PvP

Live PvP requires:

- matchmaking
- rooms
- timers
- reconnects
- authoritative validation
- anti-cheat assumptions
- server simulation
- patch/balance cadence

Architect for it, but do not build it first.

## Testing Strategy

Testing should be extensive and started immediately.

### Required Test Areas

#### Content Validation

- Invalid card definitions fail.
- Invalid pack definitions fail.
- Missing referenced IDs fail.
- Invalid Aspect names fail.

#### Pack Generation

- Same seed produces same pack.
- Slot counts are correct.
- Rarity distribution logic works.
- Tag bias is deterministic.

#### Board Validation

- Board Charge Capacity is enforced.
- Aspect access is enforced.
- illegal placements fail.
- Spellrail slot limits work.
- Source Row validation works.

#### Combat Determinism

- Same input/seed produces same result.
- Different seed only matters when randomness is used.
- Combat ends correctly.
- Max duration cap works.

#### Core Mechanics

- damage
- death
- Ashes movement
- Echo cleanup
- Phase out/in
- Recall from Ashes
- Offer
- Barrier
- Guard
- Airborne/Anti-Air
- Pierce
- Poison
- Technique interruption

#### Trigger System

- OnEntry
- OnDestroyed
- OnAllyDestroyed
- WhenCombatChargeAtLeast
- AfterSeconds
- trigger depth cap

## Initial Development Milestones

### Milestone 0: Repo Setup

Create:

- pnpm workspace
- root package.json
- TypeScript configs
- Vitest configs
- package folders
- empty client app
- lint/format scripts if desired

Acceptance:

- `pnpm install` works
- `pnpm test` works
- packages build or typecheck

### Milestone 1: Shared Types and Content Schemas

Implement:

- Aspect enum/type
- CardType enum/type
- Rarity enum/type
- Zone types
- BoardPosition
- card definition schemas
- pack definition schemas
- content loader

Acceptance:

- valid sample content loads
- invalid sample content fails tests

### Milestone 2: Seeded RNG and Pack Opening

Implement:

- seeded RNG utility
- pack generator
- rarity slot handling
- tag bias support
- mythic upgrade chance
- PackOpenResult

Acceptance:

- deterministic pack tests pass
- pack slot tests pass

### Milestone 3: Run State and Board Validation

Implement:

- RunState
- BoardState
- SourceRowState
- SpellrailState
- card instance creation
- Board Charge Capacity validation
- Aspect access validation
- placement validation

Acceptance:

- legal boards pass
- illegal capacity boards fail
- missing Aspect access fails
- invalid layer placement fails

### Milestone 4: Basic Combat Simulator

Implement:

- CombatState
- Unit runtime state
- fixed timestep loop
- basic targeting
- melee attacks
- ranged attacks
- damage
- destruction
- Ashes movement
- CombatEnded event

Acceptance:

- simple fights resolve
- event logs are stable
- deterministic tests pass

### Milestone 5: Core Ability System

Implement:

- Trigger -> Condition -> Target -> Effect pipeline
- OnCombatStart
- OnEntry
- OnDestroyed
- OnAllyDestroyed
- AfterSeconds
- DealDamage
- Heal
- ModifyStats
- ApplyStatus
- SummonEcho
- Offer
- Phase
- Recall
- GainCombatCharge

Acceptance:

- Echo summon card works
- Offer payoff works
- Recall card works
- Phase card works
- trigger loop cap works

### Milestone 6: Minimal Client

Implement:

- React app shell
- starter kit selection
- pack opening UI
- pool view
- board placement UI
- Source Row UI
- Spellrail UI
- validation messages
- start combat button
- event log display

Acceptance:

- player can start a run
- open a pack
- place cards
- validate board
- simulate combat
- see result

### Milestone 7: Pixi Board Replay

Implement:

- isometric board display
- placeholder Unit sprites
- support layer display
- event-log replay
- simple attack/death/summon animations

Acceptance:

- combat events are visible on board
- animation does not affect result

### Milestone 8: First Playable Run

Implement:

- finite run flow
- 3 starter kits
- 3 pack families
- 40-60 cards
- enemy board generation
- round rewards
- health loss
- victory/defeat

Acceptance:

- full run can be completed or lost
- no manual dev state editing required

## Initial Content Targets

Create 40-60 cards across three early sets.

Initial sets:

1. Ember Foundry
2. Rotbloom
3. Cloudspire

Initial mechanics to cover:

- Ember aggression
- Shade Ashes/Recall
- Bloom growth/poison
- Tide Phase/Technique play
- Gleam Barrier/formation
- Relic support
- Gear attachment
- Sources
- Echoes

Example initial cards:

### Ember Foundry

- Ember Scraprunner: Quickstart, deals damage when destroyed.
- Crackling Altar: Offer adjacent Echo to gain Combat Charge.
- Rustline Cannon: support Relic, fires down row.
- Junkwright: restores destroyed Relic.
- Hookblade: Gear, grants Pierce.

### Rotbloom

- Hollow Caller: Recalls cheap Unit from Ashes.
- Sporeback Beast: applies Poison.
- Huskling Echo: basic token.
- Debt-Bound Colossus: costs less based on Ashes.
- Rot Soil: tile Field, creates Echo when Unit destroyed there.

### Cloudspire

- Phase Step: Phase lowest-health ally.
- Cloudgate Adept: entry Barrier to adjacent allies.
- Mistwing Scout: Airborne.
- Skyhook Archer: Anti-Air.
- Pattern Break: interrupts first enemy Technique.

### Sources

- Ember Source
- Shade Source
- Bloom Source
- Tide Source
- Gleam Source
- Cracked Prism
- Overgrown Source
- Volatile Source
- Charge Battery

## Balance Simulation Later

Once combat is stable, add headless simulation tools.

Possible tools:

- simulate board A vs board B 1000 times
- test pack distribution over 10000 openings
- estimate card pick rates
- estimate trait win rates
- identify overperforming cards
- replay saved combat by seed

These should live in `apps/tools`.

## Coding Guidelines for Codex

When implementing tasks:

1. Write tests with every rules change.
2. Keep gameplay logic outside React and Pixi.
3. Prefer data-driven card definitions.
4. Add generic effects instead of one-off card code.
5. Use Packbound terminology.
6. Preserve deterministic behavior.
7. Keep state serializable.
8. Do not introduce copied card names or rules text from existing games.
9. Keep MVP scope small.
10. Prefer boring, testable implementation over clever abstractions.

## First Codex Task Recommendation

Start with Milestone 0 and Milestone 1.

Suggested first prompt:

```txt
Create the initial Packbound TypeScript monorepo using pnpm workspaces. Add packages/shared, packages/content, packages/rules, packages/sim, and apps/client. Implement shared domain types for Aspects, CardType, Rarity, Zones, BoardPosition, and BoardLayer. In packages/content, add Zod schemas for Unit, Technique, Relic, Gear, Field, Source, Formation, and Echo card definitions. Add a small sample content file with five valid cards and tests proving valid content loads and invalid content fails. Do not implement rendering or combat yet.
```

## Architectural Mantra

Packbound should be built as:

> A deterministic card-and-board rules engine that happens to have a flashy browser client.

If the engine is clean, then solo roguelite, async ghost PvP, co-op, live PvP, replays, balance tools, and server validation all become possible later.
