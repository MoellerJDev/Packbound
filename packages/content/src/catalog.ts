import {
  BOARD_COLS,
  BOARD_ROWS,
  chargeCostTotal,
  type AbilityEffect,
  type BoardLayer,
  type BoardPlacement,
  type CardDefId,
  type CardDefinition,
  type CardInstance,
  type PackDefinition,
  type PackId,
  type PlayerId,
  asPlayerId
} from "@packbound/shared";

import type { EncounterDefinition } from "./encounters";
import type { StarterKitDefinition } from "./starterKits";
import {
  parseCardDefinitions,
  parseEncounterDefinitions,
  parsePackDefinitions,
  parseStarterKitDefinitions
} from "./schemas";

export type ContentCatalog = {
  readonly cards: readonly CardDefinition[];
  readonly packs: readonly PackDefinition[];
  readonly encounters: readonly EncounterDefinition[];
  readonly starterKits: readonly StarterKitDefinition[];
  readonly cardsById: ReadonlyMap<CardDefId, CardDefinition>;
  readonly packsById: ReadonlyMap<PackId, PackDefinition>;
  readonly encountersById: ReadonlyMap<string, EncounterDefinition>;
  readonly starterKitsById: ReadonlyMap<string, StarterKitDefinition>;
};

export class ContentValidationError extends Error {
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(`Content validation failed: ${issues.join("; ")}`);
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

export type LoadContentInput = {
  readonly cards: unknown;
  readonly packs: unknown;
  readonly encounters?: unknown;
  readonly starterKits?: unknown;
};

type EffectReferenceValidator = (
  effect: AbilityEffect,
  context: {
    readonly card: CardDefinition;
    readonly cardsById: ReadonlyMap<CardDefId, CardDefinition>;
    readonly issues: string[];
  }
) => void;

const validateSummonReference =
  (
    effectType: "SummonEcho" | "SummonUnit",
    legalCardTypes: readonly CardDefinition["cardType"][]
  ): EffectReferenceValidator =>
  (effect, context) => {
    if (effect.type !== effectType) {
      return;
    }

    const referenced = context.cardsById.get(effect.cardDefId);
    if (!referenced) {
      context.issues.push(
        `${context.card.id} ${effect.type} references unknown card definition '${effect.cardDefId}'`
      );
      return;
    }

    if (!legalCardTypes.includes(referenced.cardType)) {
      context.issues.push(
        `${context.card.id} ${effect.type} references ${referenced.id}, but ${referenced.cardType} is not summonable by that effect`
      );
    }
  };

const effectReferenceValidators: readonly EffectReferenceValidator[] = [
  validateSummonReference("SummonEcho", ["Echo", "Unit"]),
  validateSummonReference("SummonUnit", ["Unit", "Echo"])
];

const effectsForCard = (card: CardDefinition): readonly AbilityEffect[] => {
  const abilityEffects = card.abilities.map((ability) => ability.effect);
  if (card.cardType !== "Technique") {
    return abilityEffects;
  }
  return [...abilityEffects, card.technique.effect];
};

const boardLayersForCard = (card: CardDefinition): readonly BoardLayer[] | undefined => {
  switch (card.cardType) {
    case "Unit":
    case "Echo":
      return ["ground", "air"];
    case "Relic":
      return ["support"];
    case "Field":
      return ["support", "terrain"];
    default:
      return undefined;
  }
};

const validateEncounterCardInstance = (
  encounter: EncounterDefinition,
  card: CardInstance,
  expectedZone: CardInstance["zone"],
  expectedCardType: CardDefinition["cardType"],
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): CardDefinition | undefined => {
  const def = cardsById.get(card.defId);
  if (!def) {
    issues.push(`${encounter.id} references unknown card definition '${card.defId}'`);
    return undefined;
  }

  if (card.ownerId !== encounter.loadout.playerId) {
    issues.push(
      `${encounter.id} card ${card.instanceId} owner does not match encounter playerId`
    );
  }

  if (card.zone !== expectedZone) {
    issues.push(
      `${encounter.id} card ${card.instanceId} must be in ${expectedZone}, not ${card.zone}`
    );
  }

  if (def.cardType !== expectedCardType) {
    issues.push(
      `${encounter.id} card ${card.instanceId} references ${def.id}, but ${def.cardType} is not valid for ${expectedZone}`
    );
  }

  return def;
};

const trackEncounterInstanceId = (
  encounter: EncounterDefinition,
  cardInstanceId: string,
  seenInstanceIds: Set<string>,
  issues: string[]
): void => {
  if (seenInstanceIds.has(cardInstanceId)) {
    issues.push(
      `${encounter.id} encounter reuses card instance id '${cardInstanceId}' across zones`
    );
    return;
  }
  seenInstanceIds.add(cardInstanceId);
};

const validateEncounterBoardPlacement = (
  encounter: EncounterDefinition,
  placement: BoardPlacement,
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): void => {
  const def = cardsById.get(placement.defId);
  if (!def) {
    issues.push(
      `${encounter.id} board references unknown card definition '${placement.defId}'`
    );
    return;
  }

  if (placement.ownerId !== encounter.loadout.playerId) {
    issues.push(
      `${encounter.id} board placement ${placement.cardInstanceId} owner does not match encounter playerId`
    );
  }

  if (placement.position.row >= BOARD_ROWS || placement.position.col >= BOARD_COLS) {
    issues.push(
      `${encounter.id} board placement ${placement.cardInstanceId} is outside the board`
    );
  }

  const legalLayers = boardLayersForCard(def);
  if (!legalLayers) {
    issues.push(
      `${encounter.id} board placement ${placement.cardInstanceId} references ${def.cardType}, which cannot be placed on the encounter board`
    );
    return;
  }

  if (!legalLayers.includes(placement.position.layer)) {
    issues.push(
      `${encounter.id} board placement ${placement.cardInstanceId} puts ${def.cardType} on invalid ${placement.position.layer} layer`
    );
  }
};

const validateEncounter = (
  encounter: EncounterDefinition,
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): void => {
  const seenInstanceIds = new Set<string>();

  for (const placement of encounter.loadout.board.placements) {
    trackEncounterInstanceId(
      encounter,
      placement.cardInstanceId,
      seenInstanceIds,
      issues
    );
    validateEncounterBoardPlacement(encounter, placement, cardsById, issues);
  }

  if (encounter.loadout.sourceRow.cards.length > encounter.loadout.sourceRow.maxSlots) {
    issues.push(`${encounter.id} source row exceeds its max slot count`);
  }

  for (const card of encounter.loadout.sourceRow.cards) {
    trackEncounterInstanceId(encounter, card.instanceId, seenInstanceIds, issues);
    validateEncounterCardInstance(
      encounter,
      card,
      "sourceRow",
      "Source",
      cardsById,
      issues
    );
  }

  if (encounter.loadout.spellrail.cards.length > encounter.loadout.spellrail.maxSlots) {
    issues.push(`${encounter.id} spellrail exceeds its max slot count`);
  }

  for (const card of encounter.loadout.spellrail.cards) {
    trackEncounterInstanceId(encounter, card.instanceId, seenInstanceIds, issues);
    validateEncounterCardInstance(
      encounter,
      card,
      "spellrail",
      "Technique",
      cardsById,
      issues
    );
  }

  for (const card of encounter.loadout.startingAshes ?? []) {
    trackEncounterInstanceId(encounter, card.instanceId, seenInstanceIds, issues);
    const def = cardsById.get(card.defId);
    if (!def) {
      issues.push(
        `${encounter.id} starting Ashes references unknown card definition '${card.defId}'`
      );
      continue;
    }
    if (card.ownerId !== encounter.loadout.playerId) {
      issues.push(
        `${encounter.id} Ashes card ${card.instanceId} owner does not match encounter playerId`
      );
    }
    if (card.zone !== "ashes") {
      issues.push(
        `${encounter.id} Ashes card ${card.instanceId} must be in ashes, not ${card.zone}`
      );
    }
    if (def.cardType !== "Unit" && def.cardType !== "Echo") {
      issues.push(
        `${encounter.id} Ashes card ${card.instanceId} references ${def.cardType}, which cannot start in encounter Ashes`
      );
    }
  }
};

const starterKitPlayerId = (starterKitId: string): PlayerId =>
  asPlayerId(`starter:${starterKitId}`);

const validateStarterKitCardInstance = (
  starterKit: StarterKitDefinition,
  card: CardInstance,
  expectedZone: CardInstance["zone"],
  expectedOwnerId: PlayerId,
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): CardDefinition | undefined => {
  const def = cardsById.get(card.defId);
  if (!def) {
    issues.push(
      `${starterKit.id} starter kit references unknown card definition '${card.defId}'`
    );
    return undefined;
  }

  if (card.ownerId !== expectedOwnerId) {
    issues.push(
      `${starterKit.id} starter kit card ${card.instanceId} owner must be ${expectedOwnerId}`
    );
  }

  if (card.zone !== expectedZone) {
    issues.push(
      `${starterKit.id} starter kit card ${card.instanceId} must be in ${expectedZone}, not ${card.zone}`
    );
  }

  return def;
};

const validateStarterKitBoardPlacement = (
  starterKit: StarterKitDefinition,
  placement: BoardPlacement,
  expectedOwnerId: PlayerId,
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): void => {
  const def = cardsById.get(placement.defId);
  if (!def) {
    issues.push(
      `${starterKit.id} starter kit board references unknown card definition '${placement.defId}'`
    );
    return;
  }

  if (placement.ownerId !== expectedOwnerId) {
    issues.push(
      `${starterKit.id} starter kit board placement ${placement.cardInstanceId} owner must be ${expectedOwnerId}`
    );
  }

  if (placement.position.row >= BOARD_ROWS || placement.position.col >= BOARD_COLS) {
    issues.push(
      `${starterKit.id} starter kit board placement ${placement.cardInstanceId} is outside the board`
    );
  }

  const legalLayers = boardLayersForCard(def);
  if (!legalLayers) {
    issues.push(
      `${starterKit.id} starter kit board placement ${placement.cardInstanceId} references ${def.cardType}, which cannot be placed on the board`
    );
    return;
  }

  if (!legalLayers.includes(placement.position.layer)) {
    issues.push(
      `${starterKit.id} starter kit board placement ${placement.cardInstanceId} puts ${def.cardType} on invalid ${placement.position.layer} layer`
    );
  }
};

const trackStarterKitInstanceId = (
  starterKit: StarterKitDefinition,
  cardInstanceId: string,
  seenInstanceIds: Set<string>,
  issues: string[]
): void => {
  if (seenInstanceIds.has(cardInstanceId)) {
    issues.push(
      `${starterKit.id} starter kit reuses card instance id '${cardInstanceId}' across zones`
    );
    return;
  }
  seenInstanceIds.add(cardInstanceId);
};

const validateStarterKit = (
  starterKit: StarterKitDefinition,
  cardsById: ReadonlyMap<CardDefId, CardDefinition>,
  issues: string[]
): void => {
  const expectedOwnerId = starterKitPlayerId(starterKit.id);
  const seenInstanceIds = new Set<string>();

  for (const card of starterKit.pool) {
    trackStarterKitInstanceId(starterKit, card.instanceId, seenInstanceIds, issues);
    validateStarterKitCardInstance(
      starterKit,
      card,
      "pool",
      expectedOwnerId,
      cardsById,
      issues
    );
  }

  for (const placement of starterKit.board.placements) {
    trackStarterKitInstanceId(
      starterKit,
      placement.cardInstanceId,
      seenInstanceIds,
      issues
    );
    validateStarterKitBoardPlacement(
      starterKit,
      placement,
      expectedOwnerId,
      cardsById,
      issues
    );
  }

  if (starterKit.sourceRow.cards.length > starterKit.sourceRow.maxSlots) {
    issues.push(`${starterKit.id} starter kit source row exceeds its max slot count`);
  }
  for (const card of starterKit.sourceRow.cards) {
    trackStarterKitInstanceId(starterKit, card.instanceId, seenInstanceIds, issues);
    const def = validateStarterKitCardInstance(
      starterKit,
      card,
      "sourceRow",
      expectedOwnerId,
      cardsById,
      issues
    );
    if (def && def.cardType !== "Source") {
      issues.push(
        `${starterKit.id} starter kit source row card ${card.instanceId} references ${def.cardType}, not Source`
      );
    }
  }

  if (starterKit.spellrail.cards.length > starterKit.spellrail.maxSlots) {
    issues.push(`${starterKit.id} starter kit spellrail exceeds its max slot count`);
  }
  for (const card of starterKit.spellrail.cards) {
    trackStarterKitInstanceId(starterKit, card.instanceId, seenInstanceIds, issues);
    const def = validateStarterKitCardInstance(
      starterKit,
      card,
      "spellrail",
      expectedOwnerId,
      cardsById,
      issues
    );
    if (def && def.cardType !== "Technique") {
      issues.push(
        `${starterKit.id} starter kit spellrail card ${card.instanceId} references ${def.cardType}, not Technique`
      );
    }
  }

  for (const card of starterKit.ashes ?? []) {
    trackStarterKitInstanceId(starterKit, card.instanceId, seenInstanceIds, issues);
    validateStarterKitCardInstance(
      starterKit,
      card,
      "ashes",
      expectedOwnerId,
      cardsById,
      issues
    );
  }

  for (const card of starterKit.void ?? []) {
    trackStarterKitInstanceId(starterKit, card.instanceId, seenInstanceIds, issues);
    validateStarterKitCardInstance(
      starterKit,
      card,
      "void",
      expectedOwnerId,
      cardsById,
      issues
    );
  }
};

export const loadContentCatalog = (input: LoadContentInput): ContentCatalog => {
  const cards = parseCardDefinitions(input.cards);
  const packs = parsePackDefinitions(input.packs);
  const encounters = parseEncounterDefinitions(input.encounters ?? []);
  const starterKits = parseStarterKitDefinitions(input.starterKits ?? []);
  const issues: string[] = [];

  const cardsById = new Map<CardDefId, CardDefinition>();
  for (const card of cards) {
    if (cardsById.has(card.id)) {
      issues.push(`Duplicate card definition id: ${card.id}`);
      continue;
    }
    cardsById.set(card.id, card);
  }

  const packsById = new Map<PackId, PackDefinition>();
  for (const pack of packs) {
    if (packsById.has(pack.id)) {
      issues.push(`Duplicate pack definition id: ${pack.id}`);
      continue;
    }
    packsById.set(pack.id, pack);
  }

  const encountersById = new Map<string, EncounterDefinition>();
  for (const encounter of encounters) {
    if (encountersById.has(encounter.id)) {
      issues.push(`Duplicate encounter definition id: ${encounter.id}`);
      continue;
    }
    encountersById.set(encounter.id, encounter);
  }

  const starterKitsById = new Map<string, StarterKitDefinition>();
  for (const starterKit of starterKits) {
    if (starterKitsById.has(starterKit.id)) {
      issues.push(`Duplicate starter kit definition id: ${starterKit.id}`);
      continue;
    }
    starterKitsById.set(starterKit.id, starterKit);
  }

  const knownSets = new Set(cards.map((card) => card.set));

  for (const pack of packs) {
    for (const setId of Object.keys(pack.setWeights)) {
      if (!knownSets.has(setId)) {
        issues.push(`${pack.id} references unknown set '${setId}'`);
      }
    }

    for (const [slotIndex, slot] of pack.slots.entries()) {
      if ("rarity" in slot) {
        const hasRarity = cards.some(
          (card) =>
            card.rarity === slot.rarity &&
            Object.prototype.hasOwnProperty.call(pack.setWeights, card.set)
        );

        const hasMythicUpgrade =
          slot.rarity === "rare" &&
          cards.some(
            (card) =>
              card.rarity === "mythic" &&
              Object.prototype.hasOwnProperty.call(pack.setWeights, card.set)
          );

        if (!hasRarity && !hasMythicUpgrade) {
          issues.push(
            `${pack.id} slot ${slotIndex} has no eligible ${slot.rarity} cards`
          );
        }
      } else if (slot.slotType === "sourceOrSupport") {
        const hasEligible = cards.some(
          (card) =>
            (card.cardType === "Source" || card.cardType === "Relic") &&
            Object.prototype.hasOwnProperty.call(pack.setWeights, card.set)
        );
        if (!hasEligible) {
          issues.push(`${pack.id} source/support slot has no eligible cards`);
        }
      }
    }
  }

  for (const card of cards) {
    for (const effect of effectsForCard(card)) {
      for (const validator of effectReferenceValidators) {
        validator(effect, { card, cardsById, issues });
      }
    }

    if (card.cardType === "Source") {
      continue;
    }

    const cost = chargeCostTotal(card.cost);
    if (cost === 0 && (card.cardType === "Unit" || card.cardType === "Relic")) {
      issues.push(`${card.id} is a ${card.cardType} with no Charge cost`);
    }
  }

  for (const encounter of encounters) {
    validateEncounter(encounter, cardsById, issues);
  }

  for (const starterKit of starterKits) {
    validateStarterKit(starterKit, cardsById, issues);
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return {
    cards,
    packs,
    encounters,
    starterKits,
    cardsById,
    packsById,
    encountersById,
    starterKitsById
  };
};
