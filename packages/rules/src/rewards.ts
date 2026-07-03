import type { ContentCatalog } from "@packbound/content";
import type { PackDefinition } from "@packbound/shared";

import { createRng } from "./rng";
import type { PackRewardChoice, RewardChoice, RunState } from "./runState";

const REWARD_CHOICE_COUNT = 3;

export const hasPackRewardForCurrentRound = (run: RunState): boolean =>
  run.rewardHistory.some(
    (entry) => entry.type === "pack" && entry.round === run.currentRound
  );

const packChoiceForRun = (
  run: RunState,
  pack: PackDefinition,
  index: number
): PackRewardChoice => ({
  id: `reward:${run.currentRound}:${run.rewardHistory.length}:${index}:${pack.id}`,
  type: "pack",
  round: run.currentRound,
  packId: pack.id,
  label: pack.name,
  cost: pack.cost,
  affordable: run.playerGold >= pack.cost,
  goldAfterPurchase: run.playerGold - pack.cost
});

const refreshStoredChoice = (
  run: RunState,
  catalog: ContentCatalog,
  choice: RewardChoice
): RewardChoice => {
  const pack = catalog.packsById.get(choice.packId);
  if (!pack) {
    throw new Error(`Unknown pack id for reward choice: ${choice.packId}`);
  }

  return {
    ...choice,
    label: pack.name,
    cost: pack.cost,
    affordable: run.playerGold >= pack.cost,
    goldAfterPurchase: run.playerGold - pack.cost
  };
};

const ensureAffordableRewardChoice = (
  run: RunState,
  choices: readonly PackRewardChoice[],
  packs: readonly PackDefinition[]
): readonly PackRewardChoice[] => {
  if (choices.some((choice) => choice.affordable)) {
    return choices;
  }

  const cheapestAffordablePack = [...packs]
    .filter((pack) => run.playerGold >= pack.cost)
    .sort((left, right) => left.cost - right.cost || left.id.localeCompare(right.id))[0];
  if (
    !cheapestAffordablePack ||
    choices.some((choice) => choice.packId === cheapestAffordablePack.id)
  ) {
    return choices;
  }

  return [
    ...choices.slice(0, Math.max(0, choices.length - 1)),
    packChoiceForRun(run, cheapestAffordablePack, choices.length - 1)
  ];
};

export const getCurrentRewardChoices = (
  run: RunState,
  catalog: ContentCatalog
): readonly RewardChoice[] => {
  if (run.status !== "active" || run.phase !== "reward") {
    return [];
  }

  if (hasPackRewardForCurrentRound(run)) {
    return [];
  }

  if (run.currentRewardChoices.length > 0) {
    const refreshedChoices = run.currentRewardChoices.map((choice) =>
      refreshStoredChoice(run, catalog, choice)
    );
    return ensureAffordableRewardChoice(run, refreshedChoices, catalog.packs);
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

  const choices = Array.from({ length: REWARD_CHOICE_COUNT }, (_, index) => {
    const pack = packs[index % packs.length];
    if (!pack) {
      throw new Error("No pack reward could be selected");
    }

    return packChoiceForRun(run, pack, index);
  });

  return ensureAffordableRewardChoice(run, choices, catalog.packs);
};
