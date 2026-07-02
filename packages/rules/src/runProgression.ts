import type { ContentCatalog } from "@packbound/content";
import type { CombatEvent, CombatWinner, SimulationWarning } from "@packbound/shared";

import { prepareEncounterForRound } from "./encounters";
import { openPack } from "./packOpening";
import { getCurrentRewardChoices } from "./rewards";
import type {
  CombatSummary,
  EncounterHistoryEntry,
  RewardHistoryEntry,
  RunState
} from "./runState";

export type CombatResultLike = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
  readonly seed?: string;
  readonly rulesVersion?: string;
};

export type RecordCombatOptions = {
  readonly encounterId?: string;
};

const clearCurrentEncounter = (run: RunState): RunState => {
  const next: Omit<RunState, "currentEncounterId"> & {
    currentEncounterId?: string;
  } = { ...run };
  delete next.currentEncounterId;
  return next;
};

export const applyPackReward = (
  run: RunState,
  catalog: ContentCatalog,
  choiceId: string
): RunState => {
  if (run.status !== "active") {
    return run;
  }

  const choice = getCurrentRewardChoices(run, catalog).find(
    (candidate) => candidate.id === choiceId
  );
  if (!choice) {
    throw new Error(`Unknown reward choice id: ${choiceId}`);
  }

  const openedPackSeed = `${run.seed}:round:${run.currentRound}:choice:${choice.id}`;
  const openedPack = openPack({
    catalog,
    packId: choice.packId,
    seed: openedPackSeed,
    ownerId: run.playerId
  });
  const historyEntry: RewardHistoryEntry = {
    id: `reward-history:${run.rewardHistory.length}:${choice.id}`,
    type: "pack",
    round: run.currentRound,
    choiceId: choice.id,
    packId: choice.packId,
    openedPackSeed,
    cardDefIds: openedPack.slots.map((slot) => slot.cardDefId),
    cardInstanceIds: openedPack.slots.map((slot) => slot.cardInstanceId)
  };

  return {
    ...run,
    pool: [...run.pool, ...openedPack.cards],
    currentRewardChoices: [],
    rewardHistory: [...run.rewardHistory, historyEntry],
    openedPacks: [...run.openedPacks, openedPack]
  };
};

export const recordCombatResult = (
  run: RunState,
  combatResult: CombatResultLike,
  options: RecordCombatOptions = {}
): RunState => {
  if (run.status !== "active") {
    return run;
  }

  if (!run.currentEncounterId) {
    throw new Error("Cannot record combat without a prepared encounter");
  }

  if (options.encounterId && options.encounterId !== run.currentEncounterId) {
    throw new Error(
      `Combat was recorded for ${options.encounterId}, but current encounter is ${run.currentEncounterId}`
    );
  }

  const nextHealth = Math.max(0, run.playerHealth - combatResult.damageToPlayerA);
  const combatSummaryIndex = run.combatHistory.length;
  const summary: CombatSummary = {
    round: run.currentRound,
    winner: combatResult.winner,
    damageToPlayer: combatResult.damageToPlayerA,
    damageToOpponent: combatResult.damageToPlayerB,
    eventCount: combatResult.events.length,
    warningCodes: combatResult.warnings.map((warning) => warning.code),
    ...(combatResult.seed ? { seed: combatResult.seed } : {}),
    ...(combatResult.rulesVersion ? { rulesVersion: combatResult.rulesVersion } : {})
  };
  const encounterHistoryEntry: EncounterHistoryEntry = {
    round: run.currentRound,
    encounterId: run.currentEncounterId,
    combatSummaryIndex
  };

  return {
    ...run,
    status: nextHealth <= 0 ? "lost" : run.status,
    playerHealth: nextHealth,
    combatHistory: [...run.combatHistory, summary],
    encounterHistory: [...run.encounterHistory, encounterHistoryEntry]
  };
};

export const advanceRunAfterCombat = (
  run: RunState,
  catalog?: ContentCatalog
): RunState => {
  if (run.status !== "active") {
    return run;
  }

  const nextRound = run.currentRound + 1;
  const advanced = clearCurrentEncounter({
    ...run,
    currentRound: nextRound,
    status: nextRound > run.maxRounds ? "won" : "active",
    currentRewardChoices: []
  });

  if (advanced.status !== "active" || !catalog) {
    return advanced;
  }

  return prepareEncounterForRound(advanced, catalog);
};
