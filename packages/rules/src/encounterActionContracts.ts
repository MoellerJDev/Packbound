import type {
  BoardPosition,
  CardDefId,
  CardInstanceId,
  PlayerId,
  PlayerSide
} from "@packbound/shared";

export const ENCOUNTER_ACTION_KINDS = [
  "debug_noop",
  "debug_pressure",
  "main_phase_pressure",
  "commander_rally",
  "target_probe"
] as const;

export type EncounterActionKind = (typeof ENCOUNTER_ACTION_KINDS)[number];

export type EncounterActionActor = "player" | "enemy";

export type EncounterActionPhase =
  "start" | "firstMain" | "combat" | "secondMain" | "end" | "complete";

export type EncounterActionTiming = "anyPriority" | "mainPhase";

export type EncounterActionSourceLifecycle = "none" | "usedOnResolve";

export type EncounterActionTargetRequirement =
  | {
      readonly type: "none";
    }
  | {
      readonly type: "opponentStability";
    }
  | {
      readonly type: "selfStability";
    }
  | {
      readonly type: "enemyBoardCard";
    }
  | {
      readonly type: "friendlyBoardCard";
    }
  | {
      readonly type: "anyBoardCard";
    }
  | {
      readonly type: "boardCell";
    };

export type EncounterStabilityActionTarget = {
  readonly type: "stability";
  readonly actor: EncounterActionActor;
  readonly label: string;
};

export type EncounterBoardCardActionTarget = {
  readonly type: "boardCard";
  readonly side: PlayerSide;
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly position: BoardPosition;
  readonly label: string;
};

export type EncounterBoardCellActionTarget = {
  readonly type: "boardCell";
  readonly side: PlayerSide;
  readonly position: BoardPosition;
  readonly label: string;
};

export type EncounterActionTarget =
  | EncounterStabilityActionTarget
  | EncounterBoardCardActionTarget
  | EncounterBoardCellActionTarget;

export type EncounterActionCost =
  | {
      readonly type: "none";
    }
  | {
      readonly type: "combatCharge";
      readonly amount: number;
    }
  | {
      readonly type: "sourceUsedOnResolve";
    };

export type EncounterBoardCardEffectMark = "probed";

export type EncounterActionEffect =
  | {
      readonly type: "none";
    }
  | {
      readonly type: "targetStabilityDelta";
      readonly amount: number;
    }
  | {
      readonly type: "markBoardCardTarget";
      readonly mark: EncounterBoardCardEffectMark;
    };

export type EncounterActionDefinition = {
  readonly kind: EncounterActionKind;
  readonly label: string;
  readonly timing: EncounterActionTiming;
  readonly targetRequirement: EncounterActionTargetRequirement;
  readonly costs: readonly EncounterActionCost[];
  readonly effects: readonly EncounterActionEffect[];
  readonly sourceLifecycleOnResolve: EncounterActionSourceLifecycle;
  readonly includeEffectSummaryInResolutionLog: boolean;
};

export type EncounterActionEffectInput = {
  readonly kind: EncounterActionKind;
  readonly actor: EncounterActionActor;
  readonly target?: EncounterActionTarget;
};

export type EncounterBoardCardEffectResult = {
  readonly effectType: "markBoardCardTarget";
  readonly mark: EncounterBoardCardEffectMark;
  readonly target: EncounterBoardCardActionTarget;
};

export type EncounterActionEffectResult = {
  readonly playerStabilityDelta: number;
  readonly enemyStabilityDelta: number;
  readonly boardCardEffects: readonly EncounterBoardCardEffectResult[];
};

const NO_COST = [{ type: "none" }] as const;
const NO_EFFECT = [{ type: "none" }] as const;
const NO_TARGET = { type: "none" } as const;
const OPPONENT_STABILITY_TARGET = { type: "opponentStability" } as const;
const ENEMY_BOARD_CARD_TARGET = { type: "enemyBoardCard" } as const;
const COMBAT_CHARGE_ONE = { type: "combatCharge", amount: 1 } as const;
const COMBAT_CHARGE_ONE_ONLY = [COMBAT_CHARGE_ONE] as const;
const TARGET_STABILITY_MINUS_ONE = [
  { type: "targetStabilityDelta", amount: -1 }
] as const;
const MARK_TARGET_PROBED = [{ type: "markBoardCardTarget", mark: "probed" }] as const;
const COMBAT_CHARGE_ONE_AND_SOURCE_USED_ON_RESOLVE = [
  COMBAT_CHARGE_ONE,
  { type: "sourceUsedOnResolve" }
] as const;

const ENCOUNTER_ACTION_DEFINITIONS_BY_KIND = {
  debug_noop: {
    kind: "debug_noop",
    label: "Debug no-op",
    timing: "anyPriority",
    targetRequirement: NO_TARGET,
    costs: NO_COST,
    effects: NO_EFFECT,
    sourceLifecycleOnResolve: "none",
    includeEffectSummaryInResolutionLog: false
  },
  debug_pressure: {
    kind: "debug_pressure",
    label: "Debug pressure",
    timing: "anyPriority",
    targetRequirement: OPPONENT_STABILITY_TARGET,
    costs: NO_COST,
    effects: TARGET_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "none",
    includeEffectSummaryInResolutionLog: false
  },
  main_phase_pressure: {
    kind: "main_phase_pressure",
    label: "Prototype Pressure Technique",
    timing: "mainPhase",
    targetRequirement: OPPONENT_STABILITY_TARGET,
    costs: COMBAT_CHARGE_ONE_AND_SOURCE_USED_ON_RESOLVE,
    effects: TARGET_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "usedOnResolve",
    includeEffectSummaryInResolutionLog: true
  },
  commander_rally: {
    kind: "commander_rally",
    label: "Commander Rally",
    timing: "mainPhase",
    targetRequirement: OPPONENT_STABILITY_TARGET,
    costs: COMBAT_CHARGE_ONE_AND_SOURCE_USED_ON_RESOLVE,
    effects: TARGET_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "usedOnResolve",
    includeEffectSummaryInResolutionLog: true
  },
  target_probe: {
    kind: "target_probe",
    label: "Target Probe",
    timing: "mainPhase",
    targetRequirement: ENEMY_BOARD_CARD_TARGET,
    costs: COMBAT_CHARGE_ONE_ONLY,
    effects: MARK_TARGET_PROBED,
    sourceLifecycleOnResolve: "none",
    includeEffectSummaryInResolutionLog: true
  }
} as const satisfies Record<EncounterActionKind, EncounterActionDefinition>;

export const getEncounterActionDefinition = (
  kind: EncounterActionKind
): EncounterActionDefinition => ENCOUNTER_ACTION_DEFINITIONS_BY_KIND[kind];

export const getEncounterActionDefinitions = (): readonly EncounterActionDefinition[] =>
  ENCOUNTER_ACTION_KINDS.map((kind) => getEncounterActionDefinition(kind));

export const labelForEncounterAction = (
  kind: EncounterActionKind,
  override?: string
): string => override ?? getEncounterActionDefinition(kind).label;

const actorLabel = (actor: EncounterActionActor): string =>
  actor === "player" ? "Player" : "Enemy";

const opponentOf = (actor: EncounterActionActor): EncounterActionActor =>
  actor === "player" ? "enemy" : "player";

const friendlySideForActor = (actor: EncounterActionActor): PlayerSide =>
  actor === "player" ? "playerA" : "playerB";

const enemySideForActor = (actor: EncounterActionActor): PlayerSide =>
  actor === "player" ? "playerB" : "playerA";

const stabilityTargetForActor = (actor: EncounterActionActor): EncounterActionTarget => ({
  type: "stability",
  actor,
  label: `${actorLabel(actor)} Stability`
});

const phaseAllowsPriority = (phase: EncounterActionPhase): boolean =>
  phase === "start" || phase === "firstMain" || phase === "secondMain" || phase === "end";

export const canUseEncounterActionDuringPhase = (
  kind: EncounterActionKind,
  phase: EncounterActionPhase
): boolean => {
  const definition = getEncounterActionDefinition(kind);

  switch (definition.timing) {
    case "anyPriority":
      return phaseAllowsPriority(phase);
    case "mainPhase":
      return phase === "firstMain" || phase === "secondMain";
  }
};

export const sourceLifecycleForEncounterAction = (
  kind: EncounterActionKind
): EncounterActionSourceLifecycle =>
  getEncounterActionDefinition(kind).sourceLifecycleOnResolve;

export const encounterActionConsumesSourceOnResolve = (
  kind: EncounterActionKind
): boolean => sourceLifecycleForEncounterAction(kind) === "usedOnResolve";

export const combatChargeCostForEncounterAction = (kind: EncounterActionKind): number =>
  getEncounterActionDefinition(kind).costs.reduce(
    (total, cost) => total + (cost.type === "combatCharge" ? cost.amount : 0),
    0
  );

export const defaultTargetForEncounterAction = (
  kind: EncounterActionKind,
  actor: EncounterActionActor
): EncounterActionTarget | undefined => {
  const definition = getEncounterActionDefinition(kind);

  switch (definition.targetRequirement.type) {
    case "none":
      return undefined;
    case "opponentStability":
      return stabilityTargetForActor(opponentOf(actor));
    case "selfStability":
      return stabilityTargetForActor(actor);
    case "enemyBoardCard":
    case "friendlyBoardCard":
    case "anyBoardCard":
    case "boardCell":
      return undefined;
  }
};

export const describeEncounterActionTargetRequirement = (
  kind: EncounterActionKind
): string => {
  const definition = getEncounterActionDefinition(kind);

  switch (definition.targetRequirement.type) {
    case "none":
      return "None";
    case "opponentStability":
      return "Opponent Stability";
    case "selfStability":
      return "Self Stability";
    case "enemyBoardCard":
      return "Enemy board card";
    case "friendlyBoardCard":
      return "Friendly board card";
    case "anyBoardCard":
      return "Any board card";
    case "boardCell":
      return "Board cell";
  }
};

export const describeEncounterActionTarget = (
  target: EncounterActionTarget | undefined
): string => target?.label ?? "None";

const copyBoardPosition = (position: BoardPosition): BoardPosition => ({
  row: position.row,
  col: position.col,
  layer: position.layer
});

const copyBoardCardTarget = (
  target: EncounterBoardCardActionTarget
): EncounterBoardCardActionTarget => ({
  type: "boardCard",
  side: target.side,
  cardInstanceId: target.cardInstanceId,
  defId: target.defId,
  ownerId: target.ownerId,
  position: copyBoardPosition(target.position),
  label: target.label
});

const copyBoardCellTarget = (
  target: EncounterBoardCellActionTarget
): EncounterBoardCellActionTarget => ({
  type: "boardCell",
  side: target.side,
  position: copyBoardPosition(target.position),
  label: target.label
});

export const validateEncounterActionTarget = (
  kind: EncounterActionKind,
  actor: EncounterActionActor,
  target: EncounterActionTarget | undefined
): EncounterActionTarget | undefined => {
  const definition = getEncounterActionDefinition(kind);
  const label = definition.label;

  switch (definition.targetRequirement.type) {
    case "none":
      if (target) {
        throw new Error(`${label} does not use a target.`);
      }
      return undefined;
    case "opponentStability":
    case "selfStability": {
      const expected = defaultTargetForEncounterAction(kind, actor);
      if (!expected || expected.type !== "stability") {
        throw new Error(`${label} has an invalid Stability target contract.`);
      }
      if (!target) {
        throw new Error(`${label} requires ${expected.label}.`);
      }
      if (target.type !== "stability" || target.actor !== expected.actor) {
        throw new Error(`${label} must target ${expected.label}.`);
      }
      return expected;
    }
    case "enemyBoardCard":
      if (!target) {
        throw new Error(
          `${label} requires ${describeEncounterActionTargetRequirement(kind)}.`
        );
      }
      if (target.type !== "boardCard") {
        throw new Error(`${label} requires an enemy board card target.`);
      }
      if (target.side !== enemySideForActor(actor)) {
        throw new Error(`${label} must target an enemy board card.`);
      }
      return copyBoardCardTarget(target);
    case "friendlyBoardCard":
      if (!target) {
        throw new Error(
          `${label} requires ${describeEncounterActionTargetRequirement(kind)}.`
        );
      }
      if (target.type !== "boardCard") {
        throw new Error(`${label} requires a friendly board card target.`);
      }
      if (target.side !== friendlySideForActor(actor)) {
        throw new Error(`${label} must target a friendly board card.`);
      }
      return copyBoardCardTarget(target);
    case "anyBoardCard":
      if (!target) {
        throw new Error(
          `${label} requires ${describeEncounterActionTargetRequirement(kind)}.`
        );
      }
      if (target.type !== "boardCard") {
        throw new Error(`${label} requires a board card target.`);
      }
      return copyBoardCardTarget(target);
    case "boardCell":
      if (!target) {
        throw new Error(
          `${label} requires ${describeEncounterActionTargetRequirement(kind)}.`
        );
      }
      if (target.type !== "boardCell") {
        throw new Error(`${label} requires a board cell target.`);
      }
      return copyBoardCellTarget(target);
  }
};

export const hasOnlyNoEffect = (kind: EncounterActionKind): boolean =>
  getEncounterActionDefinition(kind).effects.every((effect) => effect.type === "none");

const describeBoardCardMark = (mark: EncounterBoardCardEffectMark): string => {
  switch (mark) {
    case "probed":
      return "probed";
  }
};

export const resolveEncounterActionEffects = ({
  kind,
  actor,
  target
}: EncounterActionEffectInput): EncounterActionEffectResult => {
  const definition = getEncounterActionDefinition(kind);
  const validatedTarget = validateEncounterActionTarget(
    kind,
    actor,
    target ?? defaultTargetForEncounterAction(kind, actor)
  );
  let playerStabilityDelta = 0;
  let enemyStabilityDelta = 0;
  const boardCardEffects: EncounterBoardCardEffectResult[] = [];

  for (const effect of definition.effects) {
    switch (effect.type) {
      case "none":
        break;
      case "targetStabilityDelta":
        if (!validatedTarget || validatedTarget.type !== "stability") {
          throw new Error(
            `${definition.label} cannot apply a target Stability effect without a Stability target.`
          );
        }
        if (validatedTarget.actor === "player") {
          playerStabilityDelta += effect.amount;
        } else {
          enemyStabilityDelta += effect.amount;
        }
        break;
      case "markBoardCardTarget":
        if (!validatedTarget || validatedTarget.type !== "boardCard") {
          throw new Error(
            `${definition.label} cannot apply a board-card mark without a board-card target.`
          );
        }
        boardCardEffects.push({
          effectType: "markBoardCardTarget",
          mark: effect.mark,
          target: validatedTarget
        });
        break;
    }
  }

  return {
    playerStabilityDelta,
    enemyStabilityDelta,
    boardCardEffects
  };
};

export const describeEncounterActionCosts = (
  kind: EncounterActionKind,
  sourceLabel = "source"
): string => {
  const definition = getEncounterActionDefinition(kind);
  const costs = definition.costs.filter((cost) => cost.type !== "none");

  if (costs.length === 0) {
    return "No cost.";
  }

  return costs
    .map((cost) => {
      switch (cost.type) {
        case "combatCharge":
          return `Pay ${cost.amount} Combat Charge.`;
        case "sourceUsedOnResolve":
          return `Uses ${sourceLabel} on resolve.`;
      }
    })
    .join(" ");
};

const formatSignedDelta = (delta: number): string =>
  delta > 0 ? `+${delta}` : String(delta);

export const describeEncounterActionEffects = (
  kind: EncounterActionKind,
  actor: EncounterActionActor,
  target?: EncounterActionTarget
): string => {
  if (!target && hasOnlyNoEffect(kind)) {
    return "No effect.";
  }

  const definition = getEncounterActionDefinition(kind);
  const hasBoardCardMark = definition.effects.some(
    (effect) => effect.type === "markBoardCardTarget"
  );
  const effectResult =
    target || !hasBoardCardMark
      ? resolveEncounterActionEffects({
          kind,
          actor,
          ...(target ? { target } : {})
        })
      : undefined;
  const parts: string[] = [];

  if (effectResult?.enemyStabilityDelta) {
    parts.push(`Enemy Stability ${formatSignedDelta(effectResult.enemyStabilityDelta)}.`);
  }
  if (effectResult?.playerStabilityDelta) {
    parts.push(
      `Player Stability ${formatSignedDelta(effectResult.playerStabilityDelta)}.`
    );
  }

  for (const effect of definition.effects) {
    if (effect.type === "markBoardCardTarget") {
      parts.push(`Mark target as ${describeBoardCardMark(effect.mark)}.`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "No effect.";
};
