import { describe, expect, it } from "vitest";

import {
  BOARD_COLS,
  BOARD_ROWS,
  HEX_OFFSET_MODE,
  hexDistance,
  hexNeighbors,
  hexStepToward,
  hexToCube,
  isHexAdjacent,
  isBoardPositionInBounds,
  isHexOffsetRow,
  positionKey,
  type BoardPosition
} from "../index";

const ground = (row: number, col: number): BoardPosition => ({
  row,
  col,
  layer: "ground"
});

describe("offset hex board topology", () => {
  it("characterizes the current shared 4-row board bounds", () => {
    expect(BOARD_ROWS).toBe(4);
    expect(BOARD_COLS).toBe(7);
    expect(isBoardPositionInBounds(ground(3, 6))).toBe(true);
    expect(isBoardPositionInBounds(ground(4, 0))).toBe(false);
    expect(isBoardPositionInBounds(ground(0, 7))).toBe(false);
  });

  it("documents the deterministic odd-r offset layout", () => {
    expect(HEX_OFFSET_MODE).toBe("odd-r");
    expect(isHexOffsetRow(0)).toBe(false);
    expect(isHexOffsetRow(1)).toBe(true);
    expect(isHexOffsetRow(2)).toBe(false);
  });

  it("converts row and column positions to cube coordinates for distance math", () => {
    expect(hexToCube(ground(0, 0))).toEqual({ x: 0, y: 0, z: 0 });
    expect(hexToCube(ground(1, 0))).toEqual({ x: 0, y: -1, z: 1 });
    expect(hexToCube(ground(2, 1))).toEqual({ x: 0, y: -2, z: 2 });
  });

  it("returns six in-bounds neighbors for an interior odd row cell", () => {
    expect(hexNeighbors(ground(1, 3))).toEqual([
      ground(1, 4),
      ground(2, 4),
      ground(2, 3),
      ground(1, 2),
      ground(0, 3),
      ground(0, 4)
    ]);
  });

  it("filters neighbors at board edges and corners", () => {
    expect(hexNeighbors(ground(0, 0))).toEqual([ground(0, 1), ground(1, 0)]);
    expect(hexNeighbors(ground(3, 6))).toEqual([ground(3, 5), ground(2, 6)]);
  });

  it("uses hex distance instead of Manhattan distance", () => {
    expect(hexDistance(ground(0, 0), ground(0, 3))).toBe(3);
    expect(hexDistance(ground(0, 0), ground(2, 1))).toBe(2);
    expect(hexDistance(ground(2, 1), ground(0, 0))).toBe(2);
    expect(isHexAdjacent(ground(0, 0), ground(1, 0))).toBe(true);
    expect(isHexAdjacent(ground(0, 0), ground(1, 1))).toBe(false);
  });

  it("characterizes current shared-field side adjacency assumptions", () => {
    expect(hexDistance(ground(0, 2), ground(0, 3))).toBe(1);
    expect(hexDistance(ground(0, 2), ground(3, 3))).toBe(3);
    expect(hexDistance(ground(3, 2), ground(0, 3))).toBe(3);
  });

  it("chooses a deterministic legal neighboring hex when stepping toward a target", () => {
    expect(hexStepToward(ground(0, 0), ground(1, 1))).toEqual(ground(0, 1));
    expect(hexStepToward(ground(1, 1), ground(3, 3))).toEqual(ground(1, 2));
  });

  it("does not step into occupied ground, while other layers do not block it", () => {
    expect(
      hexStepToward(ground(0, 0), ground(0, 3), new Set([positionKey(ground(0, 1))]))
    ).toBeUndefined();
    expect(
      hexStepToward(
        ground(0, 0),
        ground(0, 3),
        new Set([positionKey({ row: 0, col: 1, layer: "support" })])
      )
    ).toEqual(ground(0, 1));
  });
});
