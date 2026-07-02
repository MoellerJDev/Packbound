import { createCardInstance, type RunState } from "@packbound/rules";
import { asCardDefId, asCardInstanceId, type CardInstance } from "@packbound/shared";

export const DEBUG_UPGRADE_SCENARIO_ID = "upgrade-lab";

export type DebugScenarioId = typeof DEBUG_UPGRADE_SCENARIO_ID;

export const DEBUG_UPGRADE_CARD_DEF_ID = asCardDefId("cinder_scout");

const DEBUG_UPGRADE_COPY_COUNT = 3;

export const isDebugScenarioId = (
  value: string | null | undefined
): value is DebugScenarioId => value === DEBUG_UPGRADE_SCENARIO_ID;

const upgradeLabCard = (run: RunState, index: number): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId: DEBUG_UPGRADE_CARD_DEF_ID,
    zone: "pool",
    upgradeLevel: 0,
    instanceId: asCardInstanceId(
      `${run.runId}:debug-scenario:${DEBUG_UPGRADE_SCENARIO_ID}:cinder_scout:${index}`
    )
  });

export const applyUpgradeLabScenario = (run: RunState): RunState => ({
  ...run,
  pool: [
    ...run.pool,
    ...Array.from({ length: DEBUG_UPGRADE_COPY_COUNT }, (_unused, index) =>
      upgradeLabCard(run, index)
    )
  ]
});

export const applyDebugScenario = (
  run: RunState,
  scenarioId: DebugScenarioId | undefined
): RunState => {
  switch (scenarioId) {
    case DEBUG_UPGRADE_SCENARIO_ID:
      return applyUpgradeLabScenario(run);
    case undefined:
      return run;
  }
};

export const debugScenarioFromSearch = (search: string): DebugScenarioId | undefined => {
  const scenario = new URLSearchParams(search).get("scenario");
  return isDebugScenarioId(scenario) ? scenario : undefined;
};
