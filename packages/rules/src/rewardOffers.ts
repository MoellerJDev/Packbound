import type { ContentCatalog } from "@packbound/content";
import {
  chargeCostTotal,
  type CardDefId,
  type CardDefinition,
  type CardType,
  type PackDefinition,
  type PackId
} from "@packbound/shared";

import { ownedRunCards } from "./runCards";
import { buildLoadoutResourceSummary } from "./runClarity";
import type { RewardChoice, RunState } from "./runState";
import { buildRunTraitSummary, type TraitCount } from "./teamups";
import { getUpgradeProgressGroups, type UpgradeProgressGroup } from "./upgrades";
import { getCurrentRewardChoices } from "./rewards";

export type RewardOfferReasonKind =
  | "affordability"
  | "traitMatch"
  | "activeTraitMatch"
  | "nearTraitProgress"
  | "upgradeProgress"
  | "sourceFixing"
  | "archetypeBias"
  | "duplicatePotential"
  | "economy"
  | "warning";

export type RewardOfferReasonSeverity = "positive" | "neutral" | "warning";

export type RewardOfferReason = {
  readonly kind: RewardOfferReasonKind;
  readonly text: string;
  readonly severity: RewardOfferReasonSeverity;
  readonly relatedTraitIds?: readonly string[];
  readonly relatedCardDefIds?: readonly CardDefId[];
  readonly relatedTags?: readonly string[];
};

export type RewardOfferExplanation = {
  readonly choiceId: string;
  readonly packId: PackId;
  readonly packName: string;
  readonly cost: number;
  readonly affordable: boolean;
  readonly goldBefore: number;
  readonly goldAfterPurchase: number;
  readonly headline: string;
  readonly reasons: readonly RewardOfferReason[];
};

type PackCardContext = {
  readonly primaryCards: readonly CardDefinition[];
  readonly topBiasTags: readonly string[];
  readonly sourceHeavy: boolean;
};

const MAX_REASONS = 5;

const unique = <T>(values: readonly T[]): readonly T[] => [...new Set(values)];

const plural = (value: number, singular: string, pluralText = `${singular}s`): string =>
  value === 1 ? singular : pluralText;

const formatList = (values: readonly string[]): string => {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0] ?? "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
};

const tagBiasWeightForCard = (
  card: CardDefinition,
  tagBias: Readonly<Record<string, number>>
): number => {
  let weight = 0;
  for (const [bias, amount] of Object.entries(tagBias)) {
    if (
      amount > 0 &&
      (card.tags.includes(bias) ||
        card.aspects.some((aspect) => aspect === bias) ||
        card.cardType === bias)
    ) {
      weight += amount;
    }
  }
  return weight;
};

const cardMatchesPackSlot = (card: CardDefinition, pack: PackDefinition): boolean =>
  pack.slots.some((slot) => {
    if ("rarity" in slot) {
      return (
        card.rarity === slot.rarity ||
        (slot.rarity === "rare" &&
          (slot.mythicUpgradeChance ?? 0) > 0 &&
          card.rarity === "mythic")
      );
    }

    if (slot.slotType === "sourceOrSupport") {
      return card.cardType === "Source" || card.cardType === "Relic";
    }

    return true;
  });

const cardPackWeight = (card: CardDefinition, pack: PackDefinition): number =>
  (pack.setWeights[card.set] ?? 0) + tagBiasWeightForCard(card, pack.tagBias);

const packCanContainCard = (card: CardDefinition, pack: PackDefinition): boolean =>
  Object.prototype.hasOwnProperty.call(pack.setWeights, card.set) &&
  cardMatchesPackSlot(card, pack) &&
  cardPackWeight(card, pack) > 0;

const eligibleCardsForPack = (
  catalog: ContentCatalog,
  pack: PackDefinition
): readonly CardDefinition[] =>
  catalog.cards
    .filter((card) => packCanContainCard(card, pack))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
    );

const topBiasTagsForPack = (pack: PackDefinition): readonly string[] =>
  Object.entries(pack.tagBias)
    .filter(([, weight]) => weight > 0)
    .sort(([leftTag, leftWeight], [rightTag, rightWeight]) => {
      const weightDelta = rightWeight - leftWeight;
      return weightDelta !== 0 ? weightDelta : leftTag.localeCompare(rightTag);
    })
    .slice(0, 4)
    .map(([tag]) => tag);

const primaryCardsForPack = (
  eligibleCards: readonly CardDefinition[],
  pack: PackDefinition
): readonly CardDefinition[] => {
  const positiveSetWeights = Object.values(pack.setWeights).filter(
    (weight) => weight > 0
  );
  const maxSetWeight = Math.max(0, ...positiveSetWeights);
  const primarySetFloor = maxSetWeight > 0 ? maxSetWeight / 2 : 0;

  return eligibleCards.filter((card) => {
    const setWeight = pack.setWeights[card.set] ?? 0;
    const biasWeight = tagBiasWeightForCard(card, pack.tagBias);
    return (
      (primarySetFloor > 0 && setWeight >= primarySetFloor) ||
      biasWeight > 0 ||
      card.cardType === "Source"
    );
  });
};

const buildPackCardContext = (
  catalog: ContentCatalog,
  pack: PackDefinition | undefined
): PackCardContext => {
  if (!pack) {
    return {
      primaryCards: [],
      topBiasTags: [],
      sourceHeavy: false
    };
  }

  const eligibleCards = eligibleCardsForPack(catalog, pack);
  const primaryCards = primaryCardsForPack(eligibleCards, pack);
  const topBiasTags = topBiasTagsForPack(pack);
  const sourceSlotCount = pack.slots.reduce(
    (sum, slot) =>
      sum + (!("rarity" in slot) && slot.slotType === "sourceOrSupport" ? slot.count : 0),
    0
  );
  const sourceHeavy =
    sourceSlotCount >= 2 ||
    (pack.tagBias.Source ?? 0) >= 3 ||
    (pack.tagBias.Fixing ?? 0) > 0;

  return {
    primaryCards,
    topBiasTags,
    sourceHeavy
  };
};

const cardDefIds = (cards: readonly CardDefinition[]): Set<CardDefId> =>
  new Set(cards.map((card) => card.id));

const traitIdsForCards = (cards: readonly CardDefinition[]): Set<string> =>
  new Set(cards.flatMap((card) => card.traits ?? []));

const traitNames = (traits: readonly TraitCount[]): readonly string[] =>
  traits.map((trait) => trait.name);

const activeTraitMatches = (
  traits: readonly TraitCount[],
  packTraitIds: ReadonlySet<string>
): readonly TraitCount[] =>
  traits
    .filter((trait) => packTraitIds.has(trait.traitId))
    .sort((left, right) => {
      const countDelta = right.count - left.count;
      return countDelta !== 0 ? countDelta : left.name.localeCompare(right.name);
    });

const sourceFixingPressure = (run: RunState, catalog: ContentCatalog): boolean => {
  const resources = buildLoadoutResourceSummary(run, catalog);

  return run.pool.some((card) => {
    const def = catalog.cardsById.get(card.defId);
    if (!def || def.cardType === "Source" || !def.cost) {
      return false;
    }

    const totalCost = chargeCostTotal(def.cost);
    if (resources.boardChargeUsed + totalCost > resources.boardChargeCapacity) {
      return true;
    }

    return Object.entries(def.cost.aspect ?? {}).some(
      ([aspect, amount]) =>
        amount >
        (resources.aspectAccess[aspect as keyof typeof resources.aspectAccess] ?? 0)
    );
  });
};

const sourceRowIsFull = (run: RunState): boolean =>
  run.sourceRow.cards.length >= run.sourceRow.maxSlots;

const upgradeRelevantCardTypes: readonly CardType[] = ["Unit", "Echo"];

const duplicatePotentialCards = (
  run: RunState,
  catalog: ContentCatalog,
  packPrimaryDefIds: ReadonlySet<CardDefId>,
  progressGroups: readonly UpgradeProgressGroup[]
): readonly CardDefinition[] => {
  const groupedDefIds = new Set(progressGroups.map((group) => group.defId));
  const seen = new Set<CardDefId>();
  const results: CardDefinition[] = [];

  for (const card of ownedRunCards(run)) {
    if (groupedDefIds.has(card.defId) || seen.has(card.defId)) {
      continue;
    }
    const def = catalog.cardsById.get(card.defId);
    if (
      !def ||
      !upgradeRelevantCardTypes.includes(def.cardType) ||
      !packPrimaryDefIds.has(def.id)
    ) {
      continue;
    }
    seen.add(def.id);
    results.push(def);
  }

  return results.sort((left, right) => left.name.localeCompare(right.name));
};

const reason = (
  kind: RewardOfferReasonKind,
  text: string,
  severity: RewardOfferReasonSeverity,
  related?: {
    readonly relatedTraitIds?: readonly string[];
    readonly relatedCardDefIds?: readonly CardDefId[];
    readonly relatedTags?: readonly string[];
  }
): RewardOfferReason => ({
  kind,
  text,
  severity,
  ...(related?.relatedTraitIds && related.relatedTraitIds.length > 0
    ? { relatedTraitIds: unique(related.relatedTraitIds) }
    : {}),
  ...(related?.relatedCardDefIds && related.relatedCardDefIds.length > 0
    ? { relatedCardDefIds: unique(related.relatedCardDefIds) }
    : {}),
  ...(related?.relatedTags && related.relatedTags.length > 0
    ? { relatedTags: unique(related.relatedTags) }
    : {})
});

const addUniqueReason = (
  reasons: RewardOfferReason[],
  nextReason: RewardOfferReason
): void => {
  if (!reasons.some((candidate) => candidate.text === nextReason.text)) {
    reasons.push(nextReason);
  }
};

const reasonPriority = (reason: RewardOfferReason): number => {
  if (reason.kind === "affordability") {
    return 0;
  }
  if (reason.kind === "warning" || reason.severity === "warning") {
    return 1;
  }

  switch (reason.kind) {
    case "upgradeProgress":
      return 2;
    case "duplicatePotential":
      return 3;
    case "sourceFixing":
      return 4;
    case "activeTraitMatch":
    case "traitMatch":
      return 5;
    case "economy":
      return 6;
    case "nearTraitProgress":
      return 7;
    case "archetypeBias":
      return 8;
  }
};

const compactReasons = (
  reasons: readonly RewardOfferReason[]
): readonly RewardOfferReason[] => {
  return reasons
    .map((current, index) => ({ current, index }))
    .sort((left, right) => {
      const priorityDelta = reasonPriority(left.current) - reasonPriority(right.current);
      return priorityDelta !== 0 ? priorityDelta : left.index - right.index;
    })
    .slice(0, MAX_REASONS)
    .map((entry) => entry.current);
};

const reasonTextByKind = (
  reasons: readonly RewardOfferReason[],
  kind: RewardOfferReasonKind
): string | undefined => reasons.find((current) => current.kind === kind)?.text;

const sourceFixingShowsPressure = (text: string | undefined): boolean =>
  text?.startsWith("Fixing helps play") ?? false;

const headlineForOffer = (
  choice: RewardChoice,
  context: PackCardContext,
  reasons: readonly RewardOfferReason[]
): string => {
  if (!choice.affordable) {
    return `Promising pack, but you need ${Math.max(0, -choice.goldAfterPurchase)} more gold.`;
  }

  const upgradeText = reasonTextByKind(reasons, "upgradeProgress");
  if (upgradeText) {
    return "Can chase visible duplicate progress.";
  }

  const duplicateText = reasonTextByKind(reasons, "duplicatePotential");
  if (duplicateText) {
    return "Can find useful duplicate Unit/Echo copies.";
  }

  const sourceFixingText = reasonTextByKind(reasons, "sourceFixing");
  if (sourceFixingShowsPressure(sourceFixingText)) {
    return "Fixing helps play cards already in your pool.";
  }

  if (context.sourceHeavy && sourceFixingText) {
    return "Adds Source options for future picks.";
  }

  const activeTraitText = reasonTextByKind(reasons, "activeTraitMatch");
  if (activeTraitText) {
    return activeTraitText;
  }

  const economyText = reasonTextByKind(reasons, "economy");
  if (economyText) {
    return economyText;
  }

  const nearTraitText = reasonTextByKind(reasons, "nearTraitProgress");
  if (nearTraitText) {
    return "May help a near trait later.";
  }

  if (context.topBiasTags.length > 0) {
    return `Broadly biased toward ${formatList(context.topBiasTags.slice(0, 3))}.`;
  }

  return "Adds another pack option for this run.";
};

const safeRewardChoices = (
  run: RunState,
  catalog: ContentCatalog
): readonly RewardChoice[] => {
  try {
    return getCurrentRewardChoices(run, catalog);
  } catch {
    return run.currentRewardChoices.map((choice) => {
      const pack = catalog.packsById.get(choice.packId);
      const cost = pack?.cost ?? choice.cost;
      return {
        ...choice,
        label: pack?.name ?? choice.label,
        cost,
        affordable: run.playerGold >= cost,
        goldAfterPurchase: run.playerGold - cost
      };
    });
  }
};

const cheapestOfferedCost = (choices: readonly RewardChoice[]): number | undefined =>
  choices.length > 0 ? Math.min(...choices.map((choice) => choice.cost)) : undefined;

export const buildRewardOfferExplanation = (
  run: RunState,
  catalog: ContentCatalog,
  choice: RewardChoice,
  options: {
    readonly cheapestCost?: number;
    readonly hasMoreExpensiveOffer?: boolean;
  } = {}
): RewardOfferExplanation => {
  const pack = catalog.packsById.get(choice.packId);
  const packName = pack?.name ?? choice.label;
  const context = buildPackCardContext(catalog, pack);
  const packPrimaryDefIds = cardDefIds(context.primaryCards);
  const packTraitIds = traitIdsForCards(
    context.primaryCards.filter((card) => card.cardType !== "Source")
  );
  const traitSummary = buildRunTraitSummary(run, catalog);
  const upgradeProgressGroups = getUpgradeProgressGroups(run, catalog);
  const upgradeRelevantGroups = upgradeProgressGroups.filter(
    (group) =>
      (group.cardType === "Unit" || group.cardType === "Echo") &&
      packPrimaryDefIds.has(group.defId)
  );
  const nonUpgradeableDuplicateGroups = upgradeProgressGroups.filter(
    (group) =>
      group.cardType !== "Unit" &&
      group.cardType !== "Echo" &&
      packPrimaryDefIds.has(group.defId)
  );
  const reasons: RewardOfferReason[] = [];

  if (choice.affordable) {
    addUniqueReason(
      reasons,
      reason(
        "affordability",
        `Costs ${choice.cost} gold; you will have ${choice.goldAfterPurchase} left.`,
        "neutral"
      )
    );
  } else {
    addUniqueReason(
      reasons,
      reason(
        "affordability",
        `Need ${choice.cost} gold; you have ${run.playerGold}.`,
        "warning"
      )
    );
  }

  if (!pack) {
    addUniqueReason(
      reasons,
      reason(
        "warning",
        "Pack definition is missing, so only cost and affordability are known.",
        "warning"
      )
    );
  }

  if (context.sourceHeavy) {
    const hasSourcePressure = sourceFixingPressure(run, catalog);
    addUniqueReason(
      reasons,
      reason(
        "sourceFixing",
        hasSourcePressure
          ? "Fixing helps play expensive or off-Aspect cards already in your pool."
          : "Can add Aspect access and board Charge for future pulls.",
        "positive",
        { relatedTags: ["Source", "Fixing"] }
      )
    );

    if (sourceRowIsFull(run)) {
      addUniqueReason(
        reasons,
        reason(
          "warning",
          "Source Row is full; you may need to return a Source before using new fixing.",
          "warning",
          { relatedTags: ["Source"] }
        )
      );
    }
  }

  const activeMatches = activeTraitMatches(traitSummary.activeTraits, packTraitIds).slice(
    0,
    3
  );
  if (activeMatches.length > 0) {
    addUniqueReason(
      reasons,
      reason(
        "activeTraitMatch",
        `Matches active ${formatList(traitNames(activeMatches))} ${plural(
          activeMatches.length,
          "trait"
        )}.`,
        "positive",
        { relatedTraitIds: activeMatches.map((trait) => trait.traitId) }
      )
    );
  }

  const activeMatchIds = new Set(activeMatches.map((trait) => trait.traitId));
  const nearMatches = activeTraitMatches(
    traitSummary.nearTraits.filter((trait) => !activeMatchIds.has(trait.traitId)),
    packTraitIds
  ).slice(0, 3);
  if (nearMatches.length > 0) {
    addUniqueReason(
      reasons,
      reason(
        "nearTraitProgress",
        `May help near ${formatList(traitNames(nearMatches))} ${plural(
          nearMatches.length,
          "trait"
        )} later.`,
        "neutral",
        { relatedTraitIds: nearMatches.map((trait) => trait.traitId) }
      )
    );
  }

  const firstUpgradeGroup = upgradeRelevantGroups[0];
  if (firstUpgradeGroup) {
    addUniqueReason(
      reasons,
      reason(
        "upgradeProgress",
        `Can contain ${firstUpgradeGroup.name}, currently ${firstUpgradeGroup.poolCopies} / ${firstUpgradeGroup.requiredCopies} pool copies toward an upgrade.`,
        "positive",
        { relatedCardDefIds: [firstUpgradeGroup.defId] }
      )
    );

    if (
      firstUpgradeGroup.activeCopies > 0 &&
      firstUpgradeGroup.totalCopies >= firstUpgradeGroup.requiredCopies
    ) {
      addUniqueReason(
        reasons,
        reason(
          "warning",
          "You have active copies that must return to pool before upgrading.",
          "warning",
          { relatedCardDefIds: [firstUpgradeGroup.defId] }
        )
      );
    }
  }

  const firstNonUpgradeableGroup = nonUpgradeableDuplicateGroups[0];
  if (firstNonUpgradeableGroup) {
    addUniqueReason(
      reasons,
      reason(
        "warning",
        `Duplicate ${plural(2, firstNonUpgradeableGroup.cardType)} are not upgradeable yet.`,
        "warning",
        { relatedCardDefIds: [firstNonUpgradeableGroup.defId] }
      )
    );
  }

  if (context.topBiasTags.length > 0) {
    addUniqueReason(
      reasons,
      reason(
        "archetypeBias",
        `Biased toward ${formatList(context.topBiasTags)} cards.`,
        "neutral",
        { relatedTags: context.topBiasTags }
      )
    );
  }

  const duplicateCards = duplicatePotentialCards(
    run,
    catalog,
    packPrimaryDefIds,
    upgradeProgressGroups
  ).slice(0, 2);
  if (duplicateCards.length > 0) {
    addUniqueReason(
      reasons,
      reason(
        "duplicatePotential",
        `Can find useful duplicate Unit/Echo copies such as ${formatList(
          duplicateCards.map((card) => card.name)
        )}.`,
        "positive",
        { relatedCardDefIds: duplicateCards.map((card) => card.id) }
      )
    );
  }

  if (options.cheapestCost !== undefined && choice.cost === options.cheapestCost) {
    addUniqueReason(
      reasons,
      reason(
        "economy",
        context.sourceHeavy && options.hasMoreExpensiveOffer
          ? "Cheaper fixing option."
          : "Cheapest offer.",
        "neutral"
      )
    );
  }

  const compactedReasons = compactReasons(reasons);

  return {
    choiceId: choice.id,
    packId: choice.packId,
    packName,
    cost: choice.cost,
    affordable: choice.affordable,
    goldBefore: run.playerGold,
    goldAfterPurchase: choice.goldAfterPurchase,
    headline: headlineForOffer(choice, context, compactedReasons),
    reasons: compactedReasons
  };
};

export const buildRewardOfferExplanations = (
  run: RunState,
  catalog: ContentCatalog
): readonly RewardOfferExplanation[] => {
  const choices = safeRewardChoices(run, catalog);
  const cheapestCost = cheapestOfferedCost(choices);
  const highestCost =
    choices.length > 0 ? Math.max(...choices.map((choice) => choice.cost)) : undefined;

  return choices.map((choice) =>
    buildRewardOfferExplanation(run, catalog, choice, {
      ...(cheapestCost !== undefined ? { cheapestCost } : {}),
      ...(highestCost !== undefined
        ? { hasMoreExpensiveOffer: choice.cost < highestCost }
        : {})
    })
  );
};
