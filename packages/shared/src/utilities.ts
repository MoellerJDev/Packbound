import type { BoardPosition } from "./board";
import type { ChargeCost } from "./cards";
import { BOARD_COLS, BOARD_ROWS } from "./constants";

export const positionKey = (position: BoardPosition): string =>
  `${position.layer}:${position.row}:${position.col}`;

export const positionsEqual = (a: BoardPosition, b: BoardPosition): boolean =>
  a.row === b.row && a.col === b.col && a.layer === b.layer;

export const isBoardPositionInBounds = (position: BoardPosition): boolean =>
  position.row >= 0 &&
  position.row < BOARD_ROWS &&
  position.col >= 0 &&
  position.col < BOARD_COLS;

export const chargeCostTotal = (cost: ChargeCost | undefined): number => {
  if (!cost) {
    return 0;
  }

  const aspectTotal = Object.values(cost.aspect ?? {}).reduce(
    (sum, value) => sum + value,
    0
  );
  return cost.generic + aspectTotal;
};
