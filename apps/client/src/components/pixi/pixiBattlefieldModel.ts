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
  PIXI_SHARED_ROWS,
  sharedCellForBoardPosition,
  type PixiPoint,
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
  readonly visualOffset: PixiPoint;
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
  readonly placeable: boolean;
};

export type PixiBattlefieldCell = {
  readonly sharedCell: PixiSharedCell;
  readonly nativePosition?: BoardPosition;
  readonly placeablePosition?: BoardPosition;
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
  readonly placeablePositions?: readonly BoardPosition[];
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
  visualOffset: { x: 0, y: 0 },
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
  sharedCell: PixiSharedCell
): Pick<BoardPosition, "row" | "col"> => ({
  row: sharedCell.row,
  col: sharedCell.col
});

const sameNativePosition = (left: BoardPosition, right: BoardPosition): boolean =>
  left.row === right.row && left.col === right.col && left.layer === right.layer;

const sideAwareOffset = (
  card: PixiBattlefieldCard,
  index: number,
  count: number
): PixiPoint => {
  if (count <= 1) {
    return { x: 0, y: 0 };
  }

  const sideX = card.side === "playerA" ? -18 : 18;
  const sideY = card.side === "playerA" ? 10 : -10;
  const stackY = (index - (count - 1) / 2) * 7;
  return { x: sideX, y: sideY + stackY };
};

const withDeterministicVisualOffsets = (
  cards: readonly PixiBattlefieldCard[]
): readonly PixiBattlefieldCard[] => {
  const byCell = new Map<string, PixiBattlefieldCard[]>();

  for (const card of cards) {
    const key = `${card.sharedCell.row}:${card.sharedCell.col}:${card.layer}`;
    byCell.set(key, [...(byCell.get(key) ?? []), card]);
  }

  const offsetByCardId = new Map<CardInstanceId, PixiPoint>();
  for (const cellCards of byCell.values()) {
    const sorted = [...cellCards].sort(
      (left, right) =>
        left.side.localeCompare(right.side) ||
        left.name.localeCompare(right.name) ||
        left.cardInstanceId.localeCompare(right.cardInstanceId)
    );
    sorted.forEach((card, index) => {
      offsetByCardId.set(
        card.cardInstanceId,
        sideAwareOffset(card, index, sorted.length)
      );
    });
  }

  return cards.map((card) => ({
    ...card,
    visualOffset: offsetByCardId.get(card.cardInstanceId) ?? { x: 0, y: 0 }
  }));
};

const markerForCell = (
  sharedCell: PixiSharedCell,
  engagementPreview: EngagementPreview,
  placeablePositions: readonly BoardPosition[]
): PixiBattlefieldCellMarkers => {
  const selected = engagementPreview.selected;
  const likelyTarget = engagementPreview.likelyTarget;
  const nativeCoordinate = nativeCoordinateForSharedCell(sharedCell);
  const isSelected =
    selected !== undefined && sameNativeCoordinate(selected.position, nativeCoordinate);
  const isRange =
    selected !== undefined &&
    engagementPreview.rangeCells.some((position) =>
      sameNativeCoordinate(position, nativeCoordinate)
    );
  const isLikelyTarget =
    likelyTarget !== undefined &&
    sameNativeCoordinate(likelyTarget.position, nativeCoordinate);
  const isNextMove =
    selected !== undefined &&
    engagementPreview.nextMove !== undefined &&
    sameNativeCoordinate(engagementPreview.nextMove.to, nativeCoordinate);
  const isPlaceable = placeablePositions.some((position) =>
    sameNativeCoordinate(position, nativeCoordinate)
  );

  return {
    selected: isSelected,
    range: isRange,
    likelyTarget: isLikelyTarget,
    targetInRange: isLikelyTarget && likelyTarget?.inRange === true,
    targetOutOfRange: isLikelyTarget && likelyTarget?.inRange === false,
    nextMove: isNextMove,
    placeable: isPlaceable
  };
};

export const buildPixiBattlefieldModel = ({
  playerBoard,
  enemyBoard,
  engagementPreview,
  placeablePositions = []
}: BuildPixiBattlefieldModelInput): PixiBattlefieldModel => {
  const cards = withDeterministicVisualOffsets(
    [
      ...cardsForBoard(enemyBoard, "playerB"),
      ...cardsForBoard(playerBoard, "playerA")
    ].sort(
      (left, right) =>
        left.sharedCell.row - right.sharedCell.row ||
        left.sharedCell.col - right.sharedCell.col ||
        left.layer.localeCompare(right.layer) ||
        left.side.localeCompare(right.side) ||
        left.cardInstanceId.localeCompare(right.cardInstanceId)
    )
  );
  const cells: PixiBattlefieldCell[] = [];

  for (let row = 0; row < PIXI_SHARED_ROWS; row += 1) {
    for (let col = 0; col < playerBoard.cols; col += 1) {
      const sharedCell = { row, col };
      const nativeCoordinate = nativeCoordinateForSharedCell(sharedCell);
      const placeablePosition = placeablePositions.find((position) =>
        sameNativeCoordinate(position, nativeCoordinate)
      );
      cells.push({
        sharedCell,
        nativePosition: {
          ...nativeCoordinate,
          layer: "ground" as const
        },
        ...(placeablePosition ? { placeablePosition: { ...placeablePosition } } : {}),
        markers: markerForCell(sharedCell, engagementPreview, placeablePositions)
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

export const pixiCardsShareNativePosition = (
  left: PixiBattlefieldCard,
  right: PixiBattlefieldCard
): boolean => sameNativePosition(left.position, right.position);
