import type { CombatWinner } from "@packbound/shared";

import type { RunState } from "./runState";

export const BASE_COMBAT_GOLD_REWARD = 3;
export const WIN_COMBAT_GOLD_BONUS = 2;
export const DRAW_COMBAT_GOLD_BONUS = 1;
export const LOSS_COMBAT_GOLD_BONUS = 1;
export const CLEAN_COMBAT_GOLD_BONUS = 1;

export type CombatGoldRewardInput = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
};

export const calculateCombatGoldReward = (
  combatResult: CombatGoldRewardInput
): number => {
  const outcomeBonus =
    combatResult.winner === "playerA"
      ? WIN_COMBAT_GOLD_BONUS
      : combatResult.winner === "draw"
        ? DRAW_COMBAT_GOLD_BONUS
        : LOSS_COMBAT_GOLD_BONUS;
  const cleanBonus = combatResult.damageToPlayerA === 0 ? CLEAN_COMBAT_GOLD_BONUS : 0;

  return BASE_COMBAT_GOLD_REWARD + outcomeBonus + cleanBonus;
};

export const applyCombatGoldReward = (
  run: RunState,
  combatResult: CombatGoldRewardInput
): RunState => ({
  ...run,
  playerGold: run.playerGold + calculateCombatGoldReward(combatResult)
});
