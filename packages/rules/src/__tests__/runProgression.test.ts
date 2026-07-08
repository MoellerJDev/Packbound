import { describe, expect, it } from "vitest";

import { sampleCatalog, type ContentCatalog } from "@packbound/content";
import {
  asCardInstanceId,
  asPackId,
  type PackDefinition,
  type CardInstanceId,
  type CombatEvent
} from "@packbound/shared";

import {
  advanceRunAfterCombat,
  applyPackReward,
  canApplyReward,
  canRecordCombat,
  commitPackOfferPicks,
  createRun,
  getCurrentRewardChoices,
  markCombatReady,
  PACK_OFFER_PICK_COUNT,
  PACK_OFFER_REVEAL_COUNT,
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
  commitPendingPackOffer(applyFirstPackReward(run));

const applyFirstPackReward = (run: RunState): RunState =>
  applyPackReward(run, sampleCatalog, firstRewardChoiceId(run));

const tinyPackId = asPackId("tiny_pack");

const tinyPack: PackDefinition = {
  id: tinyPackId,
  name: "Tiny Pack",
  cost: 1,
  setWeights: { ember_foundry: 1 },
  slots: [{ rarity: "common", count: 1 }],
  tagBias: {}
};

const tinyPackCatalog: ContentCatalog = {
  ...sampleCatalog,
  packs: [tinyPack],
  packsById: new Map([[tinyPackId, tinyPack]])
};

const withTinyPackRewardChoice = (run: RunState): RunState => ({
  ...run,
  currentRewardChoices: [
    {
      id: "reward:tiny-pack",
      type: "pack",
      round: run.currentRound,
      packId: tinyPackId,
      label: tinyPack.name,
      cost: tinyPack.cost,
      affordable: run.playerGold >= tinyPack.cost,
      goldAfterPurchase: run.playerGold - tinyPack.cost
    }
  ]
});

const firstPendingOfferPickIds = (run: RunState): readonly CardInstanceId[] => {
  const pendingOffer = run.pendingPackOffer;
  if (!pendingOffer) {
    throw new Error("Expected a pending Pack Offer");
  }

  return pendingOffer.cards
    .slice(0, pendingOffer.pickLimit)
    .map((card) => card.instanceId);
};

const commitPendingPackOffer = (run: RunState): RunState =>
  commitPackOfferPicks(run, firstPendingOfferPickIds(run));

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

  it("opens the same pending Pack Offer for the same run seed", () => {
    const first = applyFirstPackReward(rewardRun(createRun({ seed: "pack-seed" })));
    const second = applyFirstPackReward(rewardRun(createRun({ seed: "pack-seed" })));

    expect(first.pendingPackOffer).toEqual(second.pendingPackOffer);
    expect(first.pendingPackOffer?.cards).toHaveLength(PACK_OFFER_REVEAL_COUNT);
    expect(first.pendingPackOffer?.pickLimit).toBe(PACK_OFFER_PICK_COUNT);
    expect(first.openedPacks).toEqual([]);
    expect(first.pool).toEqual([]);
    expect(first.rewardHistory).toEqual([]);
    expect(first.phase).toBe("reward");
  });

  it("commits exactly the chosen Pack Offer cards to pool and releases the rest", () => {
    const rewarded = rewardRun(createRun({ seed: "pack-commit-seed" }));
    const pending = applyFirstPackReward(rewarded);
    const pendingOffer = pending.pendingPackOffer;
    if (!pendingOffer) {
      throw new Error("Expected a pending Pack Offer");
    }
    const chosenIds = firstPendingOfferPickIds(pending);
    const releasedIds = pendingOffer.cards
      .filter((card) => !chosenIds.includes(card.instanceId))
      .map((card) => card.instanceId);

    const committed = commitPackOfferPicks(pending, chosenIds);

    expect(committed.pendingPackOffer).toBeUndefined();
    expect(committed.pool.map((card) => card.instanceId)).toEqual(chosenIds);
    expect(committed.pool.every((card) => card.zone === "pool")).toBe(true);
    expect(committed.openedPacks).toHaveLength(1);
    expect(committed.openedPacks[0]?.cards.map((card) => card.instanceId)).toEqual(
      chosenIds
    );
    expect(committed.openedPacks[0]?.slots.map((slot) => slot.cardInstanceId)).toEqual(
      chosenIds
    );
    expect(committed.rewardHistory).toHaveLength(1);
    expect(committed.rewardHistory[0]).toMatchObject({
      offerId: pendingOffer.id,
      pickLimit: pendingOffer.pickLimit,
      offeredCardInstanceIds: pendingOffer.cards.map((card) => card.instanceId),
      chosenCardInstanceIds: chosenIds,
      releasedCardInstanceIds: releasedIds,
      cardInstanceIds: chosenIds,
      cost: pendingOffer.cost,
      goldBefore: rewarded.playerGold,
      goldAfter: rewarded.playerGold - pendingOffer.cost
    });
    for (const releasedId of releasedIds) {
      expect(committed.pool.map((card) => card.instanceId)).not.toContain(releasedId);
    }
    expect(committed.phase).toBe("combatResolved");
  });

  it("purchasing a Pack Offer charges gold once and does not add revealed cards to pool", () => {
    const rewarded = rewardRun(createRun({ seed: "history-seed" }));
    const choice = getCurrentRewardChoices(rewarded, sampleCatalog)[0];
    if (!choice) {
      throw new Error("Expected a reward choice");
    }
    const rewardedSnapshot = JSON.parse(JSON.stringify(rewarded)) as typeof rewarded;

    const pending = applyPackReward(rewarded, sampleCatalog, choice.id);

    expect(rewarded).toEqual(rewardedSnapshot);
    expect(pending.playerGold).toBe(rewarded.playerGold - choice.cost);
    expect(pending.pool).toEqual(rewarded.pool);
    expect(pending.openedPacks).toEqual([]);
    expect(pending.rewardHistory).toEqual([]);
    expect(pending.currentRewardChoices).toHaveLength(0);
    expect(pending.pendingPackOffer).toMatchObject({
      packId: choice.packId,
      cost: choice.cost,
      goldBefore: rewarded.playerGold,
      goldAfter: rewarded.playerGold - choice.cost
    });
    expect(pending.pendingPackOffer?.cards.every((card) => card.zone === "pack")).toBe(
      true
    );

    const committed = commitPendingPackOffer(pending);

    expect(committed.playerGold).toBe(pending.playerGold);
    expect(committed.rewardHistory[0]).toMatchObject({
      cost: choice.cost,
      goldBefore: rewarded.playerGold,
      goldAfter: rewarded.playerGold - choice.cost
    });
  });

  it("handles smaller Pack Offers by reducing the pick limit to the revealed count", () => {
    const rewarded = withTinyPackRewardChoice(
      rewardRun(createRun({ seed: "tiny-pack-seed" }))
    );
    const pending = applyPackReward(rewarded, tinyPackCatalog, "reward:tiny-pack");

    expect(pending.pendingPackOffer).toMatchObject({
      packId: tinyPackId,
      revealCount: 1,
      pickLimit: 1
    });
    expect(pending.pendingPackOffer?.cards).toHaveLength(1);
    expect(pending.pool).toEqual(rewarded.pool);

    const pickId = pending.pendingPackOffer!.cards[0]!.instanceId;
    const committed = commitPackOfferPicks(pending, [pickId]);

    expect(committed.pool.map((card) => card.instanceId)).toEqual([pickId]);
    expect(committed.rewardHistory[0]).toMatchObject({
      offeredCardInstanceIds: [pickId],
      chosenCardInstanceIds: [pickId],
      releasedCardInstanceIds: [],
      pickLimit: 1
    });
  });

  it("rejects invalid Pack Offer picks without mutating the pending offer", () => {
    const pending = applyFirstPackReward(rewardRun(createRun({ seed: "invalid-picks" })));
    const pendingSnapshot = JSON.parse(JSON.stringify(pending)) as typeof pending;
    const ids = firstPendingOfferPickIds(pending);

    expect(() => commitPackOfferPicks(pending, ids.slice(0, 1))).toThrow(
      /requires exactly 2 picks; received 1/
    );
    expect(() =>
      commitPackOfferPicks(pending, [
        ...ids,
        pending.pendingPackOffer?.cards[2]?.instanceId ?? ids[0]!
      ])
    ).toThrow(/requires exactly 2 picks; received 3/);
    expect(() => commitPackOfferPicks(pending, [ids[0]!, ids[0]!])).toThrow(
      /duplicate card ids/
    );
    expect(() =>
      commitPackOfferPicks(pending, [ids[0]!, asCardInstanceId("unknown-card")])
    ).toThrow(/not in the pending Pack Offer/);
    expect(pending).toEqual(pendingSnapshot);
  });

  it("rejects committing without a pending offer or after the offer is resolved", () => {
    const rewarded = rewardRun(createRun({ seed: "commit-guards" }));
    const pending = applyFirstPackReward(rewarded);
    const committed = commitPendingPackOffer(pending);

    expect(() => commitPackOfferPicks(rewarded, [])).toThrow(/No pending Pack Offer/);
    expect(() => commitPackOfferPicks(committed, [])).toThrow(/phase is combatResolved/);
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

  it("prevents buying another reward pack while a Pack Offer is unresolved", () => {
    const pending = applyFirstPackReward(rewardRun(createRun({ seed: "pending-block" })));

    expect(getCurrentRewardChoices(pending, sampleCatalog)).toEqual([]);
    expect(() => applyPackReward(pending, sampleCatalog, "anything")).toThrow(
      /Cannot open another reward pack while Pack Offer/
    );
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
