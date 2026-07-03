import { createCardInstance, type RunState } from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  type BoardPlacement,
  type CardDefId,
  type CardInstance
} from "@packbound/shared";

export const DEBUG_UPGRADE_SCENARIO_ID = "upgrade-lab";
export const DEBUG_ENGAGEMENT_SCENARIO_ID = "engagement-lab";
export const DEBUG_PRIORITY_SCENARIO_ID = "priority-lab";
export const DEBUG_RENDERER_SCENARIO_ID = "renderer-lab";

export type DebugScenarioId =
  | typeof DEBUG_UPGRADE_SCENARIO_ID
  | typeof DEBUG_ENGAGEMENT_SCENARIO_ID
  | typeof DEBUG_PRIORITY_SCENARIO_ID
  | typeof DEBUG_RENDERER_SCENARIO_ID;

export const DEBUG_UPGRADE_CARD_DEF_ID = asCardDefId("cinder_scout");
export const DEBUG_ENGAGEMENT_MELEE_CARD_DEF_ID = asCardDefId("cinder_scout");
export const DEBUG_ENGAGEMENT_RANGED_CARD_DEF_ID = asCardDefId("sparkcatch_apprentice");

const DEBUG_UPGRADE_COPY_COUNT = 3;
const DEBUG_ENGAGEMENT_ENCOUNTER_ID = "early_ember_pressure";

export const isDebugScenarioId = (
  value: string | null | undefined
): value is DebugScenarioId =>
  value === DEBUG_UPGRADE_SCENARIO_ID ||
  value === DEBUG_ENGAGEMENT_SCENARIO_ID ||
  value === DEBUG_PRIORITY_SCENARIO_ID ||
  value === DEBUG_RENDERER_SCENARIO_ID;

const debugScenarioInstanceId = (
  run: RunState,
  scenarioId: DebugScenarioId,
  defId: CardDefId,
  index: number
) => asCardInstanceId(`${run.runId}:debug-scenario:${scenarioId}:${defId}:${index}`);

const upgradeLabCard = (run: RunState, index: number): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId: DEBUG_UPGRADE_CARD_DEF_ID,
    zone: "pool",
    upgradeLevel: 0,
    instanceId: debugScenarioInstanceId(
      run,
      DEBUG_UPGRADE_SCENARIO_ID,
      DEBUG_UPGRADE_CARD_DEF_ID,
      index
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

const engagementLabCard = (
  run: RunState,
  defId: CardDefId,
  index: number
): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId,
    zone: "board",
    upgradeLevel: 0,
    instanceId: debugScenarioInstanceId(run, DEBUG_ENGAGEMENT_SCENARIO_ID, defId, index)
  });

const engagementLabPlacement = (
  card: CardInstance,
  row: number,
  col: number
): BoardPlacement => ({
  cardInstanceId: card.instanceId,
  defId: card.defId,
  ownerId: card.ownerId,
  position: { row, col, layer: "ground" }
});

export const applyEngagementLabScenario = (run: RunState): RunState => {
  const melee = engagementLabCard(run, DEBUG_ENGAGEMENT_MELEE_CARD_DEF_ID, 0);
  const ranged = engagementLabCard(run, DEBUG_ENGAGEMENT_RANGED_CARD_DEF_ID, 1);

  return {
    ...run,
    currentEncounterId: DEBUG_ENGAGEMENT_ENCOUNTER_ID,
    board: {
      placements: [
        engagementLabPlacement(melee, 2, 1),
        engagementLabPlacement(ranged, 2, 3)
      ]
    },
    activeCards: [melee, ranged]
  };
};

export const applyDebugScenario = (
  run: RunState,
  scenarioId: DebugScenarioId | undefined
): RunState => {
  switch (scenarioId) {
    case DEBUG_UPGRADE_SCENARIO_ID:
      return applyUpgradeLabScenario(run);
    case DEBUG_ENGAGEMENT_SCENARIO_ID:
      return applyEngagementLabScenario(run);
    case DEBUG_PRIORITY_SCENARIO_ID:
      return run;
    case DEBUG_RENDERER_SCENARIO_ID:
      return run;
    case undefined:
      return run;
  }
};

export const debugScenarioFromSearch = (search: string): DebugScenarioId | undefined => {
  const scenario = new URLSearchParams(search).get("scenario");
  return isDebugScenarioId(scenario) ? scenario : undefined;
};
