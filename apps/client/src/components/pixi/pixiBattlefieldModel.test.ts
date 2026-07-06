import { describe, expect, it } from "vitest";

import type { BoardGridSummary, EngagementPreview } from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  COMBAT_BOARD_ROWS,
  hexDistance,
  type BoardPosition
} from "@packbound/shared";

import { hexCenterForSharedCell } from "./pixiBattlefieldLayout";
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
    ...(inRange ? [enemyPosition] : []),
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
  it("maps local deployment boards into global combat coordinates", () => {
    const playerLocalPosition = { row: 0, col: 2, layer: "ground" } as const;
    const enemyLocalPosition = { row: 3, col: 2, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt(playerLocalPosition),
      enemyBoard: enemyBoardAt(enemyLocalPosition),
      engagementPreview: engagementPreview({
        playerPosition: { row: 4, col: 2, layer: "ground" },
        enemyPosition: { row: 3, col: 2, layer: "ground" },
        inRange: true
      })
    });
    const player = model.cards.find((card) => card.side === "playerA");
    const enemy = model.cards.find((card) => card.side === "playerB");

    expect(model.rows).toBe(COMBAT_BOARD_ROWS);
    expect(player?.position).toEqual({ row: 4, col: 2, layer: "ground" });
    expect(player?.sharedCell).toEqual({ row: 4, col: 2 });
    expect(enemy?.position).toEqual({ row: 3, col: 2, layer: "ground" });
    expect(enemy?.sharedCell).toEqual({ row: 3, col: 2 });

    const playerCenter = hexCenterForSharedCell(player!.sharedCell);
    const enemyCenter = hexCenterForSharedCell(enemy!.sharedCell);
    expect(enemyCenter.y).toBeLessThan(playerCenter.y);
  });

  it("marks an adjacent range-1 enemy as attackable on the global enemy coordinate", () => {
    const playerPosition = { row: 4, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 3, col: 2, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt({ row: 0, col: 2, layer: "ground" }),
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

  it("does not restrict range markers to the selected side's local deployment band", () => {
    const playerPosition = { row: 4, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 3, col: 2, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt({ row: 0, col: 2, layer: "ground" }),
      enemyBoard: enemyBoardAt(enemyPosition),
      engagementPreview: engagementPreview({
        playerPosition,
        enemyPosition,
        inRange: true
      })
    });

    expect(model.rows).toBe(COMBAT_BOARD_ROWS);
    expect(cellAt(model, { row: 3, col: 2 })?.markers.range).toBe(true);
  });

  it("separates opposing local same-coordinate tokens into side-owned combat rows", () => {
    const sharedPosition = { row: 1, col: 2, layer: "ground" } as const;
    const model = buildPixiBattlefieldModel({
      playerBoard: playerBoardAt(sharedPosition),
      enemyBoard: enemyBoardAt(sharedPosition),
      engagementPreview: engagementPreview({
        playerPosition: { row: 5, col: 2, layer: "ground" },
        enemyPosition: sharedPosition,
        inRange: true
      })
    });

    const player = model.cards.find((card) => card.side === "playerA");
    const enemy = model.cards.find((card) => card.side === "playerB");

    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    expect(pixiCardsShareNativePosition(player!, enemy!)).toBe(false);
    expect(player?.sharedCell).toEqual({ row: 5, col: 2 });
    expect(enemy?.sharedCell).toEqual({ row: 1, col: 2 });
  });

  it("adds placeable markers and does not mutate input summaries", () => {
    const playerPosition = { row: 4, col: 2, layer: "ground" } as const;
    const enemyPosition = { row: 3, col: 4, layer: "ground" } as const;
    const playerBoard = playerBoardAt({ row: 0, col: 2, layer: "ground" });
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
      "Enemy Scraprunner",
      "Ember Scraprunner"
    ]);
    expect(model.nextMove).toMatchObject({
      side: "playerA",
      from: { row: 4, col: 2 },
      to: { row: 4, col: 3 }
    });
    expect(cellAt(model, { row: 6, col: 2 })?.markers.placeable).toBe(true);
    expect(cellAt(model, { row: 6, col: 2 })?.placeablePosition).toEqual({
      row: 2,
      col: 2,
      layer: "support"
    });
    expect(JSON.stringify({ playerBoard, enemyBoard, preview, placeablePositions })).toBe(
      before
    );
  });
});
