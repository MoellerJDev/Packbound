import type { ContentCatalog } from "@packbound/content";
import type {
  CardDefId,
  CardDefinition,
  CardInstance,
  CardInstanceId,
  CardType
} from "@packbound/shared";

import type { RunState } from "./runState";

export const UPGRADE_COPIES_REQUIRED = 3;
export const MAX_CARD_UPGRADE_LEVEL = 2;

export type UpgradeCardGroup = {
  readonly defId: CardDefId;
  readonly name: string;
  readonly cardType: CardType;
  readonly upgradeLevel: number;
  readonly nextUpgradeLevel: number;
  readonly requiredCopies: number;
  readonly availableCopies: number;
  readonly cardInstanceIds: readonly CardInstanceId[];
  readonly eligible: boolean;
  readonly blockedReason?: string;
};

const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const sortedMatchingPoolCards = (
  run: RunState,
  defId: CardDefId,
  upgradeLevel: number
): readonly CardInstance[] =>
  run.pool
    .filter(
      (card) =>
        card.defId === defId &&
        card.ownerId === run.playerId &&
        card.zone === "pool" &&
        card.upgradeLevel === upgradeLevel
    )
    .map(copyCard)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));

export const isUpgradeEligibleCard = (def: CardDefinition): boolean =>
  def.cardType === "Unit" || def.cardType === "Echo";

const blockedGroup = (
  def: CardDefinition,
  upgradeLevel: number,
  matchingCards: readonly CardInstance[],
  blockedReason: string
): UpgradeCardGroup => ({
  defId: def.id,
  name: def.name,
  cardType: def.cardType,
  upgradeLevel,
  nextUpgradeLevel: Math.min(upgradeLevel + 1, MAX_CARD_UPGRADE_LEVEL),
  requiredCopies: UPGRADE_COPIES_REQUIRED,
  availableCopies: matchingCards.length,
  cardInstanceIds: matchingCards.map((card) => card.instanceId),
  eligible: false,
  blockedReason
});

const eligibleGroup = (
  def: CardDefinition,
  upgradeLevel: number,
  matchingCards: readonly CardInstance[]
): UpgradeCardGroup => ({
  defId: def.id,
  name: def.name,
  cardType: def.cardType,
  upgradeLevel,
  nextUpgradeLevel: upgradeLevel + 1,
  requiredCopies: UPGRADE_COPIES_REQUIRED,
  availableCopies: matchingCards.length,
  cardInstanceIds: matchingCards.map((card) => card.instanceId),
  eligible: true
});

export const canUpgradeCardGroup = (
  run: RunState,
  catalog: ContentCatalog,
  defId: CardDefId,
  upgradeLevel: number
): UpgradeCardGroup => {
  const def = catalog.cardsById.get(defId);
  if (!def) {
    throw new Error(`Unknown card definition: ${defId}`);
  }

  const matchingCards = sortedMatchingPoolCards(run, defId, upgradeLevel);

  if (run.status !== "active" || run.phase !== "planning") {
    return blockedGroup(
      def,
      upgradeLevel,
      matchingCards,
      "Card upgrades can only be made during planning."
    );
  }
  if (!Number.isInteger(upgradeLevel) || upgradeLevel < 0) {
    return blockedGroup(
      def,
      upgradeLevel,
      matchingCards,
      "Upgrade level must be a non-negative integer."
    );
  }
  if (!isUpgradeEligibleCard(def)) {
    return blockedGroup(
      def,
      upgradeLevel,
      matchingCards,
      "Only Unit and Echo cards can be upgraded."
    );
  }
  if (upgradeLevel >= MAX_CARD_UPGRADE_LEVEL) {
    return blockedGroup(
      def,
      upgradeLevel,
      matchingCards,
      "Card is already at max upgrade level."
    );
  }
  if (matchingCards.length < UPGRADE_COPIES_REQUIRED) {
    return blockedGroup(
      def,
      upgradeLevel,
      matchingCards,
      `Need ${UPGRADE_COPIES_REQUIRED} matching pool copies; found ${matchingCards.length}.`
    );
  }

  return eligibleGroup(def, upgradeLevel, matchingCards);
};

export const getUpgradeableCardGroups = (
  run: RunState,
  catalog: ContentCatalog
): readonly UpgradeCardGroup[] => {
  if (run.status !== "active" || run.phase !== "planning") {
    return [];
  }

  const keys = new Set<string>();
  for (const card of run.pool) {
    const def = catalog.cardsById.get(card.defId);
    if (
      !def ||
      !isUpgradeEligibleCard(def) ||
      card.ownerId !== run.playerId ||
      card.zone !== "pool" ||
      card.upgradeLevel >= MAX_CARD_UPGRADE_LEVEL
    ) {
      continue;
    }
    keys.add(`${card.defId}|${card.upgradeLevel}`);
  }

  return [...keys]
    .map((key) => {
      const [defId, upgradeLevelText] = key.split("|");
      return canUpgradeCardGroup(
        run,
        catalog,
        defId as CardDefId,
        Number(upgradeLevelText)
      );
    })
    .filter((group) => group.eligible)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.defId.localeCompare(b.defId) ||
        a.upgradeLevel - b.upgradeLevel
    );
};

export const upgradeCardGroup = (
  run: RunState,
  catalog: ContentCatalog,
  defId: CardDefId,
  upgradeLevel: number
): RunState => {
  const group = canUpgradeCardGroup(run, catalog, defId, upgradeLevel);
  if (!group.eligible) {
    throw new Error(group.blockedReason ?? "Card group cannot be upgraded.");
  }

  const preservedId = group.cardInstanceIds[0];
  const consumedIds = new Set(group.cardInstanceIds.slice(1, UPGRADE_COPIES_REQUIRED));

  return {
    ...run,
    pool: run.pool.flatMap((card) => {
      if (consumedIds.has(card.instanceId)) {
        return [];
      }
      if (card.instanceId === preservedId) {
        return [
          {
            ...copyCard(card),
            zone: "pool",
            upgradeLevel: upgradeLevel + 1
          }
        ];
      }
      return [copyCard(card)];
    })
  };
};

export const describeUpgradeGroup = (group: UpgradeCardGroup): string =>
  `${group.name}: ${group.availableCopies} / ${group.requiredCopies} copies at level ${group.upgradeLevel} -> upgrade to level ${group.nextUpgradeLevel}`;
