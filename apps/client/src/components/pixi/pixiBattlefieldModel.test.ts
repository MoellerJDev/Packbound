import { describe, expect, it } from "vitest";

import type { BoardGridSummary, EngagementPreview } from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  hexDistance,
  type BoardPosition
} from "@packbound/shared";

import {
  hexCenterForSharedCell,
  sharedCellForBoardPosition
} from "./pixiBattlefieldLayout";
import {
  buildPixiBattlefieldModel,
  pixiCardsShareNativePosition
} from "./pixiBattlefieldModel";

const playerId = asPlayerId("player");
const enemyId = asPlayerId("enemy");
const emberScraprunner = asCardDefId("ember_scraprunner");
const enemyScraprunner = asCardDefId("enemy_scraprunner");
const playerCardInstanceId = asCardInstanceId("player-card");
const enemyCardInstanceId = asCardInstanceId("enemy-card");

const boardSummary = ({
  cardInstanceId,
  defId,
  name,
  ownerId,
  position
}: {
  readonly cardInstanceId: typeof playerCardInstanceId;
  readonly defId: typeof emberScraprunner;
  readonly name: string;
  readonly ownerId: typeof playerId;
  readonly position: BoardPosition;
}): BoardGridSummary => ({
  rows: 4,
  cols: 7,
  layout: {
    topology: "offset-hex",
    offsetMode: "odd-r",
    offsetRows: "odd"
  },
  cells: [
    {
      row: position.row,
      col: position.col,
      isOffsetRow: position.row % 2 === 1,
      rowOffset: position.row % 2 === 1 ? 1 : 0,
      ground: {
        cardInstanceId,
        defId,
        name,
        cardType: "Unit",
        layer: position.layer,
        ownerId,
        traits: [],
        keywords: []
      },
      cards: [
        {
          cardInstanceId,
          defId,
          name,
          cardType: "Unit",
          layer: position.layer,
          ownerId,
          traits: [],
          keywords: []
        }
      ]
    }
  ]
});

const playerBoardAt = (position: BoardPosition): BoardGridSummary =>
  boardSummary({
    cardInstanceId: playerCardInstanceId,
    defId: emberScraprunner,
    name: "Ember Scraprunner",
    ownerId: playerId,
    position
  });

const enemyBoardAt = (position: BoardPosition): BoardGridSummary =>
  boardSummary({
    cardInstanceId: enemyCardInstanceId,
    defId: enemyScraprunner,
    name: "Enemy Scraprunner",
    ownerId: enemyId,
    position
  });

const engagementPreview = ({
  playerPosition,
  enemyPosition,
  inRange
}: {
  readonly playerPosition: BoardPosition;
  readonly enemyPosition: BoardPosition;
  readonly inRange: boolean;
}): EngagementPreview => ({
  selected: {
    instanceId: playerCardInstanceId,
    name: "Ember Scraprunner",
    side: "playerA",
    position: playerPosition,
    range: 1,
    attack: 2,
    health: 1,
    attackSpeed: 1.3,
    identity: "Melee"
  },
  rangeCells: [
    playerPosition,
    { row: playerPosition.row, col: playerPosition.col + 1, layer: "ground" },
    { row: playerPosition.row, col: playerPosition.col - 1, layer: "ground" }
  ],
  likelyTarget: {
    instanceId: enemyCardInstanceId,
    name: "Enemy Scraprunner",
    side: "playerB",
    position: enemyPosition,
    distance: hexDistance(playerPosition, enemyPosition),
    inRange
  },
  ...(inRange
    ? {}
    : {
        nextMove: {
          from: playerPosition,
          to: { row: playerPosition.row, col: playerPosition.col + 1, layer: "ground" },
          reason: "Target is out of range."
        }
      }),
  targetingReason: "Nearest valid enemy.",
  explanation: ["Ember Scraprunner has 1 RNG."]
});

const cellAt = (
  model: ReturnType<typeof buildPixiBattlefieldModel>,
  position: Pick<BoardPosition, "row" | "col">
) =>
  model.cells.find(
    (cell) => cell.sharedCell.row === position.row && cell.sharedCell.col === position.col
  );

describe("pixi battlefield model", () => {
  it("maps both sides into canonical combat coordinates", () => {
    const playerCell = sharedCellForBoardPosition("playerA", { row: 0, col: 2 });
    const enemyCell = sharedCellForBoardPosition("playerB", { row: 0, col: 3 });

    expect(playerCell).toEqual({ row: 0, col: 2 });
    expect(enemyCell).toEqual({ row: 0, col: 3 });

    const playerCenter = hexCenterForSharedCell(playerCell);
    const enemyCenter = hexCenterForSharedCell(enemyCell);
    expect(Math.abs(enemyCenter.x - playerCenter.x)).toBeLessThan(90);
    expect(Math.abs(enemyCenter.y - playerCenter.y)).toBeLessThan(8);
  });

  it("marks an adjacent range-1 enemy as attackable on the enemy coordinate", () => {
    const playerPosition = { row: 0, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 0, col: 3, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt(playerPosition),
      enemyBoard: enemyBoardAt(enemyPosition),
      engagementPreview: engagementPreview({
        playerPosition,
        enemyPosition,
        inRange: true
      })
    });

    expect(model.selectedCardInstanceId).toBe(playerCardInstanceId);
    expect(model.likelyTargetCardInstanceId).toBe(enemyCardInstanceId);
    expect(cellAt(model, enemyPosition)?.markers.range).toBe(true);
    expect(cellAt(model, enemyPosition)?.markers.targetInRange).toBe(true);
  });

  it("does not restrict range markers to the selected side's old visual band", () => {
    const playerPosition = { row: 0, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 0, col: 3, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt(playerPosition),
      enemyBoard: enemyBoardAt(enemyPosition),
      engagementPreview: engagementPreview({
        playerPosition,
        enemyPosition,
        inRange: true
      })
    });

    expect(model.rows).toBe(4);
    expect(cellAt(model, { row: 0, col: 3 })?.markers.range).toBe(true);
  });

  it("keeps opposing same-coordinate tokens visible with deterministic offsets", () => {
    const sharedPosition = { row: 1, col: 2, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt(sharedPosition),
      enemyBoard: enemyBoardAt(sharedPosition),
      engagementPreview: engagementPreview({
        playerPosition: sharedPosition,
        enemyPosition: sharedPosition,
        inRange: true
      })
    });

    const player = model.cards.find((card) => card.side === "playerA");
    const enemy = model.cards.find((card) => card.side === "playerB");

    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    expect(pixiCardsShareNativePosition(player!, enemy!)).toBe(true);
    expect(player?.visualOffset).toEqual(expect.objectContaining({ x: -24 }));
    expect(enemy?.visualOffset).toEqual(expect.objectContaining({ x: 24 }));
  });

  it("adds placeable markers and does not mutate input summaries", () => {
    const playerPosition = { row: 0, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 3, col: 4, layer: "ground" } as const;
    const playerBoard = playerBoardAt(playerPosition);
    const enemyBoard = enemyBoardAt(enemyPosition);
    const preview = engagementPreview({
      playerPosition,
      enemyPosition,
      inRange: false
    });
    const placeablePositions = [{ row: 2, col: 2, layer: "support" } as const];
    const before = JSON.stringify({
      playerBoard,
      enemyBoard,
      preview,
      placeablePositions
    });

    const model = buildPixiBattlefieldModel({
      playerBoard,
      enemyBoard,
      engagementPreview: preview,
      placeablePositions
    });

    expect(model.cards.map((card) => card.name)).toEqual([
      "Ember Scraprunner",
      "Enemy Scraprunner"
    ]);
    expect(model.nextMove).toMatchObject({
      side: "playerA",
      from: { row: 0, col: 2 },
      to: { row: 0, col: 3 }
    });
    expect(cellAt(model, { row: 2, col: 2 })?.markers.placeable).toBe(true);
    expect(cellAt(model, { row: 2, col: 2 })?.placeablePosition).toEqual({
      row: 2,
      col: 2,
      layer: "support"
    });
    expect(JSON.stringify({ playerBoard, enemyBoard, preview, placeablePositions })).toBe(
      before
    );
  });
});
