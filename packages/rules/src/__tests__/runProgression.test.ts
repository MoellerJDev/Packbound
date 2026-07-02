import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asPackId, type CombatEvent } from "@packbound/shared";

import {
  advanceRunAfterCombat,
  applyPackReward,
  canApplyReward,
  canRecordCombat,
  createRun,
  getCurrentRewardChoices,
  markCombatReady,
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

const readyRun = (run: RunState): RunState =>
  markCombatReady(prepareRun(run), sampleCatalog);

const rewardRun = (run: RunState): RunState =>
  recordCombatResult(readyRun(run), combatResult());

describe("run progression skeleton", () => {
  it("creates deterministic initial run state for the same seed", () => {
    const first = createRun({ seed: "run-seed" });
    const second = createRun({ seed: "run-seed" });

    expect(second).toEqual(first);
    expect(first.currentRound).toBe(1);
    expect(first.playerHealth).toBe(20);
    expect(first.phase).toBe("planning");
  });

  it("creates deterministic pack reward choices after combat is recorded", () => {
    const first = rewardRun(createRun({ seed: "reward-seed" }));
    const second = rewardRun(createRun({ seed: "reward-seed" }));

    const firstChoices = getCurrentRewardChoices(first, sampleCatalog);
    const secondChoices = getCurrentRewardChoices(second, sampleCatalog);

    expect(firstChoices).toHaveLength(3);
    expect(secondChoices).toEqual(firstChoices);
    expect(first.playerGold).toBe(6);
    expect(firstChoices.every((choice) => choice.cost > 0)).toBe(true);
    expect(firstChoices.every((choice) => choice.affordable)).toBe(true);
    expect(firstChoices.map((choice) => choice.goldAfterPurchase)).toEqual(
      firstChoices.map((choice) => first.playerGold - choice.cost)
    );
    expect(canApplyReward(first)).toBe(true);
  });

  it("opens the same pack reward into the same cards for the same run seed", () => {
    const first = applyFirstReward(rewardRun(createRun({ seed: "pack-seed" })));
    const second = applyFirstReward(rewardRun(createRun({ seed: "pack-seed" })));

    expect(second.openedPacks).toEqual(first.openedPacks);
    expect(second.pool.map((card) => card.defId)).toEqual(
      first.pool.map((card) => card.defId)
    );
    expect(first.phase).toBe("combatResolved");
  });

  it("applying a pack reward adds cards to pool and reward history", () => {
    const rewarded = rewardRun(createRun({ seed: "history-seed" }));
    const choice = getCurrentRewardChoices(rewarded, sampleCatalog)[0];
    if (!choice) {
      throw new Error("Expected a reward choice");
    }
    const rewardedSnapshot = JSON.parse(JSON.stringify(rewarded)) as typeof rewarded;

    const run = applyPackReward(rewarded, sampleCatalog, choice.id);

    expect(rewarded).toEqual(rewardedSnapshot);
    expect(run.pool.length).toBeGreaterThan(0);
    expect(run.openedPacks).toHaveLength(1);
    expect(run.rewardHistory).toHaveLength(1);
    expect(run.rewardHistory[0]?.cardInstanceIds).toHaveLength(run.pool.length);
    expect(run.rewardHistory[0]).toMatchObject({
      cost: choice.cost,
      goldBefore: rewarded.playerGold,
      goldAfter: rewarded.playerGold - choice.cost
    });
    expect(run.playerGold).toBe(rewarded.playerGold - choice.cost);
    expect(run.currentRewardChoices).toHaveLength(0);
  });

  it("recording combat applies player damage, adds gold, and stores a summary", () => {
    const run = recordCombatResult(
      readyRun(createRun({ seed: "damage-seed" })),
      combatResult({ damageToPlayerA: 7, damageToPlayerB: 2 })
    );

    expect(run.playerHealth).toBe(13);
    expect(run.playerGold).toBe(5);
    expect(run.status).toBe("active");
    expect(run.phase).toBe("reward");
    expect(run.combatHistory).toEqual([
      {
        round: 1,
        winner: "playerA",
        damageToPlayer: 7,
        damageToOpponent: 2,
        eventCount: 1,
        warningCodes: [],
        goldEarned: 5,
        seed: "rules-combat-seed",
        rulesVersion: "sim-test"
      }
    ]);
  });

  it("rejects unaffordable pack rewards without mutating the previous run", () => {
    const run = {
      ...rewardRun(createRun({ seed: "unaffordable-seed" })),
      playerGold: 0
    };
    const snapshot = JSON.parse(JSON.stringify(run)) as typeof run;
    const choice = getCurrentRewardChoices(run, sampleCatalog)[0];
    if (!choice) {
      throw new Error("Expected a reward choice");
    }

    expect(choice.affordable).toBe(false);
    expect(() => applyPackReward(run, sampleCatalog, choice.id)).toThrow(/Cannot afford/);
    expect(run).toEqual(snapshot);
  });

  it("keeps at least one reward choice affordable in default reward flows", () => {
    const run = rewardRun(createRun({ seed: "affordable-seed" }));
    const choices = getCurrentRewardChoices(run, sampleCatalog);

    expect(choices.some((choice) => choice.affordable)).toBe(true);
  });

  it("includes the cheapest affordable pack when stored choices are too expensive", () => {
    const run = {
      ...rewardRun(createRun({ seed: "fallback-seed" })),
      playerGold: 3,
      currentRewardChoices: sampleCatalog.packs
        .filter((pack) => pack.id !== asPackId("source_pack"))
        .map((pack, index) => ({
          id: `stored-expensive-choice:${index}:${pack.id}`,
          type: "pack" as const,
          round: 1,
          packId: pack.id,
          label: pack.name,
          cost: pack.cost,
          affordable: false,
          goldAfterPurchase: 3 - pack.cost
        }))
    };
    const choices = getCurrentRewardChoices(run, sampleCatalog);
    const sourceChoice = choices.find(
      (choice) => choice.packId === asPackId("source_pack")
    );

    expect(sourceChoice).toMatchObject({
      cost: 3,
      affordable: true,
      goldAfterPurchase: 0
    });
  });

  it("rejects combat and reward actions before lifecycle preconditions are ready", () => {
    const run = createRun({ seed: "guard-seed" });

    expect(() => recordCombatResult(run, combatResult())).toThrow(/phase is planning/);
    expect(() => markCombatReady(run, sampleCatalog)).toThrow(/prepared encounter/);
    expect(() => applyPackReward(run, sampleCatalog, "missing-choice")).toThrow(
      /Cannot apply a reward/
    );
    expect(canRecordCombat(prepareRun(run), sampleCatalog)).toBe(false);
  });

  it("advancing after reward application increments the round", () => {
    const run = advanceRunAfterCombat(
      applyFirstReward(rewardRun(createRun({ seed: "advance-seed" })))
    );

    expect(run.currentRound).toBe(2);
    expect(run.status).toBe("active");
    expect(run.phase).toBe("planning");
  });

  it("marks the run lost when health reaches zero", () => {
    const run = recordCombatResult(
      readyRun(createRun({ seed: "lost-seed", startingHealth: 4 })),
      combatResult({ damageToPlayerA: 4 })
    );

    expect(run.playerHealth).toBe(0);
    expect(run.status).toBe("lost");
    expect(run.phase).toBe("complete");
    expect(advanceRunAfterCombat(run)).toBe(run);
  });

  it("marks the run won after advancing beyond max rounds", () => {
    const run = advanceRunAfterCombat(
      applyFirstReward(rewardRun(createRun({ seed: "won-seed", maxRounds: 1 })))
    );

    expect(run.currentRound).toBe(2);
    expect(run.status).toBe("won");
    expect(run.phase).toBe("complete");
  });

  it("keeps record, reward, and advance transitions deterministic", () => {
    const playRound = (seed: string) =>
      advanceRunAfterCombat(
        applyFirstReward(rewardRun(createRun({ seed, maxRounds: 2 }))),
        sampleCatalog
      );

    const first = playRound("transition-seed");
    const second = playRound("transition-seed");

    expect(second).toEqual(first);
    expect(first.phase).toBe("planning");
    expect(first.currentEncounterId).toBeDefined();
  });

  it("keeps run state serializable", () => {
    const run = advanceRunAfterCombat(
      applyFirstReward(
        recordCombatResult(readyRun(createRun({ seed: "json-seed" })), {
          ...combatResult(),
          warnings: [{ code: "TEST_WARNING", message: "Test warning" }]
        })
      )
    );

    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});
