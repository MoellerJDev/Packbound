# Packbound Gameplay Design

## Purpose of This Document

This document defines the gameplay direction for **Packbound**, a browser-based pack-opening tactical autobattler roguelite.

It is meant to sit at the root of the repo and guide implementation, content creation, balance decisions, and future design conversations.

This is not the code architecture document. For engine structure, package boundaries, schemas, deterministic simulation, and implementation milestones, see `TECHNICAL_ARCHITECTURE.md`.

## Working Title

**Packbound**

Possible subtitles:

- Packbound: Sealed Arena
- Packbound: Midnight League
- Packbound: Booster Arena

Use **Packbound** as the project name unless replaced later.

## High-Level Pitch

Packbound is a finite-run tactical autobattler where the player builds a board by opening packs.

The player does not construct a perfect deck before the run. Instead, each run gives them an imperfect, evolving card pool. They open packs, adapt to what they pull, build a tactical team, install resources, queue effects, position units, then watch combat resolve automatically.

The intended feel is:

> A sealed-pack card game turned into a tactical autobattler roguelite.

The game should be familiar to players who like trading card games and autobattlers, but it should have its own terminology, card frame, world, mechanics, and identity.

## Current Gameplay Thesis

Useful shorthand: **MTG Limited meets TFT**. That phrase is a design compass,
not a license to copy either game.

Packbound is not just:

- TFT with card names
- Slay the Spire with booster packs
- automated trading-card-game combat

Packbound should be a finite sealed-league autobattler where booster packs are
the shop. Cards become Units, pets/Echoes, Relics, Sources, Techniques,
infrastructure, and future board objects. The player builds from imperfect
pulls rather than from a prebuilt optimized deck.

The run should push the player through overlapping constraints:

- Aspect access and Board Charge prevent pure best-card piles.
- Pack prices and gold make every reward choice an economy decision.
- Traits/teamups make mixed boards exciting instead of merely legal.
- Duplicate upgrades reward staying in a lane without making pivots impossible.
- Positioning and future board resources make the board more than front/back.

The best runs should feel discovered. A player opens a strange pile, notices
that a Source splash unlocks an off-aspect Technique, sees that a duplicate pet
can upgrade, moves a Relic beside the right Unit, and suddenly has a machine
that did not exist at run start.

## Design Pillars

### 1. Packs Are the Shop

The main reward and economy loop is opening packs.

The player should constantly ask:

- Do I take a synergy pack or a fixing pack?
- Do I chase a rare pull or complete common upgrades?
- Do I pivot into a new aspect because I opened a build-around?
- Do I take removal, board support, or more units?
- Do I open one premium pack or two bulk packs?

Packs are not just cosmetic loot. They are the primary strategic input.

### 2. Tactics Are Spatial

Combat is automatic, but positioning matters heavily.

The player makes important decisions before combat:

- Which units to field
- Where to place them
- Which support objects or terrain effects to use
- Which effects to queue
- Which resource sources to install
- Which synergies to activate

The board should feel closer to a tactical autobattler than a traditional hand-based card game.

### 3. Card Game Texture Without Card Game Bloat

Packbound should preserve the satisfying parts of card games:

- Opening packs
- Rarity tension
- Build-arounds
- Synergy reading
- Resource limits
- Graveyard-like recursion
- Blink/phase tricks
- Sacrifice engines
- Tokens
- Equipment-like attachments
- Global enchantment-like rules
- Removal and protection
- Archetype pivots

But it should avoid unnecessary complexity:

- No stack/priority system
- No manual instant-speed timing
- No land draw or mana screw
- No 60-card deck requirement
- No hidden layer rules
- No long legalistic card text

Complexity should come from combinations and board state, not rules parsing.

### 4. Deterministic Combat, Expressive Replay

The combat result should be calculated by a deterministic simulation.

The renderer should replay the result visually.

Combat can look dynamic, flashy, and dimensional, but the rules are discrete and deterministic.

### 5. Legally Distinct, Not a Clone

Packbound may borrow broad genre concepts from trading card games and autobattlers, but it should not copy specific protected expression from any existing game.

Avoid cloning:

- Existing card names
- Existing set names
- Existing rules text
- Existing mana symbols
- Existing color pie identity
- Existing card frame/trade dress
- Existing keyword names where easy alternatives exist
- Existing art style or iconography
- Existing creature type bundles too closely

The game can use familiar design concepts, but it should express them through original terminology, mechanics, flavor, visuals, and rules text.

This document intentionally uses Packbound-specific terminology.

## Core Terminology

Use these terms in player-facing design and preferably in code.

| Common Genre Concept | Packbound Term | Notes                                        |
| -------------------- | -------------- | -------------------------------------------- |
| Mana                 | Charge         | Core resource/capacity system                |
| Colors               | Aspects        | Strategic identity groups                    |
| Creature             | Unit           | Board combatant                              |
| Spell                | Technique      | Queued combat effect                         |
| Artifact             | Relic          | Persistent object or support card            |
| Equipment            | Gear           | Attachment to a unit                         |
| Enchantment          | Field          | Persistent global, tile, or attached effect  |
| Graveyard            | Ashes          | Zone for destroyed/used cards                |
| Exile                | Void           | Temporary or permanent removed zone          |
| Blink/Flicker        | Phase          | Temporarily remove and return a unit         |
| Reanimate            | Recall         | Return a unit from Ashes                     |
| Sacrifice            | Offer          | Destroy your own unit/card for benefit       |
| Token                | Echo           | Created unit/card not opened from packs      |
| Flying               | Airborne       | Evasive positional keyword                   |
| Reach                | Anti-Air       | Can target Airborne units                    |
| Trample              | Pierce         | Overflow damage                              |
| Haste                | Quickstart     | Starts combat or attack timer ahead          |
| Lifelink             | Siphon         | Damage heals self/hero/allies                |
| Deathtouch           | Bane           | Executes or heavily punishes damaged targets |
| Ward                 | Aegis          | Tax/protect against hostile Techniques       |
| Taunt                | Guard          | Draws attacks or targeting                   |
| Shield               | Barrier        | Blocks damage instance                       |

Internal code should use these terms unless there is a strong reason not to.

Developer notes may include analogies to other games, but player-facing text should avoid looking like a rules reskin of any one card game.

## Aspects

Aspects are Packbound’s strategic identity system.

They replace the need for direct color copying while still creating recognizable play patterns.

Initial Aspects:

1. **Ember**
2. **Shade**
3. **Bloom**
4. **Tide**
5. **Gleam**

These are not one-to-one copies of any existing card game color system. Each aspect should have an original flavor and mechanical profile.

### Ember

Theme: volatility, speed, pressure, heat, scrap, risk.

Mechanical identity:

- Fast units
- Explosive death effects
- Direct damage
- Fragile aggression
- Relic destruction
- High-risk temporary buffs
- Overheating engines

Autobattler role:

- Early pressure
- Tempo punishment
- Damage spikes
- Sacrifice-adjacent builds

### Shade

Theme: decay, contracts, memory, debt, shadow, death economy.

Mechanical identity:

- Ashes recursion
- Offering units for value
- Draining enemy hero or units
- Debuffs
- Delayed inevitability
- Cursed power

Autobattler role:

- Grind engines
- Death triggers
- Recursive boards
- Risk/reward power

### Bloom

Theme: growth, mutation, roots, beasts, spores, adaptation.

Mechanical identity:

- Scaling stats
- Large bodies
- Charge acceleration
- Poison/spores
- Terrain growth
- Swarm-to-monster transformations

Autobattler role:

- Midrange bodies
- Scaling frontline
- Poison attrition
- Resource growth

### Tide

Theme: motion, echoes, patterns, time, mist, calculation.

Mechanical identity:

- Phase effects
- Technique copying
- Delays
- Repositioning
- Control effects
- Target manipulation
- Tempo disruption

Autobattler role:

- Spell/Technique builds
- Phase value
- Backline control
- Counterplay tools

### Gleam

Theme: formation, oaths, light, structure, protection, resonance.

Mechanical identity:

- Barriers
- Formation bonuses
- Adjacent buffs
- Anti-Air tools
- Defensive tokens
- Protection from hostile Techniques

Autobattler role:

- Frontline stability
- Formation tactics
- Unit preservation
- Airborne counterplay

## Card Types

### Unit

A Unit is a board combatant.

Units can have:

- Attack
- Health
- Attack speed
- Range
- Aspect requirements
- Tags
- Keywords
- One or more abilities

Units are placed on the board during planning.

Example:

> Ember Scrapper  
> Unit - Scrapper Tinkerer  
> Quickstart. When this is destroyed, deal 1 damage to the nearest enemy.

### Technique

A Technique is a queued combat effect.

The player does not manually cast Techniques during combat. Instead, Techniques have trigger conditions.

Examples:

- At combat start
- After 6 seconds
- When the first allied unit is destroyed
- When combat Charge reaches 5
- When an enemy Technique is used
- When an allied unit drops below 40% health

After resolving, a Technique usually goes to Ashes.

### Relic

A Relic is a persistent non-unit card.

Relics may:

- Occupy support slots on the board
- Generate Charge
- Fire projectiles
- Modify nearby units
- Trigger when units are destroyed
- Store counters
- Enable archetypes

Relics are an important way to support digital-only board mechanics.

### Gear

Gear attaches to a Unit.

Gear can provide:

- Stats
- Keywords
- Triggered effects
- New targeting behavior
- Aspect/teamup bonuses

Gear should be simple in the MVP.

### Field

A Field is a persistent rule modifier.

Fields may be:

- Global
- Tile-based
- Attached to a Unit
- Formation-like
- Aspect-specific

Fields are where enchantment-like gameplay lives, but with Packbound terminology.

### Source

A Source is a resource card installed in the player’s Source Row.

Sources provide:

- Board Charge capacity
- Aspect access
- Combat Charge generation
- Splash support

Sources are not shuffled or drawn. They are installed during planning.

### Formation

A Formation modifies positional rules.

Only one Formation should be active at a time in the MVP.

Examples:

- Front row units gain Barrier
- Corner units gain Aegis
- Units in the center column gain attack speed
- Adjacent Echoes gain attack

### Echo

An Echo is a generated card or unit.

Echoes are not normally opened from packs.

Examples:

- Scrapling Echo
- Spore Echo
- Wisp Echo
- Husk Echo

Default rule: Echoes disappear when destroyed instead of entering Ashes, unless a card says otherwise.

## Zones

### Pool

All cards the player has opened or acquired during the run.

### Bench

Cards not currently active but easily swappable during planning.

### Board

Active Units, Relics, terrain, and support objects.

### Spellrail

The queued Technique area.

The term “spellbook” is serviceable internally, but **Spellrail** is more distinct and better matches an automated trigger system.

### Source Row

Installed Sources that determine Charge, Aspect access, and combat resource generation.

### Ashes

Destroyed Units, used Techniques, destroyed Relics, and other spent cards.

### Void

Temporary or permanent removed zone.

Phase effects use the Void temporarily.

## Board and Positioning

The rules engine should use a discrete 2D offset-hex board with optional layers.

Initial board recommendation:

- 4 rows
- 7 columns
- Odd-r offset hex topology, with odd rows visually shifted right
- Mirrored sides or separate player boards

Initial layers:

- Ground
- Support

Future layers:

- Air
- Terrain

Visuals may be isometric or 2.5D, but mechanics remain tile-based and derive
from the same offset-hex row/column positions used by the simulator.

Positioning should matter for:

- Guard units
- Backline protection
- Airborne attacks
- Anti-Air units
- Adjacent buffs
- Row/column attacks
- Support Relics
- Terrain effects
- Summon placement
- Phase return placement

Current implementation note: the MVP simulator already uses attack, health,
attack speed, odd-r hex board distance, deterministic one-hex ground movement,
Guard, Barrier, Quickstart, Airborne, AntiAir, support-layer Relic trigger
positions, and Technique combat Charge. A ready Unit or Echo attacks its
selected target if that target is within range; otherwise it moves one legal
neighboring ground hex toward that target. Occupied ground cells block movement,
while support and terrain layers do not. This is a deliberately small
engagement model, not full pathfinding or a shared TFT-style arena rewrite.

### Future Board Resources

Positioning should eventually matter more visibly than "frontline versus
backline." Packbound can use digital-only board resources that a physical card
game would struggle to represent cleanly.

Possible resource tiles:

- neutral scrap piles
- Ember forges
- Ash vents
- Bloom roots
- Tide currents
- Gleam lenses
- generic Charge wells
- extraction points tied to pack rewards, Sources, or encounters

Possible behaviors:

- A Unit or pet standing on a resource extracts it over time.
- A Relic on the support layer extracts, stores, or amplifies a nearby tile.
- A Source modifies which resource tiles appear during planning.
- Pets harvest different resources based on traits such as Wisp, Husk, Beast,
  Scrapper, or Guardian.
- Extracted resources fuel Techniques, duplicate upgrades, pack discounts, or
  temporary combat buffs.
- Enemies can contest, block, or deny important resource tiles.

Constraints:

- Resource extraction must be deterministic.
- Combat still has no real-time player input.
- No physics or complex pathfinding dependency.
- Rules stay discrete, grid-based, and serializable.
- Resources should deepen positioning decisions without overwhelming pack
  evaluation or card readability.

## Charge System

Packbound uses Charge instead of mana.

Charge has three related meanings.

### 1. Board Charge Capacity

Board Charge Capacity limits how much the player can field.

Each active permanent has a Charge cost. Active permanents include Units, some Relics, some Fields, and some Formations.

Example:

- Player has 7 Board Charge Capacity.
- A 4-cost Unit, 2-cost Relic, and 1-cost Unit can be fielded together.
- An 8-cost board is illegal.

This replaces a raw unit-count limit and creates card-game-like deckbuilding pressure.

### 2. Aspect Access

Some cards require specific Aspects.

Example:

- Cost: 2 generic + 1 Ember + 1 Shade

To field it, the player needs:

- 4 total Board Charge Capacity
- At least 1 Ember access
- At least 1 Shade access

Aspect access comes from Sources.

### 3. Combat Charge

Combat Charge is generated during battle.

It fuels:

- Techniques
- activated Relics
- activated Unit abilities
- some triggered effects

Combat Charge allows spell-like strategies to exist without manual casting.

## Packs

Packs define the run’s strategic direction.

Packs should have identity.

Pack choice should also be an economy decision. Gold should matter enough that
the player notices the difference between opening a cheap duplicate-heavy pack,
buying fixing, saving for a premium pack, or taking an economy card that is weak
right now but improves future choices.

Possible economy values:

- gold or credits
- pack cost
- known-card or singles offers later
- rerolls later
- healing or repair later
- bench or Source Row expansion later
- duplicate upgrade costs later

Reward money direction:

- Wins give gold.
- Clean wins or remaining Units may give bonus gold.
- Losses can still give small catch-up gold.
- Economy cards can generate gold, discounts, rerolls, or better reward choices.
- Combat-performance rewards should be tuned so dedicated economy builds remain
  meaningful.
- Greed should create risk. A player who buys future value should often be
  weaker in the next fight.

Current implementation note: the first economy MVP gives deterministic combat
gold from the rules layer. Combat grants 3 base gold, +2 for a player win, +1
for a draw, +1 for a loss, and +1 when the player takes no damage. Pack
definitions now carry a simple integer cost, and the reward phase lets the
player buy one offered pack if they can afford it. The debug client shows gold,
pack costs, affordability, purchase history, and concise reward-offer
explanations for trait fit, duplicate progress, Source/fixing relevance, and
pack bias. There are no rerolls, interest, debt, healing purchases, or shop
inventory systems yet.

### Example Pack Types

#### Ember Foundry Pack

Primary cards:

- Ember Units
- Scrappers
- Relics
- Offering payoffs
- Explosive effects

Good for:

- Aggro
- Sacrifice/offering
- Relic builds

#### Rotbloom Pack

Primary cards:

- Shade/Bloom Units
- Ashes recursion
- Poison/spore effects
- Scaling bodies

Good for:

- Graveyard-like recursion
- Attrition
- Poison
- Midrange

#### Cloudspire Pack

Primary cards:

- Tide/Gleam Units
- Phase effects
- Airborne units
- Barrier effects
- Technique control

Good for:

- Blink/phase value
- Flyers/evasion
- Control
- Defensive formations

#### Source Pack

Primary cards:

- Sources
- Aspect fixing
- Combat Charge engines
- Multi-aspect support

Good for:

- Splashing build-arounds
- High-cost boards
- Technique builds

Economy role:

- Low to moderate price.
- Solves Aspect and Board Charge constraints.
- Often correct when the player already has payoffs but cannot field them.

#### Removal Pack

Primary cards:

- Damage Techniques
- debuffs
- Relic destruction
- anti-Air answers
- anti-token answers

Good for:

- Fixing a weakness
- Surviving bosses
- Sideboard-like answers

#### Bulk Pack

Primary cards:

- Commons
- duplicates
- low-rarity synergy pieces

Good for:

- Upgrading core units
- stabilizing a build
- finding glue cards

Economy role:

- Cheap.
- Higher duplicate odds.
- Lower rarity ceiling.
- Rewards players who commit to a pack family or want upgrade material.

#### Collector Pack

Primary cards:

- Higher rarity chance
- visual modifiers
- odd build-arounds
- fewer fundamentals

Good for:

- Greedy pivots
- rare-driven builds
- high variance runs

Economy role:

- Expensive or risky.
- Higher rare/mythic odds.
- Less reliable synergy.
- May later include debt, curses, or weaker fundamentals.

#### Economy Pack

Primary cards:

- discount Sources
- reward modifiers
- gold generators
- future upgrade currency cards
- weak immediate bodies with future value

Good for:

- Greedy runs
- long-run planning
- smoothing future pack choices

Economy role:

- Should cost tempo or board strength now.
- Should not become the automatic best pack for every run.

## Rarity Philosophy

Rarity should create temptation, not a simple power ladder.

Commons:

- Efficient glue
- Simple synergy pieces
- Duplicates matter
- Often correct picks

Uncommons:

- Strong role players
- Archetype payoffs
- Flexible answers

Rares:

- Build-arounds
- Bombs with constraints
- Powerful but sometimes awkward

Mythics:

- Run-defining effects
- High variance
- Not always correct

A synergistic common should often beat an off-plan rare.

## Duplicate and Upgrade Philosophy

Duplicates are central because the game is pack-based and autobattler-inspired.
Opening the same pack family repeatedly should feel rewarding, especially for
Units, pets/Echoes, and simple archetype payoffs.

Possible upgrade model:

- 1 copy: playable
- 2 copies: the card can become upgraded or improved
- 3 copies: the card can become a stronger tier or choose an evolution branch
- Extra copies: convert into dust, trade, economy value, or future fusion
  currency

Possible upgrade rewards:

- stat upgrade
- ability improvement
- lower Board Charge cost
- improved trigger timing or trigger cap
- additional keyword
- pet/Echo evolution

Branching upgrades are preferred over pure number scaling once the base combine
rules are stable. Upgrades should create a reason to stay in an archetype
without making pivoting impossible.

Example:

**Sparkling Scrapling** can evolve into:

- **Swarm Scrapling**: creates another Echo when destroyed
- **Volatile Scrapling**: explodes on destruction
- **Battery Scrapling**: generates Combat Charge while alive

Constraints:

- Preserve card identity where possible.
- Store upgrade state on card instances through `upgradeLevel` and modifiers.
- Keep upgrade rules deterministic, serializable, and replayable.
- Prefer generic combine/evolution rules over card-specific one-off code.
- Add property tests for instance preservation before expanding content around
  upgrades.

Current implementation note: duplicate upgrades now use a narrow generic combine
rule for Units and Echoes only. Three matching pool copies with the same
definition, owner, and upgrade level combine into one card at the next level,
preserving the lowest sorted instance ID and consuming the next two. The current
max level is 2, and each upgrade level adds +1 ATK and +1 HP in combat.
Active, Ashes, and Void copies can be shown as duplicate context, but only pool
copies count toward the current combine action.

## Run Structure

Default run length should be finite.

Example structure:

- Round 0: Starter kit + opening packs
- Rounds 1-3: Early fights
- Round 4: Rival fight
- Rounds 5-7: Mid fights
- Round 8: Mini-boss
- Rounds 9-11: Late fights
- Round 12: Finals
- Round 13: Champion

The run ends when:

- Player wins the final fight
- Player health reaches 0

Losses deal damage based on enemy survivors and round number.

## Archetype Framework

Packbound should support familiar strategic archetypes while expressing them in original terms.

### 1. Ashes Recall

Genre equivalent: graveyard recursion/reanimation.

Core fantasy:

> My units are not truly gone. They become fuel, memory, and future threats.

Key mechanics:

- Units enter Ashes when destroyed
- Some effects Recall cards from Ashes
- Some cards grow stronger based on Ashes count
- Some cards transform destroyed units into Echoes
- Shade/Bloom commonly supports this

Example cards:

- **Hollow Caller**: On entry, Recall a 1-cost Unit from Ashes with 1 health.
- **Debt-Bound Colossus**: Costs 1 less for every three Units in your Ashes.
- **Ash Contract**: The first non-Echo Unit destroyed each combat returns as a Husk Echo.

Implementation needs:

- Ashes zone
- Death reason tracking
- Recall effect
- token/Echo cleanup rules
- entry triggers on recalled units

### 2. Phase Value

Genre equivalent: blink/flicker.

Core fantasy:

> My units slip out of reality, dodge danger, and return with renewed entry effects.

Key mechanics:

- Temporarily move Units to Void
- Return them after a delay
- Clear negative effects
- Re-trigger entry effects
- Reposition if original tile is blocked
- Tide/Gleam commonly supports this

Example cards:

- **Phase Step**: When your lowest-health Unit drops below 40%, Phase it for 1 second.
- **Cloudgate Adept**: On entry, give adjacent allies Barrier.
- **Vanishing Warden**: The first time this would be destroyed, Phase it instead.

Implementation needs:

- Void zone
- scheduled return events
- entry trigger controls
- tile fallback logic
- status clearing rules

### 3. Offering Engines

Genre equivalent: sacrifice/aristocrats.

Core fantasy:

> My board converts loss into power.

Key mechanics:

- Offer allied Units or Echoes
- Trigger effects on allied destruction
- Convert deaths into damage, healing, Charge, or tokens
- Shade/Ember commonly supports this

Example cards:

- **Crackling Altar**: Offer an adjacent Echo to gain 2 Combat Charge.
- **Debt Celebrant**: Whenever an allied Unit is destroyed, drain the enemy hero for 1.
- **Scrap Pyre**: When a Scrapper is Offered, deal 2 damage to the nearest enemy.

Implementation needs:

- Offer effect
- death reason tracking
- death triggers
- trigger loop protection

### 4. Echo Swarm

Genre equivalent: token/go-wide.

Core fantasy:

> The board floods with temporary bodies that amplify teamups and trigger engines.

Key mechanics:

- Create Echo Units
- Echoes occupy tiles
- Echoes may or may not count for teamups depending on balance
- Echoes usually vanish instead of entering Ashes

Example cards:

- **Signal Nest**: At combat start, create two 1/1 Signal Echoes.
- **Scrap Chorus**: Echoes gain +1 attack.
- **Swarm Pattern**: Whenever an Echo is destroyed, the nearest Unit gains attack speed.

Implementation needs:

- Echo definitions
- summon placement
- board occupancy handling
- Echo cleanup

### 5. Relic Engines

Genre equivalent: artifacts.

Core fantasy:

> My board is a machine.

Key mechanics:

- Support-layer Relics
- Charge engines
- row/column projectiles
- adjacent buffs
- destroyed Relic recursion
- Ember/Tide commonly supports this

Example cards:

- **Rustline Cannon**: Support Relic. Fires down its row every 4 seconds.
- **Charge Battery**: Generates Combat Charge over time.
- **Junkwright**: On entry, restore a destroyed Relic from Ashes to a support tile.

Implementation needs:

- support layer
- Relic instance state
- Relic targeting
- destroyed Relic handling

### 6. Gear Stacking

Genre equivalent: equipment/auras.

Core fantasy:

> One unit becomes the carry because the whole build supports it.

Key mechanics:

- Attach Gear to Units
- Gear grants stats, keywords, or triggers
- Some Gear cares about position or aspect
- Some cards punish over-investment

Example cards:

- **Hookblade**: Attached Unit gains Pierce.
- **Mirror Harness**: First Barrier applied to this Unit each combat is copied.
- **Siphon Fang**: Attached Unit gains Siphon.

Implementation needs:

- attachments
- modifier system
- attachment cleanup on death/Phase

### 7. Field Control

Genre equivalent: enchantments, terrain, prisons.

Core fantasy:

> I change the rules of the battlefield.

Key mechanics:

- Global Fields
- Tile Fields
- aura-like attachments
- terrain layer later
- formation interaction

Example cards:

- **Gleaming Front**: Front row allies begin with Barrier.
- **Rot Soil**: When a Unit is destroyed on this tile, create a Husk Echo.
- **Mist Tax**: Enemy Techniques cost 1 more Combat Charge.

Implementation needs:

- persistent modifiers
- tile state
- effect duration
- recalculation rules

### 8. Airborne Tempo

Genre equivalent: flyers/evasion.

Core fantasy:

> My threats bypass the normal front line unless answered.

Key mechanics:

- Airborne Units target backline differently
- Anti-Air counters Airborne
- Air layer may be added later
- Gleam/Tide commonly supports this

Example cards:

- **Mistwing Scout**: Airborne. Targets the weakest backline enemy.
- **Skyhook Archer**: Anti-Air. Prioritizes Airborne enemies.
- **Cloud Patrol**: Airborne allies gain Barrier at combat start.

Implementation needs:

- keyword targeting rules
- optional future air layer

### 9. Technique Control

Genre equivalent: spellslinger/control/countermagic.

Core fantasy:

> I win by controlling timing, triggers, and resource flow.

Key mechanics:

- Combat Charge engines
- queued Techniques
- interruption effects
- spell-copying equivalents
- silence/slow/freeze statuses
- Tide commonly supports this

Example cards:

- **Pattern Break**: Interrupt the first enemy Technique.
- **Forked Signal**: Copy your next Technique at reduced strength.
- **Mist Snare**: Root the nearest enemy for 3 seconds.

Implementation needs:

- Technique cast events
- deterministic interrupt window
- copy effect
- status effects

### 10. Growth Ramp

Genre equivalent: ramp/big creatures.

Core fantasy:

> I survive early to field overwhelming threats.

Key mechanics:

- Extra Board Charge Capacity
- large Units
- scaling bodies
- Pierce
- Charge acceleration
- Bloom commonly supports this

Example cards:

- **Root Source**: +2 Board Charge Capacity but Techniques charge slower.
- **Sporeback Behemoth**: Large Unit with Pierce.
- **Wild Surge**: Temporarily increase Board Charge Capacity next planning phase.

Implementation needs:

- capacity modifiers
- cost reductions
- large-unit targeting

## Teamups

Teamups are TFT-like synergies and should become one of Packbound's signature
layers.

They should be clear, countable, and visible in the UI, but they should not be
isolated lanes. Cards should often carry two or three meaningful Aspects, tags,
classes, or engine labels so a player can discover accidental bridges.

Trait categories:

1. Aspect traits

- Ember
- Shade
- Bloom
- Tide
- Gleam

2. Creature, pet, and faction traits

- Scrapper
- Wisp
- Husk
- Beast
- Broker
- Guardian
- Warden
- Adept
- Tinkerer
- Scout
- Spore

3. Role and engine traits

- Offering
- Ashes
- Recall
- Phase
- Barrier
- Source Greed
- Relic Engine
- Echo Fodder
- Board Resource extraction later

4. Infrastructure traits

- Relics
- Fields
- Sources
- future board resource extractors

Desired interlocking behavior:

- Ember Scrappers plus Shade Ashes: Echoes and fragile Units die, destroyed
  triggers fire, Offering payoffs activate, and Ashes/Recall cards convert the
  losses into value.
- Bloom Bodies plus Shade Ashes: durable frontline buys time for Recall,
  Offering loops, and heavy Shade/Bloom payoffs.
- Cloudspire Phase plus Ember Scrappers: Phase and Barrier protect fragile
  death-trigger payoffs or tempo Units long enough for their engines to matter.
- Source Greed plus any archetype: flexible Sources let the player splash
  powerful off-aspect Techniques or expensive multi-aspect payoffs.

The goal is not only predesigned "set combos." The roguelite excitement comes
from a board that feels discovered: a pull that looked like fixing becomes a
splash, a duplicate turns into a carry, or a defensive tag unlocks an unexpected
payoff.

Current implementation note: traits/teamups now have content definitions,
card-side trait metadata, rules-side active/near-active summaries, and a debug
client display. Threshold labels are descriptive only. Trait combat effects are
future work.

Initial Aspect teamups:

### Ember

- 2: Ember Units gain slight attack speed.
- 4: First Ember Unit to destroy an enemy gains Quickstart again.
- 6: First attacks from Ember Units splash for minor damage.

### Shade

- 2: First allied destruction each combat grants Combat Charge.
- 4: First non-Echo Unit destroyed returns as a Husk Echo.
- 6: Once per combat, a destruction trigger repeats.

### Bloom

- 2: Bloom Units gain max health.
- 4: Largest Bloom Unit gains Pierce.
- 6: Bloom Units gain health over time.

### Tide

- 2: Techniques charge faster.
- 4: First Technique costs less.
- 6: First Technique is copied at reduced strength.

### Gleam

- 2: Adjacent allies gain minor armor or Barrier.
- 4: First Barrier refreshes after several seconds.
- 6: Backline Units begin with Barrier.

Initial Unit tag teamups:

- Scrapper
- Wisp
- Husk
- Beast
- Tinkerer
- Warden
- Adept
- Spore

Do not overbuild teamups initially. Five Aspect teamups and four to eight tag teamups are enough for the first prototype.

## Keywords

Initial player-facing keywords:

- Airborne
- Anti-Air
- Pierce
- Quickstart
- Siphon
- Bane
- Aegis
- Guard
- Barrier

MVP should implement only:

- Guard
- Barrier
- Quickstart
- Airborne
- Anti-Air
- Pierce

Later:

- Siphon
- Bane
- Aegis

## Status Effects

Initial statuses:

- Stunned
- Rooted
- Slowed
- Poisoned
- Burning
- Silenced
- Frozen
- Marked

MVP statuses:

- Stunned
- Slowed
- Poisoned
- Barrier

Keep status behavior simple and visible.

## Starter Kits

At run start, player chooses a starter kit.

Starter kits nudge the run but should not decide the entire build.

Examples:

### Scrapstarter

Includes:

- Ember Source
- cheap Scrapper Units
- one Relic
- one Offering payoff
- Ember Foundry pack bias

### Ashbinder

Includes:

- Shade Source
- recursive Units
- one Recall Technique
- one Ashes payoff
- Rotbloom pack bias

### Cloudshaper

Includes:

- Tide/Gleam Source support
- one Phase card
- one Airborne Unit
- one Barrier effect
- Cloudspire pack bias

### Wildroot

Includes:

- Bloom Source
- scaling Unit
- Poison or growth effect
- capacity support
- Rotbloom/Bloom pack bias

## MVP Gameplay Scope

The first playable build should include:

- Singleplayer finite run
- 10-13 rounds
- 3 starter kits
- 3 pack families
- 40-60 cards
- Sources and Board Charge Capacity
- Aspect access validation
- Units placed on board
- Techniques queued in Spellrail
- Relics on support layer
- Ashes zone
- Void zone
- Phase effect
- Recall effect
- Offering/death triggers
- Echo creation
- Basic teamups
- Basic pack opening
- Deterministic combat log
- Simple UI

The first playable build does not need:

- live multiplayer
- accounts
- ranked mode
- cosmetics
- full collection meta-progression
- final art
- hundreds of cards
- real 3D
- complex draft bots

## Next-Stage Implementation Sequence And Non-Goals

After the current debug-loop prototype, the next design systems should land in
this order unless playtesting shows a clearer blocker:

1. Trait/teamup data model and debug display.
2. Duplicate upgrade rules for Units and pets/Echoes.
3. Pack pricing and gold economy.
4. Economy cards that trade immediate board strength for future value.
5. Board resource prototype with deterministic tile extraction.
6. Richer visual board work only after the above systems produce interesting
   event logs and planning decisions.

Do not build these yet as side effects of unrelated tasks:

- live multiplayer
- backend accounts or persistence
- Pixi or richer rendering
- drag-and-drop
- card art
- large card expansion
- new simulator mechanics without focused tests
- deployment

## Future Multiplayer Direction

The architecture should support multiplayer later, but design should ship solo first.

Recommended multiplayer progression:

1. Singleplayer roguelite
2. Async ghost PvP using saved board snapshots
3. Co-op sealed run
4. Live lobby PvP only if the core game proves strong

Async ghost PvP is the most realistic first multiplayer feature.

Co-op also fits the pack-opening fantasy well because players can trade, coordinate Aspects, and solve bosses together.

Live TFT-like multiplayer is possible but should not drive the first build.

## IP and Originality Guidelines

This project should avoid looking like a direct clone of any existing trading card game.

Do:

- Use original terminology
- Use original aspect names
- Use original card names
- Use original iconography
- Use original frame layout
- Use original set names
- Use original rules phrasing
- Build mechanics around tactical board state and pack economy
- Let digital-only mechanics define the identity

Do not:

- Use exact card names from existing games
- Use exact keyword names when a distinct term is easy
- Use exact rules text templates from existing games
- Copy mana symbols or color symbols
- Copy card frame layouts
- Copy set symbols
- Copy famous archetype names verbatim
- Copy specific creature-type/color associations too tightly
- Build a one-to-one rules clone

Broad ideas like pack opening, units, resources, graveyard-like zones, automatic combat, and tactical positioning are genre concepts. The implementation, expression, names, visuals, and exact card designs must be original.

## Design Mantra

Packbound should feel like this:

> I opened a weird pile of cards. I found a line through it. My board became a machine. Then the machine fought for me.

The emotional loop is:

1. Anticipation
2. Pack opening
3. Evaluation
4. Build adjustment
5. Tactical positioning
6. Automated payoff
7. New problems
8. Greedy decisions

The player should regularly think:

> The responsible choice is fixing my board, but I really want to open the shiny pack.
