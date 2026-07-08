import type { RunPhase } from "@packbound/rules";

export type DefaultActionRailPrimary =
  | "planning"
  | "combatPreview"
  | "packMarket"
  | "packOffer"
  | "commanderDoctrine"
  | "rewardsComplete"
  | "combatResolved"
  | "complete";

export type DefaultActionRailStepState = "done" | "current" | "todo";

export type DefaultActionRailRewardStep = {
  readonly label: string;
  readonly state: DefaultActionRailStepState;
};

export type DefaultActionRailView = {
  readonly heading: string;
  readonly message: string;
  readonly primary: DefaultActionRailPrimary;
  readonly progressText: string;
  readonly rewardSteps: readonly DefaultActionRailRewardStep[];
};

export type BuildDefaultActionRailViewInput = {
  readonly commanderDoctrineClaimed: boolean;
  readonly commanderDoctrineChoiceCount: number;
  readonly nextActionMessage: string;
  readonly packOfferPickLimit: number | undefined;
  readonly packRewardChoiceCount: number;
  readonly packRewardClaimed: boolean;
  readonly phase: RunPhase;
};

const rewardStepState = (done: boolean, current: boolean): DefaultActionRailStepState =>
  done ? "done" : current ? "current" : "todo";

export const buildDefaultActionRailView = ({
  commanderDoctrineClaimed,
  commanderDoctrineChoiceCount,
  nextActionMessage,
  packOfferPickLimit,
  packRewardChoiceCount,
  packRewardClaimed,
  phase
}: BuildDefaultActionRailViewInput): DefaultActionRailView => {
  if (phase === "complete") {
    return {
      heading: "Run Complete",
      message: "Reset to start another Packbound run.",
      primary: "complete",
      progressText: "Complete",
      rewardSteps: []
    };
  }

  if (phase === "combatReady") {
    return {
      heading: "Review Combat",
      message: nextActionMessage,
      primary: "combatPreview",
      progressText: "Combat ready",
      rewardSteps: []
    };
  }

  if (phase === "reward") {
    const hasPendingPackOffer = packOfferPickLimit !== undefined;
    const packMarketCurrent = !packRewardClaimed && !hasPendingPackOffer;
    const packOfferCurrent = hasPendingPackOffer;
    const doctrineCurrent =
      packRewardClaimed && !commanderDoctrineClaimed && commanderDoctrineChoiceCount > 0;
    const rewardsComplete = packRewardClaimed && commanderDoctrineClaimed;
    const rewardSteps: readonly DefaultActionRailRewardStep[] = [
      {
        label: "Pack Market",
        state: rewardStepState(packRewardClaimed, packMarketCurrent)
      },
      {
        label: hasPendingPackOffer
          ? `Pack Offer (${packOfferPickLimit} picks)`
          : "Pack Offer",
        state: rewardStepState(packRewardClaimed, packOfferCurrent)
      },
      {
        label: "Doctrine",
        state: rewardStepState(commanderDoctrineClaimed, doctrineCurrent)
      }
    ];

    if (packOfferCurrent) {
      return {
        heading: "Choose Pack Cards",
        message: nextActionMessage,
        primary: "packOffer",
        progressText: "Step 2 of 3",
        rewardSteps
      };
    }

    if (packMarketCurrent && packRewardChoiceCount > 0) {
      return {
        heading: "Choose A Pack",
        message: "Step 1 of 3: choose a reward pack to open.",
        primary: "packMarket",
        progressText: "Step 1 of 3",
        rewardSteps
      };
    }

    if (doctrineCurrent) {
      return {
        heading: "Unlock Doctrine",
        message: "Step 3 of 3: spend the doctrine point from this fight.",
        primary: "commanderDoctrine",
        progressText: "Step 3 of 3",
        rewardSteps
      };
    }

    if (rewardsComplete) {
      return {
        heading: "Rewards Complete",
        message: "Rewards complete: use Advance in the top bar to start planning.",
        primary: "rewardsComplete",
        progressText: "Ready to advance",
        rewardSteps
      };
    }

    return {
      heading: "Claim Rewards",
      message: nextActionMessage,
      primary: "packMarket",
      progressText: "Reward",
      rewardSteps
    };
  }

  if (phase === "combatResolved") {
    return {
      heading: "Advance",
      message: "Use Advance in the top bar to enter the next planning round.",
      primary: "combatResolved",
      progressText: "Ready",
      rewardSteps: []
    };
  }

  return {
    heading: "Plan The Fight",
    message: nextActionMessage,
    primary: "planning",
    progressText: "Planning",
    rewardSteps: []
  };
};
