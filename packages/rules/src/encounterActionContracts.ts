export const ENCOUNTER_ACTION_KINDS = [
  "debug_noop",
  "debug_pressure",
  "main_phase_pressure",
  "commander_rally"
] as const;

export type EncounterActionKind = (typeof ENCOUNTER_ACTION_KINDS)[number];

export type EncounterActionActor = "player" | "enemy";

export type EncounterActionPhase =
  "start" | "firstMain" | "combat" | "secondMain" | "end" | "complete";

export type EncounterActionTiming = "anyPriority" | "mainPhase";

export type EncounterActionSourceLifecycle = "none" | "usedOnResolve";

export type EncounterActionCost =
  | {
      readonly type: "none";
    }
  | {
      readonly type: "sourceUsedOnResolve";
    };

export type EncounterActionEffect =
  | {
      readonly type: "none";
    }
  | {
      readonly type: "opponentStabilityDelta";
      readonly amount: number;
    }
  | {
      readonly type: "selfStabilityDelta";
      readonly amount: number;
    };

export type EncounterActionDefinition = {
  readonly kind: EncounterActionKind;
  readonly label: string;
  readonly timing: EncounterActionTiming;
  readonly costs: readonly EncounterActionCost[];
  readonly effects: readonly EncounterActionEffect[];
  readonly sourceLifecycleOnResolve: EncounterActionSourceLifecycle;
  readonly includeEffectSummaryInResolutionLog: boolean;
};

export type EncounterActionEffectInput = {
  readonly kind: EncounterActionKind;
  readonly actor: EncounterActionActor;
};

export type EncounterActionEffectResult = {
  readonly playerStabilityDelta: number;
  readonly enemyStabilityDelta: number;
};

const NO_COST = [{ type: "none" }] as const;
const NO_EFFECT = [{ type: "none" }] as const;
const OPPONENT_STABILITY_MINUS_ONE = [
  { type: "opponentStabilityDelta", amount: -1 }
] as const;
const SOURCE_USED_ON_RESOLVE = [{ type: "sourceUsedOnResolve" }] as const;

const ENCOUNTER_ACTION_DEFINITIONS_BY_KIND = {
  debug_noop: {
    kind: "debug_noop",
    label: "Debug no-op",
    timing: "anyPriority",
    costs: NO_COST,
    effects: NO_EFFECT,
    sourceLifecycleOnResolve: "none",
    includeEffectSummaryInResolutionLog: false
  },
  debug_pressure: {
    kind: "debug_pressure",
    label: "Debug pressure",
    timing: "anyPriority",
    costs: NO_COST,
    effects: OPPONENT_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "none",
    includeEffectSummaryInResolutionLog: false
  },
  main_phase_pressure: {
    kind: "main_phase_pressure",
    label: "Prototype Pressure Technique",
    timing: "mainPhase",
    costs: SOURCE_USED_ON_RESOLVE,
    effects: OPPONENT_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "usedOnResolve",
    includeEffectSummaryInResolutionLog: true
  },
  commander_rally: {
    kind: "commander_rally",
    label: "Commander Rally",
    timing: "mainPhase",
    costs: SOURCE_USED_ON_RESOLVE,
    effects: OPPONENT_STABILITY_MINUS_ONE,
    sourceLifecycleOnResolve: "usedOnResolve",
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

export const resolveEncounterActionEffects = ({
  kind,
  actor
}: EncounterActionEffectInput): EncounterActionEffectResult => {
  const definition = getEncounterActionDefinition(kind);
  let playerStabilityDelta = 0;
  let enemyStabilityDelta = 0;

  for (const effect of definition.effects) {
    switch (effect.type) {
      case "none":
        break;
      case "opponentStabilityDelta":
        if (actor === "player") {
          enemyStabilityDelta += effect.amount;
        } else {
          playerStabilityDelta += effect.amount;
        }
        break;
      case "selfStabilityDelta":
        if (actor === "player") {
          playerStabilityDelta += effect.amount;
        } else {
          enemyStabilityDelta += effect.amount;
        }
        break;
    }
  }

  return {
    playerStabilityDelta,
    enemyStabilityDelta
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
  actor: EncounterActionActor
): string => {
  const effectResult = resolveEncounterActionEffects({ kind, actor });
  const parts: string[] = [];

  if (effectResult.enemyStabilityDelta !== 0) {
    parts.push(`Enemy Stability ${formatSignedDelta(effectResult.enemyStabilityDelta)}.`);
  }
  if (effectResult.playerStabilityDelta !== 0) {
    parts.push(
      `Player Stability ${formatSignedDelta(effectResult.playerStabilityDelta)}.`
    );
  }

  return parts.length > 0 ? parts.join(" ") : "No effect.";
};
