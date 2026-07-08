import type { ContentCatalog } from "@packbound/content";
import {
  type BoardPosition,
  type CombatEvent,
  type UnitInstanceId
} from "@packbound/shared";

import type { RunAshRecord, RunState } from "./runState";

export type RecordAshesFromCombatOptions = {
  readonly catalog?: ContentCatalog;
};

const ASH_LEDGER_NODE_ID = "ash_ledger";

const hasAshLedger = (run: RunState): boolean =>
  run.commander?.doctrine.unlockedNodeIds.includes(ASH_LEDGER_NODE_ID) ?? false;

const copyPosition = (position: BoardPosition): BoardPosition => ({
  row: position.row,
  col: position.col,
  layer: position.layer
});

const ashRecordIdForDestroyedEvent = (
  run: RunState,
  event: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>
): string =>
  [
    "ash",
    run.runId,
    run.currentRound,
    event.cardInstanceId,
    event.unitId,
    event.timeMs,
    event.reason
  ].join(":");

const updateLastKnownPosition = (
  positions: Map<UnitInstanceId, BoardPosition>,
  event: CombatEvent
): void => {
  switch (event.type) {
    case "UnitMoved":
      positions.set(event.unitId, copyPosition(event.to));
      return;
    case "UnitSummoned":
    case "UnitRecalled":
    case "UnitPhasedIn":
      positions.set(event.unitId, copyPosition(event.position));
      return;
    case "UnitDestroyed":
    case "UnitPhasedOut":
      return;
    default:
      return;
  }
};

const ashSideForCombatSide = (
  side: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>["side"]
): RunAshRecord["side"] => (side === "playerA" ? "player" : "enemy");

export const recordAshesFromCombatResult = (
  run: RunState,
  combatEvents: readonly CombatEvent[],
  options: RecordAshesFromCombatOptions = {}
): RunState => {
  if (!hasAshLedger(run)) {
    return run;
  }

  const existingRecords = run.ashRecords ?? [];
  const knownRecordIds = new Set(existingRecords.map((record) => record.id));
  const lastKnownPositions = new Map<UnitInstanceId, BoardPosition>();
  const nextRecords: RunAshRecord[] = [];

  combatEvents.forEach((event, index) => {
    if (event.type !== "UnitDestroyed") {
      updateLastKnownPosition(lastKnownPositions, event);
      return;
    }

    const id = ashRecordIdForDestroyedEvent(run, event);
    if (knownRecordIds.has(id)) {
      return;
    }
    knownRecordIds.add(id);

    const cardDef = options.catalog?.cardsById.get(event.defId);
    const lastKnownPosition = lastKnownPositions.get(event.unitId);
    nextRecords.push({
      id,
      sourceCardName: cardDef?.name ?? event.defId,
      cardDefId: event.defId,
      cardInstanceId: event.cardInstanceId,
      ...(cardDef ? { cardType: cardDef.cardType } : {}),
      side: ashSideForCombatSide(event.side),
      combatSide: event.side,
      ownerId: event.ownerId,
      roundCreated: run.currentRound,
      origin: "destroyed in combat",
      combatEventIndex: index,
      combatEventTimeMs: event.timeMs,
      destructionReason: event.reason,
      isEcho: event.isEcho,
      ...(lastKnownPosition ? { position: copyPosition(lastKnownPosition) } : {})
    });
  });

  if (nextRecords.length === 0) {
    return run;
  }

  return {
    ...run,
    ashRecords: [...existingRecords, ...nextRecords]
  };
};
