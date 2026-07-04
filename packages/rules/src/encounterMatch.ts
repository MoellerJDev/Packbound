import type {
  CardDefId,
  CardInstanceId,
  CombatEvent,
  CombatWinner,
  SimulationWarning,
  Zone
} from "@packbound/shared";

import {
  canUseEncounterActionDuringPhase,
  combatChargeCostForEncounterAction,
  defaultTargetForEncounterAction,
  describeEncounterActionTarget,
  getEncounterActionDefinition,
  labelForEncounterAction,
  resolveEncounterActionEffects,
  sourceLifecycleForEncounterAction,
  validateEncounterActionTarget,
  type EncounterActionKind,
  type EncounterActionSourceLifecycle,
  type EncounterActionTarget,
  type EncounterBoardCardActionTarget,
  type EncounterBoardCardEffectMark
} from "./encounterActionContracts";

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

export type {
  EncounterActionKind,
  EncounterActionSourceLifecycle,
  EncounterActionTarget
};

export type EncounterActionSource = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardDefId: CardDefId;
  readonly cardName: string;
  readonly zone: Zone;
};

export type EncounterQueuedAction = {
  readonly kind: EncounterActionKind;
  readonly actor: EncounterActor;
  readonly label: string;
  readonly source?: EncounterActionSource;
  readonly sourceLifecycle?: EncounterActionSourceLifecycle;
  readonly target?: EncounterActionTarget;
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

export type EncounterSourceLifecycleEvent = {
  readonly id: string;
  readonly index: number;
  readonly lifecycle: Exclude<EncounterActionSourceLifecycle, "none">;
  readonly source: EncounterActionSource;
  readonly actionKind: EncounterActionKind;
  readonly actionLabel: string;
  readonly actor: EncounterActor;
  readonly turnNumber: number;
  readonly phase: EncounterPhase;
  readonly stackItemId: string;
  readonly stackItemIndex: number;
};

export type EncounterCostPaymentEvent = {
  readonly id: string;
  readonly index: number;
  readonly actor: EncounterActor;
  readonly actionKind: EncounterActionKind;
  readonly actionLabel: string;
  readonly amount: number;
  readonly combatChargeBefore: number;
  readonly combatChargeAfter: number;
  readonly turnNumber: number;
  readonly phase: EncounterPhase;
  readonly stackItemId: string;
  readonly stackItemIndex: number;
};

export type EncounterBoardCardEffectEvent = {
  readonly id: string;
  readonly index: number;
  readonly actor: EncounterActor;
  readonly actionKind: EncounterActionKind;
  readonly actionLabel: string;
  readonly effectType: "markBoardCardTarget";
  readonly mark: EncounterBoardCardEffectMark;
  readonly target: EncounterBoardCardActionTarget;
  readonly turnNumber: number;
  readonly phase: EncounterPhase;
  readonly stackItemId: string;
  readonly stackItemIndex: number;
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
  readonly costPaymentEvents: readonly EncounterCostPaymentEvent[];
  readonly sourceLifecycleEvents: readonly EncounterSourceLifecycleEvent[];
  readonly boardCardEffectEvents: readonly EncounterBoardCardEffectEvent[];
  readonly playerCombatCharge: number;
  readonly enemyCombatCharge: number;
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
  readonly playerCombatCharge?: number;
  readonly enemyCombatCharge?: number;
};

export type SubmitEncounterActionInput = {
  readonly actor?: EncounterActor;
  readonly kind?: EncounterActionKind;
  readonly label?: string;
  readonly source?: EncounterActionSource;
  readonly sourceLifecycle?: EncounterActionSourceLifecycle;
  readonly target?: EncounterActionTarget;
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
const DEFAULT_COMBAT_CHARGE = 0;

const opponentOf = (actor: EncounterActor): EncounterActor =>
  actor === "player" ? "enemy" : "player";

const actorLabel = (actor: EncounterActor): string =>
  actor === "player" ? "Player" : "Enemy";

const phaseAllowsPriority = (phase: EncounterPhase): boolean =>
  phase === "start" || phase === "firstMain" || phase === "secondMain" || phase === "end";

const assertCanSubmitActionKind = (
  state: EncounterMatchState,
  kind: EncounterActionKind,
  label: string
): void => {
  if (!canUseEncounterActionDuringPhase(kind, state.phase)) {
    throw new Error(`${label} can only be queued during main phases.`);
  }
};

const combatChargeForActor = (
  state: EncounterMatchState,
  actor: EncounterActor
): number => (actor === "player" ? state.playerCombatCharge : state.enemyCombatCharge);

const assertCanPayEncounterActionCosts = (
  state: EncounterMatchState,
  actor: EncounterActor,
  kind: EncounterActionKind,
  label: string
): void => {
  const cost = combatChargeCostForEncounterAction(kind);
  const available = combatChargeForActor(state, actor);

  if (available < cost) {
    throw new Error(
      `${label} requires ${cost} Combat Charge, but ${actorLabel(actor)} has ${available}.`
    );
  }
};

const costPaymentEventForSubmission = (
  state: EncounterMatchState,
  item: EncounterStackItem,
  amount: number
): EncounterCostPaymentEvent | undefined => {
  if (amount <= 0) {
    return undefined;
  }

  const combatChargeBefore = combatChargeForActor(state, item.action.actor);
  const index = state.costPaymentEvents.length;

  return {
    id: `${state.matchId}:cost-payment:${index}:${item.id}`,
    index,
    actor: item.action.actor,
    actionKind: item.action.kind,
    actionLabel: item.action.label,
    amount,
    combatChargeBefore,
    combatChargeAfter: combatChargeBefore - amount,
    turnNumber: state.turnNumber,
    phase: state.phase,
    stackItemId: item.id,
    stackItemIndex: item.index
  };
};

const actionSubmissionText = (action: EncounterQueuedAction): string => {
  const actor = actorLabel(action.actor);

  if (action.source) {
    return `${actor} queued ${action.label} from ${action.source.cardName}.`;
  }

  if (action.kind === "main_phase_pressure") {
    return `${actor} queued ${action.label} as a prototype card action.`;
  }

  if (action.kind === "commander_rally") {
    return `${actor} queued ${action.label} as a Commander action.`;
  }

  if (action.kind === "target_probe") {
    return `${actor} queued ${action.label} targeting ${describeEncounterActionTarget(
      action.target
    )}.`;
  }

  return `${actor} submitted ${action.label}.`;
};

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
  enemyStability = DEFAULT_STABILITY,
  playerCombatCharge = DEFAULT_COMBAT_CHARGE,
  enemyCombatCharge = DEFAULT_COMBAT_CHARGE
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
    costPaymentEvents: [],
    sourceLifecycleEvents: [],
    boardCardEffectEvents: [],
    playerCombatCharge,
    enemyCombatCharge,
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
  const label = labelForEncounterAction(kind, input.label);
  assertCanSubmitActionKind(state, kind, label);
  const sourceLifecycle =
    input.sourceLifecycle ??
    (input.source ? sourceLifecycleForEncounterAction(kind) : "none");
  const target = validateEncounterActionTarget(
    kind,
    actor,
    input.target ?? defaultTargetForEncounterAction(kind, actor)
  );
  assertCanPayEncounterActionCosts(state, actor, kind, label);

  const item: EncounterStackItem = {
    id: `${state.matchId}:stack:${state.nextActionIndex}:${kind}`,
    index: state.nextActionIndex,
    action: {
      kind,
      actor,
      label,
      ...(input.source ? { source: input.source } : {}),
      ...(sourceLifecycle !== "none" || input.sourceLifecycle ? { sourceLifecycle } : {}),
      ...(target ? { target } : {})
    }
  };
  const combatChargeCost = combatChargeCostForEncounterAction(kind);
  const costPaymentEvent = costPaymentEventForSubmission(state, item, combatChargeCost);
  const submitted: EncounterMatchState = {
    ...state,
    playerCombatCharge:
      actor === "player"
        ? state.playerCombatCharge - combatChargeCost
        : state.playerCombatCharge,
    enemyCombatCharge:
      actor === "enemy"
        ? state.enemyCombatCharge - combatChargeCost
        : state.enemyCombatCharge,
    costPaymentEvents: costPaymentEvent
      ? [...state.costPaymentEvents, costPaymentEvent]
      : state.costPaymentEvents,
    priorityHolder: opponentOf(actor),
    consecutivePasses: 0,
    stack: [...state.stack, item],
    nextActionIndex: state.nextActionIndex + 1
  };

  return appendLog(submitted, {
    kind: "action_submitted",
    text: actionSubmissionText(item.action),
    actor
  });
};

const actionEffectsForAction = (action: EncounterQueuedAction) =>
  resolveEncounterActionEffects({
    kind: action.kind,
    actor: action.actor,
    ...(action.target ? { target: action.target } : {})
  });

const stabilityDeltaText = (delta: {
  readonly player: number;
  readonly enemy: number;
}): string | undefined => {
  if (delta.enemy < 0) {
    return `Enemy stability ${delta.enemy}.`;
  }
  if (delta.player < 0) {
    return `Player stability ${delta.player}.`;
  }

  return undefined;
};

const boardCardEffectText = (mark: EncounterBoardCardEffectMark): string => {
  switch (mark) {
    case "probed":
      return "Marked target as probed.";
  }
};

const actionEffectSummaryText = (effects: {
  readonly playerStabilityDelta: number;
  readonly enemyStabilityDelta: number;
  readonly boardCardEffects: readonly { readonly mark: EncounterBoardCardEffectMark }[];
}): string => {
  const parts = [
    stabilityDeltaText({
      player: effects.playerStabilityDelta,
      enemy: effects.enemyStabilityDelta
    }),
    ...effects.boardCardEffects.map((effect) => boardCardEffectText(effect.mark))
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" ") : "No effect.";
};

const actionResolutionText = (
  item: EncounterStackItem,
  effects: {
    readonly playerStabilityDelta: number;
    readonly enemyStabilityDelta: number;
    readonly boardCardEffects: readonly { readonly mark: EncounterBoardCardEffectMark }[];
  }
): string => {
  const base = `Resolved ${item.action.label} from ${actorLabel(item.action.actor)}`;
  const definition = getEncounterActionDefinition(item.action.kind);
  const targetText =
    item.action.target && item.action.target.type !== "stability"
      ? ` targeting ${describeEncounterActionTarget(item.action.target)}`
      : "";

  if (definition.includeEffectSummaryInResolutionLog) {
    return `${base}${targetText}: ${actionEffectSummaryText(effects)}`;
  }

  return `${base}.`;
};

const copyBoardCardTarget = (
  target: EncounterBoardCardActionTarget
): EncounterBoardCardActionTarget => ({
  type: "boardCard",
  side: target.side,
  cardInstanceId: target.cardInstanceId,
  defId: target.defId,
  ownerId: target.ownerId,
  position: { ...target.position },
  label: target.label
});

const sourceLifecycleEventForResolution = (
  state: EncounterMatchState,
  item: EncounterStackItem
): EncounterSourceLifecycleEvent | undefined => {
  if (!item.action.source || item.action.sourceLifecycle !== "usedOnResolve") {
    return undefined;
  }

  const index = state.sourceLifecycleEvents.length;
  return {
    id: `${state.matchId}:source-lifecycle:${index}:${item.id}`,
    index,
    lifecycle: "usedOnResolve",
    source: item.action.source,
    actionKind: item.action.kind,
    actionLabel: item.action.label,
    actor: item.action.actor,
    turnNumber: state.turnNumber,
    phase: state.phase,
    stackItemId: item.id,
    stackItemIndex: item.index
  };
};

const boardCardEffectEventsForResolution = (
  state: EncounterMatchState,
  item: EncounterStackItem,
  effects: ReturnType<typeof actionEffectsForAction>
): readonly EncounterBoardCardEffectEvent[] =>
  effects.boardCardEffects.map((effect, offset) => {
    const index = state.boardCardEffectEvents.length + offset;
    return {
      id: `${state.matchId}:board-card-effect:${index}:${item.id}`,
      index,
      actor: item.action.actor,
      actionKind: item.action.kind,
      actionLabel: item.action.label,
      effectType: effect.effectType,
      mark: effect.mark,
      target: copyBoardCardTarget(effect.target),
      turnNumber: state.turnNumber,
      phase: state.phase,
      stackItemId: item.id,
      stackItemIndex: item.index
    };
  });

const resolveTopStackItem = (state: EncounterMatchState): EncounterMatchState => {
  const item = state.stack.at(-1);
  if (!item) {
    return state;
  }

  const nextStack = state.stack.slice(0, -1);
  const actionEffects = actionEffectsForAction(item.action);
  const sourceLifecycleEvent = sourceLifecycleEventForResolution(state, item);
  const boardCardEffectEvents = boardCardEffectEventsForResolution(
    state,
    item,
    actionEffects
  );
  const resolved: EncounterMatchState = {
    ...state,
    stack: nextStack,
    sourceLifecycleEvents: sourceLifecycleEvent
      ? [...state.sourceLifecycleEvents, sourceLifecycleEvent]
      : state.sourceLifecycleEvents,
    boardCardEffectEvents:
      boardCardEffectEvents.length > 0
        ? [...state.boardCardEffectEvents, ...boardCardEffectEvents]
        : state.boardCardEffectEvents,
    playerStability: state.playerStability + actionEffects.playerStabilityDelta,
    enemyStability: state.enemyStability + actionEffects.enemyStabilityDelta,
    priorityHolder: state.activeActor,
    consecutivePasses: 0,
    lastResolvedAction: item
  };

  return appendCompletionLog(
    appendLog(withOutcome(resolved), {
      kind: "action_resolved",
      text: actionResolutionText(item, actionEffects),
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
