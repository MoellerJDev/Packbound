import {
  COMBAT_TICK_MS,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent,
  type DestructionReason,
  type PlayerSide
} from "@packbound/shared";

import { removeUnit } from "./placement";
import { aliveUnits, attackIntervalMs, emit, opponentOf } from "./state";
import { hasStatus } from "./statuses";
import { selectEnemyTarget } from "./targeting";
import type { MutableCombatState, MutableUnit, ResolveAbilities } from "./types";

type DamageSource = {
  readonly sourceId: string;
  readonly sourceCardInstanceId?: CardInstanceId;
  readonly sourceDefId?: CardDefId;
  readonly sourceSide?: PlayerSide;
};

const copyCardToAshes = (card: CardInstance): CardInstance => ({
  ...card,
  zone: "ashes",
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const unitCardInstanceToAshes = (unit: MutableUnit): CardInstance =>
  unit.sourceCard
    ? copyCardToAshes(unit.sourceCard)
    : {
        instanceId: unit.cardInstanceId,
        defId: unit.def.id,
        ownerId: unit.ownerId,
        zone: "ashes",
        modifiers: [],
        upgradeLevel: 0
      };

const damageSourceForUnit = (unit: MutableUnit): DamageSource => ({
  sourceId: unit.unitId,
  sourceCardInstanceId: unit.cardInstanceId,
  sourceDefId: unit.def.id,
  sourceSide: unit.side
});

const sourceEventMetadata = (
  source: DamageSource
): Pick<
  Extract<CombatEvent, { readonly type: "DamageDealt" }>,
  "sourceId" | "sourceCardInstanceId" | "sourceDefId" | "sourceSide"
> => ({
  sourceId: source.sourceId,
  ...(source.sourceCardInstanceId !== undefined
    ? { sourceCardInstanceId: source.sourceCardInstanceId }
    : {}),
  ...(source.sourceDefId !== undefined ? { sourceDefId: source.sourceDefId } : {}),
  ...(source.sourceSide !== undefined ? { sourceSide: source.sourceSide } : {})
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
    cardInstanceId: unit.cardInstanceId,
    defId: unit.def.id,
    side: unit.side,
    ownerId: unit.ownerId,
    isEcho: unit.isEcho,
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
  source: DamageSource,
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
      ...sourceEventMetadata(source),
      targetId: target.unitId,
      targetCardInstanceId: target.cardInstanceId,
      targetDefId: target.def.id,
      targetSide: target.side,
      amount: 0,
      damageType: reason === "combatDamage" ? "attack" : "trigger"
    });
    return;
  }

  target.currentHealth -= amount;
  emit(state, {
    type: "DamageDealt",
    timeMs: state.timeMs,
    ...sourceEventMetadata(source),
    targetId: target.unitId,
    targetCardInstanceId: target.cardInstanceId,
    targetDefId: target.def.id,
    targetSide: target.side,
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
      attackerCardInstanceId: unit.cardInstanceId,
      attackerDefId: unit.def.id,
      attackerSide: unit.side,
      targetId: target.unitId,
      targetCardInstanceId: target.cardInstanceId,
      targetDefId: target.def.id,
      targetSide: target.side
    });
    applyDamage(
      state,
      damageSourceForUnit(unit),
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
