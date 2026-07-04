import { describe, expect, it } from "vitest";

import { asCardDefId, asCardInstanceId } from "@packbound/shared";

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
      label: "Debug pressure"
    });
    expect(state.priorityHolder).toBe("enemy");
    expect(state.consecutivePasses).toBe(0);
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player"
    });
  });

  it("submits a prototype main-phase pressure action during first main", () => {
    const state = submitEncounterAction(createMatch(), {
      kind: "main_phase_pressure"
    });
    const item = state.stack[0];

    if (!item) {
      throw new Error("Expected a queued stack item.");
    }

    expect(item.action).toEqual({
      kind: "main_phase_pressure",
      actor: "player",
      label: "Prototype Pressure Technique"
    });
    expect(state.priorityHolder).toBe("enemy");
    expect(state.consecutivePasses).toBe(0);
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Prototype Pressure Technique as a prototype card action."
    });
    expect(state.actionLog.at(-1)?.text).not.toContain("Debug");
  });

  it("stores prototype action source card context on the stack and submission log", () => {
    const state = submitEncounterAction(createMatch(), {
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
      sourceLifecycle: "usedOnResolve"
    });
    expect(state.actionLog.at(-1)).toMatchObject({
      kind: "action_submitted",
      actor: "player",
      text: "Player queued Prototype Pressure Technique from Sparkfall."
    });
    expect(JSON.parse(JSON.stringify(state)).stack[0].action.source).toEqual(
      sparkfallSource
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
      action: { kind: "debug_pressure", actor: "player" }
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
    const submitted = submitEncounterAction(createMatch(), {
      kind: "main_phase_pressure"
    });
    const enemyPass = passEncounterPriority(submitted, "enemy");
    const resolved = passEncounterPriority(enemyPass, "player");

    expect(resolved.stack).toEqual([]);
    expect(resolved.lastResolvedAction).toMatchObject({
      action: { kind: "main_phase_pressure", actor: "player" }
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
    const submitted = submitEncounterAction(createMatch(), {
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
        sourceLifecycle: "usedOnResolve"
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
    const submitted = submitEncounterAction(createMatch(), {
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
      sourceLifecycle: "usedOnResolve"
    });
    expect(submitted.priorityHolder).toBe("enemy");
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
        sourceLifecycle: "usedOnResolve"
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
        submitEncounterAction(createMatch(), { kind: "main_phase_pressure" }),
        "enemy"
      ),
      "player"
    );
    const resolvedSourceWithoutLifecycle = passEncounterPriority(
      passEncounterPriority(
        submitEncounterAction(createMatch(), {
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
      const submitted = submitEncounterAction(createMatch(), {
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
