import {
  chargeCostTotal,
  type CardDefId,
  type CardDefinition,
  type PackDefinition,
  type PackId
} from "@packbound/shared";

import { parseCardDefinitions, parsePackDefinitions } from "./schemas";

export type ContentCatalog = {
  readonly cards: readonly CardDefinition[];
  readonly packs: readonly PackDefinition[];
  readonly cardsById: ReadonlyMap<CardDefId, CardDefinition>;
  readonly packsById: ReadonlyMap<PackId, PackDefinition>;
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
};

export const loadContentCatalog = (input: LoadContentInput): ContentCatalog => {
  const cards = parseCardDefinitions(input.cards);
  const packs = parsePackDefinitions(input.packs);
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
    if (card.cardType === "Source") {
      continue;
    }

    const cost = chargeCostTotal(card.cost);
    if (cost === 0 && (card.cardType === "Unit" || card.cardType === "Relic")) {
      issues.push(`${card.id} is a ${card.cardType} with no Charge cost`);
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return {
    cards,
    packs,
    cardsById,
    packsById
  };
};
