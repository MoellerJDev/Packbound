import { useCallback, useMemo, useState } from "react";

import type { ContentCatalog } from "@packbound/content";
import type { RunState } from "@packbound/rules";
import type { BoardPosition, CardInstanceId } from "@packbound/shared";

import {
  boardLayerForPlacementCard,
  buildDefaultPixiPlacementView,
  sameBoardPosition
} from "../viewModels/defaultPixiPlacementView";

export type DefaultPixiPlacementController = {
  readonly clearPlacement: () => void;
  readonly selectBlockedCell: (position: BoardPosition) => void;
  readonly selectPlacementCard: (cardInstanceId: CardInstanceId) => void;
};

export const useDefaultPixiPlacement = ({
  boardCols,
  boardRows,
  catalog,
  isDefaultRoute,
  run
}: {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly catalog: ContentCatalog;
  readonly isDefaultRoute: boolean;
  readonly run: RunState;
}) => {
  const [selectedPlacementCardId, setSelectedPlacementCardId] = useState<
    CardInstanceId | undefined
  >();
  const [blockedCellPosition, setBlockedCellPosition] = useState<
    BoardPosition | undefined
  >();

  const view = useMemo(
    () =>
      buildDefaultPixiPlacementView({
        boardCols,
        boardRows,
        catalog,
        run,
        selectedPlacementCardId,
        blockedCellPosition
      }),
    [blockedCellPosition, boardCols, boardRows, catalog, run, selectedPlacementCardId]
  );

  const clearPlacement = useCallback(() => {
    setSelectedPlacementCardId(undefined);
    setBlockedCellPosition(undefined);
  }, []);

  const selectPlacementCard = useCallback((cardInstanceId: CardInstanceId) => {
    setSelectedPlacementCardId(cardInstanceId);
    setBlockedCellPosition(undefined);
  }, []);

  const selectBlockedCell = useCallback(
    (position: BoardPosition) => {
      if (!isDefaultRoute || !view.selectedPlacementCard) {
        return;
      }

      const layer = boardLayerForPlacementCard(catalog, view.selectedPlacementCard);
      if (!layer) {
        return;
      }

      const targetPosition = { row: position.row, col: position.col, layer };
      if (
        view.placeablePositions.some((candidate) =>
          sameBoardPosition(candidate, targetPosition)
        )
      ) {
        return;
      }

      setBlockedCellPosition(targetPosition);
    },
    [catalog, isDefaultRoute, view.placeablePositions, view.selectedPlacementCard]
  );

  return {
    selectedPlacementCardId,
    view,
    controller: {
      clearPlacement,
      selectBlockedCell,
      selectPlacementCard
    } satisfies DefaultPixiPlacementController
  };
};
