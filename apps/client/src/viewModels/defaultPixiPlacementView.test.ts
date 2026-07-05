import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { applyRunAction, createRunFromStarterKit, type RunState } from "@packbound/rules";
import { asPlayerId, type CardInstance } from "@packbound/shared";

import { buildDefaultPixiPlacementView } from "./defaultPixiPlacementView";

const createBaseRun = (): RunState =>
  applyRunAction(
    createRunFromStarterKit({
      seed: "default-pixi-placement-test",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId: asPlayerId("default-pixi-placement-player"),
      maxRounds: 3
    }),
    sampleCatalog,
    { type: "prepareEncounter" }
  );

const findPoolCard = (run: RunState, cardName: string): CardInstance => {
  const card = run.pool.find(
    (candidate) => sampleCatalog.cardsById.get(candidate.defId)?.name === cardName
  );
  if (!card) {
    throw new Error(`Expected ${cardName} in pool.`);
  }
  return card;
};

describe("default Pixi placement view", () => {
  it("returns idle hint and inspect controls when no placement card is selected", () => {
    const view = buildDefaultPixiPlacementView({
      run: createBaseRun(),
      catalog: sampleCatalog,
      selectedPlacementCardId: undefined,
      blockedCellPosition: undefined,
      boardRows: 4,
      boardCols: 5
    });

    expect(view.selectedPlacementCard).toBeUndefined();
    expect(view.placeablePositions).toEqual([]);
    expect(view.placementHint).toEqual({
      mode: "idle",
      text: "Select a board-placeable Pool card below, then click a highlighted Pixi cell."
    });
    expect(view.boardEditControls).toEqual({
      mode: "inspect",
      modeLabel: "Inspect",
      statusText: "Select Pool cards below to enter placement mode.",
      canCancelPlacement: false
    });
  });

  it("returns ready hint, legal cells, and cancelable place controls", () => {
    const run = createBaseRun();
    const card = findPoolCard(run, "Sparkcatch Apprentice");
    const view = buildDefaultPixiPlacementView({
      run,
      catalog: sampleCatalog,
      selectedPlacementCardId: card.instanceId,
      blockedCellPosition: undefined,
      boardRows: 4,
      boardCols: 5
    });

    expect(view.selectedPlacementCard?.instanceId).toBe(card.instanceId);
    expect(view.placeablePositions.length).toBeGreaterThan(0);
    expect(view.placeablePositions).toContainEqual({ row: 0, col: 0, layer: "ground" });
    expect(view.placementHint).toMatchObject({
      mode: "ready",
      cardName: "Sparkcatch Apprentice",
      text: "Placing Sparkcatch Apprentice. Click a highlighted Pixi cell."
    });
    expect(view.boardEditControls).toEqual({
      mode: "place",
      modeLabel: "Place",
      selectedCardName: "Sparkcatch Apprentice",
      statusText: "Click a highlighted Pixi cell to place this card.",
      canCancelPlacement: true
    });
  });

  it("returns a selected-card blocked hint when the run cannot be edited", () => {
    const run = applyRunAction(createBaseRun(), sampleCatalog, {
      type: "markCombatReady"
    });
    const card = findPoolCard(run, "Sparkcatch Apprentice");
    const view = buildDefaultPixiPlacementView({
      run,
      catalog: sampleCatalog,
      selectedPlacementCardId: card.instanceId,
      blockedCellPosition: undefined,
      boardRows: 4,
      boardCols: 5
    });

    expect(view.placeablePositions).toEqual([]);
    expect(view.placementHint).toEqual({
      mode: "blocked",
      cardName: "Sparkcatch Apprentice",
      reason: "Loadout can only be edited during planning.",
      text: "Cannot place Sparkcatch Apprentice: Loadout can only be edited during planning."
    });
    expect(view.boardEditControls.canCancelPlacement).toBe(true);
  });

  it("returns existing validation copy when the selected card is not board-placeable", () => {
    const run = createBaseRun();
    const card = run.spellrail.cards.find(
      (candidate) => sampleCatalog.cardsById.get(candidate.defId)?.name === "Sparkfall"
    );
    if (!card) {
      throw new Error("Expected Sparkfall in Spellrail.");
    }
    const runWithTechniqueInPool = {
      ...run,
      pool: [...run.pool, { ...card, zone: "pool" as const }]
    } satisfies RunState;
    const view = buildDefaultPixiPlacementView({
      run: runWithTechniqueInPool,
      catalog: sampleCatalog,
      selectedPlacementCardId: card.instanceId,
      blockedCellPosition: undefined,
      boardRows: 4,
      boardCols: 5
    });

    expect(view.placeablePositions).toEqual([]);
    expect(view.placementHint).toMatchObject({
      mode: "blocked",
      cardName: "Sparkfall"
    });
    expect(view.placementHint.text).toContain("Cannot place Sparkfall:");
    expect(view.boardEditControls).toMatchObject({
      mode: "place",
      selectedCardName: "Sparkfall",
      canCancelPlacement: true
    });
  });

  it("returns blocked-cell copy with selected card, coordinate, layer, and reason", () => {
    const run = createBaseRun();
    const card = findPoolCard(run, "Sparkcatch Apprentice");
    const view = buildDefaultPixiPlacementView({
      run,
      catalog: sampleCatalog,
      selectedPlacementCardId: card.instanceId,
      blockedCellPosition: { row: 0, col: 2, layer: "ground" },
      boardRows: 4,
      boardCols: 5
    });

    expect(view.placementHint).toEqual({
      mode: "blockedCell",
      cardName: "Sparkcatch Apprentice",
      position: { row: 0, col: 2, layer: "ground" },
      positionText: "r0 c2 ground",
      reason: "Sparkcatch Apprentice cannot be placed on an occupied tile.",
      text: "Cannot place Sparkcatch Apprentice at r0 c2 ground: Sparkcatch Apprentice cannot be placed on an occupied tile."
    });
    expect(view.boardEditControls).toMatchObject({
      mode: "place",
      selectedCardName: "Sparkcatch Apprentice",
      canCancelPlacement: true
    });
  });

  it("ignores a stale blocked-cell target that is currently legal", () => {
    const run = createBaseRun();
    const card = findPoolCard(run, "Sparkcatch Apprentice");
    const view = buildDefaultPixiPlacementView({
      run,
      catalog: sampleCatalog,
      selectedPlacementCardId: card.instanceId,
      blockedCellPosition: { row: 0, col: 0, layer: "ground" },
      boardRows: 4,
      boardCols: 5
    });

    expect(view.placeablePositions).toContainEqual({ row: 0, col: 0, layer: "ground" });
    expect(view.placementHint).toMatchObject({
      mode: "ready",
      cardName: "Sparkcatch Apprentice"
    });
  });
});
