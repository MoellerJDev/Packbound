import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import type { CombatEvent } from "@packbound/shared";

import {
  advanceRunAfterCombat,
  applyPackReward,
  createRun,
  getCurrentRewardChoices,
  prepareEncounterForRound,
  recordCombatResult,
  type CombatResultLike,
  type RunState
} from "../index";

const combatStarted: CombatEvent = { type: "CombatStarted", timeMs: 0 };

const combatResult = (overrides: Partial<CombatResultLike> = {}): CombatResultLike => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 3,
  events: [combatStarted],
  warnings: [],
  seed: "rules-combat-seed",
  rulesVersion: "sim-test",
  ...overrides
});

const firstRewardChoiceId = (run: RunState): string => {
  const choice = getCurrentRewardChoices(run, sampleCatalog)[0];
  if (!choice) {
    throw new Error("Expected a reward choice");
  }
  return choice.id;
};

const applyFirstReward = (run: RunState): RunState =>
  applyPackReward(run, sampleCatalog, firstRewardChoiceId(run));

const prepareRun = (run: RunState): RunState =>
  prepareEncounterForRound(run, sampleCatalog);

describe("run progression skeleton", () => {
  it("creates deterministic initial run state for the same seed", () => {
    const first = createRun({ seed: "run-seed" });
    const second = createRun({ seed: "run-seed" });

    expect(second).toEqual(first);
    expect(first.currentRound).toBe(1);
    expect(first.playerHealth).toBe(20);
  });

  it("creates deterministic pack reward choices", () => {
    const first = createRun({ seed: "reward-seed" });
    const second = createRun({ seed: "reward-seed" });

    const firstChoices = getCurrentRewardChoices(first, sampleCatalog);
    const secondChoices = getCurrentRewardChoices(second, sampleCatalog);

    expect(firstChoices).toHaveLength(3);
    expect(secondChoices).toEqual(firstChoices);
  });

  it("opens the same pack reward into the same cards for the same run seed", () => {
    const first = applyFirstReward(createRun({ seed: "pack-seed" }));
    const second = applyFirstReward(createRun({ seed: "pack-seed" }));

    expect(second.openedPacks).toEqual(first.openedPacks);
    expect(second.pool.map((card) => card.defId)).toEqual(
      first.pool.map((card) => card.defId)
    );
  });

  it("applying a pack reward adds cards to pool and reward history", () => {
    const run = applyFirstReward(createRun({ seed: "history-seed" }));

    expect(run.pool.length).toBeGreaterThan(0);
    expect(run.openedPacks).toHaveLength(1);
    expect(run.rewardHistory).toHaveLength(1);
    expect(run.rewardHistory[0]?.cardInstanceIds).toHaveLength(run.pool.length);
    expect(run.currentRewardChoices).toHaveLength(0);
  });

  it("recording combat applies player damage and stores a summary", () => {
    const run = recordCombatResult(
      prepareRun(createRun({ seed: "damage-seed" })),
      combatResult({ damageToPlayerA: 7, damageToPlayerB: 2 })
    );

    expect(run.playerHealth).toBe(13);
    expect(run.status).toBe("active");
    expect(run.combatHistory).toEqual([
      {
        round: 1,
        winner: "playerA",
        damageToPlayer: 7,
        damageToOpponent: 2,
        eventCount: 1,
        warningCodes: [],
        seed: "rules-combat-seed",
        rulesVersion: "sim-test"
      }
    ]);
  });

  it("advancing after combat increments the round", () => {
    const run = advanceRunAfterCombat(
      recordCombatResult(prepareRun(createRun({ seed: "advance-seed" })), combatResult())
    );

    expect(run.currentRound).toBe(2);
    expect(run.status).toBe("active");
  });

  it("marks the run lost when health reaches zero", () => {
    const run = recordCombatResult(
      prepareRun(createRun({ seed: "lost-seed", startingHealth: 4 })),
      combatResult({ damageToPlayerA: 4 })
    );

    expect(run.playerHealth).toBe(0);
    expect(run.status).toBe("lost");
    expect(advanceRunAfterCombat(run)).toBe(run);
  });

  it("marks the run won after advancing beyond max rounds", () => {
    const run = advanceRunAfterCombat(
      recordCombatResult(
        prepareRun(createRun({ seed: "won-seed", maxRounds: 1 })),
        combatResult()
      )
    );

    expect(run.currentRound).toBe(2);
    expect(run.status).toBe("won");
  });

  it("keeps run state serializable", () => {
    const run = advanceRunAfterCombat(
      recordCombatResult(prepareRun(applyFirstReward(createRun({ seed: "json-seed" }))), {
        ...combatResult(),
        warnings: [{ code: "TEST_WARNING", message: "Test warning" }]
      })
    );

    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});
