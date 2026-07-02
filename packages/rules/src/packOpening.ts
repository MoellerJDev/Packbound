import type { ContentCatalog } from "@packbound/content";
import {
  asCardInstanceId,
  type CardDefinition,
  type CardInstance,
  type PackId,
  type PackOpenResult,
  type PackSlotDefinition,
  type PackSlotResult,
  type PlayerId,
  type Rarity
} from "@packbound/shared";

import { createCardInstance } from "./instances";
import { createRng, type SeededRng } from "./rng";

export type OpenPackInput = {
  readonly catalog: ContentCatalog;
  readonly packId: PackId;
  readonly seed: string;
  readonly ownerId: PlayerId;
};

type ConcreteSlot =
  | {
      readonly slotType: "rarity";
      readonly requestedRarity: Rarity;
      readonly actualRarity: Rarity;
    }
  | {
      readonly slotType: "sourceOrSupport" | "foilWildcard";
    };

const rarityOrder: Readonly<Record<Rarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3
};

const expandSlots = (
  slots: readonly PackSlotDefinition[],
  rng: SeededRng,
  cards: readonly CardDefinition[]
): readonly ConcreteSlot[] => {
  const expanded: ConcreteSlot[] = [];

  for (const slot of slots) {
    for (let count = 0; count < slot.count; count += 1) {
      if ("rarity" in slot) {
        const canUpgradeToMythic =
          slot.rarity === "rare" && cards.some((card) => card.rarity === "mythic");
        const actualRarity =
          canUpgradeToMythic && rng.chance(slot.mythicUpgradeChance ?? 0)
            ? "mythic"
            : slot.rarity;

        expanded.push({
          slotType: "rarity",
          requestedRarity: slot.rarity,
          actualRarity
        });
      } else {
        expanded.push({ slotType: slot.slotType });
      }
    }
  }

  return expanded;
};

const cardMatchesSlot = (card: CardDefinition, slot: ConcreteSlot): boolean => {
  if (slot.slotType === "foilWildcard") {
    return true;
  }

  if (slot.slotType === "sourceOrSupport") {
    return card.cardType === "Source" || card.cardType === "Relic";
  }

  if (slot.slotType === "rarity") {
    return card.rarity === slot.actualRarity;
  }

  return false;
};

const biasWeightForCard = (
  card: CardDefinition,
  tagBias: Readonly<Record<string, number>>
): number => {
  let weight = 0;
  for (const [bias, amount] of Object.entries(tagBias)) {
    if (
      card.tags.includes(bias) ||
      card.aspects.includes(bias as never) ||
      card.cardType === bias
    ) {
      weight += amount;
    }
  }
  return weight;
};

const weightedPickCard = (
  cards: readonly CardDefinition[],
  rng: SeededRng,
  setWeights: Readonly<Record<string, number>>,
  tagBias: Readonly<Record<string, number>>
): CardDefinition => {
  const weightedCards = cards
    .map((card) => {
      const setWeight = setWeights[card.set] ?? 0;
      return {
        card,
        weight: setWeight + biasWeightForCard(card, tagBias)
      };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => {
      const rarityDelta = rarityOrder[a.card.rarity] - rarityOrder[b.card.rarity];
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
      return a.card.id.localeCompare(b.card.id);
    });

  const totalWeight = weightedCards.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("No weighted cards were eligible for pack selection");
  }

  let cursor = rng.nextFloat() * totalWeight;
  for (const entry of weightedCards) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.card;
    }
  }

  const fallback = weightedCards[weightedCards.length - 1];
  if (!fallback) {
    throw new Error("No fallback card was available for pack selection");
  }
  return fallback.card;
};

export const openPack = (input: OpenPackInput): PackOpenResult => {
  const pack = input.catalog.packsById.get(input.packId);
  if (!pack) {
    throw new Error(`Unknown pack id: ${input.packId}`);
  }

  const rng = createRng(`${input.seed}:${input.packId}`);
  const concreteSlots = expandSlots(pack.slots, rng, input.catalog.cards);
  const cards: CardInstance[] = [];
  const slotResults: PackSlotResult[] = [];

  concreteSlots.forEach((slot, slotIndex) => {
    const eligible = input.catalog.cards.filter(
      (card) =>
        cardMatchesSlot(card, slot) &&
        Object.prototype.hasOwnProperty.call(pack.setWeights, card.set)
    );

    const picked = weightedPickCard(eligible, rng, pack.setWeights, pack.tagBias);
    const cardInstanceId = asCardInstanceId(
      `${input.packId}:${input.seed}:${slotIndex}:${picked.id}`
    );
    const instance = createCardInstance({
      instanceId: cardInstanceId,
      defId: picked.id,
      ownerId: input.ownerId,
      zone: "pool",
      isEcho: picked.cardType === "Echo"
    });

    cards.push(instance);
    slotResults.push({
      slotIndex,
      slotType: slot.slotType,
      ...("requestedRarity" in slot ? { requestedRarity: slot.requestedRarity } : {}),
      actualRarity: picked.rarity,
      cardDefId: picked.id,
      cardInstanceId
    });
  });

  return {
    packId: input.packId,
    seed: input.seed,
    cards,
    slots: slotResults
  };
};
