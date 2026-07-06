import { describe, expect, it } from "vitest";

import {
  BOARD_COLS,
  COMBAT_BOARD_COLS,
  COMBAT_BOARD_ROWS,
  COMBAT_ENGAGEMENT_LINE_AFTER_ROW,
  combatRowRangeForSide,
  combatRowsForSide,
  combatSideForRow,
  hexDistance,
  isCombatPositionInBounds,
  isCombatRowInBounds,
  isEnemySideCombatRow,
  isHexAdjacent,
  isLocalDeploymentPositionInBounds,
  isLocalDeploymentRowInBounds,
  isPlayerSideCombatRow,
  LOCAL_DEPLOYMENT_ROWS,
  toCombatPosition,
  toLocalDeploymentPosition,
  type BoardPosition,
  type BoardLayer,
  type PlayerSide
} from "../index";

const position = (
  row: number,
  col: number,
  layer: BoardLayer = "ground"
): BoardPosition => ({
  row,
  col,
  layer
});

const expectMapped = (side: PlayerSide, localPosition: BoardPosition): BoardPosition => {
  const mapped = toCombatPosition(side, localPosition);
  expect(mapped).toBeDefined();
  if (!mapped) {
    throw new Error("Expected local deployment position to map into combat space.");
  }
  return mapped;
};

describe("future two-sided battlefield coordinate model", () => {
  it("defines local deployment and global combat dimensions", () => {
    expect(LOCAL_DEPLOYMENT_ROWS).toBe(4);
    expect(COMBAT_BOARD_ROWS).toBe(8);
    expect(COMBAT_BOARD_COLS).toBe(BOARD_COLS);
    expect(COMBAT_BOARD_COLS).toBe(7);
    expect(COMBAT_ENGAGEMENT_LINE_AFTER_ROW).toBe(3);
  });

  it("defines side row ranges around the engagement line", () => {
    expect(combatRowsForSide("playerB")).toEqual([3, 2, 1, 0]);
    expect(combatRowsForSide("playerA")).toEqual([4, 5, 6, 7]);
    expect(combatRowRangeForSide("playerB")).toEqual({ firstRow: 0, lastRow: 3 });
    expect(combatRowRangeForSide("playerA")).toEqual({ firstRow: 4, lastRow: 7 });

    expect(isEnemySideCombatRow(0)).toBe(true);
    expect(isEnemySideCombatRow(3)).toBe(true);
    expect(isEnemySideCombatRow(4)).toBe(false);
    expect(isPlayerSideCombatRow(3)).toBe(false);
    expect(isPlayerSideCombatRow(4)).toBe(true);
    expect(isPlayerSideCombatRow(7)).toBe(true);
    expect(combatSideForRow(3)).toBe("playerB");
    expect(combatSideForRow(4)).toBe("playerA");
    expect(combatSideForRow(8)).toBeUndefined();
  });

  it("maps all player local deployment rows into the lower combat half", () => {
    expect(toCombatPosition("playerA", position(0, 2))).toEqual(position(4, 2));
    expect(toCombatPosition("playerA", position(1, 2))).toEqual(position(5, 2));
    expect(toCombatPosition("playerA", position(2, 2))).toEqual(position(6, 2));
    expect(toCombatPosition("playerA", position(3, 2))).toEqual(position(7, 2));
  });

  it("maps all enemy local deployment rows into the upper combat half with local row 0 as frontline", () => {
    expect(toCombatPosition("playerB", position(0, 2))).toEqual(position(3, 2));
    expect(toCombatPosition("playerB", position(1, 2))).toEqual(position(2, 2));
    expect(toCombatPosition("playerB", position(2, 2))).toEqual(position(1, 2));
    expect(toCombatPosition("playerB", position(3, 2))).toEqual(position(0, 2));
  });

  it("preserves columns and layers without mutating input positions", () => {
    const localSupport = position(2, 5, "support");
    const before = { ...localSupport };
    const mapped = toCombatPosition("playerA", localSupport);

    expect(mapped).toEqual(position(6, 5, "support"));
    expect(localSupport).toEqual(before);
    expect(mapped).not.toBe(localSupport);
  });

  it("maps valid combat positions back to local deployment positions", () => {
    expect(toLocalDeploymentPosition("playerA", position(4, 0))).toEqual(position(0, 0));
    expect(toLocalDeploymentPosition("playerA", position(5, 1))).toEqual(position(1, 1));
    expect(toLocalDeploymentPosition("playerA", position(6, 2))).toEqual(position(2, 2));
    expect(toLocalDeploymentPosition("playerA", position(7, 3))).toEqual(position(3, 3));

    expect(toLocalDeploymentPosition("playerB", position(3, 0))).toEqual(position(0, 0));
    expect(toLocalDeploymentPosition("playerB", position(2, 1))).toEqual(position(1, 1));
    expect(toLocalDeploymentPosition("playerB", position(1, 2))).toEqual(position(2, 2));
    expect(toLocalDeploymentPosition("playerB", position(0, 3))).toEqual(position(3, 3));
  });

  it("does not inverse-map opposite-side or out-of-bounds combat rows", () => {
    expect(toLocalDeploymentPosition("playerA", position(3, 2))).toBeUndefined();
    expect(toLocalDeploymentPosition("playerB", position(4, 2))).toBeUndefined();
    expect(toLocalDeploymentPosition("playerA", position(8, 2))).toBeUndefined();
    expect(toLocalDeploymentPosition("playerB", position(-1, 2))).toBeUndefined();
    expect(toLocalDeploymentPosition("playerA", position(7, 7))).toBeUndefined();
  });

  it("round-trips valid local positions through combat space", () => {
    for (const side of ["playerA", "playerB"] as const) {
      for (let row = 0; row < LOCAL_DEPLOYMENT_ROWS; row += 1) {
        const local = position(row, row + 1, row % 2 === 0 ? "ground" : "support");
        const combat = expectMapped(side, local);

        expect(toLocalDeploymentPosition(side, combat)).toEqual(local);
      }
    }
  });

  it("keeps local and combat bounds separate", () => {
    expect(isCombatRowInBounds(7)).toBe(true);
    expect(isCombatRowInBounds(8)).toBe(false);
    expect(isCombatPositionInBounds(position(7, 6))).toBe(true);
    expect(isCombatPositionInBounds(position(8, 0))).toBe(false);

    expect(isLocalDeploymentRowInBounds(3)).toBe(true);
    expect(isLocalDeploymentRowInBounds(4)).toBe(false);
    expect(isLocalDeploymentPositionInBounds(position(3, 6))).toBe(true);
    expect(isLocalDeploymentPositionInBounds(position(4, 0))).toBe(false);
    expect(toCombatPosition("playerA", position(4, 0))).toBeUndefined();
  });

  it("documents odd-r distance across the future engagement line", () => {
    const enemyFront = position(3, 2);
    const playerFrontSameCol = position(4, 2);
    const playerFrontOffsetCol = position(4, 3);
    const playerFrontOutsideOddNeighbor = position(4, 1);

    expect(hexDistance(enemyFront, playerFrontSameCol)).toBe(1);
    expect(hexDistance(enemyFront, playerFrontOffsetCol)).toBe(1);
    expect(hexDistance(enemyFront, playerFrontOutsideOddNeighbor)).toBe(2);
    expect(isHexAdjacent(enemyFront, playerFrontSameCol)).toBe(true);
    expect(isHexAdjacent(enemyFront, playerFrontOffsetCol)).toBe(true);
    expect(isHexAdjacent(enemyFront, playerFrontOutsideOddNeighbor)).toBe(false);
  });

  it("returns plain JSON-serializable mapped positions", () => {
    const mapped = expectMapped("playerA", position(0, 2, "support"));

    expect(JSON.parse(JSON.stringify(mapped))).toEqual({
      row: 4,
      col: 2,
      layer: "support"
    });
  });
});
