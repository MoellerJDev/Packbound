import type { ContentCatalog } from "@packbound/content";

import { createRng } from "./rng";
import type { RewardChoice, RunState } from "./runState";

const REWARD_CHOICE_COUNT = 3;

export const getCurrentRewardChoices = (
  run: RunState,
  catalog: ContentCatalog
): readonly RewardChoice[] => {
  if (run.status !== "active" || run.phase !== "reward") {
    return [];
  }

  if (run.currentRewardChoices.length > 0) {
    return run.currentRewardChoices;
  }

  if (catalog.packs.length === 0) {
    return [];
  }

  const rng = createRng(
    `${run.seed}:round:${run.currentRound}:rewards:${run.rewardHistory.length}`
  );
  const packs = rng.shuffle(
    [...catalog.packs].sort((left, right) => left.id.localeCompare(right.id))
  );

  return Array.from({ length: REWARD_CHOICE_COUNT }, (_, index) => {
    const pack = packs[index % packs.length];
    if (!pack) {
      throw new Error("No pack reward could be selected");
    }

    return {
      id: `reward:${run.currentRound}:${run.rewardHistory.length}:${index}:${pack.id}`,
      type: "pack",
      round: run.currentRound,
      packId: pack.id,
      label: pack.name
    };
  });
};
