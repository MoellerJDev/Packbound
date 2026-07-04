import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asCardDefId, asCardInstanceId, asPlayerId } from "@packbound/shared";

import { buildEncounterCombatChargeProfileForRun } from "../encounterResources";
import { createEncounterMatch, submitEncounterAction } from "../encounterMatch";
import { createCardInstance } from "../instances";
import type { RunState } from "../runState";
import { createRunFromStarterKit } from "../starterKits";

const playerId = asPlayerId("encounter-resource-player");

const createStarterRun = (
  starterKitId = "ember_scrappers",
  seed = `encounter-resource:${starterKitId}`
): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId
  });

const sourceRowCard = (run: RunState, defId: string, index: number) =>
  createCardInstance({
    ownerId: run.playerId,
    defId: asCardDefId(defId),
    zone: "sourceRow",
    instanceId: asCardInstanceId(`encounter-resource:${defId}:${index}`)
  });

describe("encounter resource profiles", () => {
  it("sums Source Row Combat Charge/sec and rounds into starting charge", () => {
    const run = createStarterRun("rotbloom_recall");
    const profile = buildEncounterCombatChargeProfileForRun(run, sampleCatalog);

    expect(profile.combatChargePerSecond).toBe(0.55);
    expect(profile.startingCombatCharge).toBe(1);
    expect(profile.sourceCount).toBe(2);
    expect(profile.sourceCardInstanceIds).toEqual(
      run.sourceRow.cards.map((card) => card.instanceId)
    );
    expect(profile.sourceLabels).toEqual([
      "Shade Source (0.3 Combat Charge/sec)",
      "Bloom Source (0.25 Combat Charge/sec)"
    ]);
    expect(profile.ignoredCardInstanceIds).toEqual([]);
    expect(profile.explanation).toBe(
      "2 Sources contribute 0.55 Combat Charge/sec, rounded up to 1 starting Combat Charge."
    );
    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });

  it("rounds fractional totals deterministically above one charge", () => {
    const run = createStarterRun();
    const sourceCards = [
      "ember_source",
      "shade_source",
      "bloom_source",
      "tide_source"
    ].map((defId, index) => sourceRowCard(run, defId, index));
    const runWithMoreSources: RunState = {
      ...run,
      sourceRow: {
        ...run.sourceRow,
        cards: sourceCards
      }
    };

    const profile = buildEncounterCombatChargeProfileForRun(
      runWithMoreSources,
      sampleCatalog
    );

    expect(profile.combatChargePerSecond).toBe(1.3);
    expect(profile.startingCombatCharge).toBe(2);
    expect(profile.sourceCount).toBe(4);
  });

  it("returns zero for an empty Source Row", () => {
    const run: RunState = {
      ...createStarterRun(),
      sourceRow: {
        maxSlots: 4,
        cards: []
      }
    };

    const profile = buildEncounterCombatChargeProfileForRun(run, sampleCatalog);

    expect(profile).toMatchObject({
      combatChargePerSecond: 0,
      startingCombatCharge: 0,
      sourceCount: 0,
      sourceCardInstanceIds: [],
      sourceLabels: [],
      ignoredCardInstanceIds: [],
      explanation: "No valid Sources in Source Row; starting Combat Charge is 0."
    });
  });

  it("ignores non-Source cards in the Source Row while reporting them safely", () => {
    const run = createStarterRun();
    const emberSource = sourceRowCard(run, "ember_source", 0);
    const misplacedTechnique = sourceRowCard(run, "sparkfall", 1);
    const runWithMisplacedCard: RunState = {
      ...run,
      sourceRow: {
        ...run.sourceRow,
        cards: [emberSource, misplacedTechnique]
      }
    };

    const profile = buildEncounterCombatChargeProfileForRun(
      runWithMisplacedCard,
      sampleCatalog
    );

    expect(profile.combatChargePerSecond).toBe(0.35);
    expect(profile.startingCombatCharge).toBe(1);
    expect(profile.sourceCardInstanceIds).toEqual([emberSource.instanceId]);
    expect(profile.sourceLabels).toEqual(["Ember Source (0.35 Combat Charge/sec)"]);
    expect(profile.ignoredCardInstanceIds).toEqual([misplacedTechnique.instanceId]);
    expect(profile.explanation).toBe(
      "1 Source contributes 0.35 Combat Charge/sec, rounded up to 1 starting Combat Charge. Ignored 1 non-Source card in Source Row."
    );
  });

  it("can seed an encounter match with Source-derived charge for paid actions", () => {
    const run = createStarterRun();
    const profile = buildEncounterCombatChargeProfileForRun(run, sampleCatalog);
    const match = createEncounterMatch({
      matchId: "profile-paid-match",
      seed: "profile-paid-match",
      playerCombatCharge: profile.startingCombatCharge
    });

    const submitted = submitEncounterAction(match, { kind: "main_phase_pressure" });

    expect(profile.startingCombatCharge).toBe(1);
    expect(submitted.playerCombatCharge).toBe(0);
    expect(submitted.costPaymentEvents[0]).toMatchObject({
      actionKind: "main_phase_pressure",
      amount: 1,
      combatChargeBefore: 1,
      combatChargeAfter: 0
    });
  });

  it("keeps paid actions illegal when the Source-derived profile is insufficient", () => {
    const run: RunState = {
      ...createStarterRun(),
      sourceRow: {
        maxSlots: 4,
        cards: []
      }
    };
    const profile = buildEncounterCombatChargeProfileForRun(run, sampleCatalog);
    const match = createEncounterMatch({
      matchId: "profile-unpaid-match",
      seed: "profile-unpaid-match",
      playerCombatCharge: profile.startingCombatCharge
    });

    expect(profile.startingCombatCharge).toBe(0);
    expect(() => submitEncounterAction(match, { kind: "main_phase_pressure" })).toThrow(
      /Prototype Pressure Technique requires 1 Combat Charge, but Player has 0/
    );
  });
});
