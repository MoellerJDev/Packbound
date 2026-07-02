import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  createRunFromStarterKit,
  getUpgradeableCardGroups,
  type RunState
} from "@packbound/rules";
import { asCardInstanceId, asPlayerId } from "@packbound/shared";

import {
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
    expect(debugScenarioFromSearch("?scenario=unknown")).toBeUndefined();
    expect(debugScenarioFromSearch("")).toBeUndefined();
  });

  it("leaves normal debug runs unchanged", () => {
    const run = createBaseRun();

    expect(applyDebugScenario(run, undefined)).toBe(run);
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
});
