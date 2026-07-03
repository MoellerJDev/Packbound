import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  buildEngagementPreview,
  createRunFromStarterKit,
  getUpgradeableCardGroups,
  type RunState
} from "@packbound/rules";
import { asCardInstanceId, asPlayerId, positionKey } from "@packbound/shared";

import {
  DEBUG_ENGAGEMENT_MELEE_CARD_DEF_ID,
  DEBUG_ENGAGEMENT_RANGED_CARD_DEF_ID,
  DEBUG_ENGAGEMENT_SCENARIO_ID,
  DEBUG_PRIORITY_SCENARIO_ID,
  DEBUG_UPGRADE_CARD_DEF_ID,
  DEBUG_UPGRADE_SCENARIO_ID,
  applyDebugScenario,
  debugScenarioFromSearch
} from "./debugScenarios";

const createBaseRun = (): RunState =>
  applyRunAction(
    createRunFromStarterKit({
      seed: "debug-scenario-test",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId: asPlayerId("debug-scenario-player"),
      maxRounds: 3
    }),
    sampleCatalog,
    { type: "prepareEncounter" }
  );

describe("debug upgrade scenarios", () => {
  it("reads the upgrade lab URL scenario deterministically", () => {
    expect(debugScenarioFromSearch("?scenario=upgrade-lab")).toBe(
      DEBUG_UPGRADE_SCENARIO_ID
    );
    expect(debugScenarioFromSearch("?scenario=engagement-lab")).toBe(
      DEBUG_ENGAGEMENT_SCENARIO_ID
    );
    expect(debugScenarioFromSearch("?scenario=priority-lab")).toBe(
      DEBUG_PRIORITY_SCENARIO_ID
    );
    expect(debugScenarioFromSearch("?scenario=unknown")).toBeUndefined();
    expect(debugScenarioFromSearch("")).toBeUndefined();
  });

  it("leaves normal debug runs unchanged", () => {
    const run = createBaseRun();

    expect(applyDebugScenario(run, undefined)).toBe(run);
    expect(applyDebugScenario(run, DEBUG_PRIORITY_SCENARIO_ID)).toBe(run);
    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
  });

  it("adds exactly 3 matching deterministic upgrade-lab pool copies", () => {
    const run = createBaseRun();
    const before = JSON.parse(JSON.stringify(run)) as RunState;
    const scenarioRun = applyDebugScenario(run, DEBUG_UPGRADE_SCENARIO_ID);
    const copies = scenarioRun.pool.filter(
      (card) => card.defId === DEBUG_UPGRADE_CARD_DEF_ID
    );

    expect(run).toEqual(before);
    expect(copies).toHaveLength(3);
    expect(copies.map((card) => card.instanceId)).toEqual([
      asCardInstanceId(`${run.runId}:debug-scenario:upgrade-lab:cinder_scout:0`),
      asCardInstanceId(`${run.runId}:debug-scenario:upgrade-lab:cinder_scout:1`),
      asCardInstanceId(`${run.runId}:debug-scenario:upgrade-lab:cinder_scout:2`)
    ]);
    expect(
      copies.every(
        (card) =>
          card.ownerId === run.playerId &&
          card.zone === "pool" &&
          card.upgradeLevel === 0 &&
          card.modifiers.length === 0
      )
    ).toBe(true);
    expect(getUpgradeableCardGroups(scenarioRun, sampleCatalog)).toMatchObject([
      {
        defId: DEBUG_UPGRADE_CARD_DEF_ID,
        name: "Cinder Scout",
        availableCopies: 3,
        requiredCopies: 3,
        upgradeLevel: 0,
        nextUpgradeLevel: 1,
        eligible: true
      }
    ]);
    expect(JSON.parse(JSON.stringify(scenarioRun))).toEqual(scenarioRun);
  });

  it("sets up a deterministic engagement lab with an out-of-range melee preview", () => {
    const run = createBaseRun();
    const scenarioRun = applyDebugScenario(run, DEBUG_ENGAGEMENT_SCENARIO_ID);
    const meleePlacement = scenarioRun.board.placements[0];
    const rangedPlacement = scenarioRun.board.placements[1];

    if (!meleePlacement || !rangedPlacement) {
      throw new Error("Engagement lab did not create both board placements.");
    }

    expect(run.board.placements).toHaveLength(1);
    expect(scenarioRun.currentEncounterId).toBe("early_ember_pressure");
    expect(scenarioRun.board.placements).toEqual([
      {
        cardInstanceId: asCardInstanceId(
          `${run.runId}:debug-scenario:engagement-lab:cinder_scout:0`
        ),
        defId: DEBUG_ENGAGEMENT_MELEE_CARD_DEF_ID,
        ownerId: run.playerId,
        position: { row: 2, col: 1, layer: "ground" }
      },
      {
        cardInstanceId: asCardInstanceId(
          `${run.runId}:debug-scenario:engagement-lab:sparkcatch_apprentice:1`
        ),
        defId: DEBUG_ENGAGEMENT_RANGED_CARD_DEF_ID,
        ownerId: run.playerId,
        position: { row: 2, col: 3, layer: "ground" }
      }
    ]);
    expect(scenarioRun.activeCards.map((card) => card.instanceId)).toEqual([
      meleePlacement?.cardInstanceId,
      rangedPlacement?.cardInstanceId
    ]);

    const preview = buildEngagementPreview({
      catalog: sampleCatalog,
      playerBoard: scenarioRun.board,
      enemyBoard: sampleCatalog.encountersById.get("early_ember_pressure")?.loadout
        .board ?? { placements: [] },
      playerActiveCards: scenarioRun.activeCards,
      selectedCardInstanceId: meleePlacement.cardInstanceId,
      selectedSide: "playerA"
    });

    expect(preview.selected).toMatchObject({
      name: "Cinder Scout",
      position: { row: 2, col: 1, layer: "ground" },
      range: 1
    });
    expect(preview.likelyTarget).toMatchObject({
      name: "Ember Scraprunner",
      distance: 3,
      inRange: false
    });
    expect(preview.nextMove?.to).toEqual({ row: 2, col: 2, layer: "ground" });
    expect(preview.rangeCells.map(positionKey)).toContain("ground:2:2");

    const rangedPreview = buildEngagementPreview({
      catalog: sampleCatalog,
      playerBoard: scenarioRun.board,
      enemyBoard: sampleCatalog.encountersById.get("early_ember_pressure")?.loadout
        .board ?? { placements: [] },
      playerActiveCards: scenarioRun.activeCards,
      selectedCardInstanceId: rangedPlacement.cardInstanceId,
      selectedSide: "playerA"
    });

    expect(rangedPreview.selected).toMatchObject({
      name: "Sparkcatch Apprentice",
      position: { row: 2, col: 3, layer: "ground" },
      range: 2,
      identity: "Ranged"
    });
    expect(rangedPreview.likelyTarget).toMatchObject({
      name: "Ember Scraprunner",
      distance: 2,
      inRange: true
    });
    expect(rangedPreview.nextMove).toBeUndefined();
    expect(JSON.parse(JSON.stringify(scenarioRun))).toEqual(scenarioRun);
  });
});
