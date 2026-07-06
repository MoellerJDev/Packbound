import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { toCombatPosition, type CombatEvent } from "@packbound/shared";

import {
  advanceRunAfterCombat,
  applyPackReward,
  buildCombatantSetupForEncounter,
  commitPackOfferPicks,
  createRun,
  getCurrentEncounter,
  getCurrentRewardChoices,
  markCombatReady,
  prepareEncounterForRound,
  recordCombatResult,
  selectEncounterForRound,
  validatePlanningState,
  type CombatResultLike,
  type RunState
} from "../index";

const combatStarted: CombatEvent = { type: "CombatStarted", timeMs: 0 };

const combatResult = (overrides: Partial<CombatResultLike> = {}): CombatResultLike => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 1,
  events: [combatStarted],
  warnings: [],
  seed: "encounter-combat-seed",
  rulesVersion: "sim-test",
  ...overrides
});

const preparedRun = (run: RunState): RunState =>
  prepareEncounterForRound(run, sampleCatalog);

const readyRun = (run: RunState): RunState =>
  markCombatReady(preparedRun(run), sampleCatalog);

const requireCurrentEncounterId = (run: RunState): string => {
  if (!run.currentEncounterId) {
    throw new Error("Expected a current encounter");
  }
  return run.currentEncounterId;
};

const applyFirstReward = (run: RunState): RunState => {
  const choice = getCurrentRewardChoices(run, sampleCatalog)[0];
  if (!choice) {
    throw new Error("Expected a reward choice");
  }
  const pending = applyPackReward(run, sampleCatalog, choice.id);
  const pendingOffer = pending.pendingPackOffer;
  if (!pendingOffer) {
    throw new Error("Expected a pending Pack Offer");
  }

  return commitPackOfferPicks(
    pending,
    pendingOffer.cards.slice(0, pendingOffer.pickLimit).map((card) => card.instanceId)
  );
};

const completeRound = (run: RunState): RunState => {
  const encounterId = requireCurrentEncounterId(run);
  return advanceRunAfterCombat(
    applyFirstReward(
      recordCombatResult(markCombatReady(run, sampleCatalog), combatResult(), {
        encounterId
      })
    ),
    sampleCatalog
  );
};

describe("deterministic encounter selection", () => {
  it("selects the same encounter for the same seed and round", () => {
    const first = selectEncounterForRound(
      createRun({ seed: "same-encounter-seed" }),
      sampleCatalog
    );
    const second = selectEncounterForRound(
      createRun({ seed: "same-encounter-seed" }),
      sampleCatalog
    );

    expect(second).toEqual(first);
  });

  it("can select a different eligible encounter on a later round", () => {
    const roundOne = preparedRun(createRun({ seed: "round-shift-seed" }));
    const firstEncounterId = requireCurrentEncounterId(roundOne);
    const roundTwo = completeRound(roundOne);

    expect(roundTwo.currentRound).toBe(2);
    expect(roundTwo.currentEncounterId).toBeDefined();
    expect(roundTwo.currentEncounterId).not.toBe(firstEncounterId);
  });

  it("selects a boss encounter for the final round when one is eligible", () => {
    const run = {
      ...createRun({ seed: "boss-seed", maxRounds: 3 }),
      currentRound: 3
    };

    expect(selectEncounterForRound(run, sampleCatalog)).toMatchObject({
      id: "ledger_champion",
      kind: "boss"
    });
  });

  it("preparing an encounter stores currentEncounterId", () => {
    const run = preparedRun(createRun({ seed: "prepare-seed" }));

    expect(run.currentEncounterId).toBeDefined();
    expect(getCurrentEncounter(run, sampleCatalog)?.id).toBe(run.currentEncounterId);
  });

  it("recording combat adds encounter history", () => {
    const run = readyRun(createRun({ seed: "history-seed" }));
    const encounterId = requireCurrentEncounterId(run);
    const recorded = recordCombatResult(run, combatResult({ damageToPlayerA: 2 }), {
      encounterId
    });

    expect(recorded.encounterHistory).toEqual([
      {
        round: 1,
        encounterId,
        combatSummaryIndex: 0
      }
    ]);
    expect(recorded.playerHealth).toBe(18);
  });

  it("refuses to record combat for the wrong encounter", () => {
    const run = readyRun(createRun({ seed: "wrong-encounter-seed" }));

    expect(() =>
      recordCombatResult(run, combatResult(), {
        encounterId: "not-the-current-encounter"
      })
    ).toThrow(/current encounter/);
  });

  it("advancing can prepare the next encounter deterministically", () => {
    const advancePreparedRun = (seed: string) => {
      const run = preparedRun(createRun({ seed }));
      return completeRound(run);
    };

    const first = advancePreparedRun("advance-encounter-seed");
    const second = advancePreparedRun("advance-encounter-seed");

    expect(first.currentEncounterId).toBeDefined();
    expect(second.currentEncounterId).toBe(first.currentEncounterId);
    expect(first.currentEncounterId).not.toBe(first.encounterHistory[0]?.encounterId);
  });

  it("builds a stable serializable opponent CombatantSetup from an encounter", () => {
    const encounter = sampleCatalog.encountersById.get("early_ember_pressure");
    if (!encounter) {
      throw new Error("Expected sample encounter");
    }

    const first = buildCombatantSetupForEncounter(encounter);
    const second = buildCombatantSetupForEncounter(encounter);

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first.board.placements.map((placement) => placement.defId)).toEqual([
      "ember_scraprunner"
    ]);
    expect(encounter.loadout.board.placements[0]?.position).toMatchObject({
      row: 0,
      col: 3
    });
    expect(first.board.placements[0]?.position).toMatchObject({
      row: 3,
      col: 3
    });
    expect(first.board.placements.map((placement) => placement.position)).toEqual(
      encounter.loadout.board.placements.map((placement) => {
        const combatPosition = toCombatPosition("playerB", placement.position);
        if (!combatPosition) {
          throw new Error("Expected encounter board placement to map into combat space.");
        }
        return combatPosition;
      })
    );
    expect(encounter.loadout.board.placements[0]?.position.row).toBeLessThan(4);
    expect(first.sourceRow.cards.map((card) => card.zone)).toEqual(["sourceRow"]);
    expect(first.spellrail.cards.map((card) => card.zone)).toEqual(["spellrail"]);
  });

  it.each(sampleCatalog.encounters)("builds a legal setup for $id", (encounter) => {
    const setup = buildCombatantSetupForEncounter(encounter);
    const validation = validatePlanningState({
      catalog: sampleCatalog,
      board: setup.board,
      sourceRow: setup.sourceRow,
      spellrail: setup.spellrail
    });

    expect(validation.ok, encounter.id).toBe(true);
    expect(JSON.parse(JSON.stringify(setup))).toEqual(setup);
  });
});
