import type { BoardPosition } from "./board";
import type { PlayerSide } from "./combatEvents";
import { BOARD_COLS } from "./constants";

export const LOCAL_DEPLOYMENT_ROWS = 4;
export const COMBAT_BOARD_ROWS = LOCAL_DEPLOYMENT_ROWS * 2;
export const COMBAT_BOARD_COLS = BOARD_COLS;
export const COMBAT_ENGAGEMENT_LINE_AFTER_ROW = LOCAL_DEPLOYMENT_ROWS - 1;

export type CombatRowRange = {
  readonly firstRow: number;
  readonly lastRow: number;
};

export const PLAYER_COMBAT_ROW_RANGE: CombatRowRange = {
  firstRow: LOCAL_DEPLOYMENT_ROWS,
  lastRow: COMBAT_BOARD_ROWS - 1
};

export const ENEMY_COMBAT_ROW_RANGE: CombatRowRange = {
  firstRow: 0,
  lastRow: LOCAL_DEPLOYMENT_ROWS - 1
};

const PLAYER_COMBAT_ROWS = [4, 5, 6, 7] as const;
const ENEMY_COMBAT_ROWS = [0, 1, 2, 3] as const;

export const combatRowsForSide = (side: PlayerSide): readonly number[] =>
  side === "playerA" ? PLAYER_COMBAT_ROWS : ENEMY_COMBAT_ROWS;

export const combatRowRangeForSide = (side: PlayerSide): CombatRowRange =>
  side === "playerA" ? PLAYER_COMBAT_ROW_RANGE : ENEMY_COMBAT_ROW_RANGE;

export const isLocalDeploymentRowInBounds = (row: number): boolean =>
  row >= 0 && row < LOCAL_DEPLOYMENT_ROWS;

export const isLocalDeploymentPositionInBounds = (
  position: Pick<BoardPosition, "row" | "col">
): boolean =>
  isLocalDeploymentRowInBounds(position.row) &&
  position.col >= 0 &&
  position.col < BOARD_COLS;

export const isCombatRowInBounds = (row: number): boolean =>
  row >= 0 && row < COMBAT_BOARD_ROWS;

export const isCombatPositionInBounds = (
  position: Pick<BoardPosition, "row" | "col">
): boolean =>
  isCombatRowInBounds(position.row) &&
  position.col >= 0 &&
  position.col < COMBAT_BOARD_COLS;

export const isPlayerSideCombatRow = (row: number): boolean =>
  row >= PLAYER_COMBAT_ROW_RANGE.firstRow && row <= PLAYER_COMBAT_ROW_RANGE.lastRow;

export const isEnemySideCombatRow = (row: number): boolean =>
  row >= ENEMY_COMBAT_ROW_RANGE.firstRow && row <= ENEMY_COMBAT_ROW_RANGE.lastRow;

export const combatSideForRow = (row: number): PlayerSide | undefined => {
  if (isEnemySideCombatRow(row)) {
    return "playerB";
  }
  if (isPlayerSideCombatRow(row)) {
    return "playerA";
  }
  return undefined;
};

export const toCombatPosition = (
  side: PlayerSide,
  localPosition: BoardPosition
): BoardPosition | undefined => {
  if (!isLocalDeploymentPositionInBounds(localPosition)) {
    return undefined;
  }

  return {
    ...localPosition,
    row:
      side === "playerA" ? localPosition.row + LOCAL_DEPLOYMENT_ROWS : localPosition.row
  };
};

export const toLocalDeploymentPosition = (
  side: PlayerSide,
  combatPosition: BoardPosition
): BoardPosition | undefined => {
  if (
    !isCombatPositionInBounds(combatPosition) ||
    combatSideForRow(combatPosition.row) !== side
  ) {
    return undefined;
  }

  return {
    ...combatPosition,
    row:
      side === "playerA" ? combatPosition.row - LOCAL_DEPLOYMENT_ROWS : combatPosition.row
  };
};
