import type {
  CardDefId,
  CardInstanceId,
  PermanentInstanceId,
  PlayerId,
  TerrainInstanceId,
  UnitInstanceId
} from "./ids";

export const BOARD_LAYERS = ["ground", "air", "support", "terrain"] as const;
export type BoardLayer = (typeof BOARD_LAYERS)[number];

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
