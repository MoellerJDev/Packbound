import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId
} from "@packbound/shared";

import {
  buildBattlefieldLayersView,
  buildLoadoutResourceSummary,
  createRunFromStarterKit,
  getRunNextActionMessage,
  validateRunLoadout,
  type RunState
} from "../index";

const createStarterRun = (
  starterKitId = "ember_scrappers",
  seed = `clarity:${starterKitId}`
): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId(`clarity:${starterKitId}`)
  });

it("summarizes player-facing battlefield layers without inventing mechanics", () => {
  const run = createStarterRun();
  const emptyLayers = buildBattlefieldLayersView({ run, catalog: sampleCatalog });

  expect(emptyLayers.ashes).toMatchObject({
    title: "Ashes",
    statusText: "No Ashes yet.",
    entries: []
  });
  expect(emptyLayers.wallsAndEdges).toMatchObject({
    title: "Walls / Edges",
    statusText: "No walls or edge terrain yet.",
    entries: []
  });

  const layers = buildBattlefieldLayersView({
    run,
    catalog: sampleCatalog,
    lastCombatEvents: [
      {
        type: "UnitDestroyed",
        timeMs: 100,
        unitId: asUnitInstanceId("playerA:test-destroyed"),
        cardInstanceId: asCardInstanceId("test-destroyed-card"),
        defId: asCardDefId("ember_scraprunner"),
        side: "playerA",
        ownerId: run.playerId,
        isEcho: false,
        reason: "combatDamage"
      }
    ]
  });

  expect(layers.ashes.statusText).toBe("Last combat Ashes from destroyed units.");
  expect(layers.ashes.entries).toEqual([
    {
      id: "last-combat-ashes:test-destroyed-card:0",
      label: "Ember Scraprunner",
      detail: "Last combat Ashes: Your side"
    }
  ]);
  expect(JSON.parse(JSON.stringify(layers))).toEqual(layers);
});

describe("run clarity helpers", () => {
  it("summarizes Source Row resources deterministically", () => {
    const run = createStarterRun("rotbloom_recall");
    const summary = buildLoadoutResourceSummary(run, sampleCatalog);

    expect(summary.boardChargeUsed).toBe(2);
    expect(summary.boardChargeCapacity).toBe(7);
    expect(summary.boardChargeText).toBe("2 / 7");
    expect(summary.aspectAccess).toMatchObject({ Shade: 1, Bloom: 1 });
    expect(summary.aspectAccessText).toBe("Shade 1, Bloom 1");
    expect(summary.combatChargePerSecond).toBe(0.55);
    expect(summary.combatChargePerSecondText).toBe("0.55");
    expect(summary.sourceSlotsText).toBe("2 / 4");
    expect(buildLoadoutResourceSummary(run, sampleCatalog)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("returns phase-aware next-action guidance", () => {
    const planningRun = createStarterRun();
    const planningValidation = validateRunLoadout(planningRun, sampleCatalog);
    const illegalRun = {
      ...planningRun,
      sourceRow: { ...planningRun.sourceRow, cards: [] }
    };
    const illegalValidation = validateRunLoadout(illegalRun, sampleCatalog);

    expect(getRunNextActionMessage(planningRun, planningValidation)).toBe(
      "Next: tune your board, Sources, Spellrail, and Commander, then ready combat."
    );
    expect(getRunNextActionMessage(illegalRun, illegalValidation)).toBe(
      "Fix loadout errors before combat."
    );
    expect(
      getRunNextActionMessage(
        { ...planningRun, phase: "combatReady" },
        planningValidation
      )
    ).toBe("Next: review the combat preview, then record combat to lock in the result.");
    expect(
      getRunNextActionMessage({ ...planningRun, phase: "reward" }, planningValidation)
    ).toBe("Next: claim both rewards: open one pack and unlock one Commander doctrine.");
    expect(
      getRunNextActionMessage(
        { ...planningRun, phase: "combatResolved" },
        planningValidation
      )
    ).toBe("Next: advance to start the next planning round.");
    expect(
      getRunNextActionMessage(
        { ...planningRun, status: "won", phase: "complete" },
        planningValidation
      )
    ).toBe("Run complete. Reset to start again.");
  });
});
