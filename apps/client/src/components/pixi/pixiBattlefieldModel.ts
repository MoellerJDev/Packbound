import type {
  BoardGridCardSummary,
  BoardGridSummary,
  EngagementPreview
} from "@packbound/rules";
import type {
  BoardLayer,
  BoardPosition,
  CardDefId,
  CardInstanceId,
  CardType,
  Keyword,
  PlayerSide
} from "@packbound/shared";

import {
  isLaneSharedRow,
  PIXI_SHARED_ROWS,
  PIXI_SHARED_LANE_ROW,
  sharedCellForBoardPosition,
  sideForSharedRow,
  type PixiSharedCell
} from "./pixiBattlefieldLayout";

export type PixiBattlefieldCard = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly name: string;
  readonly initials: string;
  readonly side: PlayerSide;
  readonly cardType: CardType | "Unknown";
  readonly layer: BoardLayer;
  readonly position: BoardPosition;
  readonly sharedCell: PixiSharedCell;
  readonly statChips: readonly string[];
  readonly traits: readonly string[];
  readonly keywords: readonly Keyword[];
};

export type PixiBattlefieldCellMarkers = {
  readonly selected: boolean;
  readonly range: boolean;
  readonly likelyTarget: boolean;
  readonly targetInRange: boolean;
  readonly targetOutOfRange: boolean;
  readonly nextMove: boolean;
};

export type PixiBattlefieldCell = {
  readonly sharedCell: PixiSharedCell;
  readonly side?: PlayerSide;
  readonly isLane: boolean;
  readonly nativePosition?: BoardPosition;
  readonly markers: PixiBattlefieldCellMarkers;
};

export type PixiBattlefieldMovePreview = {
  readonly from: PixiSharedCell;
  readonly to: PixiSharedCell;
  readonly side: PlayerSide;
};

export type PixiBattlefieldModel = {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly PixiBattlefieldCell[];
  readonly cards: readonly PixiBattlefieldCard[];
  readonly selectedCardInstanceId?: CardInstanceId;
  readonly likelyTargetCardInstanceId?: CardInstanceId;
  readonly nextMove?: PixiBattlefieldMovePreview;
  readonly explanation: readonly string[];
};

export type BuildPixiBattlefieldModelInput = {
  readonly playerBoard: BoardGridSummary;
  readonly enemyBoard?: BoardGridSummary;
  readonly engagementPreview: EngagementPreview;
};

const sameNativeCoordinate = (
  left: Pick<BoardPosition, "row" | "col">,
  right: Pick<BoardPosition, "row" | "col">
): boolean => left.row === right.row && left.col === right.col;

export const initialsForName = (name: string): string => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0]?.slice(0, 2).toUpperCase() ?? "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const statChipsForCard = (card: BoardGridCardSummary): readonly string[] =>
  card.combatStats?.chips.slice(0, 4) ?? [];

const modelCardFor = (
  card: BoardGridCardSummary,
  side: PlayerSide,
  position: BoardPosition
): PixiBattlefieldCard => ({
  cardInstanceId: card.cardInstanceId,
  defId: card.defId,
  name: card.name,
  initials: initialsForName(card.name),
  side,
  cardType: card.cardType,
  layer: card.layer,
  position,
  sharedCell: sharedCellForBoardPosition(side, position),
  statChips: statChipsForCard(card),
  traits: [...card.traits],
  keywords: [...card.keywords]
});

const cardsForBoard = (
  board: BoardGridSummary | undefined,
  side: PlayerSide
): readonly PixiBattlefieldCard[] =>
  (board?.cells ?? []).flatMap((cell) =>
    cell.cards.map((card) =>
      modelCardFor(card, side, {
        row: cell.row,
        col: cell.col,
        layer: card.layer
      })
    )
  );

const nativeCoordinateForSharedCell = (
  side: PlayerSide | undefined,
  sharedCell: PixiSharedCell
): Pick<BoardPosition, "row" | "col"> => ({
  row: side === "playerA" ? sharedCell.row - (PIXI_SHARED_LANE_ROW + 1) : sharedCell.row,
  col: sharedCell.col
});

const markerForCell = (
  sharedCell: PixiSharedCell,
  side: PlayerSide | undefined,
  engagementPreview: EngagementPreview
): PixiBattlefieldCellMarkers => {
  const selected = engagementPreview.selected;
  const likelyTarget = engagementPreview.likelyTarget;
  const nativeCoordinate = nativeCoordinateForSharedCell(side, sharedCell);
  const isSelected =
    selected !== undefined &&
    side === selected.side &&
    sameNativeCoordinate(selected.position, nativeCoordinate);
  const isRange =
    selected !== undefined &&
    side === selected.side &&
    engagementPreview.rangeCells.some((position) =>
      sameNativeCoordinate(position, nativeCoordinate)
    );
  const isLikelyTarget =
    likelyTarget !== undefined &&
    side === likelyTarget.side &&
    sameNativeCoordinate(likelyTarget.position, nativeCoordinate);
  const isNextMove =
    selected !== undefined &&
    engagementPreview.nextMove !== undefined &&
    side === selected.side &&
    sameNativeCoordinate(engagementPreview.nextMove.to, nativeCoordinate);

  return {
    selected: isSelected,
    range: isRange,
    likelyTarget: isLikelyTarget,
    targetInRange: isLikelyTarget && likelyTarget?.inRange === true,
    targetOutOfRange: isLikelyTarget && likelyTarget?.inRange === false,
    nextMove: isNextMove
  };
};

export const buildPixiBattlefieldModel = ({
  playerBoard,
  enemyBoard,
  engagementPreview
}: BuildPixiBattlefieldModelInput): PixiBattlefieldModel => {
  const cards = [
    ...cardsForBoard(enemyBoard, "playerB"),
    ...cardsForBoard(playerBoard, "playerA")
  ].sort(
    (left, right) =>
      left.sharedCell.row - right.sharedCell.row ||
      left.sharedCell.col - right.sharedCell.col ||
      left.layer.localeCompare(right.layer) ||
      left.cardInstanceId.localeCompare(right.cardInstanceId)
  );
  const cells: PixiBattlefieldCell[] = [];

  for (let row = 0; row < PIXI_SHARED_ROWS; row += 1) {
    const side = sideForSharedRow(row);
    for (let col = 0; col < playerBoard.cols; col += 1) {
      const sharedCell = { row, col };
      const isLane = isLaneSharedRow(row);
      cells.push({
        sharedCell,
        ...(side
          ? {
              side,
              nativePosition: {
                ...nativeCoordinateForSharedCell(side, sharedCell),
                layer: "ground" as const
              }
            }
          : {}),
        isLane,
        markers: markerForCell(sharedCell, side, engagementPreview)
      });
    }
  }

  const selectedCardInstanceId = engagementPreview.selected?.instanceId;
  const likelyTargetCardInstanceId = engagementPreview.likelyTarget?.instanceId;
  const nextMove =
    engagementPreview.selected && engagementPreview.nextMove
      ? {
          side: engagementPreview.selected.side,
          from: sharedCellForBoardPosition(
            engagementPreview.selected.side,
            engagementPreview.nextMove.from
          ),
          to: sharedCellForBoardPosition(
            engagementPreview.selected.side,
            engagementPreview.nextMove.to
          )
        }
      : undefined;

  return {
    rows: PIXI_SHARED_ROWS,
    cols: playerBoard.cols,
    cells,
    cards,
    ...(selectedCardInstanceId ? { selectedCardInstanceId } : {}),
    ...(likelyTargetCardInstanceId ? { likelyTargetCardInstanceId } : {}),
    ...(nextMove ? { nextMove } : {}),
    explanation: [...engagementPreview.explanation]
  };
};
