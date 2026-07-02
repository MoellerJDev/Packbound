import { z } from "zod";

import {
  ASPECTS,
  BOARD_LAYERS,
  CARD_DESIGN_ROLES,
  CARD_TYPES,
  KEYWORDS,
  RARITIES,
  ZONES,
  STATUS_EFFECTS,
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type CardDefinition,
  type PackDefinition
} from "@packbound/shared";

import { ENCOUNTER_KINDS, ENCOUNTER_TIERS, type EncounterDefinition } from "./encounters";
import type { StarterKitDefinition } from "./starterKits";

export const aspectSchema = z.enum(ASPECTS);
export const raritySchema = z.enum(RARITIES);
export const cardTypeSchema = z.enum(CARD_TYPES);
export const boardLayerSchema = z.enum(BOARD_LAYERS);
export const keywordSchema = z.enum(KEYWORDS);
export const statusEffectSchema = z.enum(STATUS_EFFECTS);
export const cardDesignRoleSchema = z.enum(CARD_DESIGN_ROLES);

export const cardDefIdSchema = z.string().min(1).transform(asCardDefId);
export const cardInstanceIdSchema = z.string().min(1).transform(asCardInstanceId);
export const packIdSchema = z.string().min(1).transform(asPackId);
export const playerIdSchema = z.string().min(1).transform(asPlayerId);

export const chargeCostSchema = z.object({
  generic: z.number().int().min(0),
  aspect: z.record(aspectSchema, z.number().int().min(0)).optional()
});

export const boardPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  layer: boardLayerSchema
});

export const cardModifierSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "StatModifier",
    "KeywordGrant",
    "CostModifier",
    "ChargeGenerationModifier",
    "DamageModifier",
    "TargetingModifier",
    "TriggerModifier"
  ]),
  sourceId: z.string().min(1),
  stackingRule: z.enum(["stack", "highestOnly", "refreshDuration", "uniqueBySource"]),
  metadata: z.record(z.unknown()).optional()
});

export const cardInstanceSchema = z.object({
  instanceId: cardInstanceIdSchema,
  defId: cardDefIdSchema,
  ownerId: playerIdSchema,
  zone: z.enum(ZONES),
  modifiers: z.array(cardModifierSchema),
  upgradeLevel: z.number().int().min(0),
  createdBy: cardInstanceIdSchema.optional(),
  isEcho: z.boolean().optional()
});

export const boardPlacementSchema = z.object({
  cardInstanceId: cardInstanceIdSchema,
  defId: cardDefIdSchema,
  ownerId: playerIdSchema,
  position: boardPositionSchema
});

export const boardStateSchema = z.object({
  placements: z.array(boardPlacementSchema)
});

export const sourceRowStateSchema = z.object({
  cards: z.array(cardInstanceSchema),
  maxSlots: z.number().int().min(0)
});

export const spellrailStateSchema = z.object({
  cards: z.array(cardInstanceSchema),
  maxSlots: z.number().int().min(0)
});

const noPayloadTriggers = [
  "OnCombatStart",
  "OnCombatEnd",
  "OnEntry",
  "OnLeaveBoard",
  "OnDestroyed",
  "OnOffered",
  "OnAllyDestroyed",
  "OnEnemyDestroyed",
  "OnSummoned",
  "OnTechniqueUsed",
  "OnTakeDamage",
  "OnDealDamage",
  "OnAttack",
  "OnKill",
  "OnCombatChargeGained",
  "WhenFirstAllyDestroyed",
  "WhenFirstEnemyDestroyed",
  "WhenFirstEnemyUsesTechnique"
] as const;

export const triggerSchema = z.union([
  z.object({ type: z.enum(noPayloadTriggers) }),
  z.object({
    type: z.literal("WhenCombatChargeAtLeast"),
    amount: z.number().min(0)
  }),
  z.object({
    type: z.literal("WhenFirstAllyBelowHealthPercent"),
    percent: z.number().min(1).max(100)
  }),
  z.object({
    type: z.literal("AfterSeconds"),
    seconds: z.number().min(0)
  })
]);

export const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Always") }),
  z.object({ type: z.literal("HasTag"), tag: z.string().min(1) }),
  z.object({ type: z.literal("HasKeyword"), keyword: keywordSchema }),
  z.object({ type: z.literal("IsDamaged") }),
  z.object({ type: z.literal("IsAdjacent") }),
  z.object({ type: z.literal("IsInRow"), row: z.number().int().min(0) }),
  z.object({ type: z.literal("IsInColumn"), col: z.number().int().min(0) }),
  z.object({ type: z.literal("HasStatus"), status: statusEffectSchema }),
  z.object({
    type: z.literal("CombatChargeAvailable"),
    amount: z.number().min(0)
  }),
  z.object({ type: z.literal("AshesHasCard") }),
  z.object({ type: z.literal("AllyDestroyedThisCombat") }),
  z.object({ type: z.literal("EnemyDestroyedThisCombat") })
]);

export const targetSelectorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Self") }),
  z.object({ type: z.literal("Source") }),
  z.object({ type: z.literal("NearestEnemy") }),
  z.object({ type: z.literal("LowestHealthAlliedUnit") }),
  z.object({ type: z.literal("LowestHealthEnemy") }),
  z.object({ type: z.literal("HighestAttackEnemy") }),
  z.object({ type: z.literal("RandomEnemy") }),
  z.object({ type: z.literal("AdjacentAllied") }),
  z.object({ type: z.literal("AdjacentEnemy") }),
  z.object({ type: z.literal("SameRowEnemy") }),
  z.object({ type: z.literal("SameColumnEnemy") }),
  z.object({ type: z.literal("AllAllied") }),
  z.object({ type: z.literal("AllEnemies") }),
  z.object({ type: z.literal("AlliedUnitWithTag"), tag: z.string().min(1) }),
  z.object({ type: z.literal("EnemyUnitWithTag"), tag: z.string().min(1) }),
  z.object({ type: z.literal("EmptyAdjacentTile") }),
  z.object({ type: z.literal("EmptyBacklineTile") }),
  z.object({
    type: z.literal("CardInAshes"),
    maxChargeCost: z.number().int().min(0).optional()
  }),
  z.object({ type: z.literal("CardInVoid") })
]);

export const abilityEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DealDamage"), amount: z.number().int().min(0) }),
  z.object({ type: z.literal("Heal"), amount: z.number().int().min(0) }),
  z.object({
    type: z.literal("ModifyStats"),
    attack: z.number().int().optional(),
    health: z.number().int().optional(),
    attackSpeed: z.number().optional()
  }),
  z.object({
    type: z.literal("ApplyStatus"),
    status: statusEffectSchema,
    durationMs: z.number().int().min(0).optional(),
    stacks: z.number().int().min(1).optional()
  }),
  z.object({ type: z.literal("RemoveStatus"), status: statusEffectSchema }),
  z.object({ type: z.literal("GrantKeyword"), keyword: keywordSchema }),
  z.object({ type: z.literal("RemoveKeyword"), keyword: keywordSchema }),
  z.object({
    type: z.literal("SummonEcho"),
    cardDefId: cardDefIdSchema,
    placement: z.enum(["FirstOpen", "AdjacentToSource", "Backline"])
  }),
  z.object({
    type: z.literal("SummonUnit"),
    cardDefId: cardDefIdSchema,
    placement: z.enum(["FirstOpen", "AdjacentToSource", "Backline"])
  }),
  z.object({ type: z.literal("Offer") }),
  z.object({ type: z.literal("Destroy") }),
  z.object({ type: z.literal("SendToVoid") }),
  z.object({ type: z.literal("ReturnFromVoid") }),
  z.object({
    type: z.literal("Phase"),
    delayMs: z.number().int().min(0),
    clearNegativeStatuses: z.boolean(),
    retriggerEntryEffects: z.boolean(),
    returnPreference: z.enum(["originalTile", "nearestOpenTile", "backline"])
  }),
  z.object({
    type: z.literal("Recall"),
    maxChargeCost: z.number().int().min(0).optional(),
    healthOverride: z.number().int().min(1).optional(),
    placement: z.enum(["FirstOpen", "Backline"]),
    becomesEcho: z.boolean().optional()
  }),
  z.object({ type: z.literal("MoveUnit"), to: boardPositionSchema }),
  z.object({ type: z.literal("Attach") }),
  z.object({ type: z.literal("Detach") }),
  z.object({
    type: z.literal("GainCombatCharge"),
    amount: z.number().min(0)
  }),
  z.object({
    type: z.literal("DrainCombatCharge"),
    amount: z.number().min(0)
  }),
  z.object({ type: z.literal("CopyTechnique") }),
  z.object({ type: z.literal("InterruptTechnique") }),
  z.object({
    type: z.literal("MillToAshes"),
    count: z.number().int().min(1)
  })
]);

export const abilitySchema = z.object({
  id: z.string().min(1),
  trigger: triggerSchema,
  condition: conditionSchema,
  target: targetSelectorSchema,
  effect: abilityEffectSchema
});

export const cardDesignMetadataSchema = z.object({
  role: cardDesignRoleSchema,
  archetypes: z.array(z.string().min(1)),
  complexity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  mechanicTags: z.array(z.string().min(1))
});

const baseCardSchema = {
  id: cardDefIdSchema,
  name: z.string().min(1),
  set: z.string().min(1),
  rarity: raritySchema,
  aspects: z.array(aspectSchema),
  cost: chargeCostSchema.optional(),
  tags: z.array(z.string().min(1)),
  keywords: z.array(keywordSchema),
  abilities: z.array(abilitySchema),
  rulesText: z.string().min(1).optional(),
  design: cardDesignMetadataSchema.optional()
};

const unitStatsSchema = z.object({
  attack: z.number().int().min(0),
  health: z.number().int().min(1),
  attackSpeed: z.number().min(0.1),
  range: z.number().int().min(1)
});

export const sourceDefinitionSchema = z.object({
  boardChargeCapacity: z.number().int().min(0),
  aspectAccess: z.array(aspectSchema),
  combatChargePerSecond: z.number().min(0)
});

export const techniqueDefinitionSchema = z.object({
  combatChargeCost: z.number().min(0),
  trigger: triggerSchema,
  target: targetSelectorSchema,
  effect: abilityEffectSchema
});

export const cardDefinitionSchema = z.discriminatedUnion("cardType", [
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Unit"),
    stats: unitStatsSchema
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Echo"),
    stats: unitStatsSchema
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Technique"),
    technique: techniqueDefinitionSchema
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Relic"),
    supportSlots: z.number().int().min(1)
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Gear"),
    attachment: z.object({
      legalCardTypes: z.array(z.enum(["Unit", "Echo"])).min(1)
    })
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Field"),
    scope: z.enum(["global", "tile", "attached"])
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Source"),
    source: sourceDefinitionSchema
  }),
  z.object({
    ...baseCardSchema,
    cardType: z.literal("Formation"),
    formation: z.object({
      formationId: z.string().min(1),
      maxActive: z.literal(1)
    })
  })
]);

export const packSlotDefinitionSchema = z.union([
  z.object({
    rarity: raritySchema,
    count: z.number().int().min(1),
    mythicUpgradeChance: z.number().min(0).max(1).optional()
  }),
  z.object({
    slotType: z.enum(["sourceOrSupport", "foilWildcard"]),
    count: z.number().int().min(1)
  })
]);

export const packDefinitionSchema = z.object({
  id: packIdSchema,
  name: z.string().min(1),
  setWeights: z.record(z.number().min(0)),
  slots: z.array(packSlotDefinitionSchema).min(1),
  tagBias: z.record(z.number().min(0))
});

export const encounterKindSchema = z.enum(ENCOUNTER_KINDS);
export const encounterTierSchema = z.enum(ENCOUNTER_TIERS);

export const encounterLoadoutSchema = z.object({
  playerId: playerIdSchema,
  board: boardStateSchema,
  sourceRow: sourceRowStateSchema,
  spellrail: spellrailStateSchema,
  startingAshes: z.array(cardInstanceSchema).optional()
});

export const encounterRewardProfileSchema = z.object({
  packBias: z.array(packIdSchema).optional(),
  bonusGold: z.number().int().min(0).optional()
});

export const encounterDefinitionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: encounterKindSchema,
    tier: encounterTierSchema,
    minRound: z.number().int().min(1),
    maxRound: z.number().int().min(1),
    difficulty: z.number().int().min(1),
    loadout: encounterLoadoutSchema,
    tags: z.array(z.string().min(1)).optional(),
    aspects: z.array(aspectSchema).optional(),
    rewardProfile: encounterRewardProfileSchema.optional()
  })
  .refine((encounter) => encounter.maxRound >= encounter.minRound, {
    message: "Encounter maxRound must be greater than or equal to minRound",
    path: ["maxRound"]
  });

export const starterKitDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  aspects: z.array(aspectSchema),
  pool: z.array(cardInstanceSchema),
  board: boardStateSchema,
  sourceRow: sourceRowStateSchema,
  spellrail: spellrailStateSchema,
  ashes: z.array(cardInstanceSchema).optional(),
  void: z.array(cardInstanceSchema).optional(),
  tags: z.array(z.string().min(1)).optional()
});

export const parseCardDefinitions = (raw: unknown): readonly CardDefinition[] =>
  z.array(cardDefinitionSchema).parse(raw) as readonly CardDefinition[];

export const parsePackDefinitions = (raw: unknown): readonly PackDefinition[] =>
  z.array(packDefinitionSchema).parse(raw) as readonly PackDefinition[];

export const parseEncounterDefinitions = (raw: unknown): readonly EncounterDefinition[] =>
  z.array(encounterDefinitionSchema).parse(raw) as readonly EncounterDefinition[];

export const parseStarterKitDefinitions = (
  raw: unknown
): readonly StarterKitDefinition[] =>
  z.array(starterKitDefinitionSchema).parse(raw) as readonly StarterKitDefinition[];
