import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardLayer,
  type BoardPlacement,
  type CardInstance
} from "@packbound/shared";

import { buildBoardGridSummary, type BoardGridSummary } from "../index";

const ownerId = asPlayerId("board-grid-player");

const placement = (
  id: string,
  defId: string,
  row: number,
  col: number,
  layer: BoardLayer
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(id),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer }
});

const activeBoardCard = (
  boardPlacement: BoardPlacement,
  upgradeLevel: number
): CardInstance => ({
  instanceId: boardPlacement.cardInstanceId,
  defId: boardPlacement.defId,
  ownerId: boardPlacement.ownerId,
  zone: "board",
  modifiers: [],
  upgradeLevel
});

const requireCell = (
  summary: BoardGridSummary,
  row: number,
  col: number
): BoardGridSummary["cells"][number] => {
  const cell = summary.cells.find(
    (candidate) => candidate.row === row && candidate.col === col
  );
  if (!cell) {
    throw new Error(`Expected grid cell r${row} c${col}`);
  }
  return cell;
};

const cardInstanceIds = (summary: BoardGridSummary): readonly string[] =>
  summary.cells.flatMap((cell) => cell.cards.map((card) => card.cardInstanceId));

describe("board grid summaries", () => {
  it("summarizes an empty board deterministically as serializable cells", () => {
    const summary = buildBoardGridSummary({ placements: [] }, sampleCatalog);

    expect(summary.rows).toBe(4);
    expect(summary.cols).toBe(7);
    expect(summary.cells).toHaveLength(28);
    expect(summary.cells[0]).toEqual({ row: 0, col: 0, cards: [] });
    expect(summary).toEqual(buildBoardGridSummary({ placements: [] }, sampleCatalog));
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("keeps ground and support cards in the same coordinate as separate layers", () => {
    const ground = placement("grid:cinder-scout", "cinder_scout", 1, 2, "ground");
    const support = placement("grid:cinder-tally", "cinder_tally_relic", 1, 2, "support");
    const summary = buildBoardGridSummary(
      { placements: [support, ground] },
      sampleCatalog,
      [activeBoardCard(ground, 2)]
    );
    const cell = requireCell(summary, 1, 2);

    expect(cell.ground?.name).toBe("Cinder Scout");
    expect(cell.ground?.upgradeLevel).toBe(2);
    expect(cell.support?.name).toBe("Cinder Tally");
    expect(cell.support?.upgradeLevel).toBeUndefined();
    expect(cell.cards.map((card) => `${card.layer}:${card.name}`)).toEqual([
      "ground:Cinder Scout",
      "support:Cinder Tally"
    ]);
    expect(new Set(cardInstanceIds(summary)).size).toBe(cardInstanceIds(summary).length);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("keeps encounter boards readable without active card instances", () => {
    const encounter = sampleCatalog.encountersById.get("cloudspire_phase_patrol");
    if (!encounter) {
      throw new Error("Expected cloudspire encounter fixture");
    }

    const summary = buildBoardGridSummary(encounter.loadout.board, sampleCatalog);
    const supportCell = requireCell(summary, 1, 3);
    const ids = cardInstanceIds(summary);

    expect(requireCell(summary, 0, 2).ground?.name).toBe("Cloudgate Adept");
    expect(supportCell.support?.name).toBe("Gleam Lantern");
    expect(ids).toHaveLength(encounter.loadout.board.placements.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("includes placements with missing definitions instead of dropping them", () => {
    const missing = placement("grid:missing", "missing_debug_card", 3, 6, "ground");
    const summary = buildBoardGridSummary({ placements: [missing] }, sampleCatalog);
    const card = requireCell(summary, 3, 6).ground;

    expect(card).toMatchObject({
      cardInstanceId: missing.cardInstanceId,
      defId: missing.defId,
      name: "missing_debug_card",
      cardType: "Unknown",
      layer: "ground",
      ownerId,
      traits: [],
      keywords: [],
      definitionMissing: true
    });
  });
});
