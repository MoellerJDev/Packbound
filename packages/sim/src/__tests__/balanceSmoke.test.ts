import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  createRunFromStarterKit,
  getCurrentEncounter,
  getCurrentRewardChoices,
  markCombatReady,
  prepareEncounterForRound,
  recordCombatResult,
  applyPackReward,
  advanceRunAfterCombat
} from "@packbound/rules";
import { asPlayerId, type CombatEvent, type CombatWinner } from "@packbound/shared";

import {
  buildDefaultStarterEncounterFixtures,
  resolveCombat,
  summarizeCombatOutcome,
  type StarterEncounterBalanceFixture
} from "../index";

type BalanceSmokeFixture = StarterEncounterBalanceFixture & {
  readonly expectation: {
    readonly allowedWinners: readonly CombatWinner[];
    readonly maxDamageToPlayer?: number;
    readonly minDamageToPlayer?: number;
    readonly maxWarnings: number;
    readonly requiresThreat?: boolean;
    readonly requiredEventTypes: readonly CombatEvent["type"][];
  };
};

const starterKitIds = ["ember_scrappers", "rotbloom_recall", "cloudspire_phase"] as const;
const expectationForFixture = (
  fixture: StarterEncounterBalanceFixture
): BalanceSmokeFixture["expectation"] =>
  fixture.encounterId === "ledger_champion"
    ? {
        allowedWinners: ["playerA", "playerB", "draw"],
        maxDamageToPlayer: 4,
        maxWarnings: 0,
        requiresThreat: true,
        requiredEventTypes: ["CombatStarted", "DamageDealt", "CombatEnded"]
      }
    : {
        allowedWinners: ["playerA", "playerB", "draw"],
        maxDamageToPlayer: 2,
        maxWarnings: 0,
        requiredEventTypes: ["CombatStarted", "UnitAttacked", "CombatEnded"]
      };

const fixtures: readonly BalanceSmokeFixture[] = buildDefaultStarterEncounterFixtures(
  sampleCatalog
).map((fixture) => ({
  ...fixture,
  expectation: expectationForFixture(fixture)
}));

const resolveFixture = (fixture: BalanceSmokeFixture) => {
  const playerId = asPlayerId(`balance:${fixture.starterKitId}`);
  const run = createRunFromStarterKit({
    seed: fixture.seed,
    catalog: sampleCatalog,
    starterKitId: fixture.starterKitId,
    playerId
  });
  const encounter = sampleCatalog.encountersById.get(fixture.encounterId);
  if (!encounter) {
    throw new Error(`Missing smoke encounter ${fixture.encounterId}`);
  }

  return resolveCombat({
    catalog: sampleCatalog,
    seed: fixture.seed,
    playerA: buildCombatantSetupForRun(run),
    playerB: buildCombatantSetupForEncounter(encounter),
    maxDurationMs: fixture.maxDurationMs
  });
};

describe("balance smoke fixtures", () => {
  it.each(fixtures)("$id produces a deterministic broad outcome", (fixture) => {
    const first = resolveFixture(fixture);
    const second = resolveFixture(fixture);
    const summary = summarizeCombatOutcome(first);

    expect(summarizeCombatOutcome(second)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
    expect(fixture.expectation.allowedWinners).toContain(summary.winner);
    expect(summary.warningCodes).toHaveLength(fixture.expectation.maxWarnings);
    expect(summary.warningCodes).not.toContain("MAX_DURATION_REACHED");
    expect(summary.warningCodes).not.toContain("MAX_COMBAT_EVENTS_REACHED");
    expect(summary.durationMs).toBeLessThanOrEqual(fixture.maxDurationMs);

    if (fixture.expectation.maxDamageToPlayer !== undefined) {
      expect(summary.damageToPlayerA).toBeLessThanOrEqual(
        fixture.expectation.maxDamageToPlayer
      );
    }
    if (fixture.expectation.minDamageToPlayer !== undefined) {
      expect(summary.damageToPlayerA).toBeGreaterThanOrEqual(
        fixture.expectation.minDamageToPlayer
      );
    }
    if (fixture.expectation.requiresThreat) {
      expect(
        summary.winner !== "playerA" || summary.damageToPlayerA > 0,
        `${fixture.id}:boss-threat`
      ).toBe(true);
    }

    for (const eventType of fixture.expectation.requiredEventTypes) {
      expect(
        first.events.some((event) => event.type === eventType),
        `${fixture.id}:${eventType}`
      ).toBe(true);
    }
  });

  it.each(starterKitIds)("can run one real combat/reward loop for %s", (starterKitId) => {
    const seed = `balance-smoke:${starterKitId}:run-loop`;
    let run = createRunFromStarterKit({
      seed,
      catalog: sampleCatalog,
      starterKitId,
      playerId: asPlayerId(`balance-loop:${starterKitId}`),
      maxRounds: 2
    });

    run = prepareEncounterForRound(run, sampleCatalog);
    run = markCombatReady(run, sampleCatalog);

    const encounter = getCurrentEncounter(run, sampleCatalog);
    if (!encounter) {
      throw new Error(`Expected a current encounter for ${starterKitId}`);
    }

    const combatResult = resolveCombat({
      catalog: sampleCatalog,
      seed,
      playerA: buildCombatantSetupForRun(run),
      playerB: buildCombatantSetupForEncounter(encounter),
      maxDurationMs: 30_000
    });
    const summary = summarizeCombatOutcome(combatResult);

    expect(summary.warningCodes).toEqual([]);
    run = recordCombatResult(run, combatResult, { encounterId: encounter.id });
    expect(run.phase).toBe("reward");

    const rewardChoice = getCurrentRewardChoices(run, sampleCatalog)[0];
    if (!rewardChoice) {
      throw new Error(`Expected a reward choice for ${starterKitId}`);
    }

    const poolSizeBeforeReward = run.pool.length;
    run = applyPackReward(run, sampleCatalog, rewardChoice.id);
    expect(run.openedPacks).toHaveLength(1);
    expect(run.pool.length).toBeGreaterThan(poolSizeBeforeReward);

    run = advanceRunAfterCombat(run, sampleCatalog);
    expect(["planning", "complete"]).toContain(run.phase);
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});
