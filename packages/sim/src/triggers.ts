import { MAX_TRIGGER_DEPTH, type AbilityDefinition } from "@packbound/shared";

import { applyEffect } from "./effects";
import { addWarning, collectAbilitySources, opponentOf } from "./state";
import { hasStatus } from "./statuses";
import type { AbilitySource, MutableCombatState } from "./types";

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
      return source.unit?.position.row === ability.condition.row;
    case "IsInColumn":
      return source.unit?.position.col === ability.condition.col;
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
  depth: number
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
