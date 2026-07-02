import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import type {
  CardInstanceId,
  CardDefId,
  CombatEvent,
  CombatWinner,
  PlayerSide,
  UnitInstance,
  UnitInstanceId
} from "@packbound/shared";

import {
  combatFixtures,
  type ExpectedCombatSummary,
  type ExpectedEventStep
} from "../__fixtures__/combatFixtures";
import { resolveCombat, type CombatResult } from "../index";

type FixtureSummary = Omit<ExpectedCombatSummary, "selectedEventSequence">;

const sides: readonly PlayerSide[] = ["playerA", "playerB"];

const unitDefIdsBySide = (
  units: readonly UnitInstance[]
): Readonly<Record<PlayerSide, readonly CardDefId[]>> => ({
  playerA: units.filter((unit) => unit.side === "playerA").map((unit) => unit.defId),
  playerB: units.filter((unit) => unit.side === "playerB").map((unit) => unit.defId)
});

const actualSummary = (result: CombatResult): FixtureSummary => ({
  winner: result.winner,
  damageToPlayerA: result.damageToPlayerA,
  damageToPlayerB: result.damageToPlayerB,
  warningCodes: result.warnings.map((warning) => warning.code),
  finalState: {
    unitDefIdsBySide: unitDefIdsBySide(result.finalState.units),
    ashesDefIdsBySide: {
      playerA: result.finalState.ashes.playerA.map((card) => card.defId),
      playerB: result.finalState.ashes.playerB.map((card) => card.defId)
    },
    voidUnitDefIdsBySide: {
      playerA: result.finalState.void.playerA.map((unit) => unit.defId),
      playerB: result.finalState.void.playerB.map((unit) => unit.defId)
    }
  }
});

const expectedSummary = (summary: ExpectedCombatSummary): FixtureSummary => ({
  winner: summary.winner,
  damageToPlayerA: summary.damageToPlayerA,
  damageToPlayerB: summary.damageToPlayerB,
  warningCodes: summary.warningCodes,
  finalState: {
    unitDefIdsBySide: {
      playerA: summary.finalState.unitDefIdsBySide.playerA,
      playerB: summary.finalState.unitDefIdsBySide.playerB
    },
    ashesDefIdsBySide: {
      playerA: summary.finalState.ashesDefIdsBySide.playerA,
      playerB: summary.finalState.ashesDefIdsBySide.playerB
    },
    voidUnitDefIdsBySide: {
      playerA: summary.finalState.voidUnitDefIdsBySide.playerA,
      playerB: summary.finalState.voidUnitDefIdsBySide.playerB
    }
  }
});

const eventUnitId = (event: CombatEvent): UnitInstanceId | undefined =>
  "unitId" in event ? event.unitId : undefined;

const eventCardInstanceId = (event: CombatEvent): CardInstanceId | undefined =>
  "cardInstanceId" in event ? event.cardInstanceId : undefined;

const eventWinner = (event: CombatEvent): CombatWinner | undefined =>
  "winner" in event ? event.winner : undefined;

const eventMatchesStep = (event: CombatEvent, step: ExpectedEventStep): boolean =>
  event.type === step.type &&
  (step.unitId === undefined || eventUnitId(event) === step.unitId) &&
  (step.cardInstanceId === undefined ||
    eventCardInstanceId(event) === step.cardInstanceId) &&
  (step.winner === undefined || eventWinner(event) === step.winner);

const normalizeEventStep = (
  event: CombatEvent,
  step: ExpectedEventStep
): ExpectedEventStep => ({
  type: event.type,
  ...(step.unitId !== undefined ? { unitId: eventUnitId(event) as UnitInstanceId } : {}),
  ...(step.cardInstanceId !== undefined
    ? { cardInstanceId: eventCardInstanceId(event) as CardInstanceId }
    : {}),
  ...(step.winner !== undefined ? { winner: eventWinner(event) as CombatWinner } : {})
});

const selectedEventSequence = (
  events: readonly CombatEvent[],
  expected: readonly ExpectedEventStep[]
): readonly ExpectedEventStep[] => {
  let cursor = 0;
  return expected.map((step) => {
    const eventIndex = events.findIndex(
      (event, index) => index >= cursor && eventMatchesStep(event, step)
    );
    if (eventIndex < 0) {
      throw new Error(`Expected event step was not found: ${step.type}`);
    }

    cursor = eventIndex + 1;
    const event = events[eventIndex];
    if (!event) {
      throw new Error("Expected selected event to exist");
    }
    return normalizeEventStep(event, step);
  });
};

describe("combat fixtures", () => {
  it.each(combatFixtures)("$name resolves deterministically", (fixture) => {
    const first = resolveCombat({ catalog: sampleCatalog, ...fixture.input });
    const second = resolveCombat({ catalog: sampleCatalog, ...fixture.input });

    expect(second.events).toEqual(first.events);
    expect(actualSummary(second)).toEqual(actualSummary(first));
  });

  it.each(combatFixtures)("$name matches the expected summary", (fixture) => {
    const result = resolveCombat({ catalog: sampleCatalog, ...fixture.input });

    expect(actualSummary(result)).toEqual(expectedSummary(fixture.expected));

    for (const side of sides) {
      expect(result.finalState.ashes[side]).toEqual(
        result.finalState.ashes[side].filter((card) => !card.isEcho)
      );
    }
  });

  it.each(combatFixtures)("$name preserves selected event ordering", (fixture) => {
    const result = resolveCombat({ catalog: sampleCatalog, ...fixture.input });

    expect(
      selectedEventSequence(result.events, fixture.expected.selectedEventSequence)
    ).toEqual(fixture.expected.selectedEventSequence);
  });
});
