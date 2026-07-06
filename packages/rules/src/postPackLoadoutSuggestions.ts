import type { ContentCatalog } from "@packbound/content";
import {
  type BoardPosition,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CardType
} from "@packbound/shared";

import {
  canAddCardToSourceRow,
  canAddCardToSpellrail,
  canPlaceCardOnBoard,
  getDefaultBoardPositionForCard,
  getLegalLoadoutActions,
  type LoadoutAction
} from "./loadout";
import { getRunPhase, type RunState } from "./runState";

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

type SuggestionCopy = {
  readonly headline: string;
  readonly reason: string;
  readonly priority: PostPackLoadoutSuggestionPriority;
  readonly unavailableReason?: string;
};

type LoadoutCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

const boardLayerForCardType = (
  cardType: CardType
): Extract<BoardPosition["layer"], "ground" | "support"> | undefined => {
  if (cardType === "Unit" || cardType === "Echo") {
    return "ground";
  }
  if (cardType === "Relic" || cardType === "Field") {
    return "support";
  }
  return undefined;
};

const cardIsInPool = (run: RunState, cardInstanceId: CardInstanceId): boolean =>
  run.pool.some((card) => card.instanceId === cardInstanceId);

const postPackActionRank = (action: LoadoutAction, cardType: CardType): number => {
  if (action.type === "addToSourceRow" && cardType === "Source") {
    return 0;
  }
  if (action.type === "addToSpellrail" && cardType === "Technique") {
    return 1;
  }
  if (action.type === "placeOnBoard" && boardLayerForCardType(cardType)) {
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

const actionSuggestionCopy = (
  action: LoadoutAction | undefined,
  cardType: CardType
): SuggestionCopy | undefined => {
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

  return undefined;
};

const sourceBlockedCopy = (run: RunState, check: LoadoutCheck): SuggestionCopy => {
  if (!check.ok && check.reason === "Source Row is full.") {
    return {
      headline: "Source Row full",
      reason: "Source Row is full. Return a Source to Pool before adding this one.",
      priority: "low",
      unavailableReason: `Source Row slots: ${run.sourceRow.cards.length} / ${run.sourceRow.maxSlots}.`
    };
  }

  return {
    headline: "Source Row blocked",
    reason: !check.ok
      ? `Cannot add this Source right now. ${check.reason}`
      : "Cannot add this Source right now.",
    priority: "low",
    ...(!check.ok ? { unavailableReason: check.reason } : {})
  };
};

const spellrailBlockedCopy = (run: RunState, check: LoadoutCheck): SuggestionCopy => {
  if (!check.ok && check.reason === "Spellrail is full.") {
    return {
      headline: "Spellrail full",
      reason: "Spellrail is full. Return a Technique to Pool before adding this one.",
      priority: "low",
      unavailableReason: `Spellrail slots: ${run.spellrail.cards.length} / ${run.spellrail.maxSlots}.`
    };
  }

  return {
    headline: "Spellrail blocked",
    reason: !check.ok
      ? `Cannot add this Technique right now. ${check.reason}`
      : "Cannot add this Technique right now.",
    priority: "low",
    ...(!check.ok ? { unavailableReason: check.reason } : {})
  };
};

const boardPlacementCheckCopy = (check: LoadoutCheck): SuggestionCopy => {
  const reason = check.ok ? "" : check.reason;

  if (reason.includes("Board uses") || reason.includes("Board Charge")) {
    return {
      headline: "Board Charge blocked",
      reason: `No legal board cell right now. ${reason} Add Source capacity or return a board card to Pool.`,
      priority: "low",
      unavailableReason: reason
    };
  }

  if (reason.includes("requires") && reason.includes("access")) {
    return {
      headline: "Aspect access blocked",
      reason: `No legal board cell right now. ${reason} Add matching Sources before placing this card.`,
      priority: "low",
      unavailableReason: reason
    };
  }

  if (reason.includes("occupied")) {
    return {
      headline: "Board layer occupied",
      reason: `No legal board cell right now. ${reason} Try another highlighted cell or return a board card to Pool.`,
      priority: "low",
      unavailableReason: reason
    };
  }

  return {
    headline: "Board placement blocked",
    reason: reason
      ? `No legal board cell right now. ${reason}`
      : "No legal board cell right now. Check Board Charge and occupied ground/support layers.",
    priority: "low",
    ...(reason ? { unavailableReason: reason } : {})
  };
};

const boardBlockedCopy = ({
  catalog,
  cardInstanceId,
  cardName,
  cardType,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly cardInstanceId: CardInstanceId;
  readonly cardName: string;
  readonly cardType: CardType;
  readonly run: RunState;
}): SuggestionCopy | undefined => {
  const layer = boardLayerForCardType(cardType);
  if (!layer) {
    return undefined;
  }

  const defaultPosition = getDefaultBoardPositionForCard(run, catalog, cardInstanceId);
  if (!defaultPosition) {
    return {
      headline: `No open ${layer} cell`,
      reason: `No open ${layer} board cell for ${cardName}. Units/Echoes use ground; Relics/Fields use support.`,
      priority: "low",
      unavailableReason: `All ${layer} cells are occupied or unavailable. Return a board card to Pool before placing this one.`
    };
  }

  return boardPlacementCheckCopy(
    canPlaceCardOnBoard(run, catalog, cardInstanceId, defaultPosition)
  );
};

const unavailablePostPackSuggestionCopy = ({
  catalog,
  card,
  cardName,
  cardType,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly cardName: string;
  readonly cardType: CardType;
  readonly run: RunState;
}): SuggestionCopy => {
  if (getRunPhase(run) !== "planning") {
    return {
      headline: "Edit after planning",
      reason:
        "Not editable during rewards or combat. Advance to planning before moving this card.",
      priority: "low",
      unavailableReason: "Loadout can only be edited during planning."
    };
  }

  if (!cardIsInPool(run, card.instanceId)) {
    return {
      headline: "No pool edit available",
      reason: `${cardName} is not currently in Pool, so no post-pack loadout edit can be applied.`,
      priority: "low",
      unavailableReason: "Inspect the card to confirm its current zone before editing."
    };
  }

  if (cardType === "Source") {
    return sourceBlockedCopy(run, canAddCardToSourceRow(run, catalog, card.instanceId));
  }

  if (cardType === "Technique") {
    return spellrailBlockedCopy(
      run,
      canAddCardToSpellrail(run, catalog, card.instanceId)
    );
  }

  return (
    boardBlockedCopy({
      catalog,
      cardInstanceId: card.instanceId,
      cardName,
      cardType,
      run
    }) ?? {
      headline: "No loadout edit available",
      reason:
        "No immediate loadout edit is available for this card type from the latest pack.",
      priority: "low",
      unavailableReason: "Inspect the card to confirm its current legal actions."
    }
  );
};

const postPackSuggestionCopy = ({
  action,
  catalog,
  card,
  cardName,
  cardType,
  run
}: {
  readonly action: LoadoutAction | undefined;
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly cardName: string;
  readonly cardType: CardType;
  readonly run: RunState;
}): SuggestionCopy =>
  actionSuggestionCopy(action, cardType) ??
  unavailablePostPackSuggestionCopy({ catalog, card, cardName, cardType, run });

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
      return suggestion.headline;
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

  return orderedKeys.flatMap((key) => {
    const group = grouped.get(key);
    if (!group || group.length === 0) {
      return [];
    }
    const representative = group[0]!;
    if (group.length <= 1) {
      return [representative];
    }

    const groupedCardInstanceIds = group.flatMap(
      (suggestion) => suggestion.groupedCardInstanceIds
    );
    const duplicateCount = groupedCardInstanceIds.length;

    return [
      {
        ...representative,
        id: `${representative.id}:group:${duplicateCount}`,
        groupedCardInstanceIds,
        displayName: `${representative.cardName} x${duplicateCount}`,
        duplicateCount,
        headline: groupedHeadline(representative, duplicateCount),
        reason: `${duplicateCount} copies opened. ${representative.reason}`
      }
    ];
  });
};

export const getLatestOpenedPackCardInstanceIds = (
  run: RunState
): readonly CardInstanceId[] =>
  run.openedPacks.at(-1)?.cards.map((card) => card.instanceId) ?? [];

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
      const copy = postPackSuggestionCopy({
        action,
        catalog,
        card: openedCard,
        cardName: def.name,
        cardType: def.cardType,
        run
      });

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
      "No immediate legal edits from the latest pack. Check Source Row, Spellrail, Board Charge, and occupied board layers."
  };
};
