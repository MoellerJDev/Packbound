import { describe, expect, it } from "vitest";

import { asCardDefId, asCardInstanceId, asPlayerId } from "@packbound/shared";

import {
  advanceEncounterPhase,
  createEncounterMatch,
  passEncounterPriority,
  recordEncounterCombatSkirmish,
  submitEncounterAction,
  type EncounterCombatResultLike,
  type EncounterMatchState
} from "../encounterMatch";

const createMatch = (): EncounterMatchState =>
  createEncounterMatch({
    matchId: "test-match",
    seed: "encounter-test-seed"
  });

const createChargedMatch = (playerCombatCharge = 2): EncounterMatchState =>
  createEncounterMatch({
    matchId: "charged-test-match",
    seed: "charged-encounter-test-seed",
    playerCombatCharge
  });

const sparkfallSource = {
  cardInstanceId: asCardInstanceId("test-match:sparkfall:spellrail:0"),
  cardDefId: asCardDefId("sparkfall"),
  cardName: "Sparkfall",
  zone: "spellrail" as const
};

const commanderSource = {
  cardInstanceId: asCardInstanceId("test-match:commander:board:0"),
  cardDefId: asCardDefId("sparkcatch_apprentice"),
  cardName: "Sparkcatch Apprentice",
  zone: "board" as const
};

const enemyStabilityTarget = {
  type: "stability",
  actor: "enemy",
  label: "Enemy Stability"
} as const;

const playerStabilityTarget = {
  type: "stability",
  actor: "player",
  label: "Player Stability"
} as const;

const enemyBoardCardTarget = {
  type: "boardCard",
  side: "playerB",
  cardInstanceId: asCardInstanceId("encounter:ember_scraprunner:board:0"),
  defId: asCardDefId("ember_scraprunner"),
  ownerId: asPlayerId("encounter:early_ember_pressure"),
  position: { row: 0, col: 3, layer: "ground" },
  label: "Ember Scraprunner (enemy ground r0 c3)"
} as const;

const friendlyBoardCardTarget = {
  ...enemyBoardCardTarget,
  side: "playerA",
  label: "Ember Scraprunner (ally ground r0 c3)"
} as const;

const combatResult = (
  winner: EncounterCombatResultLike["winner"]
): EncounterCombatResultLike => ({
  winner,
  damageToPlayerA: winner === "playerB" ? 2 : 0,
  damageToPlayerB: winner === "playerA" ? 2 : 0,
  events: [{ type: "CombatStarted", timeMs: 0 }],
  warnings: [{ code: "test-warning", message: "Only used by the encounter shell test." }],
  seed: `combat-${winner}`
});

const passEmptyPriorityWindow = (state: EncounterMatchState): EncounterMatchState => {
  if (!state.priorityHolder) {
    throw new Error(`Expected priority during ${state.phase}.`);
  }
  const firstPass = passEncounterPriority(state, state.priorityHolder);
  if (!firstPass.priorityHolder) {
    throw new Error(`Expected priority after the first pass during ${firstPass.phase}.`);
  }
  return passEncounterPriority(firstPass, firstPass.priorityHolder);
};

const reachSecondMain = (): EncounterMatchState => {
  const combat = passEmptyPriorityWindow(createMatch());
  return recordEncounterCombatSkirmish(combat, combatResult("playerA"));
};

describe("encounter match priority shell", () => {
  it("starts in first main with the active actor holding priority", () => {
    const state = createMatch();

    expect(state.phase).toBe("firstMain");
    expect(state.turnNumber).toBe(1);
    expect(state.activeActor).toBe("player");
    expect(state.priorityHolder).toBe("player");
    expect(state.consecutivePasses).toBe(0);
    expect(state.stack).toEqual([]);
    expect(state.playerCombatCharge).toBe(0);
    expect(state.enemyCombatCharge).toBe(0);
    expect(state.costPaymentEvents).toEqual([]);
    expect(state.boardCardEffectEvents).toEqual([]);
    expect(state.outcome).toEqual({ kind: "inProgress", reason: null });
    expect(state.actionLog[0]).toMatchObject({
      kind: "match_started",
      phase: "firstMain",
      priorityHolder: "player"
    });
  });

  it("submitting an action puts it on the stack and passes priority", () => {
    const state = submitEncounterAction(createMatch(), {
      kind: "debug_pressure"
    });
    const item = state.stack[0];

    if (!item) {
      throw new Error("Expected a queued stack item.");
    }

    expect(state.stack).toHaveLength(1);
    expect(item.action).toEqual({
      kind: "debug_pressure",
      actor: "player",
      label: "Debug pressure",
      target: enemyStabilityTarget
    });
    expect(state.priorityHolder).toBe("enemy");
    expect(state.consecutivePasses).toBe(0);
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player"
    });
  });

  it("submits a prototype main-phase pressure action during first main", () => {
    const state = submitEncounterAction(createChargedMatch(), {
      kind: "main_phase_pressure"
    });
    const item = state.stack[0];

    if (!item) {
      throw new Error("Expected a queued stack item.");
    }

    expect(item.action).toEqual({
      kind: "main_phase_pressure",
      actor: "player",
      label: "Prototype Pressure Technique",
      target: enemyStabilityTarget
    });
    expect(state.priorityHolder).toBe("enemy");
    expect(state.consecutivePasses).toBe(0);
    expect(state.playerCombatCharge).toBe(1);
    expect(state.costPaymentEvents[0]).toMatchObject({
      actor: "player",
      actionKind: "main_phase_pressure",
      actionLabel: "Prototype Pressure Technique",
      amount: 1,
      combatChargeBefore: 2,
      combatChargeAfter: 1,
      turnNumber: 1,
      phase: "firstMain",
      stackItemId: item.id,
      stackItemIndex: item.index
    });
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Prototype Pressure Technique as a prototype card action."
    });
    expect(state.actionLog.at(-1)?.text).not.toContain("Debug");
  });

  it("stores prototype action source card context on the stack and submission log", () => {
    const state = submitEncounterAction(createChargedMatch(), {
      kind: "main_phase_pressure",
      source: sparkfallSource
    });
    const item = state.stack[0];

    if (!item) {
      throw new Error("Expected a queued stack item.");
    }

    expect(item.action).toEqual({
      kind: "main_phase_pressure",
      actor: "player",
      label: "Prototype Pressure Technique",
      source: sparkfallSource,
      sourceLifecycle: "usedOnResolve",
      target: enemyStabilityTarget
    });
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Prototype Pressure Technique from Sparkfall."
    });
    expect(JSON.parse(JSON.stringify(state)).stack[0].action.source).toEqual(
      sparkfallSource
    );
    expect(JSON.parse(JSON.stringify(state)).costPaymentEvents).toEqual(
      state.costPaymentEvents
    );
  });

  it("passing priority alternates the holder", () => {
    const state = passEncounterPriority(createMatch(), "player");

    expect(state.priorityHolder).toBe("enemy");
    expect(state.consecutivePasses).toBe(1);
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "priority_passed",
      actor: "player"
    });
  });

  it("two passes with a non-empty stack resolve the top action and return priority", () => {
    const submitted = submitEncounterAction(createMatch(), {
      kind: "debug_pressure"
    });
    const enemyPass = passEncounterPriority(submitted, "enemy");
    const resolved = passEncounterPriority(enemyPass, "player");

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: { kind: "debug_pressure", actor: "player", target: enemyStabilityTarget }
    });
    expect(resolved.priorityHolder).toBe("player");
    expect(resolved.consecutivePasses).toBe(0);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.outcome.kind).toBe("inProgress");
    expect(resolved.actionLog.at(-1)).toMatchObject({
      kind: "action_resolved",
      actor: "player"
    });
  });

  it("resolves prototype main-phase pressure after two passes", () => {
    const submitted = submitEncounterAction(createChargedMatch(), {
      kind: "main_phase_pressure"
    });
    const enemyPass = passEncounterPriority(submitted, "enemy");
    const resolved = passEncounterPriority(enemyPass, "player");

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: {
        kind: "main_phase_pressure",
        actor: "player",
        target: enemyStabilityTarget
      }
    });
    expect(resolved.priorityHolder).toBe("player");
    expect(resolved.consecutivePasses).toBe(0);
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.outcome.kind).toBe("inProgress");
    expect(resolved.actionLog.at(-1)).toMatchObject({
      kind: "action_resolved",
      actor: "player",
      text: "Resolved Prototype Pressure Technique from Player: Enemy stability -1."
    });
  });

  it("resolves sourced prototype main-phase pressure without changing semantics", () => {
    const submitted = submitEncounterAction(createChargedMatch(), {
      kind: "main_phase_pressure",
      source: sparkfallSource
    });
    const enemyPass = passEncounterPriority(submitted, "enemy");
    const resolved = passEncounterPriority(enemyPass, "player");
    const lifecycleEvent = resolved.sourceLifecycleEvents[0];

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: {
        kind: "main_phase_pressure",
        actor: "player",
        source: sparkfallSource,
        sourceLifecycle: "usedOnResolve",
        target: enemyStabilityTarget
      }
    });
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.outcome.kind).toBe("inProgress");
    expect(resolved.actionLog.at(-1)).toMatchObject({
      kind: "action_resolved",
      actor: "player",
      text: "Resolved Prototype Pressure Technique from Player: Enemy stability -1."
    });
    expect(lifecycleEvent).toMatchObject({
      lifecycle: "usedOnResolve",
      source: sparkfallSource,
      actionKind: "main_phase_pressure",
      actionLabel: "Prototype Pressure Technique",
      actor: "player",
      turnNumber: 1,
      phase: "firstMain"
    });
    expect(JSON.parse(JSON.stringify(resolved)).sourceLifecycleEvents).toEqual(
      resolved.sourceLifecycleEvents
    );
  });

  it("submits and resolves Commander Rally from a Commander source", () => {
    const submitted = submitEncounterAction(createChargedMatch(), {
      kind: "commander_rally",
      source: commanderSource,
      sourceLifecycle: "usedOnResolve"
    });
    const item = submitted.stack[0];

    if (!item) {
      throw new Error("Expected a queued Commander Rally stack item.");
    }

    expect(item.action).toEqual({
      kind: "commander_rally",
      actor: "player",
      label: "Commander Rally",
      source: commanderSource,
      sourceLifecycle: "usedOnResolve",
      target: enemyStabilityTarget
    });
    expect(submitted.priorityHolder).toBe("enemy");
    expect(submitted.playerCombatCharge).toBe(1);
    expect(submitted.costPaymentEvents).toHaveLength(1);
    expect(submitted.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Commander Rally from Sparkcatch Apprentice."
    });

    const resolved = passEncounterPriority(
      passEncounterPriority(submitted, "enemy"),
      "player"
    );
    const lifecycleEvent = resolved.sourceLifecycleEvents[0];

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: {
        kind: "commander_rally",
        actor: "player",
        source: commanderSource,
        sourceLifecycle: "usedOnResolve",
        target: enemyStabilityTarget
      }
    });
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(4);
    expect(resolved.actionLog.at(-1)).toMatchObject({
      kind: "action_resolved",
      actor: "player",
      text: "Resolved Commander Rally from Player: Enemy stability -1."
    });
    expect(lifecycleEvent).toMatchObject({
      lifecycle: "usedOnResolve",
      source: commanderSource,
      actionKind: "commander_rally",
      actionLabel: "Commander Rally",
      actor: "player",
      turnNumber: 1,
      phase: "firstMain"
    });
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved);
  });

  it("submits and resolves Target Probe with an enemy board-card target", () => {
    const submitted = submitEncounterAction(createChargedMatch(1), {
      kind: "target_probe",
      target: enemyBoardCardTarget
    });
    const item = submitted.stack[0];

    if (!item) {
      throw new Error("Expected a queued Target Probe stack item.");
    }

    expect(item.action).toEqual({
      kind: "target_probe",
      actor: "player",
      label: "Target Probe",
      target: enemyBoardCardTarget
    });
    expect(submitted.priorityHolder).toBe("enemy");
    expect(submitted.playerCombatCharge).toBe(0);
    expect(submitted.costPaymentEvents[0]).toMatchObject({
      actor: "player",
      actionKind: "target_probe",
      actionLabel: "Target Probe",
      amount: 1,
      combatChargeBefore: 1,
      combatChargeAfter: 0,
      turnNumber: 1,
      phase: "firstMain",
      stackItemId: item.id,
      stackItemIndex: item.index
    });
    expect(submitted.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Target Probe targeting Ember Scraprunner (enemy ground r0 c3)."
    });

    const resolved = passEncounterPriority(
      passEncounterPriority(submitted, "enemy"),
      "player"
    );

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: {
        kind: "target_probe",
        actor: "player",
        target: enemyBoardCardTarget
      }
    });
    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(5);
    expect(resolved.sourceLifecycleEvents).toEqual([]);
    expect(resolved.boardCardEffectEvents).toEqual([
      {
        id: "charged-test-match:board-card-effect:0:charged-test-match:stack:0:target_probe",
        index: 0,
        actor: "player",
        actionKind: "target_probe",
        actionLabel: "Target Probe",
        effectType: "markBoardCardTarget",
        mark: "probed",
        target: enemyBoardCardTarget,
        turnNumber: 1,
        phase: "firstMain",
        stackItemId: item.id,
        stackItemIndex: item.index
      }
    ]);
    expect(resolved.actionLog.at(-1)).toMatchObject({
      kind: "action_resolved",
      actor: "player",
      text: "Resolved Target Probe from Player targeting Ember Scraprunner (enemy ground r0 c3): Marked target as probed."
    });
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved);
  });

  it("does not record source lifecycle events for debug or unsourced actions", () => {
    const resolvedDebug = passEncounterPriority(
      passEncounterPriority(
        submitEncounterAction(createMatch(), { kind: "debug_pressure" }),
        "enemy"
      ),
      "player"
    );
    const resolvedDebugWithSource = passEncounterPriority(
      passEncounterPriority(
        submitEncounterAction(createMatch(), {
          kind: "debug_pressure",
          source: sparkfallSource
        }),
        "enemy"
      ),
      "player"
    );
    const resolvedUnsourcedPrototype = passEncounterPriority(
      passEncounterPriority(
        submitEncounterAction(createChargedMatch(), { kind: "main_phase_pressure" }),
        "enemy"
      ),
      "player"
    );
    const resolvedSourceWithoutLifecycle = passEncounterPriority(
      passEncounterPriority(
        submitEncounterAction(createChargedMatch(), {
          kind: "main_phase_pressure",
          source: sparkfallSource,
          sourceLifecycle: "none"
        }),
        "enemy"
      ),
      "player"
    );

    expect(resolvedDebug.sourceLifecycleEvents).toEqual([]);
    expect(resolvedDebugWithSource.sourceLifecycleEvents).toEqual([]);
    expect(resolvedUnsourcedPrototype.sourceLifecycleEvents).toEqual([]);
    expect(resolvedSourceWithoutLifecycle.sourceLifecycleEvents).toEqual([]);
  });

  it("rejects explicit targets that disagree with the action contract", () => {
    expect(() =>
      submitEncounterAction(createMatch(), {
        kind: "main_phase_pressure",
        target: playerStabilityTarget
      })
    ).toThrow(/Prototype Pressure Technique must target Enemy Stability/);
    expect(() =>
      submitEncounterAction(createMatch(), {
        kind: "debug_noop",
        target: enemyStabilityTarget
      })
    ).toThrow(/Debug no-op does not use a target/);
    expect(() =>
      submitEncounterAction(createChargedMatch(1), {
        kind: "target_probe"
      })
    ).toThrow(/Target Probe requires Enemy board card/);
    expect(() =>
      submitEncounterAction(createChargedMatch(1), {
        kind: "target_probe",
        target: friendlyBoardCardTarget
      })
    ).toThrow(/Target Probe must target an enemy board card/);
  });

  it("blocks paid actions when Combat Charge is insufficient without mutating state", () => {
    const match = createMatch();

    expect(() => submitEncounterAction(match, { kind: "main_phase_pressure" })).toThrow(
      /Prototype Pressure Technique requires 1 Combat Charge, but Player has 0/
    );
    expect(() => submitEncounterAction(match, { kind: "commander_rally" })).toThrow(
      /Commander Rally requires 1 Combat Charge, but Player has 0/
    );
    expect(() =>
      submitEncounterAction(match, { kind: "target_probe", target: enemyBoardCardTarget })
    ).toThrow(/Target Probe requires 1 Combat Charge, but Player has 0/);
    expect(match).toEqual(createMatch());
  });

  it("charges the enemy actor from enemy Combat Charge for paid actions", () => {
    const submitted = submitEncounterAction(
      createEncounterMatch({
        matchId: "enemy-paid-match",
        seed: "enemy-paid-seed",
        activeActor: "enemy",
        enemyCombatCharge: 1
      }),
      { kind: "main_phase_pressure" }
    );

    expect(submitted.enemyCombatCharge).toBe(0);
    expect(submitted.playerCombatCharge).toBe(0);
    expect(submitted.stack[0]?.action.target).toEqual(playerStabilityTarget);
    expect(submitted.costPaymentEvents[0]).toMatchObject({
      actor: "enemy",
      actionKind: "main_phase_pressure",
      amount: 1,
      combatChargeBefore: 1,
      combatChargeAfter: 0
    });
  });

  it("resolves enemy pressure against the stored player Stability target", () => {
    const submitted = submitEncounterAction(
      createEncounterMatch({
        matchId: "enemy-action-match",
        seed: "enemy-action-seed",
        activeActor: "enemy"
      }),
      { kind: "debug_pressure" }
    );
    const resolved = passEncounterPriority(
      passEncounterPriority(submitted, "player"),
      "enemy"
    );

    expect(submitted.stack[0]?.action.target).toEqual(playerStabilityTarget);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: {
        kind: "debug_pressure",
        actor: "enemy",
        target: playerStabilityTarget
      }
    });
    expect(resolved.playerStability).toBe(4);
    expect(resolved.enemyStability).toBe(5);
  });

  it("two passes with an empty stack advances first main to combat", () => {
    const state = passEmptyPriorityWindow(createMatch());

    expect(state.phase).toBe("combat");
    expect(state.priorityHolder).toBeNull();
    expect(state.consecutivePasses).toBe(0);
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "phase_advanced",
      text: "Advanced to combat."
    });
  });

  it("records combat skirmishes and advances combat to second main", () => {
    const combat = passEmptyPriorityWindow(createMatch());
    const state = recordEncounterCombatSkirmish(combat, combatResult("playerA"));
    const skirmish = state.skirmishes[0];

    if (!skirmish) {
      throw new Error("Expected a recorded skirmish.");
    }

    expect(state.phase).toBe("secondMain");
    expect(state.priorityHolder).toBe("player");
    expect(state.enemyStability).toBe(4);
    expect(state.outcome.kind).toBe("inProgress");
    expect(skirmish).toMatchObject({
      id: "test-match:skirmish:0",
      turnNumber: 1,
      phase: "combat",
      winner: "playerA",
      seed: "combat-playerA",
      eventCount: 1,
      warningCodes: ["test-warning"],
      stabilityDelta: { player: 0, enemy: -1 },
      damageToPlayerA: 0,
      damageToPlayerB: 2
    });
  });

  it("advances second main to end, then end to the next turn with a new active actor", () => {
    const secondMain = reachSecondMain();
    const end = passEmptyPriorityWindow(secondMain);
    const nextTurn = passEmptyPriorityWindow(end);

    expect(end.phase).toBe("end");
    expect(end.turnNumber).toBe(1);
    expect(end.activeActor).toBe("player");
    expect(end.priorityHolder).toBe("player");
    expect(nextTurn.phase).toBe("firstMain");
    expect(nextTurn.turnNumber).toBe(2);
    expect(nextTurn.activeActor).toBe("enemy");
    expect(nextTurn.priorityHolder).toBe("enemy");
  });

  it("can advance a documented start phase into first main explicitly", () => {
    const start = createEncounterMatch({
      matchId: "start-match",
      seed: "start-seed",
      phase: "start"
    });
    const state = advanceEncounterPhase(start);

    expect(state.phase).toBe("firstMain");
    expect(state.activeActor).toBe("player");
    expect(state.priorityHolder).toBe("player");
  });

  it("guards prototype main-phase pressure outside main phases and wrong actors", () => {
    const endPhase = createEncounterMatch({
      matchId: "end-match",
      seed: "end-seed",
      phase: "end"
    });
    const combatPhase = createEncounterMatch({
      matchId: "combat-match",
      seed: "combat-seed",
      phase: "combat"
    });

    expect(() =>
      submitEncounterAction(endPhase, { kind: "main_phase_pressure" })
    ).toThrow(/Prototype Pressure Technique can only be queued during main phases/);
    expect(() => submitEncounterAction(endPhase, { kind: "commander_rally" })).toThrow(
      /Commander Rally can only be queued during main phases/
    );
    expect(() =>
      submitEncounterAction(combatPhase, { kind: "main_phase_pressure" })
    ).toThrow(/Cannot submit an action during combat/);
    expect(() =>
      submitEncounterAction(createMatch(), {
        actor: "enemy",
        kind: "main_phase_pressure"
      })
    ).toThrow(/Enemy cannot act while Player has priority/);
  });

  it("ends when stability reaches zero and otherwise keeps one skirmish incomplete", () => {
    const oneSkirmish = reachSecondMain();
    const lethalCombat = createEncounterMatch({
      matchId: "lethal-match",
      seed: "lethal-seed",
      phase: "combat",
      enemyStability: 1
    });
    const ended = recordEncounterCombatSkirmish(lethalCombat, combatResult("playerA"));

    expect(oneSkirmish.outcome.kind).toBe("inProgress");
    expect(oneSkirmish.phase).toBe("secondMain");
    expect(ended.phase).toBe("complete");
    expect(ended.priorityHolder).toBeNull();
    expect(ended.enemyStability).toBe(0);
    expect(ended.outcome).toEqual({
      kind: "playerWon",
      reason: "enemy_stability_zero"
    });
    expect(ended.actionLog.at(-1)).toMatchObject({
      kind: "match_completed"
    });
  });

  it("is deterministic and JSON serializable", () => {
    const runSequence = () => {
      const submitted = submitEncounterAction(createMatch(), {
        kind: "debug_pressure"
      });
      const resolved = passEncounterPriority(
        passEncounterPriority(submitted, "enemy"),
        "player"
      );
      const combat = passEmptyPriorityWindow(resolved);
      return recordEncounterCombatSkirmish(combat, combatResult("playerB"));
    };

    const first = runSequence();
    const second = runSequence();

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("keeps prototype main-phase actions deterministic and JSON serializable", () => {
    const runSequence = () => {
      const submitted = submitEncounterAction(createChargedMatch(), {
        kind: "main_phase_pressure"
      });
      const resolved = passEncounterPriority(
        passEncounterPriority(submitted, "enemy"),
        "player"
      );
      const combat = passEmptyPriorityWindow(resolved);
      return recordEncounterCombatSkirmish(combat, combatResult("playerA"));
    };

    const first = runSequence();
    const second = runSequence();

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
