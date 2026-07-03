import type {
  CardDefId,
  CardInstanceId,
  PermanentInstanceId,
  PlayerId,
  TerrainInstanceId,
  UnitInstanceId
} from "./ids";
import { BOARD_COLS, BOARD_ROWS } from "./constants";

export const BOARD_LAYERS = ["ground", "air", "support", "terrain"] as const;
export type BoardLayer = (typeof BOARD_LAYERS)[number];
export const HEX_OFFSET_MODE = "odd-r" as const;
export type HexOffsetMode = typeof HEX_OFFSET_MODE;
export type HexDirection = "E" | "SE" | "SW" | "W" | "NW" | "NE";

export type CubeCoordinate = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type BoardPosition = {
  readonly row: number;
  readonly col: number;
  readonly layer: BoardLayer;
};

export type BoardSlot = {
  readonly ground?: UnitInstanceId;
  readonly air?: UnitInstanceId;
  readonly support?: PermanentInstanceId;
  readonly terrain?: TerrainInstanceId;
};

export type BoardPlacement = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly position: BoardPosition;
};

export type BoardState = {
  readonly placements: readonly BoardPlacement[];
};

type HexNeighborDelta = {
  readonly direction: HexDirection;
  readonly row: number;
  readonly col: number;
};

export type HexOccupancy = ReadonlySet<string> | ((position: BoardPosition) => boolean);

export type HexBounds = (position: BoardPosition) => boolean;

const HEX_EVEN_ROW_DELTAS: readonly HexNeighborDelta[] = [
  { direction: "E", row: 0, col: 1 },
  { direction: "SE", row: 1, col: 0 },
  { direction: "SW", row: 1, col: -1 },
  { direction: "W", row: 0, col: -1 },
  { direction: "NW", row: -1, col: -1 },
  { direction: "NE", row: -1, col: 0 }
];

const HEX_ODD_ROW_DELTAS: readonly HexNeighborDelta[] = [
  { direction: "E", row: 0, col: 1 },
  { direction: "SE", row: 1, col: 1 },
  { direction: "SW", row: 1, col: 0 },
  { direction: "W", row: 0, col: -1 },
  { direction: "NW", row: -1, col: 0 },
  { direction: "NE", row: -1, col: 1 }
];

const EMPTY_HEX_OCCUPANCY = new Set<string>();

const hexPositionKey = (position: BoardPosition): string =>
  `${position.layer}:${position.row}:${position.col}`;

const isHexBoardPositionInBounds = (position: BoardPosition): boolean =>
  position.row >= 0 &&
  position.row < BOARD_ROWS &&
  position.col >= 0 &&
  position.col < BOARD_COLS;

const isHexOccupied = (occupancy: HexOccupancy, position: BoardPosition): boolean =>
  typeof occupancy === "function"
    ? occupancy(position)
    : occupancy.has(hexPositionKey(position));

export const isHexOffsetRow = (row: number): boolean => row % 2 !== 0;

export const hexToCube = (
  position: Pick<BoardPosition, "row" | "col">
): CubeCoordinate => {
  const x = position.col - Math.floor(position.row / 2);
  const z = position.row;
  const y = -x - z;
  return { x, y: Object.is(y, -0) ? 0 : y, z };
};

export const hexDistance = (
  a: Pick<BoardPosition, "row" | "col">,
  b: Pick<BoardPosition, "row" | "col">
): number => {
  const left = hexToCube(a);
  const right = hexToCube(b);

  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.z - right.z)
  );
};

export const hexNeighbors = (position: BoardPosition): readonly BoardPosition[] => {
  const deltas = isHexOffsetRow(position.row) ? HEX_ODD_ROW_DELTAS : HEX_EVEN_ROW_DELTAS;

  return deltas
    .map((delta) => ({
      row: position.row + delta.row,
      col: position.col + delta.col,
      layer: position.layer
    }))
    .filter(isHexBoardPositionInBounds);
};

export const isHexAdjacent = (
  a: Pick<BoardPosition, "row" | "col">,
  b: Pick<BoardPosition, "row" | "col">
): boolean => hexDistance(a, b) === 1;

export const hexStepToward = (
  from: BoardPosition,
  to: Pick<BoardPosition, "row" | "col">,
  occupancy: HexOccupancy = EMPTY_HEX_OCCUPANCY,
  bounds: HexBounds = isHexBoardPositionInBounds
): BoardPosition | undefined => {
  const currentDistance = hexDistance(from, to);
  const candidates = hexNeighbors(from)
    .map((position, index) => ({ position, index }))
    .filter(
      ({ position }) =>
        bounds(position) &&
        hexDistance(position, to) < currentDistance &&
        !isHexOccupied(occupancy, position)
    );

  candidates.sort(
    (left, right) =>
      hexDistance(left.position, to) - hexDistance(right.position, to) ||
      left.index - right.index
  );

  return candidates[0]?.position;
};
