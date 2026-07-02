export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CardDefId = Brand<string, "CardDefId">;
export type CardInstanceId = Brand<string, "CardInstanceId">;
export type UnitInstanceId = Brand<string, "UnitInstanceId">;
export type PermanentInstanceId = Brand<string, "PermanentInstanceId">;
export type TerrainInstanceId = Brand<string, "TerrainInstanceId">;
export type PlayerId = Brand<string, "PlayerId">;
export type RunId = Brand<string, "RunId">;
export type CombatId = Brand<string, "CombatId">;
export type PackId = Brand<string, "PackId">;

export const asCardDefId = (value: string): CardDefId => value as CardDefId;
export const asCardInstanceId = (value: string): CardInstanceId =>
  value as CardInstanceId;
export const asUnitInstanceId = (value: string): UnitInstanceId =>
  value as UnitInstanceId;
export const asPlayerId = (value: string): PlayerId => value as PlayerId;
export const asPackId = (value: string): PackId => value as PackId;

export const ASPECTS = ["Ember", "Shade", "Bloom", "Tide", "Gleam"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

export const CARD_TYPES = [
  "Unit",
  "Technique",
  "Relic",
  "Gear",
  "Field",
  "Source",
  "Formation",
  "Echo"
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const ZONES = [
  "pack",
  "pool",
  "bench",
  "board",
  "spellrail",
  "sourceRow",
  "ashes",
  "void",
  "removed"
] as const;
export type Zone = (typeof ZONES)[number];

export const BOARD_LAYERS = ["ground", "air", "support", "terrain"] as const;
export type BoardLayer = (typeof BOARD_LAYERS)[number];

export const KEYWORDS = [
  "Airborne",
  "AntiAir",
  "Pierce",
  "Quickstart",
  "Siphon",
  "Bane",
  "Aegis",
  "Guard",
  "Barrier"
] as const;
export type Keyword = (typeof KEYWORDS)[number];

export const STATUS_EFFECTS = [
  "Stunned",
  "Rooted",
  "Slowed",
  "Poisoned",
  "Burning",
  "Silenced",
  "Frozen",
  "Marked",
  "Barrier"
] as const;
export type StatusEffectType = (typeof STATUS_EFFECTS)[number];

export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;
export const COMBAT_TICK_MS = 100;
export const MAX_COMBAT_DURATION_MS = 90_000;
export const MAX_COMBAT_EVENTS = 5_000;
export const MAX_TRIGGER_DEPTH = 20;

export type PlayerSide = "playerA" | "playerB";
export type CombatWinner = PlayerSide | "draw";
export type DamageType = "attack" | "technique" | "relic" | "status" | "trigger";
export type DestructionReason =
  | "combatDamage"
  | "techniqueDamage"
  | "offered"
  | "effectDestroy"
  | "poison"
  | "burning"
  | "unknown";

export type AspectCountMap = Partial<Record<Aspect, number>>;

export type ChargeCost = {
  readonly generic: number;
  readonly aspect?: AspectCountMap;
};

export type BoardPosition = {
  readonly row: number;
  readonly col: number;
  readonly layer: BoardLayer;
};

export type BoardSlot = {
  readonly ground?: UnitInstanceId;
  readonly air?: UnitInstanceId;
  readonly support?: PermanentInstanceId;
  readonly terrain?: TerrainInstanceId;
};

export type ActiveStatus = {
  readonly type: StatusEffectType;
  readonly sourceId?: string;
  readonly remainingMs?: number;
  readonly stacks?: number;
  readonly metadata?: Record<string, unknown>;
};

export type CardModifier = {
  readonly id: string;
  readonly type:
    | "StatModifier"
    | "KeywordGrant"
    | "CostModifier"
    | "ChargeGenerationModifier"
    | "DamageModifier"
    | "TargetingModifier"
    | "TriggerModifier";
  readonly sourceId: string;
  readonly stackingRule: "stack" | "highestOnly" | "refreshDuration" | "uniqueBySource";
  readonly metadata?: Record<string, unknown>;
};

export type Trigger =
  | { readonly type: "OnCombatStart" }
  | { readonly type: "OnCombatEnd" }
  | { readonly type: "OnEntry" }
  | { readonly type: "OnLeaveBoard" }
  | { readonly type: "OnDestroyed" }
  | { readonly type: "OnOffered" }
  | { readonly type: "OnAllyDestroyed" }
  | { readonly type: "OnEnemyDestroyed" }
  | { readonly type: "OnSummoned" }
  | { readonly type: "OnTechniqueUsed" }
  | { readonly type: "OnTakeDamage" }
  | { readonly type: "OnDealDamage" }
  | { readonly type: "OnAttack" }
  | { readonly type: "OnKill" }
  | { readonly type: "OnCombatChargeGained" }
  | { readonly type: "WhenCombatChargeAtLeast"; readonly amount: number }
  | { readonly type: "WhenFirstAllyDestroyed" }
  | { readonly type: "WhenFirstEnemyDestroyed" }
  | { readonly type: "WhenFirstEnemyUsesTechnique" }
  | {
      readonly type: "WhenFirstAllyBelowHealthPercent";
      readonly percent: number;
    }
  | { readonly type: "AfterSeconds"; readonly seconds: number };

export type Condition =
  | { readonly type: "Always" }
  | { readonly type: "HasTag"; readonly tag: string }
  | { readonly type: "HasKeyword"; readonly keyword: Keyword }
  | { readonly type: "IsDamaged" }
  | { readonly type: "IsAdjacent" }
  | { readonly type: "IsInRow"; readonly row: number }
  | { readonly type: "IsInColumn"; readonly col: number }
  | { readonly type: "HasStatus"; readonly status: StatusEffectType }
  | { readonly type: "CombatChargeAvailable"; readonly amount: number }
  | { readonly type: "AshesHasCard" }
  | { readonly type: "AllyDestroyedThisCombat" }
  | { readonly type: "EnemyDestroyedThisCombat" };

export type TargetSelector =
  | { readonly type: "Self" }
  | { readonly type: "Source" }
  | { readonly type: "NearestEnemy" }
  | { readonly type: "LowestHealthAlliedUnit" }
  | { readonly type: "LowestHealthEnemy" }
  | { readonly type: "HighestAttackEnemy" }
  | { readonly type: "RandomEnemy" }
  | { readonly type: "AdjacentAllied" }
  | { readonly type: "AdjacentEnemy" }
  | { readonly type: "SameRowEnemy" }
  | { readonly type: "SameColumnEnemy" }
  | { readonly type: "AllAllied" }
  | { readonly type: "AllEnemies" }
  | { readonly type: "AlliedUnitWithTag"; readonly tag: string }
  | { readonly type: "EnemyUnitWithTag"; readonly tag: string }
  | { readonly type: "EmptyAdjacentTile" }
  | { readonly type: "EmptyBacklineTile" }
  | { readonly type: "CardInAshes"; readonly maxChargeCost?: number }
  | { readonly type: "CardInVoid" };

export type PhaseOptions = {
  readonly delayMs: number;
  readonly clearNegativeStatuses: boolean;
  readonly retriggerEntryEffects: boolean;
  readonly returnPreference: "originalTile" | "nearestOpenTile" | "backline";
};

export type AbilityEffect =
  | { readonly type: "DealDamage"; readonly amount: number }
  | { readonly type: "Heal"; readonly amount: number }
  | {
      readonly type: "ModifyStats";
      readonly attack?: number;
      readonly health?: number;
      readonly attackSpeed?: number;
    }
  | {
      readonly type: "ApplyStatus";
      readonly status: StatusEffectType;
      readonly durationMs?: number;
      readonly stacks?: number;
    }
  | { readonly type: "RemoveStatus"; readonly status: StatusEffectType }
  | { readonly type: "GrantKeyword"; readonly keyword: Keyword }
  | { readonly type: "RemoveKeyword"; readonly keyword: Keyword }
  | {
      readonly type: "SummonEcho";
      readonly cardDefId: CardDefId;
      readonly placement: "FirstOpen" | "AdjacentToSource" | "Backline";
    }
  | {
      readonly type: "SummonUnit";
      readonly cardDefId: CardDefId;
      readonly placement: "FirstOpen" | "AdjacentToSource" | "Backline";
    }
  | { readonly type: "Offer" }
  | { readonly type: "Destroy" }
  | { readonly type: "SendToVoid" }
  | { readonly type: "ReturnFromVoid" }
  | ({ readonly type: "Phase" } & PhaseOptions)
  | {
      readonly type: "Recall";
      readonly maxChargeCost?: number;
      readonly healthOverride?: number;
      readonly placement: "FirstOpen" | "Backline";
      readonly becomesEcho?: boolean;
    }
  | { readonly type: "MoveUnit"; readonly to: BoardPosition }
  | { readonly type: "Attach" }
  | { readonly type: "Detach" }
  | { readonly type: "GainCombatCharge"; readonly amount: number }
  | { readonly type: "DrainCombatCharge"; readonly amount: number }
  | { readonly type: "CopyTechnique" }
  | { readonly type: "InterruptTechnique" }
  | { readonly type: "MillToAshes"; readonly count: number };

export type AbilityDefinition = {
  readonly id: string;
  readonly trigger: Trigger;
  readonly condition: Condition;
  readonly target: TargetSelector;
  readonly effect: AbilityEffect;
};

export type UnitStats = {
  readonly attack: number;
  readonly health: number;
  readonly attackSpeed: number;
  readonly range: number;
};

export type SourceDefinition = {
  readonly boardChargeCapacity: number;
  readonly aspectAccess: readonly Aspect[];
  readonly combatChargePerSecond: number;
};

export type TechniqueDefinition = {
  readonly combatChargeCost: number;
  readonly trigger: Trigger;
  readonly target: TargetSelector;
  readonly effect: AbilityEffect;
};

export type BaseCardDefinition = {
  readonly id: CardDefId;
  readonly name: string;
  readonly set: string;
  readonly rarity: Rarity;
  readonly cardType: CardType;
  readonly aspects: readonly Aspect[];
  readonly cost?: ChargeCost;
  readonly tags: readonly string[];
  readonly keywords: readonly Keyword[];
  readonly abilities: readonly AbilityDefinition[];
  readonly rulesText?: string;
};

export type UnitCardDefinition = BaseCardDefinition & {
  readonly cardType: "Unit";
  readonly stats: UnitStats;
};

export type EchoCardDefinition = BaseCardDefinition & {
  readonly cardType: "Echo";
  readonly stats: UnitStats;
};

export type TechniqueCardDefinition = BaseCardDefinition & {
  readonly cardType: "Technique";
  readonly technique: TechniqueDefinition;
};

export type RelicCardDefinition = BaseCardDefinition & {
  readonly cardType: "Relic";
  readonly supportSlots: number;
};

export type GearCardDefinition = BaseCardDefinition & {
  readonly cardType: "Gear";
  readonly attachment: {
    readonly legalCardTypes: readonly ("Unit" | "Echo")[];
  };
};

export type FieldCardDefinition = BaseCardDefinition & {
  readonly cardType: "Field";
  readonly scope: "global" | "tile" | "attached";
};

export type SourceCardDefinition = BaseCardDefinition & {
  readonly cardType: "Source";
  readonly source: SourceDefinition;
};

export type FormationCardDefinition = BaseCardDefinition & {
  readonly cardType: "Formation";
  readonly formation: {
    readonly formationId: string;
    readonly maxActive: 1;
  };
};

export type CardDefinition =
  | UnitCardDefinition
  | TechniqueCardDefinition
  | RelicCardDefinition
  | GearCardDefinition
  | FieldCardDefinition
  | SourceCardDefinition
  | FormationCardDefinition
  | EchoCardDefinition;

export type PackSlotDefinition =
  | {
      readonly rarity: Rarity;
      readonly count: number;
      readonly mythicUpgradeChance?: number;
    }
  | {
      readonly slotType: "sourceOrSupport" | "foilWildcard";
      readonly count: number;
    };

export type PackDefinition = {
  readonly id: PackId;
  readonly name: string;
  readonly setWeights: Readonly<Record<string, number>>;
  readonly slots: readonly PackSlotDefinition[];
  readonly tagBias: Readonly<Record<string, number>>;
};

export type CardInstance = {
  readonly instanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly zone: Zone;
  readonly modifiers: readonly CardModifier[];
  readonly upgradeLevel: number;
  readonly createdBy?: CardInstanceId;
  readonly isEcho?: boolean;
};

export type BoardPlacement = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly position: BoardPosition;
};

export type BoardState = {
  readonly placements: readonly BoardPlacement[];
};

export type SourceRowState = {
  readonly cards: readonly CardInstance[];
  readonly maxSlots: number;
};

export type SpellrailState = {
  readonly cards: readonly CardInstance[];
  readonly maxSlots: number;
};

export type ActiveTeamup = {
  readonly teamupId: string;
  readonly count: number;
  readonly tier: number;
  readonly sourceInstanceIds: readonly CardInstanceId[];
};

export type ValidationError = {
  readonly code: string;
  readonly message: string;
  readonly cardInstanceId?: CardInstanceId;
  readonly position?: BoardPosition;
};

export type ValidationWarning = {
  readonly code: string;
  readonly message: string;
  readonly cardInstanceId?: CardInstanceId;
  readonly position?: BoardPosition;
};

export type ValidationResult = {
  readonly ok: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
};

export type PackSlotResult = {
  readonly slotIndex: number;
  readonly slotType: "rarity" | "sourceOrSupport" | "foilWildcard";
  readonly requestedRarity?: Rarity;
  readonly actualRarity: Rarity;
  readonly cardDefId: CardDefId;
  readonly cardInstanceId: CardInstanceId;
};

export type PackOpenResult = {
  readonly packId: PackId;
  readonly seed: string;
  readonly cards: readonly CardInstance[];
  readonly slots: readonly PackSlotResult[];
};

export type UnitInstance = {
  readonly unitId: UnitInstanceId;
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly side: PlayerSide;
  readonly position: BoardPosition;
  readonly attack: number;
  readonly maxHealth: number;
  readonly currentHealth: number;
  readonly attackSpeed: number;
  readonly range: number;
  readonly keywords: readonly Keyword[];
  readonly statuses: readonly ActiveStatus[];
  readonly attachments: readonly CardInstanceId[];
  readonly attackTimerMs: number;
  readonly summonedThisCombat: boolean;
  readonly isEcho: boolean;
};

export type CombatEvent =
  | { readonly type: "CombatStarted"; readonly timeMs: number }
  | {
      readonly type: "TraitActivated";
      readonly timeMs: number;
      readonly playerId: PlayerId;
      readonly traitId: string;
      readonly tier: number;
    }
  | {
      readonly type: "CombatChargeGained";
      readonly timeMs: number;
      readonly playerId: PlayerId;
      readonly amount: number;
    }
  | {
      readonly type: "UnitMoved";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly from: BoardPosition;
      readonly to: BoardPosition;
    }
  | {
      readonly type: "UnitAttacked";
      readonly timeMs: number;
      readonly attackerId: UnitInstanceId;
      readonly targetId: UnitInstanceId;
    }
  | {
      readonly type: "DamageDealt";
      readonly timeMs: number;
      readonly sourceId?: string;
      readonly targetId: UnitInstanceId;
      readonly amount: number;
      readonly damageType: DamageType;
    }
  | {
      readonly type: "StatusApplied";
      readonly timeMs: number;
      readonly targetId: UnitInstanceId;
      readonly status: StatusEffectType;
      readonly durationMs?: number;
    }
  | {
      readonly type: "StatusRemoved";
      readonly timeMs: number;
      readonly targetId: UnitInstanceId;
      readonly status: StatusEffectType;
      readonly reason: "expired" | "consumed" | "cleansed";
    }
  | {
      readonly type: "UnitDestroyed";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly reason: DestructionReason;
    }
  | {
      readonly type: "UnitSummoned";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly cardInstanceId: CardInstanceId;
      readonly position: BoardPosition;
    }
  | {
      readonly type: "UnitRecalled";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly from: "ashes";
      readonly position: BoardPosition;
    }
  | {
      readonly type: "UnitPhasedOut";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
    }
  | {
      readonly type: "UnitPhasedIn";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly position: BoardPosition;
    }
  | {
      readonly type: "TechniqueQueued";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "TechniqueUsed";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly targets: readonly string[];
    }
  | {
      readonly type: "TechniqueInterrupted";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly byCardInstanceId?: CardInstanceId;
    }
  | {
      readonly type: "CombatEnded";
      readonly timeMs: number;
      readonly winner: CombatWinner;
    };

export type SimulationWarning = {
  readonly code: string;
  readonly message: string;
};

export const positionKey = (position: BoardPosition): string =>
  `${position.layer}:${position.row}:${position.col}`;

export const positionsEqual = (a: BoardPosition, b: BoardPosition): boolean =>
  a.row === b.row && a.col === b.col && a.layer === b.layer;

export const isBoardPositionInBounds = (position: BoardPosition): boolean =>
  position.row >= 0 &&
  position.row < BOARD_ROWS &&
  position.col >= 0 &&
  position.col < BOARD_COLS;

export const chargeCostTotal = (cost: ChargeCost | undefined): number => {
  if (!cost) {
    return 0;
  }

  const aspectTotal = Object.values(cost.aspect ?? {}).reduce(
    (sum, value) => sum + value,
    0
  );
  return cost.generic + aspectTotal;
};
