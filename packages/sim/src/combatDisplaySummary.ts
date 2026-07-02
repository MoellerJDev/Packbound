import type { ContentCatalog } from "@packbound/content";
import type {
  CardDefId,
  CombatEvent,
  CombatWinner,
  PlayerSide,
  SimulationWarning
} from "@packbound/shared";

export type CombatDisplayLine = {
  readonly timeMs?: number;
  readonly kind:
    | "start"
    | "technique"
    | "attack"
    | "damage"
    | "destroyed"
    | "status"
    | "summon"
    | "phase"
    | "recall"
    | "warning"
    | "end";
  readonly text: string;
  readonly severity?: "info" | "good" | "bad" | "warning";
};

export type CombatDisplaySummary = {
  readonly title: string;
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly lines: readonly CombatDisplayLine[];
};

export type CombatDisplayResultLike = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
};

export type BuildCombatDisplaySummaryInput = {
  readonly catalog: ContentCatalog;
  readonly combatResult: CombatDisplayResultLike;
  readonly perspectiveSide?: PlayerSide;
  readonly maxLines?: number;
};

const DEFAULT_MAX_LINES = 48;

const sideLabel = (side: PlayerSide, perspectiveSide: PlayerSide): string =>
  side === perspectiveSide ? "You" : "Enemy";

const possessiveSideLabel = (side: PlayerSide, perspectiveSide: PlayerSide): string =>
  side === perspectiveSide ? "Your" : "Enemy";

const cardName = (catalog: ContentCatalog, defId: CardDefId): string =>
  catalog.cardsById.get(defId)?.name ?? defId;

const positionText = (event: Extract<CombatEvent, { readonly type: "UnitSummoned" }>) =>
  `r${event.position.row} c${event.position.col} ${event.position.layer}`;

const recallPositionText = (
  event: Extract<CombatEvent, { readonly type: "UnitRecalled" }>
) => `r${event.position.row} c${event.position.col} ${event.position.layer}`;

const phaseInPositionText = (
  event: Extract<CombatEvent, { readonly type: "UnitPhasedIn" }>
) => `r${event.position.row} c${event.position.col} ${event.position.layer}`;

const winnerTitle = (winner: CombatWinner, perspectiveSide: PlayerSide): string => {
  if (winner === "draw") {
    return "Combat ends in a draw";
  }
  return winner === perspectiveSide ? "You win combat" : "Enemy wins combat";
};

const severityForSide = (
  side: PlayerSide,
  perspectiveSide: PlayerSide,
  favorableWhenPerspectiveSide: boolean
): NonNullable<CombatDisplayLine["severity"]> => {
  const isPerspectiveSide = side === perspectiveSide;
  return isPerspectiveSide === favorableWhenPerspectiveSide ? "good" : "bad";
};

const destructionReasonText = (
  reason: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>["reason"]
): string => {
  switch (reason) {
    case "combatDamage":
      return "combat damage";
    case "techniqueDamage":
      return "Technique damage";
    case "offered":
      return "Offering";
    case "effectDestroy":
      return "an effect";
    case "poison":
      return "poison";
    case "burning":
      return "burning";
    case "unknown":
      return "unknown cause";
  }
};

const statusRemovalText = (
  reason: Extract<CombatEvent, { readonly type: "StatusRemoved" }>["reason"]
): string => {
  switch (reason) {
    case "consumed":
      return "was consumed";
    case "expired":
      return "expired";
    case "cleansed":
      return "was cleansed";
  }
};

const barrierKey = (timeMs: number, targetId: string): string => `${timeMs}:${targetId}`;

const buildEventLine = (
  catalog: ContentCatalog,
  event: CombatEvent,
  perspectiveSide: PlayerSide,
  barrierConsumes: Set<string>
): CombatDisplayLine | undefined => {
  switch (event.type) {
    case "CombatStarted":
      return {
        timeMs: event.timeMs,
        kind: "start",
        text: "Combat started.",
        severity: "info"
      };
    case "TechniqueQueued":
      return {
        timeMs: event.timeMs,
        kind: "technique",
        text: `${sideLabel(event.side, perspectiveSide)} queued ${cardName(
          catalog,
          event.defId
        )}.`,
        severity: "info"
      };
    case "TechniqueUsed":
      return {
        timeMs: event.timeMs,
        kind: "technique",
        text: `${sideLabel(event.side, perspectiveSide)} used ${cardName(
          catalog,
          event.defId
        )} on ${event.targets.length} target${event.targets.length === 1 ? "" : "s"}.`,
        severity: severityForSide(event.side, perspectiveSide, true)
      };
    case "TechniqueInterrupted":
      return {
        timeMs: event.timeMs,
        kind: "technique",
        text: "A Technique was interrupted.",
        severity: "warning"
      };
    case "UnitAttacked":
      return {
        timeMs: event.timeMs,
        kind: "attack",
        text: `${possessiveSideLabel(
          event.attackerSide,
          perspectiveSide
        )} ${cardName(catalog, event.attackerDefId)} attacked ${cardName(
          catalog,
          event.targetDefId
        )}.`,
        severity: "info"
      };
    case "DamageDealt": {
      const sourceName = event.sourceDefId
        ? cardName(catalog, event.sourceDefId)
        : "an effect";
      const targetName = cardName(catalog, event.targetDefId);
      if (
        event.amount === 0 &&
        barrierConsumes.has(barrierKey(event.timeMs, event.targetId))
      ) {
        return {
          timeMs: event.timeMs,
          kind: "status",
          text: `Barrier on ${targetName} blocked ${sourceName}.`,
          severity: severityForSide(event.targetSide, perspectiveSide, true)
        };
      }
      if (event.amount === 0) {
        return undefined;
      }
      return {
        timeMs: event.timeMs,
        kind: "damage",
        text: `${sourceName} dealt ${event.amount} ${event.damageType} damage to ${targetName}.`,
        severity: severityForSide(event.targetSide, perspectiveSide, false)
      };
    }
    case "StatusApplied":
      return {
        timeMs: event.timeMs,
        kind: "status",
        text: `${event.status} was applied.`,
        severity: "info"
      };
    case "StatusRemoved":
      if (event.status === "Barrier" && event.reason === "consumed") {
        barrierConsumes.add(barrierKey(event.timeMs, event.targetId));
        return undefined;
      }
      return {
        timeMs: event.timeMs,
        kind: "status",
        text: `${event.status} ${statusRemovalText(event.reason)}.`,
        severity: "info"
      };
    case "UnitDestroyed":
      return {
        timeMs: event.timeMs,
        kind: "destroyed",
        text: event.isEcho
          ? `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
              catalog,
              event.defId
            )} vanished after ${destructionReasonText(event.reason)}.`
          : `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
              catalog,
              event.defId
            )} was destroyed by ${destructionReasonText(event.reason)}.`,
        severity: severityForSide(event.side, perspectiveSide, false)
      };
    case "UnitSummoned":
      return {
        timeMs: event.timeMs,
        kind: "summon",
        text: `${sideLabel(event.side, perspectiveSide)} summoned ${cardName(
          catalog,
          event.defId
        )} at ${positionText(event)}.`,
        severity: severityForSide(event.side, perspectiveSide, true)
      };
    case "UnitRecalled":
      return {
        timeMs: event.timeMs,
        kind: "recall",
        text: `${sideLabel(event.side, perspectiveSide)} recalled ${cardName(
          catalog,
          event.defId
        )} from Ashes to ${recallPositionText(event)}.`,
        severity: severityForSide(event.side, perspectiveSide, true)
      };
    case "UnitPhasedOut":
      return {
        timeMs: event.timeMs,
        kind: "phase",
        text: `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
          catalog,
          event.defId
        )} phased out.`,
        severity: "info"
      };
    case "UnitPhasedIn":
      return {
        timeMs: event.timeMs,
        kind: "phase",
        text: `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
          catalog,
          event.defId
        )} phased in at ${phaseInPositionText(event)}.`,
        severity: severityForSide(event.side, perspectiveSide, true)
      };
    case "CombatEnded":
      return {
        timeMs: event.timeMs,
        kind: "end",
        text:
          event.winner === "draw"
            ? "Combat ended in a draw."
            : `${sideLabel(event.winner, perspectiveSide)} won combat.`,
        severity:
          event.winner === "draw"
            ? "info"
            : severityForSide(event.winner, perspectiveSide, true)
      };
    case "CombatChargeGained":
    case "TraitActivated":
    case "UnitMoved":
      return undefined;
  }
};

export const buildCombatDisplaySummary = ({
  catalog,
  combatResult,
  perspectiveSide = "playerA",
  maxLines = DEFAULT_MAX_LINES
}: BuildCombatDisplaySummaryInput): CombatDisplaySummary => {
  const lines: CombatDisplayLine[] = [];
  const barrierConsumes = new Set<string>();
  let skippedLines = 0;

  const addLine = (line: CombatDisplayLine | undefined): void => {
    if (!line) {
      return;
    }
    if (lines.length < maxLines) {
      lines.push(line);
      return;
    }
    skippedLines += 1;
  };

  for (const event of combatResult.events) {
    addLine(buildEventLine(catalog, event, perspectiveSide, barrierConsumes));
  }

  if (skippedLines > 0) {
    lines.push({
      kind: "warning",
      text: `${skippedLines} additional combat line${skippedLines === 1 ? "" : "s"} hidden.`,
      severity: "warning"
    });
  }

  for (const warning of combatResult.warnings) {
    lines.push({
      kind: "warning",
      text: `Warning ${warning.code}: ${warning.message}`,
      severity: "warning"
    });
  }

  return {
    title: winnerTitle(combatResult.winner, perspectiveSide),
    winner: combatResult.winner,
    damageToPlayerA: combatResult.damageToPlayerA,
    damageToPlayerB: combatResult.damageToPlayerB,
    eventCount: combatResult.events.length,
    warningCodes: combatResult.warnings.map((warning) => warning.code),
    lines
  };
};
