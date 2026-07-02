import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardState,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

import { createCardInstance } from "../instances";
import { validatePlanningState } from "../validation";

const ownerId = asPlayerId("player");

const instance = (defId: string, zone: "board" | "sourceRow" | "spellrail") =>
  createCardInstance({
    defId: asCardDefId(defId),
    ownerId,
    zone,
    instanceId: asCardInstanceId(`${defId}:${zone}`)
  });

const sourceRow = (...defIds: string[]): SourceRowState => ({
  maxSlots: 4,
  cards: defIds.map((defId) => instance(defId, "sourceRow"))
});

const spellrail = (...defIds: string[]): SpellrailState => ({
  maxSlots: 2,
  cards: defIds.map((defId) => instance(defId, "spellrail"))
});

const board = (...defIds: string[]): BoardState => ({
  placements: defIds.map((defId, index) => ({
    cardInstanceId: asCardInstanceId(`${defId}:board:${index}`),
    defId: asCardDefId(defId),
    ownerId,
    position: { row: 0, col: index, layer: "ground" }
  }))
});

describe("planning validation", () => {
  it("accepts a legal board, Source Row, and Spellrail", () => {
    const result = validatePlanningState({
      catalog: sampleCatalog,
      board: board("ember_scraprunner"),
      sourceRow: sourceRow("ember_source"),
      spellrail: spellrail("sparkfall")
    });

    expect(result.ok).toBe(true);
  });

  it("rejects board Charge over capacity", () => {
    const result = validatePlanningState({
      catalog: sampleCatalog,
      board: board("debt_bound_colossus", "sporeback_beast"),
      sourceRow: sourceRow("bloom_source"),
      spellrail: spellrail()
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("BOARD_CHARGE_EXCEEDED");
  });

  it("rejects missing Aspect access", () => {
    const result = validatePlanningState({
      catalog: sampleCatalog,
      board: board("ember_scraprunner"),
      sourceRow: sourceRow("bloom_source"),
      spellrail: spellrail()
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("MISSING_ASPECT_ACCESS");
  });

  it("rejects illegal board layers", () => {
    const result = validatePlanningState({
      catalog: sampleCatalog,
      board: {
        placements: [
          {
            cardInstanceId: asCardInstanceId("ember_scraprunner:bad-layer"),
            defId: asCardDefId("ember_scraprunner"),
            ownerId,
            position: { row: 0, col: 0, layer: "support" }
          }
        ]
      },
      sourceRow: sourceRow("ember_source"),
      spellrail: spellrail()
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("ILLEGAL_BOARD_LAYER");
  });

  it("rejects Spellrail overflow", () => {
    const result = validatePlanningState({
      catalog: sampleCatalog,
      board: board(),
      sourceRow: sourceRow("ember_source", "tide_source"),
      spellrail: {
        maxSlots: 1,
        cards: [instance("sparkfall", "spellrail"), instance("phase_step", "spellrail")]
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain(
      "SPELLRAIL_LIMIT_EXCEEDED"
    );
  });
});
