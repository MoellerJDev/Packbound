import type { BoardPosition } from "@packbound/shared";

export const timeLabel = (timeMs?: number): string =>
  timeMs === undefined ? "--" : `${(timeMs / 1000).toFixed(1)}s`;

export const optionalList = (values: readonly string[]): string =>
  values.length > 0 ? values.join(", ") : "None";

export const formatCoordinate = (position: Pick<BoardPosition, "row" | "col">): string =>
  `r${position.row} c${position.col}`;

export const hexNoun = (count: number): string => (count === 1 ? "hex" : "hexes");
