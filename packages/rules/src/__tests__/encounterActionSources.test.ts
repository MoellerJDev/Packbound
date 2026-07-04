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
  listCommanderRallyActionSources,
  listPrototypePressureActionSources,
  submitCommanderRallyActionFromRun,
  submitPrototypePressureActionFromRun,
  validateCommanderRallyActionSource,
  validatePrototypePressureActionSource,
  type CommanderRallyActionSourceValidationCode,
  type CommanderRallyActionSourceValidationResult,
  type PrototypePressureActionSourceValidationCode,
  type PrototypePressureActionSourceValidationResult
} from "../encounterActionSources";
import { deployCommander, getDefaultCommanderPosition } from "../commander";
import { createEncounterMatch, passEncounterPriority } from "../encounterMatch";
import type { RunState } from "../runState";
import { createRunFromStarterKit } from "../starterKits";

const playerId = asPlayerId("source-validation-player");
const wrongOwnerId = asPlayerId("source-validation-wrong-owner");

const enemyStabilityTarget = {
  type: "stability",
  actor: "enemy",
  label: "Enemy Stability"
} as const;

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

const deployTestCommander = (run: RunState): RunState => {
  const position = getDefaultCommanderPosition(run, sampleCatalog);
  if (!position) {
    throw new Error("Expected a legal Commander deployment position");
  }
  return deployCommander(run, sampleCatalog, position);
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

const expectCommanderFailureCode = (
  result: CommanderRallyActionSourceValidationResult,
  code: CommanderRallyActionSourceValidationCode,
  messagePattern?: RegExp
): void => {
  if (result.ok) {
    throw new Error(`Expected validation failure, received ${result.source.cardName}.`);
  }
  expect(result.code).toBe(code);
  if (messagePattern) {
    expect(result.message).toMatch(messagePattern);
  }
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
    expect(submitted.stack[0]?.action.sourceLifecycle).toBe("usedOnResolve");
    expect(submitted.stack[0]?.action.target).toEqual(enemyStabilityTarget);
    expect(submitted.actionLog.at(-1)?.text).toBe(
      "Player queued Prototype Pressure Technique from Sparkfall."
    );
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.lastResolvedAction?.action.source?.cardName).toBe("Sparkfall");
    expect(resolved.sourceLifecycleEvents[0]).toMatchObject({
      lifecycle: "usedOnResolve",
      actionKind: "main_phase_pressure",
      actionLabel: "Prototype Pressure Technique",
      actor: "player",
      source: {
        cardInstanceId: sparkfall.instanceId,
        cardName: "Sparkfall",
        zone: "spellrail"
      }
    });
  });

  it("blocks the same source while queued and after it has been used", () => {
    const run = createTestRun();
    const sparkfall = getSparkfall(run);
    const match = createEncounterMatch({
      matchId: "repeat-source",
      seed: "repeat-source"
    });

    const submitted = submitPrototypePressureActionFromRun({
      match,
      run,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: sparkfall.instanceId
    });
    expect(
      listPrototypePressureActionSources({
        run,
        catalog: sampleCatalog,
        match: submitted
      })
    ).toEqual([]);

    const playerPriorityWithStack = passEncounterPriority(submitted, "enemy");
    expect(() =>
      submitPrototypePressureActionFromRun({
        match: playerPriorityWithStack,
        run,
        catalog: sampleCatalog,
        actor: "player",
        cardInstanceId: sparkfall.instanceId
      })
    ).toThrow(/already queued/);

    const resolved = passEncounterPriority(playerPriorityWithStack, "player");
    expect(
      listPrototypePressureActionSources({
        run,
        catalog: sampleCatalog,
        match: resolved
      })
    ).toEqual([]);
    expect(() =>
      submitPrototypePressureActionFromRun({
        match: resolved,
        run,
        catalog: sampleCatalog,
        actor: "player",
        cardInstanceId: sparkfall.instanceId
      })
    ).toThrow(/already used/);
  });
});

describe("encounter Commander Rally action sources", () => {
  it("accepts a deployed player Commander during first main with player priority", () => {
    const run = deployTestCommander(createTestRun());
    const match = createEncounterMatch({
      matchId: "commander-rally-source",
      seed: "commander-rally-source"
    });

    const result = validateCommanderRallyActionSource({
      run,
      catalog: sampleCatalog,
      match,
      actor: "player"
    });

    if (!result.ok) {
      throw new Error(`Expected a valid Commander source, received ${result.code}.`);
    }

    expect(result).toEqual({
      ok: true,
      source: {
        cardInstanceId: run.commander?.card.instanceId,
        cardDefId: run.commander?.card.defId,
        cardName: "Sparkcatch Apprentice",
        zone: "board"
      }
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(
      listCommanderRallyActionSources({
        run,
        catalog: sampleCatalog,
        match
      })
    ).toEqual([result.source]);
  });

  it("rejects a Commander that is still in Command Zone", () => {
    const run = createTestRun();
    const match = createEncounterMatch({
      matchId: "commander-rally-command-zone",
      seed: "commander-rally-command-zone"
    });

    const result = validateCommanderRallyActionSource({
      run,
      catalog: sampleCatalog,
      match,
      actor: "player"
    });

    expectCommanderFailureCode(
      result,
      "wrong_zone",
      /Commander must be deployed to use Commander Rally/
    );
    expect(
      listCommanderRallyActionSources({
        run,
        catalog: sampleCatalog,
        match
      })
    ).toEqual([]);
  });

  it("rejects a deployed Commander without a matching board placement", () => {
    const deployed = deployTestCommander(createTestRun());
    const run: RunState = {
      ...deployed,
      board: { placements: [] }
    };
    const match = createEncounterMatch({
      matchId: "commander-rally-missing-placement",
      seed: "commander-rally-missing-placement"
    });

    const result = validateCommanderRallyActionSource({
      run,
      catalog: sampleCatalog,
      match,
      actor: "player"
    });

    expectCommanderFailureCode(result, "missing_board_placement", /board placement/);
  });

  it("rejects unsupported actors, wrong phases, and missing player priority", () => {
    const run = deployTestCommander(createTestRun());
    const firstMain = createEncounterMatch({
      matchId: "commander-rally-guards",
      seed: "commander-rally-guards"
    });
    const combat = createEncounterMatch({
      matchId: "commander-rally-combat",
      seed: "commander-rally-combat",
      phase: "combat"
    });
    const enemyPriority = submitPrototypePressureActionFromRun({
      match: firstMain,
      run,
      catalog: sampleCatalog,
      actor: "player",
      cardInstanceId: getSparkfall(run).instanceId
    });

    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run,
        catalog: sampleCatalog,
        match: firstMain,
        actor: "enemy"
      }),
      "unsupported_actor",
      /player Commanders only/
    );
    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run,
        catalog: sampleCatalog,
        match: combat,
        actor: "player"
      }),
      "wrong_phase",
      /main phases/
    );
    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run,
        catalog: sampleCatalog,
        match: enemyPriority,
        actor: "player"
      }),
      "priority_required",
      /player priority/
    );
  });

  it("rejects wrong owner, unknown definitions, and non-Unit Commander definitions", () => {
    const deployed = deployTestCommander(createTestRun());
    const match = createEncounterMatch({
      matchId: "commander-rally-definition-guards",
      seed: "commander-rally-definition-guards"
    });

    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run: {
          ...deployed,
          commander: {
            ...deployed.commander!,
            card: { ...deployed.commander!.card, ownerId: wrongOwnerId }
          }
        },
        catalog: sampleCatalog,
        match,
        actor: "player"
      }),
      "wrong_owner",
      /not the run player/
    );
    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run: {
          ...deployed,
          commander: {
            ...deployed.commander!,
            card: { ...deployed.commander!.card, defId: asCardDefId("missing") }
          }
        },
        catalog: sampleCatalog,
        match,
        actor: "player"
      }),
      "unknown_card_definition",
      /unknown card definition/
    );
    expectCommanderFailureCode(
      validateCommanderRallyActionSource({
        run: {
          ...deployed,
          commander: {
            ...deployed.commander!,
            card: { ...deployed.commander!.card, defId: asCardDefId("sparkfall") }
          }
        },
        catalog: sampleCatalog,
        match,
        actor: "player"
      }),
      "wrong_card_type",
      /Unit or Echo/
    );
  });

  it("queues, resolves, and prevents reusing Commander Rally in one encounter", () => {
    const run = deployTestCommander(createTestRun());
    const match = createEncounterMatch({
      matchId: "commander-rally-repeat-source",
      seed: "commander-rally-repeat-source"
    });

    const submitted = submitCommanderRallyActionFromRun({
      match,
      run,
      catalog: sampleCatalog,
      actor: "player"
    });

    expect(submitted.stack[0]?.action).toMatchObject({
      kind: "commander_rally",
      actor: "player",
      label: "Commander Rally",
      source: {
        cardInstanceId: run.commander?.card.instanceId,
        cardName: "Sparkcatch Apprentice",
        zone: "board"
      },
      sourceLifecycle: "usedOnResolve",
      target: enemyStabilityTarget
    });
    expect(submitted.actionLog.at(-1)?.text).toBe(
      "Player queued Commander Rally from Sparkcatch Apprentice."
    );
    expect(
      listCommanderRallyActionSources({
        run,
        catalog: sampleCatalog,
        match: submitted
      })
    ).toEqual([]);
    expect(() =>
      submitCommanderRallyActionFromRun({
        match: submitted,
        run,
        catalog: sampleCatalog,
        actor: "player"
      })
    ).toThrow(/player priority/);

    const playerPriorityWithStack = passEncounterPriority(submitted, "enemy");
    expect(() =>
      submitCommanderRallyActionFromRun({
        match: playerPriorityWithStack,
        run,
        catalog: sampleCatalog,
        actor: "player"
      })
    ).toThrow(/already queued/);

    const resolved = passEncounterPriority(playerPriorityWithStack, "player");

    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.actionLog.at(-1)?.text).toBe(
      "Resolved Commander Rally from Player: Enemy stability -1."
    );
    expect(resolved.sourceLifecycleEvents[0]).toMatchObject({
      lifecycle: "usedOnResolve",
      actionKind: "commander_rally",
      actionLabel: "Commander Rally",
      actor: "player",
      source: {
        cardInstanceId: run.commander?.card.instanceId,
        cardName: "Sparkcatch Apprentice",
        zone: "board"
      }
    });
    expect(
      listCommanderRallyActionSources({
        run,
        catalog: sampleCatalog,
        match: resolved
      })
    ).toEqual([]);
    expect(() =>
      submitCommanderRallyActionFromRun({
        match: resolved,
        run,
        catalog: sampleCatalog,
        actor: "player"
      })
    ).toThrow(/already used/);
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved);
  });
});
