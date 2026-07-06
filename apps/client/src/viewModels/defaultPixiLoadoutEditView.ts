import type { ContentCatalog } from "@packbound/content";
import {
  getLegalLoadoutActions,
  type LoadoutAction,
  type RunState
} from "@packbound/rules";
import type { CardDefId, CardInstanceId } from "@packbound/shared";

export type DefaultPixiZoneEditAction = Extract<
  LoadoutAction,
  { readonly type: "addToSourceRow" | "addToSpellrail" | "returnToPool" }
>;

export type DefaultPixiLoadoutEditZone = "pool" | "board" | "sourceRow" | "spellrail";

export type DefaultPixiLoadoutEditView =
  | {
      readonly mode: "idle";
      readonly modeLabel: "Loadout";
      readonly statusText: string;
      readonly actions: readonly DefaultPixiZoneEditAction[];
    }
  | {
      readonly mode: "selected";
      readonly modeLabel: "Loadout";
      readonly selectedCardInstanceId: CardInstanceId;
      readonly selectedCardName: string;
      readonly selectedZone: DefaultPixiLoadoutEditZone;
      readonly selectedZoneLabel: string;
      readonly statusText: string;
      readonly actions: readonly DefaultPixiZoneEditAction[];
    };

export type BuildDefaultPixiLoadoutEditViewInput = {
  readonly catalog: ContentCatalog;
  readonly run: RunState;
  readonly selectedCardId: CardInstanceId | undefined;
};

const isZoneEditAction = (action: LoadoutAction): action is DefaultPixiZoneEditAction =>
  action.type === "addToSourceRow" ||
  action.type === "addToSpellrail" ||
  action.type === "returnToPool";

const ZONE_LABELS = {
  pool: "Pool",
  board: "Board",
  sourceRow: "Source Row",
  spellrail: "Spellrail"
} satisfies Record<DefaultPixiLoadoutEditZone, string>;

type SelectedLoadoutCard = {
  readonly instanceId: CardInstanceId;
  readonly name: string;
  readonly zone: DefaultPixiLoadoutEditZone;
};

const cardName = (catalog: ContentCatalog, defId: CardDefId): string =>
  catalog.cardsById.get(defId)?.name ?? defId;

const findSelectedLoadoutCard = (
  catalog: ContentCatalog,
  run: RunState,
  selectedCardId: CardInstanceId | undefined
): SelectedLoadoutCard | undefined => {
  if (!selectedCardId || selectedCardId === run.commander?.card.instanceId) {
    return undefined;
  }

  const poolCard = run.pool.find((card) => card.instanceId === selectedCardId);
  if (poolCard) {
    return {
      instanceId: poolCard.instanceId,
      name: cardName(catalog, poolCard.defId),
      zone: "pool"
    };
  }

  const boardPlacement = run.board.placements.find(
    (placement) => placement.cardInstanceId === selectedCardId
  );
  if (boardPlacement) {
    return {
      instanceId: boardPlacement.cardInstanceId,
      name: cardName(catalog, boardPlacement.defId),
      zone: "board"
    };
  }

  const sourceCard = run.sourceRow.cards.find(
    (card) => card.instanceId === selectedCardId
  );
  if (sourceCard) {
    return {
      instanceId: sourceCard.instanceId,
      name: cardName(catalog, sourceCard.defId),
      zone: "sourceRow"
    };
  }

  const spellrailCard = run.spellrail.cards.find(
    (card) => card.instanceId === selectedCardId
  );
  if (spellrailCard) {
    return {
      instanceId: spellrailCard.instanceId,
      name: cardName(catalog, spellrailCard.defId),
      zone: "spellrail"
    };
  }

  return undefined;
};

const selectedStatusText = (
  selectedCard: SelectedLoadoutCard,
  actions: readonly DefaultPixiZoneEditAction[]
): string => {
  if (selectedCard.zone === "pool") {
    return actions.length > 0
      ? `Send ${selectedCard.name} to Source Row or Spellrail.`
      : `${selectedCard.name} has no legal Source Row or Spellrail move.`;
  }

  return actions.some((action) => action.type === "returnToPool")
    ? `Send ${selectedCard.name} back to Pool.`
    : `${selectedCard.name} has no legal return action.`;
};

export const buildDefaultPixiLoadoutEditView = ({
  catalog,
  run,
  selectedCardId
}: BuildDefaultPixiLoadoutEditViewInput): DefaultPixiLoadoutEditView => {
  const selectedCard = findSelectedLoadoutCard(catalog, run, selectedCardId);

  if (!selectedCard) {
    return {
      mode: "idle",
      modeLabel: "Loadout",
      statusText:
        "Select a Pool, Board, Source Row, or Spellrail card below to edit its loadout zone.",
      actions: []
    };
  }

  const actions = getLegalLoadoutActions(run, catalog, selectedCard.instanceId).filter(
    isZoneEditAction
  );

  return {
    mode: "selected",
    modeLabel: "Loadout",
    selectedCardInstanceId: selectedCard.instanceId,
    selectedCardName: selectedCard.name,
    selectedZone: selectedCard.zone,
    selectedZoneLabel: ZONE_LABELS[selectedCard.zone],
    statusText: selectedStatusText(selectedCard, actions),
    actions
  };
};
