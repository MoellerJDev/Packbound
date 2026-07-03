import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardLayer,
  type BoardPlacement,
  type BoardPosition,
  type BoardState
} from "@packbound/shared";

import {
  buildEngagementPreview,
  engagementPositionKey,
  previewHasPosition
} from "../index";

const player = asPlayerId("preview-player");
const enemy = asPlayerId("preview-enemy");

const placement = (
  id: string,
  defId: string,
  row: number,
  col: number,
  layer: BoardLayer = "ground"
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(id),
  defId: asCardDefId(defId),
  ownerId: id.startsWith("enemy") ? enemy : player,
  position: { row, col, layer }
});

const board = (...placements: readonly BoardPlacement[]): BoardState => ({
  placements
});

const preview = (
  selected: BoardPlacement,
  playerBoard: BoardState,
  enemyBoard: BoardState,
  side: "playerA" | "playerB" = "playerA"
) =>
  buildEngagementPreview({
    catalog: sampleCatalog,
    selectedCardInstanceId: selected.cardInstanceId,
    selectedSide: side,
    playerBoard,
    enemyBoard
  });

const pos = (row: number, col: number): BoardPosition => ({
  row,
  col,
  layer: "ground"
});

describe("engagement preview", () => {
  it("reports next movement for a selected melee unit with an out-of-range target", () => {
    const attacker = placement("ally:scout", "cinder_scout", 0, 0);
    const target = placement("enemy:runner", "ember_scraprunner", 0, 3);

    const result = preview(attacker, board(attacker), board(target));

    expect(result.selected).toMatchObject({
      instanceId: attacker.cardInstanceId,
      name: "Cinder Scout",
      range: 1,
      identity: "Melee"
    });
    expect(result.likelyTarget).toMatchObject({
      instanceId: target.cardInstanceId,
      name: "Ember Scraprunner",
      distance: 3,
      inRange: false
    });
    expect(result.nextMove).toEqual({
      from: attacker.position,
      to: pos(0, 1),
      reason: "Target is out of range."
    });
    expect(result.explanation).toContain(
      "Out of range: would move one hex toward r0 c1."
    );
  });

  it("reports an in-range target for a selected ranged unit", () => {
    const attacker = placement("ally:sparkcatch", "sparkcatch_apprentice", 0, 1);
    const target = placement("enemy:runner", "ember_scraprunner", 0, 3);

    const result = preview(attacker, board(attacker), board(target));

    expect(result.selected).toMatchObject({
      name: "Sparkcatch Apprentice",
      range: 2,
      identity: "Ranged"
    });
    expect(result.likelyTarget).toMatchObject({
      name: "Ember Scraprunner",
      distance: 2,
      inRange: true
    });
    expect(result.nextMove).toBeUndefined();
    expect(result.explanation).toContain("In range: can attack this target now.");
  });

  it("uses hex distance for range cells instead of square Manhattan distance", () => {
    const attacker = placement("ally:scout", "cinder_scout", 0, 0);

    const result = preview(attacker, board(attacker), board());

    expect(previewHasPosition(result.rangeCells, pos(1, 0))).toBe(true);
    expect(previewHasPosition(result.rangeCells, pos(1, 1))).toBe(false);
    expect(result.rangeCells.map(engagementPositionKey)).toEqual([
      "ground:0:0",
      "ground:0:1",
      "ground:1:0"
    ]);
  });

  it("prioritizes Guard targets before nearer non-Guard targets", () => {
    const attacker = placement("ally:runner", "ember_scraprunner", 0, 0);
    const closer = placement("enemy:scout", "cinder_scout", 0, 1);
    const guard = placement("enemy:guardian", "rootbrace_guardian", 0, 3);

    const result = preview(attacker, board(attacker), board(closer, guard));

    expect(result.likelyTarget).toMatchObject({
      instanceId: guard.cardInstanceId,
      name: "Rootbrace Guardian"
    });
    expect(result.targetingReason).toBe("Guard is prioritized.");
  });

  it("uses AntiAir to prefer Airborne targets when available", () => {
    const attacker = placement("ally:skyhook", "skyhook_lookout", 0, 0);
    const groundTarget = placement("enemy:runner", "ember_scraprunner", 0, 1);
    const airborneTarget = placement("enemy:mistwing", "mistwing_scout", 0, 3);

    const result = preview(
      attacker,
      board(attacker),
      board(groundTarget, airborneTarget)
    );

    expect(result.likelyTarget).toMatchObject({
      instanceId: airborneTarget.cardInstanceId,
      name: "Mistwing Scout"
    });
    expect(result.targetingReason).toBe("AntiAir prioritizes Airborne targets.");
  });

  it("reports blocked movement when the only closer ground hex is occupied", () => {
    const attacker = placement("ally:scout", "cinder_scout", 0, 0);
    const blocker = placement("ally:blocker", "ember_scraprunner", 0, 1);
    const target = placement("enemy:runner", "ember_scraprunner", 0, 3);

    const result = preview(attacker, board(attacker, blocker), board(target));

    expect(result.likelyTarget).toMatchObject({
      distance: 3,
      inRange: false
    });
    expect(result.nextMove).toBeUndefined();
    expect(result.blockedMovementReason).toBe(
      "Movement blocked by occupied ground hex or board edge."
    );
    expect(result.explanation).toContain(
      "Out of range: movement blocked by occupied ground hex or board edge."
    );
  });

  it("returns deterministic JSON-serializable output", () => {
    const attacker = placement("ally:runner", "ember_scraprunner", 0, 2);
    const target = placement("enemy:guardian", "rootbrace_guardian", 0, 3);
    const input = {
      catalog: sampleCatalog,
      selectedCardInstanceId: attacker.cardInstanceId,
      selectedSide: "playerA" as const,
      playerBoard: board(attacker),
      enemyBoard: board(target)
    };

    const first = buildEngagementPreview(input);
    const second = buildEngagementPreview(input);

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("explains that non-Unit and non-Echo selections do not create attack overlays", () => {
    const relic = placement("ally:relic", "cinder_tally_relic", 1, 2, "support");
    const target = placement("enemy:runner", "ember_scraprunner", 0, 3);

    const result = preview(relic, board(relic), board(target));

    expect(result.selected).toBeUndefined();
    expect(result.rangeCells).toEqual([]);
    expect(result.likelyTarget).toBeUndefined();
    expect(result.explanation).toEqual([
      "Cinder Tally is not a Unit or Echo; only Units and Echoes have basic attack ranges."
    ]);
  });
});
