import type { ContentCatalog } from "@packbound/content";
import {
  ASPECTS,
  chargeCostTotal,
  type Aspect,
  type CardDefId,
  type CardType,
  type CardInstanceId,
  type ValidationResult
} from "@packbound/shared";

import { getLegalLoadoutActions, type LoadoutAction } from "./loadout";
import { getRunPhase, type RunState } from "./runState";

export type LoadoutResourceSummary = {
  readonly boardChargeUsed: number;
  readonly boardChargeCapacity: number;
  readonly boardChargeText: string;
  readonly aspectAccess: Readonly<Record<Aspect, number>>;
  readonly aspectAccessText: string;
  readonly combatChargePerSecond: number;
  readonly combatChargePerSecondText: string;
  readonly sourceSlotsUsed: number;
  readonly sourceSlotsMax: number;
  readonly sourceSlotsText: string;
};

export type PostPackLoadoutSuggestionPriority = "high" | "medium" | "low";

export type PostPackLoadoutSuggestion = {
  readonly id: string;
  readonly cardInstanceId: CardInstanceId;
  readonly groupedCardInstanceIds: readonly CardInstanceId[];
  readonly cardDefId: CardDefId;
  readonly cardName: string;
  readonly displayName: string;
  readonly cardType: CardType;
  readonly duplicateCount: number;
  readonly action?: LoadoutAction;
  readonly headline: string;
  readonly reason: string;
  readonly priority: PostPackLoadoutSuggestionPriority;
  readonly unavailableReason?: string;
};

export type PostPackLoadoutSuggestionSummary = {
  readonly latestPackName?: string;
  readonly latestOpenedCardCount: number;
  readonly editableNow: boolean;
  readonly suggestions: readonly PostPackLoadoutSuggestion[];
  readonly emptyText: string;
};

const emptyAspectAccess = (): Record<Aspect, number> => ({
  Ember: 0,
  Shade: 0,
  Bloom: 0,
  Tide: 0,
  Gleam: 0
});

const formatNumber = (value: number): string => `${Number(value.toFixed(4))}`;

const formatAspectAccess = (access: Readonly<Record<Aspect, number>>): string => {
  const parts = ASPECTS.filter((aspect) => access[aspect] > 0).map(
    (aspect) => `${aspect} ${access[aspect]}`
  );
  return parts.length > 0 ? parts.join(", ") : "None";
};

const commanderEffectiveRebindTax = (run: RunState): number =>
  Math.max(0, (run.commander?.rebindTax ?? 0) - (run.commander?.rebindTaxDiscount ?? 0));

export const buildLoadoutResourceSummary = (
  run: RunState,
  catalog: ContentCatalog
): LoadoutResourceSummary => {
  const aspectAccess = emptyAspectAccess();
  let boardChargeCapacity = 0;
  let combatChargePerSecond = 0;

  for (const source of run.sourceRow.cards) {
    const def = catalog.cardsById.get(source.defId);
    if (def?.cardType !== "Source") {
      continue;
    }

    boardChargeCapacity += def.source.boardChargeCapacity;
    combatChargePerSecond += def.source.combatChargePerSecond;
    for (const aspect of def.source.aspectAccess) {
      aspectAccess[aspect] += 1;
    }
  }

  const boardChargeUsed = run.board.placements.reduce((sum, placement) => {
    const def = catalog.cardsById.get(placement.defId);
    return sum + (def ? chargeCostTotal(def.cost) : 0);
  }, 0);
  const commanderRebindTaxUsed =
    run.commander?.card.zone === "board" ? commanderEffectiveRebindTax(run) : 0;
  const totalBoardChargeUsed = boardChargeUsed + commanderRebindTaxUsed;
  const roundedCombatChargePerSecond = Number(combatChargePerSecond.toFixed(4));

  return {
    boardChargeUsed: totalBoardChargeUsed,
    boardChargeCapacity,
    boardChargeText: `${totalBoardChargeUsed} / ${boardChargeCapacity}`,
    aspectAccess,
    aspectAccessText: formatAspectAccess(aspectAccess),
    combatChargePerSecond: roundedCombatChargePerSecond,
    combatChargePerSecondText: formatNumber(roundedCombatChargePerSecond),
    sourceSlotsUsed: run.sourceRow.cards.length,
    sourceSlotsMax: run.sourceRow.maxSlots,
    sourceSlotsText: `${run.sourceRow.cards.length} / ${run.sourceRow.maxSlots}`
  };
};

export const getRunNextActionMessage = (
  run: RunState,
  validation: ValidationResult,
  canApplyRewardNow = run.status === "active" && run.phase === "reward"
): string => {
  const phase = getRunPhase(run);

  if (phase === "complete" || run.status !== "active") {
    return "Run complete. Reset to start again.";
  }

  switch (phase) {
    case "planning":
      return validation.ok
        ? "Next: tune your board, Sources, Spellrail, and Commander, then ready combat."
        : "Fix loadout errors before combat.";
    case "combatReady":
      return "Next: review the combat preview, then record combat to lock in the result.";
    case "reward": {
      if (!canApplyRewardNow) {
        return "Next: rewards will appear after combat.";
      }

      const packRewardClaimed = run.rewardHistory.some(
        (entry) => entry.type === "pack" && entry.round === run.currentRound
      );
      const commanderUpgradeClaimed =
        !run.commander ||
        run.commander.upgradeHistory.some((entry) => entry.round === run.currentRound);

      if (!packRewardClaimed && !commanderUpgradeClaimed) {
        return "Next: claim both rewards: open one pack and choose one Commander upgrade.";
      }
      if (!packRewardClaimed) {
        return "Next: open one reward pack.";
      }
      if (!commanderUpgradeClaimed) {
        return "Next: choose one Commander upgrade.";
      }
      return "Next: reward choices are complete.";
    }
    case "combatResolved":
      return "Next: advance to start the next planning round.";
  }
};

export const getLatestOpenedPackCardInstanceIds = (
  run: RunState
): readonly CardInstanceId[] =>
  run.openedPacks.at(-1)?.cards.map((card) => card.instanceId) ?? [];

const postPackActionRank = (action: LoadoutAction, cardType: CardType): number => {
  if (action.type === "addToSourceRow" && cardType === "Source") {
    return 0;
  }
  if (action.type === "addToSpellrail" && cardType === "Technique") {
    return 1;
  }
  if (
    action.type === "placeOnBoard" &&
    (cardType === "Unit" ||
      cardType === "Echo" ||
      cardType === "Relic" ||
      cardType === "Field")
  ) {
    return 2;
  }
  return 10;
};

const bestPostPackAction = (
  actions: readonly LoadoutAction[],
  cardType: CardType
): LoadoutAction | undefined =>
  actions
    .filter((action) => postPackActionRank(action, cardType) < 10)
    .sort((left, right) => {
      const rankDelta =
        postPackActionRank(left, cardType) - postPackActionRank(right, cardType);
      return rankDelta !== 0 ? rankDelta : left.type.localeCompare(right.type);
    })[0];

const postPackSuggestionCopy = (
  action: LoadoutAction | undefined,
  cardType: CardType
): {
  readonly headline: string;
  readonly reason: string;
  readonly priority: PostPackLoadoutSuggestionPriority;
  readonly unavailableReason?: string;
} => {
  if (action?.type === "addToSourceRow" && cardType === "Source") {
    return {
      headline: action.label,
      reason: "Adds Board Charge, Aspect access, and Combat Charge/sec from this Source.",
      priority: "high"
    };
  }

  if (action?.type === "addToSpellrail" && cardType === "Technique") {
    return {
      headline: action.label,
      reason: "Makes this Technique available from the Spellrail for future fights.",
      priority: "medium"
    };
  }

  if (action?.type === "placeOnBoard") {
    return {
      headline: action.label,
      reason: "Adds a legal board or support option using the current default placement.",
      priority: "medium"
    };
  }

  return {
    headline: "Inspect for blocked reason",
    reason:
      "No immediate suggested edit from the latest pack. Inspect the card for blocked reasons.",
    priority: "low",
    unavailableReason: "No forward loadout edit is available from this state."
  };
};

const postPackSuggestionRank = (suggestion: PostPackLoadoutSuggestion): number => {
  if (suggestion.action) {
    return postPackActionRank(suggestion.action, suggestion.cardType);
  }
  return 20;
};

const priorityOrder = {
  high: 0,
  medium: 1,
  low: 2
} satisfies Record<PostPackLoadoutSuggestionPriority, number>;

const postPackSuggestionSort = (
  left: PostPackLoadoutSuggestion,
  right: PostPackLoadoutSuggestion
): number => {
  const rankDelta = postPackSuggestionRank(left) - postPackSuggestionRank(right);
  if (rankDelta !== 0) {
    return rankDelta;
  }
  const priorityDelta = priorityOrder[left.priority] - priorityOrder[right.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return (
    left.cardName.localeCompare(right.cardName) ||
    left.cardInstanceId.localeCompare(right.cardInstanceId)
  );
};

const groupedSuggestionKey = (suggestion: PostPackLoadoutSuggestion): string =>
  [
    suggestion.cardDefId,
    suggestion.cardName,
    suggestion.cardType,
    suggestion.action?.type ?? "inspect",
    suggestion.headline,
    suggestion.unavailableReason ?? ""
  ].join("|");

const groupedHeadline = (
  suggestion: PostPackLoadoutSuggestion,
  duplicateCount: number
): string => {
  if (duplicateCount === 1) {
    return suggestion.headline;
  }

  switch (suggestion.action?.type) {
    case "addToSourceRow":
      return "Add one to Source Row";
    case "addToSpellrail":
      return "Add one to Spellrail";
    case "placeOnBoard":
      return "Place one on Board";
    case "returnToPool":
      return "Return one to Pool";
    case undefined:
      return "Inspect one for blocked reason";
  }
};

const groupPostPackSuggestions = (
  suggestions: readonly PostPackLoadoutSuggestion[]
): readonly PostPackLoadoutSuggestion[] => {
  const grouped = new Map<string, PostPackLoadoutSuggestion[]>();
  const orderedKeys: string[] = [];

  for (const suggestion of suggestions) {
    const key = groupedSuggestionKey(suggestion);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(suggestion);
    } else {
      grouped.set(key, [suggestion]);
      orderedKeys.push(key);
    }
  }

  return orderedKeys.map((key) => {
    const group = grouped.get(key) ?? [];
    const representative = group[0];
    if (!representative || group.length <= 1) {
      return representative ?? suggestions[0]!;
    }

    const groupedCardInstanceIds = group.flatMap(
      (suggestion) => suggestion.groupedCardInstanceIds
    );
    const duplicateCount = groupedCardInstanceIds.length;

    return {
      ...representative,
      id: `${representative.id}:group:${duplicateCount}`,
      groupedCardInstanceIds,
      displayName: `${representative.cardName} x${duplicateCount}`,
      duplicateCount,
      headline: groupedHeadline(representative, duplicateCount),
      reason: `${duplicateCount} copies opened. ${representative.reason}`
    };
  });
};

export const buildPostPackLoadoutSuggestions = (
  run: RunState,
  catalog: ContentCatalog
): PostPackLoadoutSuggestionSummary => {
  const latestOpenedPack = run.openedPacks.at(-1);
  const latestOpenedCardIds = getLatestOpenedPackCardInstanceIds(run);
  const editableNow = getRunPhase(run) === "planning";
  const latestPackName = latestOpenedPack
    ? (catalog.packsById.get(latestOpenedPack.packId)?.name ?? latestOpenedPack.packId)
    : undefined;

  if (!latestOpenedPack || latestOpenedCardIds.length === 0) {
    return {
      latestOpenedCardCount: 0,
      editableNow,
      suggestions: [],
      emptyText: "Open a reward pack to see suggested loadout edits."
    };
  }

  if (!editableNow) {
    return {
      ...(latestPackName ? { latestPackName } : {}),
      latestOpenedCardCount: latestOpenedCardIds.length,
      editableNow,
      suggestions: [],
      emptyText:
        "New cards are in your pool. Advance to the next planning round to edit your loadout."
    };
  }

  const suggestions = latestOpenedPack.cards
    .map((openedCard): PostPackLoadoutSuggestion | undefined => {
      const def = catalog.cardsById.get(openedCard.defId);
      if (!def) {
        return undefined;
      }

      const actions = getLegalLoadoutActions(run, catalog, openedCard.instanceId);
      const action = bestPostPackAction(actions, def.cardType);
      const copy = postPackSuggestionCopy(action, def.cardType);

      return {
        id: `post-pack:${latestOpenedPack.seed}:${openedCard.instanceId}:${
          action?.type ?? "inspect"
        }`,
        cardInstanceId: openedCard.instanceId,
        groupedCardInstanceIds: [openedCard.instanceId],
        cardDefId: def.id,
        cardName: def.name,
        displayName: def.name,
        cardType: def.cardType,
        duplicateCount: 1,
        ...(action ? { action } : {}),
        ...copy
      } satisfies PostPackLoadoutSuggestion;
    })
    .filter(
      (suggestion): suggestion is PostPackLoadoutSuggestion => suggestion !== undefined
    )
    .sort(postPackSuggestionSort);
  const groupedSuggestions = groupPostPackSuggestions(suggestions).slice(0, 5);

  return {
    ...(latestPackName ? { latestPackName } : {}),
    latestOpenedCardCount: latestOpenedCardIds.length,
    editableNow,
    suggestions: groupedSuggestions,
    emptyText:
      "No immediate legal edits from the latest pack. Inspect the new cards for blocked reasons."
  };
};
