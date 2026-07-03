import { describe, expect, it } from "vitest";

import type { BoardGridSummary, EngagementPreview } from "@packbound/rules";
import { asCardDefId, asCardInstanceId, asPlayerId } from "@packbound/shared";

import { sharedCellForBoardPosition } from "./pixiBattlefieldLayout";
import { buildPixiBattlefieldModel } from "./pixiBattlefieldModel";

const playerId = asPlayerId("player");
const enemyId = asPlayerId("enemy");
const emberScraprunner = asCardDefId("ember_scraprunner");
const enemyScraprunner = asCardDefId("enemy_scraprunner");
const playerCardInstanceId = asCardInstanceId("player-card");
const enemyCardInstanceId = asCardInstanceId("enemy-card");

const boardSummary = (side: "player" | "enemy"): BoardGridSummary => ({
  rows: 4,
  cols: 7,
  layout: {
    topology: "offset-hex",
    offsetMode: "odd-r",
    offsetRows: "odd"
  },
  cells: [
    {
      row: side === "player" ? 0 : 3,
      col: side === "player" ? 2 : 4,
      isOffsetRow: side === "enemy",
      rowOffset: side === "enemy" ? 1 : 0,
      ground: {
        cardInstanceId: side === "player" ? playerCardInstanceId : enemyCardInstanceId,
        defId: side === "player" ? emberScraprunner : enemyScraprunner,
        name: side === "player" ? "Ember Scraprunner" : "Enemy Scraprunner",
        cardType: "Unit",
        layer: "ground",
        ownerId: side === "player" ? playerId : enemyId,
        traits: [],
        keywords: []
      },
      cards: [
        {
          cardInstanceId: side === "player" ? playerCardInstanceId : enemyCardInstanceId,
          defId: side === "player" ? emberScraprunner : enemyScraprunner,
          name: side === "player" ? "Ember Scraprunner" : "Enemy Scraprunner",
          cardType: "Unit",
          layer: "ground",
          ownerId: side === "player" ? playerId : enemyId,
          traits: [],
          keywords: []
        }
      ]
    }
  ]
});

const engagementPreview: EngagementPreview = {
  selected: {
    instanceId: playerCardInstanceId,
    name: "Ember Scraprunner",
    side: "playerA",
    position: { row: 0, col: 2, layer: "ground" },
    range: 1,
    attack: 2,
    health: 1,
    attackSpeed: 1.3,
    identity: "Melee"
  },
  rangeCells: [{ row: 0, col: 2, layer: "ground" }],
  likelyTarget: {
    instanceId: enemyCardInstanceId,
    name: "Enemy Scraprunner",
    side: "playerB",
    position: { row: 3, col: 4, layer: "ground" },
    distance: 2,
    inRange: false
  },
  nextMove: {
    from: { row: 0, col: 2, layer: "ground" },
    to: { row: 0, col: 3, layer: "ground" },
    reason: "Target is out of range."
  },
  targetingReason: "Nearest valid enemy.",
  explanation: ["Ember Scraprunner has 1 RNG."]
};

describe("pixi battlefield model", () => {
  it("maps player and enemy boards into a deterministic shared battlefield", () => {
    expect(sharedCellForBoardPosition("playerB", { row: 3, col: 4 })).toMatchObject({
      row: 3,
      col: 4
    });
    expect(sharedCellForBoardPosition("playerA", { row: 0, col: 2 })).toMatchObject({
      row: 5,
      col: 2
    });
  });

  it("includes expected units and preview markers without mutating input", () => {
    const playerBoard = boardSummary("player");
    const enemyBoard = boardSummary("enemy");
    const before = JSON.stringify({ playerBoard, enemyBoard, engagementPreview });

    const model = buildPixiBattlefieldModel({
      playerBoard,
      enemyBoard,
      engagementPreview
    });

    expect(model.cards.map((card) => card.name)).toEqual([
      "Enemy Scraprunner",
      "Ember Scraprunner"
    ]);
    expect(model.selectedCardInstanceId).toBe(playerCardInstanceId);
    expect(model.likelyTargetCardInstanceId).toBe(enemyCardInstanceId);
    expect(model.nextMove).toMatchObject({
      side: "playerA",
      from: { row: 5, col: 2 },
      to: { row: 5, col: 3 }
    });
    expect(
      model.cells.find((cell) => cell.sharedCell.row === 5 && cell.sharedCell.col === 2)
        ?.markers.selected
    ).toBe(true);
    expect(
      model.cells.find((cell) => cell.sharedCell.row === 3 && cell.sharedCell.col === 4)
        ?.markers.targetOutOfRange
    ).toBe(true);
    expect(JSON.stringify({ playerBoard, enemyBoard, engagementPreview })).toBe(before);
  });
});
