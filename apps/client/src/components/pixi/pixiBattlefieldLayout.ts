import {
  BOARD_COLS,
  BOARD_ROWS,
  isHexOffsetRow,
  type BoardPosition,
  type PlayerSide
} from "@packbound/shared";

export type PixiSharedCell = {
  readonly row: number;
  readonly col: number;
};

export type PixiPoint = {
  readonly x: number;
  readonly y: number;
};

export type PixiBattlefieldLayout = {
  readonly cols: number;
  readonly rows: number;
  readonly boardRows: number;
  readonly laneRow: number;
  readonly hexRadius: number;
  readonly hexWidth: number;
  readonly hexHeight: number;
  readonly rowStep: number;
  readonly marginX: number;
  readonly marginY: number;
  readonly width: number;
  readonly height: number;
};

export const PIXI_SHARED_LANE_ROW = BOARD_ROWS;
export const PIXI_SHARED_ROWS = BOARD_ROWS * 2 + 1;

export const PIXI_BATTLEFIELD_LAYOUT: PixiBattlefieldLayout = {
  cols: BOARD_COLS,
  rows: PIXI_SHARED_ROWS,
  boardRows: BOARD_ROWS,
  laneRow: PIXI_SHARED_LANE_ROW,
  hexRadius: 34,
  hexWidth: 58.889,
  hexHeight: 68,
  rowStep: 51,
  marginX: 64,
  marginY: 54,
  width: 548,
  height: 528
};

export const sharedCellForBoardPosition = (
  side: PlayerSide,
  position: Pick<BoardPosition, "row" | "col">
): PixiSharedCell => ({
  row: side === "playerB" ? position.row : BOARD_ROWS + 1 + position.row,
  col: position.col
});

export const sideForSharedRow = (row: number): PlayerSide | undefined => {
  if (row < PIXI_SHARED_LANE_ROW) {
    return "playerB";
  }

  if (row > PIXI_SHARED_LANE_ROW) {
    return "playerA";
  }

  return undefined;
};

export const isLaneSharedRow = (row: number): boolean => row === PIXI_SHARED_LANE_ROW;

export const hexCenterForSharedCell = (
  cell: PixiSharedCell,
  layout: PixiBattlefieldLayout = PIXI_BATTLEFIELD_LAYOUT
): PixiPoint => ({
  x:
    layout.marginX +
    cell.col * layout.hexWidth +
    (isHexOffsetRow(cell.row) ? layout.hexWidth / 2 : 0),
  y: layout.marginY + cell.row * layout.rowStep
});

export const hexPolygonPoints = (
  center: PixiPoint,
  radius = PIXI_BATTLEFIELD_LAYOUT.hexRadius
): readonly number[] => {
  const points: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 30);
    points.push(center.x + radius * Math.cos(angle));
    points.push(center.y + radius * Math.sin(angle));
  }
  return points;
};
