import { describe, expect, it } from "vitest";

import { buildDefaultActionRailView } from "./defaultActionRailView";

describe("default action rail view", () => {
  it("starts reward sequencing at the pack market", () => {
    const view = buildDefaultActionRailView({
      commanderDoctrineClaimed: false,
      commanderDoctrineChoiceCount: 3,
      nextActionMessage: "Next: claim both rewards.",
      packOfferPickLimit: undefined,
      packRewardChoiceCount: 2,
      packRewardClaimed: false,
      phase: "reward"
    });

    expect(view).toMatchObject({
      heading: "Choose A Pack",
      primary: "packMarket",
      progressText: "Step 1 of 3"
    });
    expect(view.rewardSteps).toEqual([
      { label: "Pack Market", state: "current" },
      { label: "Pack Offer", state: "todo" },
      { label: "Doctrine", state: "todo" }
    ]);
  });

  it("moves pending pack offers into the pick step", () => {
    const view = buildDefaultActionRailView({
      commanderDoctrineClaimed: false,
      commanderDoctrineChoiceCount: 3,
      nextActionMessage: "Next: pick 2 from Ember Foundry Pack.",
      packOfferPickLimit: 2,
      packRewardChoiceCount: 0,
      packRewardClaimed: false,
      phase: "reward"
    });

    expect(view).toMatchObject({
      heading: "Choose Pack Cards",
      primary: "packOffer",
      progressText: "Step 2 of 3"
    });
    expect(view.rewardSteps).toEqual([
      { label: "Pack Market", state: "todo" },
      { label: "Pack Offer (2 picks)", state: "current" },
      { label: "Doctrine", state: "todo" }
    ]);
  });

  it("moves to doctrine after pack reward resolution", () => {
    const view = buildDefaultActionRailView({
      commanderDoctrineClaimed: false,
      commanderDoctrineChoiceCount: 3,
      nextActionMessage: "Next: unlock one Commander doctrine.",
      packOfferPickLimit: undefined,
      packRewardChoiceCount: 0,
      packRewardClaimed: true,
      phase: "reward"
    });

    expect(view).toMatchObject({
      heading: "Unlock Doctrine",
      primary: "commanderDoctrine",
      progressText: "Step 3 of 3"
    });
    expect(view.rewardSteps).toEqual([
      { label: "Pack Market", state: "done" },
      { label: "Pack Offer", state: "done" },
      { label: "Doctrine", state: "current" }
    ]);
  });

  it("shows an advance prompt when reward buckets are complete", () => {
    const view = buildDefaultActionRailView({
      commanderDoctrineClaimed: true,
      commanderDoctrineChoiceCount: 0,
      nextActionMessage: "Next: reward choices are complete.",
      packOfferPickLimit: undefined,
      packRewardChoiceCount: 0,
      packRewardClaimed: true,
      phase: "reward"
    });

    expect(view).toMatchObject({
      heading: "Rewards Complete",
      primary: "rewardsComplete",
      progressText: "Ready to advance"
    });
    expect(view.message).toContain("Advance");
  });
});
