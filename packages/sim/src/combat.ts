import { COMBAT_TICK_MS, MAX_COMBAT_DURATION_MS } from "@packbound/shared";

import { processAttacks } from "./damage";
import { returnPhasedUnits } from "./placement";
import {
  addWarning,
  aliveUnits,
  createInitialState,
  emit,
  snapshot,
  winnerForState
} from "./state";
import { tickStatuses } from "./statuses";
import { queueTechniques, resolveTechniques, tickCombatCharge } from "./techniques";
import {
  resolveAbilities,
  resolveCombatStartTriggers,
  resolveEntryTriggers
} from "./triggers";
import type { CombatResult, ResolveCombatInput } from "./types";

export type {
  CombatantSetup,
  CombatResult,
  CombatStateSnapshot,
  ResolveCombatInput
} from "./types";

export const resolveCombat = (input: ResolveCombatInput): CombatResult => {
  const rulesVersion = input.rulesVersion ?? "packbound-mvp-0";
  const state = createInitialState(input);
  const maxDurationMs = input.maxDurationMs ?? MAX_COMBAT_DURATION_MS;

  emit(state, { type: "CombatStarted", timeMs: 0 });
  queueTechniques(state);
  resolveEntryTriggers(state);
  resolveCombatStartTriggers(state);

  let winner = winnerForState(state);

  while (!state.ended && winner === undefined && state.timeMs < maxDurationMs) {
    state.timeMs += COMBAT_TICK_MS;
    tickCombatCharge(state);
    tickStatuses(state);
    returnPhasedUnits(state, resolveAbilities);
    resolveTechniques(state, resolveAbilities);
    processAttacks(state, resolveAbilities);
    winner = winnerForState(state);
  }

  if (winner === undefined) {
    winner = "draw";
    addWarning(
      state,
      "MAX_DURATION_REACHED",
      `Combat reached max duration of ${maxDurationMs}ms.`
    );
  }

  emit(state, {
    type: "CombatEnded",
    timeMs: state.timeMs,
    winner
  });

  return {
    winner,
    damageToPlayerA: winner === "playerB" ? aliveUnits(state.sides.playerB).length : 0,
    damageToPlayerB: winner === "playerA" ? aliveUnits(state.sides.playerA).length : 0,
    finalState: snapshot(state),
    events: state.events,
    warnings: state.warnings,
    rulesVersion,
    seed: input.seed
  };
};
