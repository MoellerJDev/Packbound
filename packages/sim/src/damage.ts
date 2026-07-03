import {
  COMBAT_TICK_MS,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent,
  type DestructionReason,
  type DestroyedUnitTriggerCause,
  type PlayerSide
} from "@packbound/shared";

import { removeUnit } from "./placement";
import { moveUnitOneStepTowardTarget } from "./movement";
import {
  aliveUnits,
  attackIntervalMs,
  collectAbilitySources,
  emit,
  opponentOf
} from "./state";
import { hasStatus } from "./statuses";
import { isTargetInRange, selectEnemyTarget } from "./targeting";
import type {
  AbilitySource,
  MutableCombatState,
  MutableUnit,
  ResolveAbilities
} from "./types";

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

const sourceIsPresent = (state: MutableCombatState, source: AbilitySource): boolean => {
  if (source.unit) {
    const unitId = source.unit.unitId;
    return state.sides[source.sideState.side].units.some(
      (unit) => unit.unitId === unitId
    );
  }

  return state.sides[source.sideState.side].permanents.some(
    (permanent) => permanent.cardInstanceId === source.cardInstanceId
  );
};

const resolveSourcesForTrigger = (
  state: MutableCombatState,
  sources: readonly AbilitySource[],
  triggerType:
    | "OnAllyDestroyed"
    | "OnEnemyDestroyed"
    | "WhenFirstAllyDestroyed"
    | "WhenFirstEnemyDestroyed",
  depth: number,
  resolveAbilities: ResolveAbilities,
  causedBy: DestroyedUnitTriggerCause
): void => {
  for (const source of sources) {
    if (!sourceIsPresent(state, source)) {
      continue;
    }
    resolveAbilities(state, source, triggerType, depth, { causedBy });
  }
};

const resolveFirstDestroyedTriggers = (
  state: MutableCombatState,
  sources: readonly AbilitySource[],
  triggerType: "WhenFirstAllyDestroyed" | "WhenFirstEnemyDestroyed",
  depth: number,
  resolveAbilities: ResolveAbilities,
  causedBy: DestroyedUnitTriggerCause
): void => {
  for (const source of sources) {
    if (!sourceIsPresent(state, source)) {
      continue;
    }

    const firedSources =
      triggerType === "WhenFirstAllyDestroyed"
        ? source.sideState.firstAllyDestroyedTriggerSources
        : source.sideState.firstEnemyDestroyedTriggerSources;
    if (firedSources.has(source.cardInstanceId)) {
      continue;
    }

    firedSources.add(source.cardInstanceId);
    resolveAbilities(state, source, triggerType, depth, { causedBy });
  }
};

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
  const destroyedCause = {
    type: "unitDestroyed",
    unitId: unit.unitId,
    cardInstanceId: unit.cardInstanceId,
    defId: unit.def.id,
    side: unit.side,
    ownerId: unit.ownerId,
    isEcho: unit.isEcho,
    reason
  } satisfies DestroyedUnitTriggerCause;

  emit(state, {
    type: "UnitDestroyed",
    timeMs: state.timeMs,
    unitId: destroyedCause.unitId,
    cardInstanceId: destroyedCause.cardInstanceId,
    defId: destroyedCause.defId,
    side: destroyedCause.side,
    ownerId: destroyedCause.ownerId,
    isEcho: destroyedCause.isEcho,
    reason: destroyedCause.reason
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

  side.destroyedUnitsThisCombat += 1;

  const alliedSources = collectAbilitySources(side).filter(
    (source) => source.cardInstanceId !== unit.cardInstanceId
  );
  const enemySide = state.sides[opponentOf(unit.side)];
  const enemySources = collectAbilitySources(enemySide);

  resolveSourcesForTrigger(
    state,
    alliedSources,
    "OnAllyDestroyed",
    depth,
    resolveAbilities,
    destroyedCause
  );
  resolveSourcesForTrigger(
    state,
    enemySources,
    "OnEnemyDestroyed",
    depth,
    resolveAbilities,
    destroyedCause
  );
  resolveFirstDestroyedTriggers(
    state,
    alliedSources,
    "WhenFirstAllyDestroyed",
    depth,
    resolveAbilities,
    destroyedCause
  );
  resolveFirstDestroyedTriggers(
    state,
    enemySources,
    "WhenFirstEnemyDestroyed",
    depth,
    resolveAbilities,
    destroyedCause
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

    if (!isTargetInRange(unit, target)) {
      moveUnitOneStepTowardTarget(state, unit, target);
      unit.attackTimerMs += attackIntervalMs(unit);
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
