import {
  COMBAT_TICK_MS,
  type CardInstance,
  type DestructionReason
} from "@packbound/shared";

import { removeUnit } from "./placement";
import { aliveUnits, attackIntervalMs, emit, opponentOf } from "./state";
import { hasStatus } from "./statuses";
import { selectEnemyTarget } from "./targeting";
import type { MutableCombatState, MutableUnit, ResolveAbilities } from "./types";

const unitCardInstanceToAshes = (unit: MutableUnit): CardInstance => ({
  instanceId: unit.cardInstanceId,
  defId: unit.def.id,
  ownerId: unit.ownerId,
  zone: "ashes",
  modifiers: [],
  upgradeLevel: 0
});

export const destroyUnit = (
  state: MutableCombatState,
  unit: MutableUnit,
  reason: DestructionReason,
  depth: number,
  resolveAbilities: ResolveAbilities
): void => {
  const side = state.sides[unit.side];
  if (!side.units.some((candidate) => candidate.unitId === unit.unitId)) {
    return;
  }

  removeUnit(side, unit.unitId);
  emit(state, {
    type: "UnitDestroyed",
    timeMs: state.timeMs,
    unitId: unit.unitId,
    reason
  });

  if (!unit.isEcho) {
    side.ashes.push(unitCardInstanceToAshes(unit));
  }

  resolveAbilities(
    state,
    {
      sideState: side,
      cardInstanceId: unit.cardInstanceId,
      def: unit.def,
      unit
    },
    "OnDestroyed",
    depth
  );
};

export const applyDamage = (
  state: MutableCombatState,
  sourceId: string,
  target: MutableUnit,
  amount: number,
  reason: DestructionReason,
  depth: number,
  resolveAbilities: ResolveAbilities
): void => {
  if (amount <= 0) {
    return;
  }

  if (hasStatus(target, "Barrier")) {
    target.statuses = target.statuses.filter((status) => status.type !== "Barrier");
    emit(state, {
      type: "StatusRemoved",
      timeMs: state.timeMs,
      targetId: target.unitId,
      status: "Barrier",
      reason: "consumed"
    });
    emit(state, {
      type: "DamageDealt",
      timeMs: state.timeMs,
      sourceId,
      targetId: target.unitId,
      amount: 0,
      damageType: reason === "combatDamage" ? "attack" : "trigger"
    });
    return;
  }

  target.currentHealth -= amount;
  emit(state, {
    type: "DamageDealt",
    timeMs: state.timeMs,
    sourceId,
    targetId: target.unitId,
    amount,
    damageType: reason === "combatDamage" ? "attack" : "trigger"
  });

  if (target.currentHealth <= 0) {
    destroyUnit(state, target, reason, depth + 1, resolveAbilities);
  }
};

export const processAttacks = (
  state: MutableCombatState,
  resolveAbilities: ResolveAbilities
): void => {
  const units = [...state.sides.playerA.units, ...state.sides.playerB.units].sort(
    (a, b) => a.unitId.localeCompare(b.unitId)
  );

  for (const unit of units) {
    const side = state.sides[unit.side];
    if (!side.units.some((candidate) => candidate.unitId === unit.unitId)) {
      continue;
    }

    if (hasStatus(unit, "Stunned")) {
      continue;
    }

    unit.attackTimerMs -= COMBAT_TICK_MS;
    if (unit.attackTimerMs > 0) {
      continue;
    }

    const target = selectEnemyTarget(unit, state);
    if (!target) {
      continue;
    }

    emit(state, {
      type: "UnitAttacked",
      timeMs: state.timeMs,
      attackerId: unit.unitId,
      targetId: target.unitId
    });
    applyDamage(
      state,
      unit.unitId,
      target,
      unit.attack,
      "combatDamage",
      0,
      resolveAbilities
    );
    unit.attackTimerMs += attackIntervalMs(unit);

    if (aliveUnits(state.sides[opponentOf(unit.side)]).length === 0) {
      return;
    }
  }
};
