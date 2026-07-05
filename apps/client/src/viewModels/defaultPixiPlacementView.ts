import type { ContentCatalog } from "@packbound/content";
import { canPlaceCardOnBoard, type RunState } from "@packbound/rules";
import {
  type BoardLayer,
  type BoardPosition,
  type CardInstance,
  type CardInstanceId
} from "@packbound/shared";

export type DefaultPixiPlacementHintView =
  | {
      readonly mode: "idle";
      readonly text: string;
    }
  | {
      readonly mode: "ready";
      readonly cardName: string;
      readonly text: string;
    }
  | {
      readonly mode: "blocked";
      readonly cardName: string;
      readonly reason: string;
      readonly text: string;
    }
  | {
      readonly mode: "blockedCell";
      readonly cardName: string;
      readonly position: BoardPosition;
      readonly positionText: string;
      readonly reason: string;
      readonly text: string;
    };

export type DefaultPixiBoardEditControlsView = {
  readonly mode: "inspect" | "place";
  readonly modeLabel: "Inspect" | "Place";
  readonly selectedCardName?: string;
  readonly statusText: string;
  readonly canCancelPlacement: boolean;
};

export type DefaultPixiPlacementView = {
  readonly selectedPlacementCard: CardInstance | undefined;
  readonly placeablePositions: readonly BoardPosition[];
  readonly placementHint: DefaultPixiPlacementHintView;
  readonly boardEditControls: DefaultPixiBoardEditControlsView;
};

export type BuildDefaultPixiPlacementViewInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly selectedPlacementCardId: CardInstanceId | undefined;
  readonly blockedCellPosition: BoardPosition | undefined;
  readonly boardRows: number;
  readonly boardCols: number;
};

const idleHint = (): DefaultPixiPlacementHintView => ({
  mode: "idle",
  text: "Select a board-placeable Pool card below, then click a highlighted Pixi cell."
});

const inspectControls = (): DefaultPixiBoardEditControlsView => ({
  mode: "inspect",
  modeLabel: "Inspect",
  statusText: "Select Pool cards below to enter placement mode.",
  canCancelPlacement: false
});

export const formatBoardPosition = (position: BoardPosition): string =>
  `r${position.row} c${position.col} ${position.layer}`;

export const boardLayerForPlacementCard = (
  catalog: ContentCatalog,
  card: CardInstance
): BoardLayer | undefined => {
  const def = catalog.cardsById.get(card.defId);
  if (def?.cardType === "Unit" || def?.cardType === "Echo") {
    return "ground";
  }
  if (def?.cardType === "Relic" || def?.cardType === "Field") {
    return "support";
  }
  return undefined;
};

export const sameBoardPosition = (left: BoardPosition, right: BoardPosition): boolean =>
  left.row === right.row && left.col === right.col && left.layer === right.layer;

const selectedCardName = (catalog: ContentCatalog, card: CardInstance): string =>
  catalog.cardsById.get(card.defId)?.name ?? card.defId;

const buildPlaceablePositions = ({
  boardCols,
  boardRows,
  catalog,
  card,
  layer,
  run
}: {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly layer: BoardLayer;
  readonly run: RunState;
}): readonly BoardPosition[] => {
  const positions: BoardPosition[] = [];

  for (let row = 0; row < boardRows; row += 1) {
    for (let col = 0; col < boardCols; col += 1) {
      const position = { row, col, layer };
      if (canPlaceCardOnBoard(run, catalog, card.instanceId, position).ok) {
        positions.push(position);
      }
    }
  }

  return positions;
};

const firstBlockedReason = ({
  boardCols,
  boardRows,
  catalog,
  card,
  layer,
  run
}: {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly layer: BoardLayer;
  readonly run: RunState;
}): string => {
  for (let row = 0; row < boardRows; row += 1) {
    for (let col = 0; col < boardCols; col += 1) {
      const check = canPlaceCardOnBoard(run, catalog, card.instanceId, {
        row,
        col,
        layer
      });
      if (!check.ok) {
        return check.reason;
      }
    }
  }

  return "No legal Pixi cells are available.";
};

const placeControls = (
  cardName: string,
  hintMode: Exclude<DefaultPixiPlacementHintView["mode"], "idle">
): DefaultPixiBoardEditControlsView => ({
  mode: "place",
  modeLabel: "Place",
  selectedCardName: cardName,
  statusText:
    hintMode === "ready"
      ? "Click a highlighted Pixi cell to place this card."
      : "Choose a highlighted cell or cancel placement.",
  canCancelPlacement: true
});

export const buildDefaultPixiPlacementView = ({
  blockedCellPosition,
  boardCols,
  boardRows,
  catalog,
  run,
  selectedPlacementCardId
}: BuildDefaultPixiPlacementViewInput): DefaultPixiPlacementView => {
  const selectedPlacementCard = selectedPlacementCardId
    ? run.pool.find((card) => card.instanceId === selectedPlacementCardId)
    : undefined;

  if (!selectedPlacementCard) {
    return {
      selectedPlacementCard: undefined,
      placeablePositions: [],
      placementHint: idleHint(),
      boardEditControls: inspectControls()
    };
  }

  const cardName = selectedCardName(catalog, selectedPlacementCard);
  const layer = boardLayerForPlacementCard(catalog, selectedPlacementCard) ?? "ground";
  const placeablePositions = buildPlaceablePositions({
    boardCols,
    boardRows,
    catalog,
    card: selectedPlacementCard,
    layer,
    run
  });

  if (blockedCellPosition) {
    const targetPosition = {
      row: blockedCellPosition.row,
      col: blockedCellPosition.col,
      layer
    };
    const targetIsPlaceable = placeablePositions.some((position) =>
      sameBoardPosition(position, targetPosition)
    );
    if (!targetIsPlaceable) {
      const check = canPlaceCardOnBoard(
        run,
        catalog,
        selectedPlacementCard.instanceId,
        targetPosition
      );
      if (!check.ok) {
        const placementHint = {
          mode: "blockedCell" as const,
          cardName,
          position: targetPosition,
          positionText: formatBoardPosition(targetPosition),
          reason: check.reason,
          text: `Cannot place ${cardName} at ${formatBoardPosition(
            targetPosition
          )}: ${check.reason}`
        };
        return {
          selectedPlacementCard,
          placeablePositions,
          placementHint,
          boardEditControls: placeControls(cardName, placementHint.mode)
        };
      }
    }
  }

  if (placeablePositions.length > 0) {
    const placementHint = {
      mode: "ready" as const,
      cardName,
      text: `Placing ${cardName}. Click a highlighted Pixi cell.`
    };
    return {
      selectedPlacementCard,
      placeablePositions,
      placementHint,
      boardEditControls: placeControls(cardName, placementHint.mode)
    };
  }

  const reason = firstBlockedReason({
    boardCols,
    boardRows,
    catalog,
    card: selectedPlacementCard,
    layer,
    run
  });
  const placementHint = {
    mode: "blocked" as const,
    cardName,
    reason,
    text: `Cannot place ${cardName}: ${reason}`
  };

  return {
    selectedPlacementCard,
    placeablePositions,
    placementHint,
    boardEditControls: placeControls(cardName, placementHint.mode)
  };
};
