import type { CombatEvent, CombatWinner, SimulationWarning } from "@packbound/shared";

export type EncounterActor = "player" | "enemy";

export type EncounterPhase =
  "start" | "firstMain" | "combat" | "secondMain" | "end" | "complete";

export type EncounterOutcomeKind = "inProgress" | "playerWon" | "enemyWon" | "draw";

export type EncounterOutcomeReason =
  "enemy_stability_zero" | "player_stability_zero" | "both_stability_zero";

export type EncounterOutcome = {
  readonly kind: EncounterOutcomeKind;
  readonly reason: EncounterOutcomeReason | null;
};

export type EncounterActionKind = "debug_noop" | "debug_pressure";

export type EncounterQueuedAction = {
  readonly kind: EncounterActionKind;
  readonly actor: EncounterActor;
  readonly label: string;
};

export type EncounterStackItem = {
  readonly id: string;
  readonly index: number;
  readonly action: EncounterQueuedAction;
};

export type EncounterSkirmishRecord = {
  readonly id: string;
  readonly turnNumber: number;
  readonly phase: "combat";
  readonly winner: CombatWinner;
  readonly seed: string | null;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly stabilityDelta: {
    readonly player: number;
    readonly enemy: number;
  };
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
};

export type EncounterLogKind =
  | "match_started"
  | "action_submitted"
  | "priority_passed"
  | "action_resolved"
  | "phase_advanced"
  | "combat_skirmish_recorded"
  | "match_completed";

export type EncounterActionLogEntry = {
  readonly id: string;
  readonly index: number;
  readonly kind: EncounterLogKind;
  readonly text: string;
  readonly phase: EncounterPhase;
  readonly turnNumber: number;
  readonly stackDepth: number;
  readonly priorityHolder: EncounterActor | null;
  readonly actor: EncounterActor | null;
};

export type EncounterMatchState = {
  readonly matchId: string;
  readonly seed: string;
  readonly turnNumber: number;
  readonly phase: EncounterPhase;
  readonly activeActor: EncounterActor;
  readonly priorityHolder: EncounterActor | null;
  readonly consecutivePasses: number;
  readonly stack: readonly EncounterStackItem[];
  readonly actionLog: readonly EncounterActionLogEntry[];
  readonly skirmishes: readonly EncounterSkirmishRecord[];
  readonly playerStability: number;
  readonly enemyStability: number;
  readonly outcome: EncounterOutcome;
  readonly lastResolvedAction: EncounterStackItem | null;
  readonly nextActionIndex: number;
};

export type CreateEncounterMatchInput = {
  readonly matchId: string;
  readonly seed: string;
  readonly turnNumber?: number;
  readonly phase?: EncounterPhase;
  readonly activeActor?: EncounterActor;
  readonly playerStability?: number;
  readonly enemyStability?: number;
};

export type SubmitEncounterActionInput = {
  readonly actor?: EncounterActor;
  readonly kind?: EncounterActionKind;
  readonly label?: string;
};

export type EncounterCombatResultLike = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
  readonly seed?: string;
};

const DEFAULT_STABILITY = 5;

const opponentOf = (actor: EncounterActor): EncounterActor =>
  actor === "player" ? "enemy" : "player";

const actorLabel = (actor: EncounterActor): string =>
  actor === "player" ? "Player" : "Enemy";

const actionLabel = (kind: EncounterActionKind, label?: string): string => {
  if (label) {
    return label;
  }

  switch (kind) {
    case "debug_noop":
      return "Debug no-op";
    case "debug_pressure":
      return "Debug pressure";
  }
};

const phaseAllowsPriority = (phase: EncounterPhase): boolean =>
  phase === "start" || phase === "firstMain" || phase === "secondMain" || phase === "end";

const appendLog = (
  state: EncounterMatchState,
  input: {
    readonly kind: EncounterLogKind;
    readonly text: string;
    readonly actor?: EncounterActor;
  }
): EncounterMatchState => {
  const index = state.actionLog.length;
  const entry: EncounterActionLogEntry = {
    id: `${state.matchId}:log:${index}:${input.kind}`,
    index,
    kind: input.kind,
    text: input.text,
    phase: state.phase,
    turnNumber: state.turnNumber,
    stackDepth: state.stack.length,
    priorityHolder: state.priorityHolder,
    actor: input.actor ?? null
  };

  return {
    ...state,
    actionLog: [...state.actionLog, entry]
  };
};

const withOutcome = (state: EncounterMatchState): EncounterMatchState => {
  const playerOut = state.playerStability <= 0;
  const enemyOut = state.enemyStability <= 0;

  if (!playerOut && !enemyOut) {
    return {
      ...state,
      outcome: { kind: "inProgress", reason: null }
    };
  }

  const outcome: EncounterOutcome = playerOut
    ? enemyOut
      ? { kind: "draw", reason: "both_stability_zero" }
      : { kind: "enemyWon", reason: "player_stability_zero" }
    : { kind: "playerWon", reason: "enemy_stability_zero" };

  const completed = {
    ...state,
    phase: "complete" as const,
    priorityHolder: null,
    consecutivePasses: 0,
    outcome
  };

  return completed;
};

const appendCompletionLog = (state: EncounterMatchState): EncounterMatchState => {
  if (state.outcome.kind === "inProgress") {
    return state;
  }

  const hasCompletionLog = state.actionLog.some(
    (entry) => entry.kind === "match_completed"
  );
  if (hasCompletionLog) {
    return state;
  }

  return appendLog(state, {
    kind: "match_completed",
    text: `Match complete: ${state.outcome.kind}.`
  });
};

export const createEncounterMatch = ({
  matchId,
  seed,
  turnNumber = 1,
  phase = "firstMain",
  activeActor = "player",
  playerStability = DEFAULT_STABILITY,
  enemyStability = DEFAULT_STABILITY
}: CreateEncounterMatchInput): EncounterMatchState => {
  const base: EncounterMatchState = {
    matchId,
    seed,
    turnNumber,
    phase,
    activeActor,
    priorityHolder: phaseAllowsPriority(phase) ? activeActor : null,
    consecutivePasses: 0,
    stack: [],
    actionLog: [],
    skirmishes: [],
    playerStability,
    enemyStability,
    outcome: { kind: "inProgress", reason: null },
    lastResolvedAction: null,
    nextActionIndex: 0
  };

  return appendCompletionLog(
    appendLog(withOutcome(base), {
      kind: "match_started",
      text: `Match started with ${actorLabel(activeActor)} active.`
    })
  );
};

export const isEncounterComplete = (state: EncounterMatchState): boolean =>
  state.outcome.kind !== "inProgress" || state.phase === "complete";

export const submitEncounterAction = (
  state: EncounterMatchState,
  input: SubmitEncounterActionInput = {}
): EncounterMatchState => {
  if (isEncounterComplete(state)) {
    return state;
  }

  if (!state.priorityHolder) {
    throw new Error(
      `Cannot submit an action during ${state.phase}; no actor has priority.`
    );
  }

  const actor = input.actor ?? state.priorityHolder;
  if (actor !== state.priorityHolder) {
    throw new Error(
      `${actorLabel(actor)} cannot act while ${actorLabel(state.priorityHolder)} has priority.`
    );
  }

  const kind = input.kind ?? "debug_noop";
  const item: EncounterStackItem = {
    id: `${state.matchId}:stack:${state.nextActionIndex}:${kind}`,
    index: state.nextActionIndex,
    action: {
      kind,
      actor,
      label: actionLabel(kind, input.label)
    }
  };
  const submitted: EncounterMatchState = {
    ...state,
    priorityHolder: opponentOf(actor),
    consecutivePasses: 0,
    stack: [...state.stack, item],
    nextActionIndex: state.nextActionIndex + 1
  };

  return appendLog(submitted, {
    kind: "action_submitted",
    text: `${actorLabel(actor)} submitted ${item.action.label}.`,
    actor
  });
};

const resolveTopStackItem = (state: EncounterMatchState): EncounterMatchState => {
  const item = state.stack.at(-1);
  if (!item) {
    return state;
  }

  const nextStack = state.stack.slice(0, -1);
  const pressureDelta =
    item.action.kind === "debug_pressure"
      ? item.action.actor === "player"
        ? { player: 0, enemy: -1 }
        : { player: -1, enemy: 0 }
      : { player: 0, enemy: 0 };
  const resolved: EncounterMatchState = {
    ...state,
    stack: nextStack,
    playerStability: state.playerStability + pressureDelta.player,
    enemyStability: state.enemyStability + pressureDelta.enemy,
    priorityHolder: state.activeActor,
    consecutivePasses: 0,
    lastResolvedAction: item
  };

  return appendCompletionLog(
    appendLog(withOutcome(resolved), {
      kind: "action_resolved",
      text: `Resolved ${item.action.label} from ${actorLabel(item.action.actor)}.`,
      actor: item.action.actor
    })
  );
};

export const advanceEncounterPhase = (
  state: EncounterMatchState
): EncounterMatchState => {
  if (isEncounterComplete(state)) {
    return state;
  }

  if (state.stack.length > 0) {
    throw new Error("Cannot advance an encounter phase while the stack is not empty.");
  }

  switch (state.phase) {
    case "start": {
      const advanced: EncounterMatchState = {
        ...state,
        phase: "firstMain",
        priorityHolder: state.activeActor,
        consecutivePasses: 0
      };
      return appendLog(advanced, {
        kind: "phase_advanced",
        text: "Advanced to first main."
      });
    }
    case "firstMain": {
      const advanced: EncounterMatchState = {
        ...state,
        phase: "combat",
        priorityHolder: null,
        consecutivePasses: 0
      };
      return appendLog(advanced, {
        kind: "phase_advanced",
        text: "Advanced to combat."
      });
    }
    case "combat":
      return state;
    case "secondMain": {
      const advanced: EncounterMatchState = {
        ...state,
        phase: "end",
        priorityHolder: state.activeActor,
        consecutivePasses: 0
      };
      return appendLog(advanced, {
        kind: "phase_advanced",
        text: "Advanced to end."
      });
    }
    case "end": {
      const nextActiveActor = opponentOf(state.activeActor);
      const advanced: EncounterMatchState = {
        ...state,
        turnNumber: state.turnNumber + 1,
        phase: "firstMain",
        activeActor: nextActiveActor,
        priorityHolder: nextActiveActor,
        consecutivePasses: 0
      };
      return appendLog(advanced, {
        kind: "phase_advanced",
        text: `Advanced to turn ${advanced.turnNumber} first main.`
      });
    }
    case "complete":
      return state;
  }
};

export const passEncounterPriority = (
  state: EncounterMatchState,
  actor = state.priorityHolder
): EncounterMatchState => {
  if (isEncounterComplete(state)) {
    return state;
  }

  if (!actor || !state.priorityHolder) {
    throw new Error(`Cannot pass priority during ${state.phase}; no actor has priority.`);
  }

  if (actor !== state.priorityHolder) {
    throw new Error(
      `${actorLabel(actor)} cannot pass while ${actorLabel(state.priorityHolder)} has priority.`
    );
  }

  const passed: EncounterMatchState = {
    ...state,
    priorityHolder: opponentOf(actor),
    consecutivePasses: state.consecutivePasses + 1
  };
  const logged = appendLog(passed, {
    kind: "priority_passed",
    text: `${actorLabel(actor)} passed priority.`,
    actor
  });

  if (logged.consecutivePasses < 2) {
    return logged;
  }

  return logged.stack.length > 0
    ? resolveTopStackItem(logged)
    : advanceEncounterPhase(logged);
};

export const recordEncounterCombatSkirmish = (
  state: EncounterMatchState,
  combatResult: EncounterCombatResultLike
): EncounterMatchState => {
  if (isEncounterComplete(state)) {
    return state;
  }

  if (state.phase !== "combat") {
    throw new Error(`Cannot record a combat skirmish during ${state.phase}.`);
  }

  const stabilityDelta =
    combatResult.winner === "playerA"
      ? { player: 0, enemy: -1 }
      : combatResult.winner === "playerB"
        ? { player: -1, enemy: 0 }
        : { player: 0, enemy: 0 };
  const record: EncounterSkirmishRecord = {
    id: `${state.matchId}:skirmish:${state.skirmishes.length}`,
    turnNumber: state.turnNumber,
    phase: "combat",
    winner: combatResult.winner,
    seed: combatResult.seed ?? null,
    eventCount: combatResult.events.length,
    warningCodes: combatResult.warnings.map((warning) => warning.code),
    stabilityDelta,
    damageToPlayerA: combatResult.damageToPlayerA,
    damageToPlayerB: combatResult.damageToPlayerB
  };
  const recorded: EncounterMatchState = {
    ...state,
    phase: "secondMain",
    priorityHolder: state.activeActor,
    consecutivePasses: 0,
    skirmishes: [...state.skirmishes, record],
    playerStability: state.playerStability + stabilityDelta.player,
    enemyStability: state.enemyStability + stabilityDelta.enemy
  };

  return appendCompletionLog(
    appendLog(withOutcome(recorded), {
      kind: "combat_skirmish_recorded",
      text: `Recorded skirmish ${state.skirmishes.length + 1}: ${combatResult.winner}.`
    })
  );
};
