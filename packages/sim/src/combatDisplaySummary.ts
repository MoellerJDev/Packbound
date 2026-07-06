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
    | "move"
    | "attack"
    | "trigger"
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

export type CombatDisplayKeyMomentLine = {
  readonly kind:
    | "outcome"
    | "damage"
    | "destroyed"
    | "majorDamage"
    | "attacks"
    | "techniques"
    | "special"
    | "warnings"
    | "events";
  readonly text: string;
  readonly severity?: "info" | "good" | "bad" | "warning";
};

export type CombatDisplayKeyMoments = {
  readonly rawEventCount: number;
  readonly summarizedEventCount: number;
  readonly hiddenEventCount: number;
  readonly lines: readonly CombatDisplayKeyMomentLine[];
};

export type CombatDisplaySummary = {
  readonly title: string;
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly keyMoments: CombatDisplayKeyMoments;
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
const SHORT_COMBAT_EVENT_COUNT = 12;
const MAX_MAJOR_DAMAGE_LINES = 3;
const MAX_GROUPED_ITEMS = 5;

const sideLabel = (side: PlayerSide, perspectiveSide: PlayerSide): string =>
  side === perspectiveSide ? "You" : "Enemy";

const possessiveSideLabel = (side: PlayerSide, perspectiveSide: PlayerSide): string =>
  side === perspectiveSide ? "Your" : "Enemy";

const cardName = (catalog: ContentCatalog, defId: CardDefId): string =>
  catalog.cardsById.get(defId)?.name ?? defId;

type CountedLabel = {
  readonly label: string;
  readonly count: number;
  readonly firstIndex: number;
};

type DamageHighlight = {
  readonly text: string;
  readonly amount: number;
  readonly timeMs: number;
  readonly eventIndex: number;
};

const addCount = (
  counts: Map<string, CountedLabel>,
  key: string,
  label: string,
  eventIndex: number
): void => {
  const existing = counts.get(key);
  counts.set(key, {
    label,
    count: (existing?.count ?? 0) + 1,
    firstIndex: existing?.firstIndex ?? eventIndex
  });
};

const sortedCounts = (counts: Map<string, CountedLabel>): readonly CountedLabel[] =>
  Array.from(counts.values()).sort(
    (left, right) => right.count - left.count || left.firstIndex - right.firstIndex
  );

const countTotal = (counts: readonly CountedLabel[]): number =>
  counts.reduce((total, item) => total + item.count, 0);

const formatCountedLabels = (counts: Map<string, CountedLabel>): string => {
  const items = sortedCounts(counts);
  const visible = items.slice(0, MAX_GROUPED_ITEMS);
  const hidden = items.slice(MAX_GROUPED_ITEMS);
  const parts = visible.map((item) =>
    item.count > 1 ? `${item.label} x${item.count}` : item.label
  );
  const hiddenCount = countTotal(hidden);
  return hiddenCount > 0 ? `${parts.join("; ")}; ${hiddenCount} more` : parts.join("; ");
};

const hasCounts = (counts: Map<string, CountedLabel>): boolean => counts.size > 0;

const boardPositionText = (position: {
  readonly row: number;
  readonly col: number;
  readonly layer: string;
}): string => `r${position.row} c${position.col} ${position.layer}`;

const positionText = (event: Extract<CombatEvent, { readonly type: "UnitSummoned" }>) =>
  boardPositionText(event.position);

const recallPositionText = (
  event: Extract<CombatEvent, { readonly type: "UnitRecalled" }>
) => boardPositionText(event.position);

const phaseInPositionText = (
  event: Extract<CombatEvent, { readonly type: "UnitPhasedIn" }>
) => boardPositionText(event.position);

const winnerTitle = (winner: CombatWinner, perspectiveSide: PlayerSide): string => {
  if (winner === "draw") {
    return "Combat ends in a draw";
  }
  return winner === perspectiveSide ? "You win combat" : "Enemy wins combat";
};

const damageText = (
  combatResult: Pick<CombatDisplayResultLike, "damageToPlayerA" | "damageToPlayerB">,
  perspectiveSide: PlayerSide
): string => {
  const damageToYou =
    perspectiveSide === "playerA"
      ? combatResult.damageToPlayerA
      : combatResult.damageToPlayerB;
  const damageToEnemy =
    perspectiveSide === "playerA"
      ? combatResult.damageToPlayerB
      : combatResult.damageToPlayerA;
  return `Damage: You -${damageToYou}, Enemy -${damageToEnemy}.`;
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

const destroyedCauseText = (
  catalog: ContentCatalog,
  causedBy: NonNullable<
    Extract<CombatEvent, { readonly type: "AbilityTriggered" }>["causedBy"]
  >
): string => {
  const name = cardName(catalog, causedBy.defId);
  return causedBy.isEcho ? `${name} vanished` : `${name} was destroyed`;
};

const abilityTriggerText = (
  catalog: ContentCatalog,
  event: Extract<CombatEvent, { readonly type: "AbilityTriggered" }>
): string => {
  const sourceName = cardName(catalog, event.sourceDefId);
  if (!event.causedBy) {
    return `${sourceName} triggered ${event.trigger}.`;
  }

  const causeText = destroyedCauseText(catalog, event.causedBy);
  switch (event.trigger) {
    case "WhenFirstAllyDestroyed":
      return `${sourceName} triggered after ${causeText} as the first ally destroyed.`;
    case "WhenFirstEnemyDestroyed":
      return `${sourceName} triggered after ${causeText} as the first enemy destroyed.`;
    case "OnAllyDestroyed":
    case "OnEnemyDestroyed":
      return `${sourceName} reacted when ${causeText}.`;
    default:
      return `${sourceName} triggered when ${causeText}.`;
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
    case "AbilityTriggered":
      return {
        timeMs: event.timeMs,
        kind: "trigger",
        text: abilityTriggerText(catalog, event),
        severity: severityForSide(event.sourceSide, perspectiveSide, true)
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
    case "UnitMoved":
      return {
        timeMs: event.timeMs,
        kind: "move",
        text: `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
          catalog,
          event.defId
        )} moved one hex from ${boardPositionText(event.from)} to ${boardPositionText(
          event.to
        )} toward ${cardName(catalog, event.targetDefId)}.`,
        severity: "info"
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
      return undefined;
  }
};

export const buildCombatDisplayKeyMoments = ({
  catalog,
  combatResult,
  perspectiveSide = "playerA"
}: Omit<BuildCombatDisplaySummaryInput, "maxLines">): CombatDisplayKeyMoments => {
  const lines: CombatDisplayKeyMomentLine[] = [
    {
      kind: "outcome",
      text: `Outcome: ${winnerTitle(combatResult.winner, perspectiveSide)}.`,
      severity:
        combatResult.winner === "draw"
          ? "info"
          : severityForSide(combatResult.winner, perspectiveSide, true)
    },
    {
      kind: "damage",
      text: damageText(combatResult, perspectiveSide),
      severity: "info"
    }
  ];

  const destroyed = new Map<string, CountedLabel>();
  const attacks = new Map<string, CountedLabel>();
  const techniques = new Map<string, CountedLabel>();
  const special = new Map<string, CountedLabel>();
  const damageHighlights: DamageHighlight[] = [];
  let highlightedEventCount = combatResult.events.some(
    (event) => event.type === "CombatEnded"
  )
    ? 1
    : 0;

  combatResult.events.forEach((event, eventIndex) => {
    switch (event.type) {
      case "UnitDestroyed": {
        addCount(
          destroyed,
          `${event.side}:${event.defId}:${event.isEcho}`,
          `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
            catalog,
            event.defId
          )}`,
          eventIndex
        );
        break;
      }
      case "UnitAttacked": {
        addCount(
          attacks,
          `${event.attackerSide}:${event.attackerDefId}:${event.targetDefId}`,
          `${possessiveSideLabel(
            event.attackerSide,
            perspectiveSide
          )} ${cardName(catalog, event.attackerDefId)} -> ${cardName(
            catalog,
            event.targetDefId
          )}`,
          eventIndex
        );
        break;
      }
      case "DamageDealt": {
        if (event.amount <= 0) {
          break;
        }
        const sourceName = event.sourceDefId
          ? cardName(catalog, event.sourceDefId)
          : "effect";
        damageHighlights.push({
          text: `${sourceName} -> ${cardName(catalog, event.targetDefId)} for ${event.amount}`,
          amount: event.amount,
          timeMs: event.timeMs,
          eventIndex
        });
        break;
      }
      case "TechniqueUsed":
        addCount(
          techniques,
          `${event.side}:${event.defId}`,
          `${sideLabel(event.side, perspectiveSide)} used ${cardName(catalog, event.defId)}`,
          eventIndex
        );
        break;
      case "UnitSummoned":
        addCount(
          special,
          `summon:${event.side}:${event.defId}`,
          `${sideLabel(event.side, perspectiveSide)} summoned ${cardName(
            catalog,
            event.defId
          )}`,
          eventIndex
        );
        break;
      case "UnitRecalled":
        addCount(
          special,
          `recall:${event.side}:${event.defId}`,
          `${sideLabel(event.side, perspectiveSide)} recalled ${cardName(
            catalog,
            event.defId
          )}`,
          eventIndex
        );
        break;
      case "UnitPhasedOut":
      case "UnitPhasedIn":
        addCount(
          special,
          `phase:${event.side}:${event.defId}`,
          `${possessiveSideLabel(event.side, perspectiveSide)} ${cardName(
            catalog,
            event.defId
          )} phased`,
          eventIndex
        );
        break;
      case "AbilityTriggered":
        addCount(
          special,
          `trigger:${event.sourceSide}:${event.sourceDefId}:${event.trigger}`,
          `${cardName(catalog, event.sourceDefId)} triggered`,
          eventIndex
        );
        break;
      case "TechniqueInterrupted":
        addCount(special, "technique-interrupted", "Technique interrupted", eventIndex);
        break;
      case "CombatStarted":
      case "CombatEnded":
      case "CombatChargeGained":
      case "TraitActivated":
      case "TechniqueQueued":
      case "UnitMoved":
      case "StatusApplied":
      case "StatusRemoved":
        break;
    }
  });

  if (hasCounts(destroyed)) {
    const items = sortedCounts(destroyed);
    highlightedEventCount += countTotal(items);
    lines.push({
      kind: "destroyed",
      text: `Destroyed: ${formatCountedLabels(destroyed)}.`,
      severity: "warning"
    });
  }

  if (damageHighlights.length > 0) {
    const majorDamage = damageHighlights
      .slice()
      .sort(
        (left, right) =>
          right.amount - left.amount ||
          left.timeMs - right.timeMs ||
          left.eventIndex - right.eventIndex
      )
      .slice(0, MAX_MAJOR_DAMAGE_LINES);
    highlightedEventCount += majorDamage.length;
    lines.push({
      kind: "majorDamage",
      text: `Major damage: ${majorDamage.map((damage) => damage.text).join("; ")}.`,
      severity: "info"
    });
  }

  if (hasCounts(attacks)) {
    const items = sortedCounts(attacks);
    highlightedEventCount += countTotal(items);
    lines.push({
      kind: "attacks",
      text: `Attacks: ${formatCountedLabels(attacks)}.`,
      severity: "info"
    });
  }

  if (hasCounts(techniques)) {
    const items = sortedCounts(techniques);
    highlightedEventCount += countTotal(items);
    lines.push({
      kind: "techniques",
      text: `Techniques: ${formatCountedLabels(techniques)}.`,
      severity: "info"
    });
  }

  if (hasCounts(special)) {
    const items = sortedCounts(special);
    highlightedEventCount += countTotal(items);
    lines.push({
      kind: "special",
      text: `Special: ${formatCountedLabels(special)}.`,
      severity: "info"
    });
  }

  lines.push({
    kind: "warnings",
    text:
      combatResult.warnings.length > 0
        ? `Warnings: ${combatResult.warnings.map((warning) => warning.code).join(", ")}.`
        : "Warnings: none.",
    severity: combatResult.warnings.length > 0 ? "warning" : "info"
  });

  const rawEventCount = combatResult.events.length;
  const summarizedEventCount =
    rawEventCount <= SHORT_COMBAT_EVENT_COUNT
      ? rawEventCount
      : Math.min(rawEventCount, highlightedEventCount);
  const hiddenEventCount = rawEventCount - summarizedEventCount;
  lines.push({
    kind: "events",
    text:
      hiddenEventCount > 0
        ? `Events shown: ${summarizedEventCount} of ${rawEventCount}. ${hiddenEventCount} lower-priority event${
            hiddenEventCount === 1 ? "" : "s"
          } remain in the full feed.`
        : `Events shown: ${rawEventCount} of ${rawEventCount}. Full feed stays available.`,
    severity: hiddenEventCount > 0 ? "warning" : "info"
  });

  return {
    rawEventCount,
    summarizedEventCount,
    hiddenEventCount,
    lines
  };
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
    keyMoments: buildCombatDisplayKeyMoments({
      catalog,
      combatResult,
      perspectiveSide
    }),
    lines
  };
};
