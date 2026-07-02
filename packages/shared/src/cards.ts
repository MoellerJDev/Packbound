import type {
  AbilityDefinition,
  AbilityEffect,
  TargetSelector,
  Trigger
} from "./abilities";
import type { Aspect, AspectCountMap } from "./aspects";
import type { CardDefId, CardInstanceId, PackId, PlayerId } from "./ids";
import type { Zone } from "./zones";

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

export type ChargeCost = {
  readonly generic: number;
  readonly aspect?: AspectCountMap;
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

export type SourceRowState = {
  readonly cards: readonly CardInstance[];
  readonly maxSlots: number;
};

export type SpellrailState = {
  readonly cards: readonly CardInstance[];
  readonly maxSlots: number;
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
