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
  readonly hexRadius: number;
  readonly hexWidth: number;
  readonly hexHeight: number;
  readonly rowStep: number;
  readonly marginX: number;
  readonly marginY: number;
  readonly width: number;
  readonly height: number;
};

export const PIXI_SHARED_ROWS = BOARD_ROWS;

export const PIXI_BATTLEFIELD_LAYOUT: PixiBattlefieldLayout = {
  cols: BOARD_COLS,
  rows: PIXI_SHARED_ROWS,
  hexRadius: 48,
  hexWidth: 83.138,
  hexHeight: 96,
  rowStep: 72,
  marginX: 80,
  marginY: 74,
  width: 700,
  height: 420
};

export const sharedCellForBoardPosition = (
  _side: PlayerSide,
  position: Pick<BoardPosition, "row" | "col">
): PixiSharedCell => ({
  row: position.row,
  col: position.col
});

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
