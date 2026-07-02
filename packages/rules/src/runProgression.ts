import type { ContentCatalog } from "@packbound/content";
import type { CombatEvent, CombatWinner, SimulationWarning } from "@packbound/shared";

import { prepareEncounterForRound } from "./encounters";
import { validateRunLoadout } from "./loadout";
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

export const canApplyReward = (run: RunState): boolean =>
  run.status === "active" && run.phase === "reward";

export const canRecordCombat = (run: RunState, catalog: ContentCatalog): boolean =>
  run.status === "active" &&
  run.phase === "combatReady" &&
  Boolean(run.currentEncounterId) &&
  validateRunLoadout(run, catalog).ok;

export const markCombatReady = (run: RunState, catalog: ContentCatalog): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (run.phase !== "planning") {
    throw new Error(`Cannot mark combat ready while run phase is ${run.phase}`);
  }
  if (!run.currentEncounterId) {
    throw new Error("Cannot mark combat ready without a prepared encounter");
  }

  const validation = validateRunLoadout(run, catalog);
  if (!validation.ok) {
    throw new Error(
      `Cannot mark combat ready with an illegal loadout: ${validation.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return {
    ...run,
    phase: "combatReady"
  };
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
  if (!canApplyReward(run)) {
    throw new Error(`Cannot apply a reward while run phase is ${run.phase}`);
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
    phase: "combatResolved",
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

  if (run.phase !== "combatReady") {
    throw new Error(`Cannot record combat while run phase is ${run.phase}`);
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
    phase: nextHealth <= 0 ? "complete" : "reward",
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
  if (run.phase !== "combatResolved") {
    throw new Error(`Cannot advance after combat while run phase is ${run.phase}`);
  }

  const nextRound = run.currentRound + 1;
  const advanced = clearCurrentEncounter({
    ...run,
    currentRound: nextRound,
    status: nextRound > run.maxRounds ? "won" : "active",
    phase: nextRound > run.maxRounds ? "complete" : "planning",
    currentRewardChoices: []
  });

  if (advanced.status !== "active" || !catalog) {
    return advanced;
  }

  return prepareEncounterForRound(advanced, catalog);
};
