import type { ContentCatalog } from "@packbound/content";
import {
  getLegalLoadoutActions,
  type LoadoutAction,
  type RunState
} from "@packbound/rules";
import type { CardInstanceId } from "@packbound/shared";

export type DefaultPixiZoneEditAction = Extract<
  LoadoutAction,
  { readonly type: "addToSourceRow" | "addToSpellrail" }
>;

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
      readonly statusText: string;
      readonly actions: readonly DefaultPixiZoneEditAction[];
    };

export type BuildDefaultPixiLoadoutEditViewInput = {
  readonly catalog: ContentCatalog;
  readonly run: RunState;
  readonly selectedPoolCardId: CardInstanceId | undefined;
};

const isZoneEditAction = (action: LoadoutAction): action is DefaultPixiZoneEditAction =>
  action.type === "addToSourceRow" || action.type === "addToSpellrail";

const cardName = (catalog: ContentCatalog, card: RunState["pool"][number]): string =>
  catalog.cardsById.get(card.defId)?.name ?? card.defId;

export const buildDefaultPixiLoadoutEditView = ({
  catalog,
  run,
  selectedPoolCardId
}: BuildDefaultPixiLoadoutEditViewInput): DefaultPixiLoadoutEditView => {
  const selectedCard = selectedPoolCardId
    ? run.pool.find((card) => card.instanceId === selectedPoolCardId)
    : undefined;

  if (!selectedCard) {
    return {
      mode: "idle",
      modeLabel: "Loadout",
      statusText: "Select a Pool card below to send it to Source Row or Spellrail.",
      actions: []
    };
  }

  const selectedCardName = cardName(catalog, selectedCard);
  const actions = getLegalLoadoutActions(run, catalog, selectedCard.instanceId).filter(
    isZoneEditAction
  );

  return {
    mode: "selected",
    modeLabel: "Loadout",
    selectedCardInstanceId: selectedCard.instanceId,
    selectedCardName,
    statusText:
      actions.length > 0
        ? `Send ${selectedCardName} to Source Row or Spellrail.`
        : `${selectedCardName} has no legal Source Row or Spellrail move.`,
    actions
  };
};
