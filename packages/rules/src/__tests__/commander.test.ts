import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type BoardPosition,
  type CardInstance,
  type CombatEvent
} from "@packbound/shared";

import {
  applyRunAction,
  applyRunActions,
  canDeployCommander,
  canPlaceCardOnBoard,
  canReturnCommanderToCommand,
  createRunFromStarterKit,
  deployCommander,
  getDefaultCommanderPosition,
  recordCombatResult,
  replayRunActions,
  returnCommanderToCommand,
  toRunActionLog,
  type CombatResultLike,
  type RunAction,
  type RunState
} from "../index";

const createCommanderRun = (seed = "commander-seed"): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId: "ember_scrappers",
    playerId: asPlayerId("test-player")
  });

const requireCommanderPosition = (run: RunState): BoardPosition => {
  const position = getDefaultCommanderPosition(run, sampleCatalog);
  if (!position) {
    throw new Error("Expected a legal Commander deployment position");
  }
  return position;
};

const requirePoolCard = (run: RunState, defId: string): CardInstance => {
  const cardDefId = asCardDefId(defId);
  const card = run.pool.find((candidate) => candidate.defId === cardDefId);
  if (!card) {
    throw new Error(`Expected ${defId} in pool`);
  }
  return card;
};

const withExtraCrackedPrismSource = (run: RunState): RunState => ({
  ...run,
  sourceRow: {
    ...run.sourceRow,
    cards: [
      ...run.sourceRow.cards,
      {
        instanceId: asCardInstanceId(`${run.runId}:test-source:cracked-prism`),
        defId: asCardDefId("cracked_prism"),
        ownerId: run.playerId,
        zone: "sourceRow",
        modifiers: [],
        upgradeLevel: 0
      }
    ]
  }
});

const readyCombatRun = (run: RunState): RunState =>
  applyRunActions(run, sampleCatalog, [
    { type: "prepareEncounter" },
    { type: "markCombatReady" }
  ]);

const combatResult = (
  events: readonly CombatEvent[],
  overrides: Partial<CombatResultLike> = {}
): CombatResultLike => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 3,
  events,
  warnings: [],
  seed: "commander-combat-seed",
  rulesVersion: "commander-test",
  ...overrides
});

const unitDestroyedEvent = (
  run: RunState,
  card: {
    readonly instanceId: CardInstance["instanceId"];
    readonly defId: CardInstance["defId"];
  },
  overrides: Partial<Extract<CombatEvent, { readonly type: "UnitDestroyed" }>> = {}
): Extract<CombatEvent, { readonly type: "UnitDestroyed" }> => ({
  type: "UnitDestroyed",
  timeMs: 200,
  unitId: asUnitInstanceId(`playerA:${card.instanceId}`),
  cardInstanceId: card.instanceId,
  defId: card.defId,
  side: "playerA",
  ownerId: run.playerId,
  isEcho: false,
  reason: "combatDamage",
  ...overrides
});

const requireCurrentEncounterId = (run: RunState): string => {
  if (!run.currentEncounterId) {
    throw new Error("Expected a prepared encounter");
  }
  return run.currentEncounterId;
};

describe("command zone commander prototype", () => {
  it("adds a JSON-serializable Commander to starter-created runs", () => {
    const run = createCommanderRun("starter-commander-seed");

    expect(run.commander).toMatchObject({
      deployCount: 0,
      rebindTax: 0,
      card: {
        defId: "sparkcatch_apprentice",
        ownerId: run.playerId,
        zone: "command",
        upgradeLevel: 0
      }
    });
    expect(run.commander?.card.instanceId).toContain(
      `${run.runId}:starter:ember_scrappers:command:0:`
    );
    expect(JSON.parse(JSON.stringify(run.commander))).toEqual(run.commander);
  });

  it("deploys the Commander from Command Zone during planning", () => {
    const run = createCommanderRun("deploy-commander-seed");
    const position = requireCommanderPosition(run);
    const deployed = deployCommander(run, sampleCatalog, position);

    expect(run.commander?.card.zone).toBe("command");
    expect(
      run.board.placements.map((placement) => placement.cardInstanceId)
    ).not.toContain(run.commander?.card.instanceId);
    expect(deployed.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 0,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "board"
      }
    });
    expect(deployed.board.placements).toContainEqual({
      cardInstanceId: run.commander?.card.instanceId,
      defId: run.commander?.card.defId,
      ownerId: run.playerId,
      position
    });
    expect(
      deployed.activeCards.find(
        (card) => card.instanceId === run.commander?.card.instanceId
      )
    ).toMatchObject({
      defId: run.commander?.card.defId,
      zone: "board"
    });
  });

  it("guards Commander deployment by phase and zone", () => {
    const run = createCommanderRun("deploy-guards-seed");
    const position = requireCommanderPosition(run);
    const deployed = deployCommander(run, sampleCatalog, position);
    const ready = applyRunActions(run, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(canDeployCommander(run, sampleCatalog, position)).toEqual({ ok: true });
    expect(canDeployCommander(ready, sampleCatalog, position)).toEqual({
      ok: false,
      reason: "Commander can only be deployed during planning."
    });
    expect(canDeployCommander(deployed, sampleCatalog, position)).toEqual({
      ok: false,
      reason: "Commander is already deployed."
    });
    expect(() => deployCommander(ready, sampleCatalog, position)).toThrow(/planning/);
    expect(() => deployCommander(deployed, sampleCatalog, position)).toThrow(
      /already deployed/
    );
  });

  it("returns a deployed Commander to Command Zone during planning and increments tax", () => {
    const run = createCommanderRun("return-commander-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const returned = returnCommanderToCommand(deployed);

    expect(returned.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 1,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "command"
      }
    });
    expect(
      returned.board.placements.map((placement) => placement.cardInstanceId)
    ).not.toContain(run.commander?.card.instanceId);
    expect(returned.activeCards.map((card) => card.instanceId)).not.toContain(
      run.commander?.card.instanceId
    );
    expect(deployed.commander?.rebindTax).toBe(0);
  });

  it("guards Commander return by phase and zone", () => {
    const run = createCommanderRun("return-guards-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = applyRunActions(deployed, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(canReturnCommanderToCommand(run)).toEqual({
      ok: false,
      reason: "Commander is already in the Command Zone."
    });
    expect(canReturnCommanderToCommand(deployed)).toEqual({ ok: true });
    expect(canReturnCommanderToCommand(ready)).toEqual({
      ok: false,
      reason: "Commander can only return to Command during planning."
    });
    expect(() => returnCommanderToCommand(run)).toThrow(/already in the Command Zone/);
    expect(() => returnCommanderToCommand(ready)).toThrow(/planning/);
  });

  it("redeploys deterministically when Source Row can pay Rebind Tax", () => {
    const run = withExtraCrackedPrismSource(
      createCommanderRun("redeploy-commander-seed")
    );
    const firstDeploy = deployCommander(
      run,
      sampleCatalog,
      requireCommanderPosition(run)
    );
    const returned = returnCommanderToCommand(firstDeploy);
    const redeployed = deployCommander(
      returned,
      sampleCatalog,
      requireCommanderPosition(returned)
    );

    expect(redeployed.commander).toMatchObject({
      deployCount: 2,
      rebindTax: 1,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "board"
      }
    });
    expect(JSON.parse(JSON.stringify(redeployed))).toEqual(redeployed);
  });

  it("blocks redeploy when Rebind Tax exceeds available Board Charge", () => {
    const run = createCommanderRun("tax-block-seed");
    const position = requireCommanderPosition(run);
    const firstDeploy = deployCommander(run, sampleCatalog, position);
    const returned = returnCommanderToCommand(firstDeploy);

    const check = canDeployCommander(returned, sampleCatalog, position);

    expect(check).toEqual({
      ok: false,
      reason:
        "Commander Rebind Tax requires 4 total Board Charge, but the Source Row provides 3."
    });
    expect(check.ok ? "" : check.reason).toMatch(/Rebind Tax|Charge/);
    expect(check.ok ? "" : check.reason).not.toMatch(/Ember access/);
    expect(() => deployCommander(returned, sampleCatalog, position)).toThrow(
      /Rebind Tax/
    );
  });

  it("does not apply Rebind Tax to normal pool card placement", () => {
    const run = createCommanderRun("pool-tax-bypass-seed");
    const firstDeploy = deployCommander(
      run,
      sampleCatalog,
      requireCommanderPosition(run)
    );
    const returned = returnCommanderToCommand(firstDeploy);
    const poolCard = requirePoolCard(returned, "sparkcatch_apprentice");

    expect(returned.commander?.rebindTax).toBe(1);
    expect(
      canPlaceCardOnBoard(returned, sampleCatalog, poolCard.instanceId, {
        row: 0,
        col: 0,
        layer: "ground"
      })
    ).toEqual({ ok: true });
  });

  it("applies and replays Commander run actions without mutating prior state", () => {
    const initialRun = withExtraCrackedPrismSource(
      createCommanderRun("commander-action-seed")
    );
    const firstPosition = requireCommanderPosition(initialRun);
    const actions: readonly RunAction[] = [
      { type: "deployCommander", position: firstPosition },
      { type: "returnCommanderToCommand" },
      { type: "deployCommander", position: firstPosition }
    ];
    const finalRun = applyRunActions(initialRun, sampleCatalog, actions);

    expect(initialRun.commander?.card.zone).toBe("command");
    expect(initialRun.commander?.deployCount).toBe(0);
    expect(initialRun.commander?.rebindTax).toBe(0);
    expect(finalRun.commander).toMatchObject({
      deployCount: 2,
      rebindTax: 1,
      card: { zone: "board" }
    });
    expect(replayRunActions(initialRun, sampleCatalog, actions)).toEqual(finalRun);
    expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
      toRunActionLog(actions)
    );
  });

  it("rejects Commander deployment through the reducer outside planning", () => {
    const run = createCommanderRun("commander-reducer-guards-seed");
    const ready = applyRunActions(run, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(() =>
      applyRunAction(ready, sampleCatalog, {
        type: "deployCommander",
        position: requireCommanderPosition(run)
      })
    ).toThrow(/planning/);
  });

  it("returns a destroyed deployed Commander to Command Zone when combat is recorded", () => {
    const run = createCommanderRun("commander-destroyed-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);
    const deployCount = ready.commander?.deployCount;
    const result = combatResult([unitDestroyedEvent(ready, ready.commander!.card)]);

    const recorded = recordCombatResult(ready, result, {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(recorded.commander).toMatchObject({
      deployCount,
      rebindTax: 1,
      card: {
        instanceId: ready.commander?.card.instanceId,
        zone: "command"
      }
    });
    expect(
      recorded.board.placements.map((placement) => placement.cardInstanceId)
    ).not.toContain(ready.commander?.card.instanceId);
    expect(recorded.activeCards.map((card) => card.instanceId)).not.toContain(
      ready.commander?.card.instanceId
    );
    expect(recorded.combatHistory).toHaveLength(1);
    expect(recorded.combatHistory[0]).toMatchObject({
      eventCount: 1,
      seed: "commander-combat-seed",
      rulesVersion: "commander-test"
    });
    expect(recorded.phase).toBe("reward");
    expect(ready.commander?.card.zone).toBe("board");
    expect(ready.commander?.rebindTax).toBe(0);
  });

  it("keeps a deployed Commander on board when combat does not destroy it", () => {
    const run = createCommanderRun("commander-survives-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);

    const recorded = recordCombatResult(ready, combatResult([]), {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 0,
      card: { zone: "board" }
    });
    expect(
      recorded.board.placements.map((placement) => placement.cardInstanceId)
    ).toContain(ready.commander?.card.instanceId);
    expect(recorded.activeCards.map((card) => card.instanceId)).toContain(
      ready.commander?.card.instanceId
    );
  });

  it("ignores destroyed non-Commander player units and enemy units", () => {
    const run = createCommanderRun("commander-ignore-destruction-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);
    const nonCommanderPlacement = ready.board.placements.find(
      (placement) => placement.cardInstanceId !== ready.commander?.card.instanceId
    );

    if (!nonCommanderPlacement) {
      throw new Error("Expected a non-Commander board placement");
    }

    const result = combatResult([
      unitDestroyedEvent(ready, {
        instanceId: nonCommanderPlacement.cardInstanceId,
        defId: nonCommanderPlacement.defId
      }),
      unitDestroyedEvent(
        ready,
        {
          instanceId: asCardInstanceId("enemy-destroyed-card"),
          defId: asCardDefId("enemy_scraprunner")
        },
        {
          side: "playerB",
          ownerId: asPlayerId("enemy-player"),
          unitId: asUnitInstanceId("playerB:enemy-destroyed-card")
        }
      )
    ]);

    const recorded = recordCombatResult(ready, result, {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 0,
      card: { zone: "board" }
    });
    expect(
      recorded.board.placements.map((placement) => placement.cardInstanceId)
    ).toContain(ready.commander?.card.instanceId);
  });

  it("increments Rebind Tax only once for duplicate Commander destruction events", () => {
    const run = createCommanderRun("commander-duplicate-destroyed-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);
    const destroyed = unitDestroyedEvent(ready, ready.commander!.card);

    const recorded = recordCombatResult(ready, combatResult([destroyed, destroyed]), {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 1,
      card: { zone: "command" }
    });
  });

  it("does not apply stale Commander destruction events while Commander is already in Command Zone", () => {
    const run = createCommanderRun("commander-stale-destroyed-seed");
    const ready = readyCombatRun(run);

    const recorded = recordCombatResult(
      ready,
      combatResult([unitDestroyedEvent(ready, ready.commander!.card)]),
      { encounterId: requireCurrentEncounterId(ready) }
    );

    expect(recorded.commander).toMatchObject({
      deployCount: 0,
      rebindTax: 0,
      card: { zone: "command" }
    });
  });

  it("replays Commander destruction replacement deterministically through run actions", () => {
    const initialRun = createCommanderRun("commander-destroyed-replay-seed");
    const deployed = applyRunAction(initialRun, sampleCatalog, {
      type: "deployCommander",
      position: requireCommanderPosition(initialRun)
    });
    const ready = readyCombatRun(deployed);
    const recordAction: RunAction = {
      type: "recordCombatResult",
      encounterId: requireCurrentEncounterId(ready),
      combatResult: combatResult([unitDestroyedEvent(ready, ready.commander!.card)])
    };

    const recorded = applyRunAction(ready, sampleCatalog, recordAction);

    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 1,
      card: { zone: "command" }
    });
    expect(replayRunActions(ready, sampleCatalog, [recordAction])).toEqual(recorded);
    expect(JSON.parse(JSON.stringify(recorded))).toEqual(recorded);
  });

  it("applies Commander destruction lifecycle even when recorded combat loses the run", () => {
    const run = {
      ...createCommanderRun("commander-lost-destroyed-seed"),
      playerHealth: 2
    };
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);

    const recorded = recordCombatResult(
      ready,
      combatResult([unitDestroyedEvent(ready, ready.commander!.card)], {
        winner: "playerB",
        damageToPlayerA: 2
      }),
      { encounterId: requireCurrentEncounterId(ready) }
    );

    expect(recorded.status).toBe("lost");
    expect(recorded.phase).toBe("complete");
    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 1,
      card: { zone: "command" }
    });
  });
});
