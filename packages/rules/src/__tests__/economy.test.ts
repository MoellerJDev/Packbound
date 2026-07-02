import { describe, expect, it } from "vitest";

import { applyCombatGoldReward, calculateCombatGoldReward, createRun } from "../index";

describe("combat gold economy", () => {
  it("calculates deterministic gold rewards for win, draw, and loss outcomes", () => {
    expect(
      calculateCombatGoldReward({
        winner: "playerA",
        damageToPlayerA: 0
      })
    ).toBe(6);
    expect(
      calculateCombatGoldReward({
        winner: "playerA",
        damageToPlayerA: 2
      })
    ).toBe(5);
    expect(
      calculateCombatGoldReward({
        winner: "draw",
        damageToPlayerA: 0
      })
    ).toBe(5);
    expect(
      calculateCombatGoldReward({
        winner: "playerB",
        damageToPlayerA: 3
      })
    ).toBe(4);
  });

  it("applies combat gold without mutating the previous run", () => {
    const run = createRun({ seed: "economy-seed", startingGold: 2 });
    const snapshot = JSON.parse(JSON.stringify(run)) as typeof run;
    const rewarded = applyCombatGoldReward(run, {
      winner: "playerA",
      damageToPlayerA: 0
    });

    expect(run).toEqual(snapshot);
    expect(rewarded.playerGold).toBe(8);
    expect(JSON.parse(JSON.stringify(rewarded))).toEqual(rewarded);
  });
});
