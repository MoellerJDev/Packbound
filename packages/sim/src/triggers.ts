import { MAX_TRIGGER_DEPTH, type AbilityDefinition } from "@packbound/shared";

import { applyEffect } from "./effects";
import { addWarning, collectAbilitySources, emit, opponentOf } from "./state";
import { hasStatus } from "./statuses";
import type { AbilitySource, MutableCombatState, TriggerContext } from "./types";

const abilityTriggeredEventTypes = new Set<AbilityDefinition["trigger"]["type"]>([
  "OnAllyDestroyed",
  "OnEnemyDestroyed",
  "WhenFirstAllyDestroyed",
  "WhenFirstEnemyDestroyed"
]);

const sourcePosition = (source: AbilitySource) =>
  source.unit?.position ?? source.placement?.position;

const conditionPasses = (
  state: MutableCombatState,
  source: AbilitySource,
  ability: AbilityDefinition
): boolean => {
  switch (ability.condition.type) {
    case "Always":
      return true;
    case "HasTag":
      return source.def.tags.includes(ability.condition.tag);
    case "HasKeyword":
      return source.unit?.keywords.includes(ability.condition.keyword) ?? false;
    case "IsDamaged":
      return source.unit ? source.unit.currentHealth < source.unit.maxHealth : false;
    case "IsAdjacent":
      return true;
    case "IsInRow":
      return sourcePosition(source)?.row === ability.condition.row;
    case "IsInColumn":
      return sourcePosition(source)?.col === ability.condition.col;
    case "HasStatus":
      return source.unit ? hasStatus(source.unit, ability.condition.status) : false;
    case "CombatChargeAvailable":
      return source.sideState.combatCharge >= ability.condition.amount;
    case "AshesHasCard":
      return source.sideState.ashes.length > 0;
    case "AllyDestroyedThisCombat":
      return source.sideState.destroyedUnitsThisCombat > 0;
    case "EnemyDestroyedThisCombat":
      return state.sides[opponentOf(source.sideState.side)].destroyedUnitsThisCombat > 0;
  }
};

export const resolveAbilities = (
  state: MutableCombatState,
  source: AbilitySource,
  triggerType: AbilityDefinition["trigger"]["type"],
  depth: number,
  context?: TriggerContext
): void => {
  if (depth > MAX_TRIGGER_DEPTH) {
    addWarning(
      state,
      "MAX_TRIGGER_DEPTH_REACHED",
      `Trigger depth cap of ${MAX_TRIGGER_DEPTH} was reached.`
    );
    return;
  }

  for (const ability of source.def.abilities) {
    if (
      ability.trigger.type !== triggerType ||
      !conditionPasses(state, source, ability)
    ) {
      continue;
    }
    if (abilityTriggeredEventTypes.has(triggerType)) {
      emit(state, {
        type: "AbilityTriggered",
        timeMs: state.timeMs,
        abilityId: ability.id,
        trigger: triggerType,
        sourceCardInstanceId: source.cardInstanceId,
        sourceDefId: source.def.id,
        sourceSide: source.sideState.side,
        ownerId: source.sideState.playerId,
        ...(context?.causedBy ? { causedBy: context.causedBy } : {})
      });
    }
    applyEffect(state, source, ability, ability.effect, depth + 1, resolveAbilities);
  }
};

export const resolveEntryTriggers = (state: MutableCombatState): void => {
  const units = [...state.sides.playerA.units, ...state.sides.playerB.units].sort(
    (a, b) => a.unitId.localeCompare(b.unitId)
  );
  for (const unit of units) {
    resolveAbilities(
      state,
      {
        sideState: state.sides[unit.side],
        cardInstanceId: unit.cardInstanceId,
        def: unit.def,
        unit
      },
      "OnEntry",
      0
    );
  }
};

export const resolveCombatStartTriggers = (state: MutableCombatState): void => {
  const sources = [
    ...collectAbilitySources(state.sides.playerA),
    ...collectAbilitySources(state.sides.playerB)
  ].sort((a, b) => a.cardInstanceId.localeCompare(b.cardInstanceId));

  for (const source of sources) {
    resolveAbilities(state, source, "OnCombatStart", 0);
  }
};
