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

  expect(layers.ashes.statusText).toBe(
    "Last combat destroyed units (not persistent Ashes)."
  );
  expect(layers.ashes.entries).toEqual([
    {
      id: "last-combat-destroyed:test-destroyed-card:0",
      label: "Ember Scraprunner",
      detail: "Last combat destroyed: Your side"
    }
  ]);
  expect(JSON.parse(JSON.stringify(layers))).toEqual(layers);
});

describe("run clarity helpers", () => {
  it("prefers persistent Ash Ledger records over last-combat destroyed context", () => {
    const run: RunState = {
      ...createStarterRun(),
      ashRecords: [
        {
          id: "ash:test-run:2:test-destroyed-card:playerA:test-destroyed:200:combatDamage",
          sourceCardName: "Ember Scraprunner",
          cardDefId: asCardDefId("ember_scraprunner"),
          cardInstanceId: asCardInstanceId("test-destroyed-card"),
          cardType: "Unit",
          side: "player",
          combatSide: "playerA",
          ownerId: asPlayerId("clarity:ash-ledger"),
          roundCreated: 2,
          origin: "destroyed in combat",
          combatEventIndex: 1,
          combatEventTimeMs: 200,
          destructionReason: "combatDamage",
          isEcho: false,
          position: { row: 4, col: 1, layer: "ground" }
        }
      ]
    };

    const layers = buildBattlefieldLayersView({
      run,
      catalog: sampleCatalog,
      lastCombatEvents: [
        {
          type: "UnitDestroyed",
          timeMs: 300,
          unitId: asUnitInstanceId("playerB:temporary-destroyed"),
          cardInstanceId: asCardInstanceId("temporary-destroyed-card"),
          defId: asCardDefId("ash_debt_runner"),
          side: "playerB",
          ownerId: asPlayerId("enemy-player"),
          isEcho: false,
          reason: "combatDamage"
        }
      ]
    });

    expect(layers.ashes.statusText).toBe("Persistent Ashes tracked by Ash Ledger.");
    expect(layers.ashes.entries).toEqual([
      {
        id: "persistent-ashes:ash:test-run:2:test-destroyed-card:playerA:test-destroyed:200:combatDamage",
        label: "Ember Scraprunner",
        detail:
          "Persistent Ash from Ash Ledger: Your side; Unit; round 2; destroyed in combat; last seen r4 c1 ground"
      }
    ]);
  });

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
