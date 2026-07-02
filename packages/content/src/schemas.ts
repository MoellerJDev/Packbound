import { z } from "zod";

import {
  ASPECTS,
  BOARD_LAYERS,
  CARD_TYPES,
  KEYWORDS,
  RARITIES,
  STATUS_EFFECTS,
  asCardDefId,
  asPackId,
  type CardDefinition,
  type PackDefinition
} from "@packbound/shared";

export const aspectSchema = z.enum(ASPECTS);
export const raritySchema = z.enum(RARITIES);
export const cardTypeSchema = z.enum(CARD_TYPES);
export const boardLayerSchema = z.enum(BOARD_LAYERS);
export const keywordSchema = z.enum(KEYWORDS);
export const statusEffectSchema = z.enum(STATUS_EFFECTS);

export const cardDefIdSchema = z.string().min(1).transform(asCardDefId);
export const packIdSchema = z.string().min(1).transform(asPackId);

export const chargeCostSchema = z.object({
  generic: z.number().int().min(0),
  aspect: z.record(aspectSchema, z.number().int().min(0)).optional()
});

export const boardPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  layer: boardLayerSchema
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
  rulesText: z.string().min(1).optional()
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

export const parseCardDefinitions = (raw: unknown): readonly CardDefinition[] =>
  z.array(cardDefinitionSchema).parse(raw) as readonly CardDefinition[];

export const parsePackDefinitions = (raw: unknown): readonly PackDefinition[] =>
  z.array(packDefinitionSchema).parse(raw) as readonly PackDefinition[];
