import { COMBAT_TICK_MS, type ActiveStatus } from "@packbound/shared";

import { emit } from "./state";
import type { MutableCombatState, MutableUnit } from "./types";

export const hasStatus = (unit: MutableUnit, status: string): boolean =>
  unit.statuses.some((entry) => entry.type === status);

export const applyStatus = (
  state: MutableCombatState,
  target: MutableUnit,
  status: ActiveStatus
): void => {
  if (status.type === "Barrier" && hasStatus(target, "Barrier")) {
    return;
  }

  target.statuses = [
    ...target.statuses.filter((entry) => entry.type !== status.type),
    status
  ];
  emit(state, {
    type: "StatusApplied",
    timeMs: state.timeMs,
    targetId: target.unitId,
    status: status.type,
    ...(status.remainingMs ? { durationMs: status.remainingMs } : {})
  });
};

export const tickStatuses = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const unit of side.units) {
      const remaining: ActiveStatus[] = [];
      for (const status of unit.statuses) {
        if (status.remainingMs === undefined) {
          remaining.push(status);
          continue;
        }

        const nextRemaining = status.remainingMs - COMBAT_TICK_MS;
        if (nextRemaining > 0) {
          remaining.push({ ...status, remainingMs: nextRemaining });
        } else {
          emit(state, {
            type: "StatusRemoved",
            timeMs: state.timeMs,
            targetId: unit.unitId,
            status: status.type,
            reason: "expired"
          });
        }
      }
      unit.statuses = remaining;
    }
  }
};
