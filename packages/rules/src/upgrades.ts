import type { ContentCatalog } from "@packbound/content";
import type {
  CardDefId,
  CardDefinition,
  CardInstance,
  CardInstanceId,
  CardType
} from "@packbound/shared";

import { copyCard, uniqueActiveCardEntriesForRun } from "./runCards";
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

export type UpgradeProgressGroup = {
  readonly defId: CardDefId;
  readonly name: string;
  readonly cardType: CardType;
  readonly upgradeLevel: number;
  readonly nextUpgradeLevel?: number;
  readonly requiredCopies: number;
  readonly poolCopies: number;
  readonly activeCopies: number;
  readonly otherCopies: number;
  readonly totalCopies: number;
  readonly poolCardInstanceIds: readonly CardInstanceId[];
  readonly activeCardInstanceIds: readonly CardInstanceId[];
  readonly otherCardInstanceIds: readonly CardInstanceId[];
  readonly eligible: boolean;
  readonly canUpgrade: boolean;
  readonly progressText: string;
  readonly blockedReason?: string;
};

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

export const describeUpgradeIneligibleReason = (cardType: CardType): string => {
  switch (cardType) {
    case "Echo":
    case "Unit":
      return "";
    case "Field":
      return "Fields are not upgradeable yet.";
    case "Formation":
      return "Formations are not upgradeable yet.";
    case "Gear":
      return "Gear cards are not upgradeable yet.";
    case "Relic":
      return "Relics are not upgradeable yet.";
    case "Source":
      return "Sources are not upgradeable yet.";
    case "Technique":
      return "Techniques are not upgradeable yet.";
  }
};

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

const upgradeKey = (defId: CardDefId, upgradeLevel: number): string =>
  `${defId}|${upgradeLevel}`;

const activeCardsForProgress = (run: RunState): readonly CardInstance[] =>
  uniqueActiveCardEntriesForRun(run).map((entry) => copyCard(entry.card));

const addProgressCard = (
  groups: Map<string, CardInstance[]>,
  card: CardInstance,
  seen: Set<CardInstanceId>
): void => {
  if (seen.has(card.instanceId)) {
    return;
  }
  seen.add(card.instanceId);

  const key = upgradeKey(card.defId, card.upgradeLevel);
  groups.set(key, [...(groups.get(key) ?? []), copyCard(card)]);
};

const sortCards = (cards: readonly CardInstance[]): readonly CardInstance[] =>
  [...cards].sort((a, b) => a.instanceId.localeCompare(b.instanceId));

const pluralCopy = (count: number): string => (count === 1 ? "copy" : "copies");

const ownedProgressGroups = (
  cards: readonly CardInstance[],
  run: RunState,
  seen: Set<CardInstanceId>
): Map<string, CardInstance[]> => {
  const groups = new Map<string, CardInstance[]>();
  for (const card of cards) {
    if (card.ownerId !== run.playerId) {
      continue;
    }
    addProgressCard(groups, card, seen);
  }
  return groups;
};

const progressBlockedReason = (
  run: RunState,
  def: CardDefinition,
  upgradeLevel: number,
  poolCopies: number,
  activeCopies: number,
  otherCopies: number,
  totalCopies: number
): string | undefined => {
  if (!isUpgradeEligibleCard(def)) {
    return describeUpgradeIneligibleReason(def.cardType);
  }
  if (upgradeLevel >= MAX_CARD_UPGRADE_LEVEL) {
    return "Max upgrade level reached.";
  }
  if (run.status !== "active" || run.phase !== "planning") {
    return "Card upgrades can only be made during planning.";
  }
  if (poolCopies >= UPGRADE_COPIES_REQUIRED) {
    return undefined;
  }
  if (activeCopies > 0 && totalCopies >= UPGRADE_COPIES_REQUIRED) {
    return "Return active copies to pool to upgrade.";
  }
  if (otherCopies > 0 && totalCopies >= UPGRADE_COPIES_REQUIRED) {
    return "Only pool copies count for upgrades.";
  }
  return `Need ${UPGRADE_COPIES_REQUIRED} matching pool copies; found ${poolCopies}.`;
};

const buildProgressText = (group: {
  readonly poolCopies: number;
  readonly activeCopies: number;
  readonly otherCopies: number;
  readonly requiredCopies: number;
  readonly upgradeLevel: number;
}): string => {
  const base = `${group.poolCopies} / ${group.requiredCopies} pool copies at Lv ${group.upgradeLevel}`;
  const activeText =
    group.activeCopies > 0
      ? ` + ${group.activeCopies} active ${pluralCopy(group.activeCopies)}`
      : "";
  const otherText =
    group.otherCopies > 0
      ? ` + ${group.otherCopies} other ${pluralCopy(group.otherCopies)}`
      : "";

  return activeText || otherText
    ? `${base} (${group.poolCopies} pool${activeText}${otherText})`
    : base;
};

const progressGroupFromCards = (
  run: RunState,
  catalog: ContentCatalog,
  key: string,
  poolCards: readonly CardInstance[],
  activeCards: readonly CardInstance[],
  otherCards: readonly CardInstance[]
): UpgradeProgressGroup | undefined => {
  const [defIdText, upgradeLevelText] = key.split("|");
  const defId = defIdText as CardDefId;
  const def = catalog.cardsById.get(defId);
  const upgradeLevel = Number(upgradeLevelText);
  if (!def || !Number.isInteger(upgradeLevel) || upgradeLevel < 0) {
    return undefined;
  }

  const sortedPoolCards = sortCards(poolCards);
  const sortedActiveCards = sortCards(activeCards);
  const sortedOtherCards = sortCards(otherCards);
  const poolCopies = sortedPoolCards.length;
  const activeCopies = sortedActiveCards.length;
  const otherCopies = sortedOtherCards.length;
  const totalCopies = poolCopies + activeCopies + otherCopies;
  const eligible = isUpgradeEligibleCard(def) && upgradeLevel < MAX_CARD_UPGRADE_LEVEL;
  const canUpgrade =
    run.status === "active" &&
    run.phase === "planning" &&
    eligible &&
    poolCopies >= UPGRADE_COPIES_REQUIRED;
  const blockedReason = progressBlockedReason(
    run,
    def,
    upgradeLevel,
    poolCopies,
    activeCopies,
    otherCopies,
    totalCopies
  );
  const nextUpgradeLevel = eligible ? upgradeLevel + 1 : undefined;
  const progressText = buildProgressText({
    poolCopies,
    activeCopies,
    otherCopies,
    requiredCopies: UPGRADE_COPIES_REQUIRED,
    upgradeLevel
  });

  return {
    defId,
    name: def.name,
    cardType: def.cardType,
    upgradeLevel,
    ...(nextUpgradeLevel !== undefined ? { nextUpgradeLevel } : {}),
    requiredCopies: UPGRADE_COPIES_REQUIRED,
    poolCopies,
    activeCopies,
    otherCopies,
    totalCopies,
    poolCardInstanceIds: sortedPoolCards.map((card) => card.instanceId),
    activeCardInstanceIds: sortedActiveCards.map((card) => card.instanceId),
    otherCardInstanceIds: sortedOtherCards.map((card) => card.instanceId),
    eligible,
    canUpgrade,
    progressText,
    ...(blockedReason ? { blockedReason } : {})
  };
};

const shouldShowProgressGroup = (group: UpgradeProgressGroup): boolean =>
  group.canUpgrade || group.totalCopies > 1;

const sortProgressGroups = (
  groups: readonly UpgradeProgressGroup[]
): readonly UpgradeProgressGroup[] =>
  [...groups].sort(
    (a, b) =>
      Number(b.canUpgrade) - Number(a.canUpgrade) ||
      Number(b.eligible) - Number(a.eligible) ||
      a.name.localeCompare(b.name) ||
      a.defId.localeCompare(b.defId) ||
      a.upgradeLevel - b.upgradeLevel
  );

const getAllUpgradeProgressGroups = (
  run: RunState,
  catalog: ContentCatalog
): readonly UpgradeProgressGroup[] => {
  const seen = new Set<CardInstanceId>();
  const poolGroups = ownedProgressGroups(run.pool, run, seen);
  const activeGroups = ownedProgressGroups(activeCardsForProgress(run), run, seen);
  const otherGroups = ownedProgressGroups([...run.ashes, ...run.void], run, seen);
  const keys = new Set<string>([
    ...poolGroups.keys(),
    ...activeGroups.keys(),
    ...otherGroups.keys()
  ]);

  return sortProgressGroups(
    [...keys].flatMap((key) => {
      const group = progressGroupFromCards(
        run,
        catalog,
        key,
        poolGroups.get(key) ?? [],
        activeGroups.get(key) ?? [],
        otherGroups.get(key) ?? []
      );
      return group ? [group] : [];
    })
  );
};

export const getUpgradeProgressGroups = (
  run: RunState,
  catalog: ContentCatalog
): readonly UpgradeProgressGroup[] =>
  getAllUpgradeProgressGroups(run, catalog).filter(shouldShowProgressGroup);

export const getUpgradeProgressForCard = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId
): UpgradeProgressGroup | undefined =>
  getAllUpgradeProgressGroups(run, catalog).find(
    (group) =>
      group.poolCardInstanceIds.includes(cardInstanceId) ||
      group.activeCardInstanceIds.includes(cardInstanceId) ||
      group.otherCardInstanceIds.includes(cardInstanceId)
  );

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

export const describeUpgradeProgressGroup = (group: UpgradeProgressGroup): string => {
  if (!group.eligible && group.cardType !== "Unit" && group.cardType !== "Echo") {
    return `${group.name}: duplicate ${group.cardType}. ${group.blockedReason}`;
  }

  if (group.canUpgrade) {
    return `${group.name}: ${group.progressText} -> Upgrade to Lv ${group.nextUpgradeLevel}`;
  }

  return `${group.name}: ${group.progressText}${
    group.blockedReason ? `. ${group.blockedReason}` : ""
  }`;
};
