import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type BoardPosition,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent
} from "@packbound/shared";

import {
  applyRunAction,
  applyRunActions,
  applyPackReward,
  commitPackOfferPicks,
  canDeployCommander,
  canUnlockCommanderDoctrineNode,
  canPlaceCardOnBoard,
  canReturnCommanderToCommand,
  createRunFromStarterKit,
  deployCommander,
  getCommanderEffectiveRebindTax,
  getCommanderDoctrineNodes,
  getCurrentCommanderDoctrineChoices,
  getCurrentCommanderUpgradeChoices,
  getDefaultCommanderPosition,
  getLegalCommanderDeployPositions,
  hasCommanderRewardForRound,
  getCurrentRewardChoices,
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

const rewardCombatRun = (run: RunState): RunState => {
  const ready = readyCombatRun(run);
  return recordCombatResult(ready, combatResult([]), {
    encounterId: requireCurrentEncounterId(ready)
  });
};

const firstPackRewardChoiceId = (run: RunState): string => {
  const choice = getCurrentRewardChoices(run, sampleCatalog)[0];
  if (!choice) {
    throw new Error("Expected a pack reward choice");
  }
  return choice.id;
};

const pendingOfferPickIds = (run: RunState): readonly CardInstanceId[] => {
  const pendingOffer = run.pendingPackOffer;
  if (!pendingOffer) {
    throw new Error("Expected a pending Pack Offer");
  }

  return pendingOffer.cards
    .slice(0, pendingOffer.pickLimit)
    .map((card) => card.instanceId);
};

const commitPendingPackOffer = (run: RunState): RunState =>
  commitPackOfferPicks(run, pendingOfferPickIds(run));

const applyAndCommitPackReward = (run: RunState): RunState =>
  commitPendingPackOffer(
    applyPackReward(run, sampleCatalog, firstPackRewardChoiceId(run))
  );

const commanderLifecycleTypes = (run: RunState): readonly string[] =>
  run.commander?.lifecycleHistory.map((entry) => entry.type) ?? [];

const latestCommanderLifecycleEntry = (run: RunState) => {
  const entry = run.commander?.lifecycleHistory.at(-1);
  if (!entry) {
    throw new Error("Expected a Commander lifecycle entry");
  }
  return entry;
};

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
      rebindTaxDiscount: 0,
      upgradeHistory: [],
      lifecycleHistory: [
        expect.objectContaining({
          type: "created",
          source: "starter",
          label: "Commander initialized in Command Zone.",
          round: 1,
          phase: "planning",
          toZone: "command",
          deployCountBefore: 0,
          deployCountAfter: 0,
          rebindTaxBefore: 0,
          rebindTaxAfter: 0,
          effectiveRebindTaxBefore: 0,
          effectiveRebindTaxAfter: 0,
          upgradeLevelBefore: 0,
          upgradeLevelAfter: 0
        })
      ],
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
    expect(commanderLifecycleTypes(deployed)).toEqual(["created", "deployed"]);
    expect(latestCommanderLifecycleEntry(deployed)).toMatchObject({
      type: "deployed",
      source: "planning",
      label: "Commander deployed from Command Zone.",
      round: deployed.currentRound,
      phase: "planning",
      fromZone: "command",
      toZone: "board",
      deployCountBefore: 0,
      deployCountAfter: 1,
      rebindTaxBefore: 0,
      rebindTaxAfter: 0,
      effectiveRebindTaxBefore: 0,
      effectiveRebindTaxAfter: 0,
      upgradeLevelBefore: 0,
      upgradeLevelAfter: 0
    });
  });

  it("exposes deterministic legal Commander deployment positions", () => {
    const run = createCommanderRun("legal-commander-positions-seed");
    const positions = getLegalCommanderDeployPositions(run, sampleCatalog);

    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0]).toEqual(requireCommanderPosition(run));
    expect(positions.every((position) => position.layer === "ground")).toBe(true);
    expect(positions).toEqual(
      positions
        .slice()
        .sort((left, right) => left.row - right.row || left.col - right.col)
    );
    expect(JSON.parse(JSON.stringify(positions))).toEqual(positions);

    const deployed = deployCommander(run, sampleCatalog, positions[0]!);
    expect(getLegalCommanderDeployPositions(deployed, sampleCatalog)).toEqual([]);
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
    expect(commanderLifecycleTypes(ready)).toEqual(["created"]);
    expect(commanderLifecycleTypes(deployed)).toEqual(["created", "deployed"]);
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
    expect(commanderLifecycleTypes(returned)).toEqual([
      "created",
      "deployed",
      "returned_to_command"
    ]);
    expect(latestCommanderLifecycleEntry(returned)).toMatchObject({
      type: "returned_to_command",
      source: "planning",
      label: "Commander returned to Command Zone.",
      fromZone: "board",
      toZone: "command",
      deployCountBefore: 1,
      deployCountAfter: 1,
      rebindTaxBefore: 0,
      rebindTaxAfter: 1,
      effectiveRebindTaxBefore: 0,
      effectiveRebindTaxAfter: 1
    });
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
    expect(commanderLifecycleTypes(run)).toEqual(["created"]);
    expect(commanderLifecycleTypes(ready)).toEqual(["created", "deployed"]);
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
    expect(commanderLifecycleTypes(redeployed)).toEqual([
      "created",
      "deployed",
      "returned_to_command",
      "deployed"
    ]);
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
    expect(commanderLifecycleTypes(recorded)).toEqual([
      "created",
      "deployed",
      "destroyed_to_command"
    ]);
    expect(latestCommanderLifecycleEntry(recorded)).toMatchObject({
      type: "destroyed_to_command",
      source: "combat_result",
      label: "Commander returned to Command Zone after combat destruction.",
      phase: "combatReady",
      fromZone: "board",
      toZone: "command",
      deployCountBefore: 1,
      deployCountAfter: 1,
      rebindTaxBefore: 0,
      rebindTaxAfter: 1,
      effectiveRebindTaxBefore: 0,
      effectiveRebindTaxAfter: 1,
      combatEventType: "UnitDestroyed",
      combatEventIndex: 0,
      combatEventTimeMs: 200,
      destructionReason: "combatDamage"
    });
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
    expect(commanderLifecycleTypes(recorded)).toEqual(["created", "deployed"]);
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
    expect(commanderLifecycleTypes(recorded)).toEqual(["created", "deployed"]);
  });

  it("ignores malformed same-owner Commander destruction events from the enemy side", () => {
    const run = createCommanderRun("commander-wrong-side-destroyed-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = readyCombatRun(deployed);

    const recorded = recordCombatResult(
      ready,
      combatResult([
        unitDestroyedEvent(ready, ready.commander!.card, {
          side: "playerB",
          unitId: asUnitInstanceId(`playerB:${ready.commander!.card.instanceId}`)
        })
      ]),
      { encounterId: requireCurrentEncounterId(ready) }
    );

    expect(recorded.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 0,
      card: { zone: "board" }
    });
    expect(
      recorded.board.placements.map((placement) => placement.cardInstanceId)
    ).toContain(ready.commander?.card.instanceId);
    expect(commanderLifecycleTypes(recorded)).toEqual(["created", "deployed"]);
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
    expect(commanderLifecycleTypes(recorded)).toEqual([
      "created",
      "deployed",
      "destroyed_to_command"
    ]);
    expect(latestCommanderLifecycleEntry(recorded)).toMatchObject({
      combatEventIndex: 0,
      rebindTaxBefore: 0,
      rebindTaxAfter: 1
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
    expect(commanderLifecycleTypes(recorded)).toEqual(["created"]);
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
    expect(commanderLifecycleTypes(recorded)).toEqual([
      "created",
      "deployed",
      "destroyed_to_command"
    ]);
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
    expect(commanderLifecycleTypes(recorded)).toEqual([
      "created",
      "deployed",
      "destroyed_to_command"
    ]);
  });

  it("awards a doctrine point and exposes available doctrine choices during reward", () => {
    const planning = createCommanderRun("commander-doctrine-choice-window-seed");
    const ready = readyCombatRun(planning);
    const reward = recordCombatResult(ready, combatResult([]), {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(planning.commander?.doctrine).toMatchObject({
      points: 0,
      unlockedNodeIds: [],
      unlockHistory: []
    });
    expect(getCurrentCommanderDoctrineChoices(planning)).toEqual([]);
    expect(getCurrentCommanderDoctrineChoices(ready)).toEqual([]);
    expect(reward.commander?.doctrine.points).toBe(1);
    expect(getCurrentCommanderDoctrineChoices(reward)).toEqual([
      expect.objectContaining({
        id: "ash_ledger",
        path: "ashbound",
        displayName: "Ash Ledger",
        status: "available"
      }),
      expect.objectContaining({
        id: "edge_mason",
        path: "field_architect",
        displayName: "Edge Mason",
        status: "available"
      }),
      expect.objectContaining({
        id: "queued_trigger",
        path: "spellrail_conductor",
        displayName: "Queued Trigger",
        status: "available"
      })
    ]);
    expect(getCommanderDoctrineNodes(reward)).toContainEqual(
      expect.objectContaining({
        id: "memory_vault",
        status: "locked",
        lockedReason: "Requires Ash Ledger."
      })
    );
  });

  it("unlocks one Commander doctrine node per reward round and records history", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-doctrine-history-seed"));

    const unlocked = applyRunAction(reward, sampleCatalog, {
      type: "unlockCommanderDoctrineNode",
      nodeId: "ash_ledger"
    });

    expect(unlocked.commander?.doctrine).toMatchObject({
      points: 0,
      unlockedNodeIds: ["ash_ledger"],
      unlockHistory: [
        expect.objectContaining({
          round: reward.currentRound,
          nodeId: "ash_ledger",
          path: "ashbound",
          label: "Ash Ledger",
          pointsBefore: 1,
          pointsAfter: 0
        })
      ]
    });
    expect(commanderLifecycleTypes(unlocked)).toEqual(["created", "doctrine_unlocked"]);
    expect(latestCommanderLifecycleEntry(unlocked)).toMatchObject({
      type: "doctrine_unlocked",
      source: "reward",
      label: "Commander doctrine unlocked: Ash Ledger.",
      doctrineNodeId: "ash_ledger",
      doctrineNodeLabel: "Ash Ledger",
      fromZone: "command",
      toZone: "command"
    });
    expect(getCurrentCommanderDoctrineChoices(unlocked)).toEqual([]);
    expect(hasCommanderRewardForRound(unlocked)).toBe(true);
    expect(() =>
      applyRunAction(unlocked, sampleCatalog, {
        type: "unlockCommanderDoctrineNode",
        nodeId: "edge_mason"
      })
    ).toThrow(/already claimed/);
    expect(JSON.parse(JSON.stringify(unlocked.commander?.doctrine))).toEqual(
      unlocked.commander?.doctrine
    );
  });

  it("guards locked doctrine prerequisites and makes next-tier nodes available later", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-doctrine-prereq-seed"));

    expect(canUnlockCommanderDoctrineNode(reward, "memory_vault")).toEqual({
      ok: false,
      reason: "Requires Ash Ledger."
    });

    const firstUnlock = applyRunAction(reward, sampleCatalog, {
      type: "unlockCommanderDoctrineNode",
      nodeId: "ash_ledger"
    });
    const packed = applyAndCommitPackReward(firstUnlock);
    const nextPlanning = applyRunAction(packed, sampleCatalog, {
      type: "advanceRunAfterCombat"
    });
    const nextReward = rewardCombatRun(nextPlanning);

    expect(nextReward.commander?.doctrine.points).toBe(1);
    expect(getCurrentCommanderDoctrineChoices(nextReward)).toContainEqual(
      expect.objectContaining({
        id: "memory_vault",
        status: "available"
      })
    );
  });

  it("keeps pack rewards and Commander doctrine rewards separate in the same round", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-doctrine-buckets-seed"));
    const packChoiceId = firstPackRewardChoiceId(reward);

    const packed = applyPackReward(reward, sampleCatalog, packChoiceId);

    expect(packed.phase).toBe("reward");
    expect(packed.pendingPackOffer).toBeDefined();
    expect(getCurrentRewardChoices(packed, sampleCatalog)).toEqual([]);
    expect(getCurrentCommanderDoctrineChoices(packed)).toHaveLength(3);
    expect(() => applyPackReward(packed, sampleCatalog, packChoiceId)).toThrow(
      /Cannot open another reward pack while Pack Offer/
    );

    const committed = commitPendingPackOffer(packed);
    expect(committed.phase).toBe("reward");
    const unlocked = applyRunAction(committed, sampleCatalog, {
      type: "unlockCommanderDoctrineNode",
      nodeId: "edge_mason"
    });

    expect(unlocked.phase).toBe("combatResolved");
    expect(unlocked.openedPacks).toHaveLength(1);
    expect(unlocked.commander?.doctrine.unlockHistory).toHaveLength(1);
  });

  it("replays Commander doctrine unlock actions deterministically", () => {
    const initialRun = createCommanderRun("commander-doctrine-replay-seed");
    const ready = readyCombatRun(initialRun);
    const actions: readonly RunAction[] = [
      {
        type: "recordCombatResult",
        encounterId: requireCurrentEncounterId(ready),
        combatResult: combatResult([])
      },
      {
        type: "unlockCommanderDoctrineNode",
        nodeId: "queued_trigger"
      }
    ];

    const unlocked = applyRunActions(ready, sampleCatalog, actions);

    expect(unlocked.commander?.doctrine).toMatchObject({
      points: 0,
      unlockedNodeIds: ["queued_trigger"],
      unlockHistory: [expect.objectContaining({ nodeId: "queued_trigger" })]
    });
    expect(commanderLifecycleTypes(unlocked)).toEqual(["created", "doctrine_unlocked"]);
    expect(replayRunActions(ready, sampleCatalog, actions)).toEqual(unlocked);
    expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
      toRunActionLog(actions)
    );
  });

  it("exposes Commander upgrade choices only during reward with a Commander", () => {
    const planning = createCommanderRun("commander-upgrade-choice-window-seed");
    const ready = readyCombatRun(planning);
    const reward = recordCombatResult(ready, combatResult([]), {
      encounterId: requireCurrentEncounterId(ready)
    });

    expect(getCurrentCommanderUpgradeChoices(planning)).toEqual([]);
    expect(getCurrentCommanderUpgradeChoices(ready)).toEqual([]);
    const { commander, ...rewardWithoutCommander } = reward;
    expect(commander).toBeDefined();
    expect(getCurrentCommanderUpgradeChoices(rewardWithoutCommander)).toEqual([]);
    expect(getCurrentCommanderUpgradeChoices(reward)).toEqual([
      expect.objectContaining({
        id: "combat_training",
        label: "Combat Training"
      }),
      expect.objectContaining({
        id: "rebind_calibration",
        label: "Rebind Calibration"
      })
    ]);
  });

  it("applies one Commander upgrade choice per reward round and records history", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-upgrade-history-seed"));

    const upgraded = applyRunAction(reward, sampleCatalog, {
      type: "applyCommanderUpgradeChoice",
      choiceId: "combat_training"
    });

    expect(upgraded.commander).toMatchObject({
      card: { upgradeLevel: 1 },
      upgradeHistory: [
        expect.objectContaining({
          round: reward.currentRound,
          upgradeId: "combat_training",
          label: "Combat Training"
        })
      ]
    });
    expect(commanderLifecycleTypes(upgraded)).toEqual(["created", "upgraded"]);
    expect(latestCommanderLifecycleEntry(upgraded)).toMatchObject({
      type: "upgraded",
      source: "reward",
      label: "Commander upgraded: Combat Training.",
      upgradeId: "combat_training",
      upgradeLabel: "Combat Training",
      fromZone: "command",
      toZone: "command",
      upgradeLevelBefore: 0,
      upgradeLevelAfter: 1,
      rebindTaxDiscountBefore: 0,
      rebindTaxDiscountAfter: 0
    });
    expect(getCurrentCommanderUpgradeChoices(upgraded)).toEqual([]);
    expect(() =>
      applyRunAction(upgraded, sampleCatalog, {
        type: "applyCommanderUpgradeChoice",
        choiceId: "rebind_calibration"
      })
    ).toThrow(/already claimed/);
    expect(JSON.parse(JSON.stringify(upgraded.commander?.upgradeHistory))).toEqual(
      upgraded.commander?.upgradeHistory
    );
  });

  it("Combat Training upgrades only the Commander card in Command Zone", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-training-command-seed"));
    const normalCopy = {
      ...reward.commander!.card,
      instanceId: asCardInstanceId("normal-pool-sparkcatch-copy"),
      zone: "pool" as const,
      upgradeLevel: 0
    };

    const upgraded = applyRunAction(
      {
        ...reward,
        pool: [...reward.pool, normalCopy]
      },
      sampleCatalog,
      {
        type: "applyCommanderUpgradeChoice",
        choiceId: "combat_training"
      }
    );

    expect(upgraded.commander?.card).toMatchObject({
      zone: "command",
      upgradeLevel: 1
    });
    expect(
      upgraded.pool.find(
        (card) => card.instanceId === asCardInstanceId("normal-pool-sparkcatch-copy")
      )?.upgradeLevel
    ).toBe(0);
  });

  it("Combat Training updates activeCards when the Commander is deployed", () => {
    const run = createCommanderRun("commander-training-board-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const reward = rewardCombatRun(deployed);

    const upgraded = applyRunAction(reward, sampleCatalog, {
      type: "applyCommanderUpgradeChoice",
      choiceId: "combat_training"
    });

    expect(upgraded.commander?.card).toMatchObject({
      zone: "board",
      upgradeLevel: 1
    });
    expect(
      upgraded.activeCards.find(
        (card) => card.instanceId === upgraded.commander?.card.instanceId
      )
    ).toMatchObject({
      zone: "board",
      upgradeLevel: 1
    });
    expect(commanderLifecycleTypes(upgraded)).toEqual([
      "created",
      "deployed",
      "upgraded"
    ]);
    expect(latestCommanderLifecycleEntry(upgraded)).toMatchObject({
      type: "upgraded",
      fromZone: "board",
      toZone: "board",
      upgradeLevelBefore: 0,
      upgradeLevelAfter: 1
    });
  });

  it("Combat Training persists from Command Zone into later deployment", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-training-deploy-seed"));
    const trained = applyRunAction(reward, sampleCatalog, {
      type: "applyCommanderUpgradeChoice",
      choiceId: "combat_training"
    });
    const packed = applyAndCommitPackReward(trained);
    const nextPlanning = applyRunAction(packed, sampleCatalog, {
      type: "advanceRunAfterCombat"
    });
    const deployed = deployCommander(
      nextPlanning,
      sampleCatalog,
      requireCommanderPosition(nextPlanning)
    );

    expect(deployed.commander?.card).toMatchObject({
      zone: "board",
      upgradeLevel: 1
    });
    expect(
      deployed.activeCards.find(
        (card) => card.instanceId === deployed.commander?.card.instanceId
      )?.upgradeLevel
    ).toBe(1);
  });

  it("Rebind Calibration discounts effective Rebind Tax and deployment validation", () => {
    const run = createCommanderRun("commander-rebind-calibration-seed");
    const commanderPosition = requireCommanderPosition(run);
    const deployed = deployCommander(run, sampleCatalog, commanderPosition);
    const returned = returnCommanderToCommand(deployed);
    const reward = rewardCombatRun(returned);

    expect(returned.commander?.rebindTax).toBe(1);
    expect(getCommanderEffectiveRebindTax(returned.commander)).toBe(1);
    expect(canDeployCommander(returned, sampleCatalog, commanderPosition)).toEqual({
      ok: false,
      reason:
        "Commander Rebind Tax requires 4 total Board Charge, but the Source Row provides 3."
    });

    const calibrated = applyRunAction(reward, sampleCatalog, {
      type: "applyCommanderUpgradeChoice",
      choiceId: "rebind_calibration"
    });
    const packed = applyAndCommitPackReward(calibrated);
    const nextPlanning = applyRunAction(packed, sampleCatalog, {
      type: "advanceRunAfterCombat"
    });

    expect(nextPlanning.commander).toMatchObject({
      rebindTax: 1,
      rebindTaxDiscount: 1
    });
    expect(getCommanderEffectiveRebindTax(nextPlanning.commander)).toBe(0);
    expect(canDeployCommander(nextPlanning, sampleCatalog, commanderPosition)).toEqual({
      ok: true
    });
    expect(latestCommanderLifecycleEntry(calibrated)).toMatchObject({
      type: "upgraded",
      source: "reward",
      label: "Commander upgraded: Rebind Calibration.",
      upgradeId: "rebind_calibration",
      upgradeLabel: "Rebind Calibration",
      rebindTaxDiscountBefore: 0,
      rebindTaxDiscountAfter: 1,
      effectiveRebindTaxBefore: 1,
      effectiveRebindTaxAfter: 0
    });
  });

  it("replays Commander upgrade choice actions deterministically", () => {
    const initialRun = createCommanderRun("commander-upgrade-replay-seed");
    const ready = readyCombatRun(initialRun);
    const actions: readonly RunAction[] = [
      {
        type: "recordCombatResult",
        encounterId: requireCurrentEncounterId(ready),
        combatResult: combatResult([])
      },
      {
        type: "applyCommanderUpgradeChoice",
        choiceId: "rebind_calibration"
      }
    ];

    const upgraded = applyRunActions(ready, sampleCatalog, actions);

    expect(upgraded.commander).toMatchObject({
      rebindTaxDiscount: 1,
      upgradeHistory: [expect.objectContaining({ upgradeId: "rebind_calibration" })]
    });
    expect(commanderLifecycleTypes(upgraded)).toEqual(["created", "upgraded"]);
    expect(replayRunActions(ready, sampleCatalog, actions)).toEqual(upgraded);
    expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
      toRunActionLog(actions)
    );
  });

  it("keeps pack rewards and Commander upgrade rewards separate in the same round", () => {
    const reward = rewardCombatRun(createCommanderRun("commander-reward-buckets-seed"));
    const packChoiceId = firstPackRewardChoiceId(reward);

    const packed = applyPackReward(reward, sampleCatalog, packChoiceId);

    expect(packed.phase).toBe("reward");
    expect(packed.pendingPackOffer).toBeDefined();
    expect(getCurrentRewardChoices(packed, sampleCatalog)).toEqual([]);
    expect(getCurrentCommanderUpgradeChoices(packed)).toHaveLength(2);
    expect(() => applyPackReward(packed, sampleCatalog, packChoiceId)).toThrow(
      /Cannot open another reward pack while Pack Offer/
    );

    const committed = commitPendingPackOffer(packed);
    const upgraded = applyRunAction(committed, sampleCatalog, {
      type: "applyCommanderUpgradeChoice",
      choiceId: "combat_training"
    });

    expect(upgraded.phase).toBe("combatResolved");
    expect(upgraded.openedPacks).toHaveLength(1);
    expect(upgraded.commander?.upgradeHistory).toHaveLength(1);
  });
});
