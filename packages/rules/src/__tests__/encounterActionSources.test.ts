import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type Zone
} from "@packbound/shared";

import {
  listPrototypePressureActionSources,
  submitPrototypePressureActionFromRun,
  validatePrototypePressureActionSource,
  type PrototypePressureActionSourceValidationCode,
  type PrototypePressureActionSourceValidationResult
} from "../encounterActionSources";
import { createEncounterMatch, passEncounterPriority } from "../encounterMatch";
import type { RunState } from "../runState";
import { createRunFromStarterKit } from "../starterKits";

const playerId = asPlayerId("source-validation-player");
const wrongOwnerId = asPlayerId("source-validation-wrong-owner");

const createTestRun = (): RunState =>
  createRunFromStarterKit({
    seed: "source-validation",
    catalog: sampleCatalog,
    starterKitId: "ember_scrappers",
    playerId
  });

const getSparkfall = (run: RunState): CardInstance => {
  const card = run.spellrail.cards.find(
    (candidate) => sampleCatalog.cardsById.get(candidate.defId)?.name === "Sparkfall"
  );
  if (!card) {
    throw new Error("Expected Sparkfall in the test run Spellrail.");
  }
  return card;
};

const expectFailureCode = (
  result: PrototypePressureActionSourceValidationResult,
  code: PrototypePressureActionSourceValidationCode
): void => {
  if (result.ok) {
    throw new Error(`Expected validation failure, received ${result.source.cardName}.`);
  }
  expect(result.code).toBe(code);
  expect(result.message).toContain(String(result.cardInstanceId));
};

const emptyCardZones = (run: RunState): RunState => ({
  ...run,
  pool: [],
  board: { placements: [] },
  activeCards: [],
  sourceRow: { ...run.sourceRow, cards: [] },
  spellrail: { ...run.spellrail, cards: [] },
  ashes: [],
  void: []
});

const runWithCardOnlyInZone = (
  run: RunState,
  card: CardInstance,
  zone: Extract<Zone, "pool" | "board" | "sourceRow" | "ashes" | "void">
): RunState => {
  const movedCard: CardInstance = { ...card, zone };
  const base = emptyCardZones(run);

  switch (zone) {
    case "pool":
      return { ...base, pool: [movedCard] };
    case "sourceRow":
      return { ...base, sourceRow: { ...base.sourceRow, cards: [movedCard] } };
    case "ashes":
      return { ...base, ashes: [movedCard] };
    case "void":
      return { ...base, void: [movedCard] };
    case "board":
      return {
        ...base,
        activeCards: [movedCard],
        board: {
          placements: [
            {
              cardInstanceId: movedCard.instanceId,
              defId: movedCard.defId,
              ownerId: movedCard.ownerId,
              position: { row: 0, col: 0, layer: "ground" }
            }
          ]
        }
      };
  }
};

describe("encounter prototype pressure action sources", () => {
  it("accepts a player-owned Spellrail Technique", () => {
    const run = createTestRun();
    const sparkfall = getSparkfall(run);

    const result = validatePrototypePressureActionSource({
      run,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sparkfall.instanceId
    });

    if (!result.ok) {
      throw new Error(`Expected a valid source, received ${result.code}.`);
    }

    expect(result).toEqual({
      ok: true,
      source: {
        cardInstanceId: sparkfall.instanceId,
        cardDefId: sparkfall.defId,
        cardName: "Sparkfall",
        zone: "spellrail"
      }
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(listPrototypePressureActionSources({ run, catalog: sampleCatalog })).toEqual([
      result.source
    ]);
  });

  it("rejects a card not in the run", () => {
    const run = createTestRun();
    const missingCardInstanceId = asCardInstanceId("missing-card-instance");

    const result = validatePrototypePressureActionSource({
      run,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: missingCardInstanceId
    });

    expectFailureCode(result, "card_not_in_run");
  });

  it("rejects a card with the wrong owner", () => {
    const run = createTestRun();
    const sparkfall = getSparkfall(run);
    const wrongOwnerRun: RunState = {
      ...run,
      spellrail: {
        ...run.spellrail,
        cards: run.spellrail.cards.map((card) =>
          card.instanceId === sparkfall.instanceId
            ? { ...card, ownerId: wrongOwnerId }
            : card
        )
      }
    };

    const result = validatePrototypePressureActionSource({
      run: wrongOwnerRun,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sparkfall.instanceId
    });

    expectFailureCode(result, "wrong_owner");
  });

  it.each(["pool", "board", "sourceRow", "ashes", "void"] as const)(
    "rejects a %s source because prototype pressure requires Spellrail",
    (zone) => {
      const run = createTestRun();
      const sparkfall = getSparkfall(run);
      const wrongZoneRun = runWithCardOnlyInZone(run, sparkfall, zone);

      const result = validatePrototypePressureActionSource({
        run: wrongZoneRun,
        catalog: sampleCatalog,
        actor: "player",
        cardInstanceId: sparkfall.instanceId
      });

      expectFailureCode(result, "wrong_zone");
    }
  );

  it("rejects a non-Technique in Spellrail", () => {
    const run = createTestRun();
    const sourceCard = run.sourceRow.cards[0];
    if (!sourceCard) {
      throw new Error("Expected a Source Row card in the test run.");
    }
    const wrongTypeRun: RunState = {
      ...emptyCardZones(run),
      spellrail: {
        ...run.spellrail,
        cards: [{ ...sourceCard, zone: "spellrail" }]
      }
    };

    const result = validatePrototypePressureActionSource({
      run: wrongTypeRun,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sourceCard.instanceId
    });

    expectFailureCode(result, "wrong_card_type");
  });

  it("rejects an unknown card definition", () => {
    const run = createTestRun();
    const sparkfall = getSparkfall(run);
    const unknownDefinitionRun: RunState = {
      ...run,
      spellrail: {
        ...run.spellrail,
        cards: run.spellrail.cards.map((card) =>
          card.instanceId === sparkfall.instanceId
            ? { ...card, defId: asCardDefId("unknown_technique") }
            : card
        )
      }
    };

    const result = validatePrototypePressureActionSource({
      run: unknownDefinitionRun,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sparkfall.instanceId
    });

    expectFailureCode(result, "unknown_card_definition");
  });

  it("queues a validated source and preserves prototype resolution semantics", () => {
    const run = createTestRun();
    const sparkfall = getSparkfall(run);
    const match = createEncounterMatch({
      matchId: "source-submit",
      seed: "source-submit"
    });

    const submitted = submitPrototypePressureActionFromRun({
      match,
      run,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sparkfall.instanceId
    });
    const resolved = passEncounterPriority(
      passEncounterPriority(submitted, "enemy"),
      "player"
    );

    expect(submitted.stack[0]?.action.source).toMatchObject({
      cardInstanceId: sparkfall.instanceId,
      cardName: "Sparkfall",
      zone: "spellrail"
    });
    expect(submitted.actionLog.at(-1)?.text).toBe(
      "Player queued Prototype Pressure Technique from Sparkfall."
    );
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.lastResolvedAction?.action.source?.cardName).toBe("Sparkfall");
  });
});
