import type { AbilityDefinition } from "@packbound/shared";

import { aliveUnits, distance, hasKeyword, opponentOf } from "./state";
import type { AbilitySource, MutableCombatState, MutableUnit } from "./types";

export const selectEnemyTarget = (
  attacker: MutableUnit,
  state: MutableCombatState
): MutableUnit | undefined => {
  const enemySide = state.sides[opponentOf(attacker.side)];
  let candidates = [...aliveUnits(enemySide)];
  if (candidates.length === 0) {
    return undefined;
  }

  const guards = candidates.filter((unit) => hasKeyword(unit, "Guard"));
  if (guards.length > 0) {
    candidates = guards;
  }

  if (hasKeyword(attacker, "AntiAir")) {
    const airborne = candidates.filter((unit) => hasKeyword(unit, "Airborne"));
    if (airborne.length > 0) {
      candidates = airborne;
    }
  }

  if (hasKeyword(attacker, "Airborne")) {
    candidates.sort(
      (a, b) =>
        a.currentHealth - b.currentHealth ||
        distance(attacker.position, a.position) -
          distance(attacker.position, b.position) ||
        a.unitId.localeCompare(b.unitId)
    );
  } else {
    candidates.sort(
      (a, b) =>
        distance(attacker.position, a.position) -
          distance(attacker.position, b.position) ||
        a.currentHealth - b.currentHealth ||
        a.unitId.localeCompare(b.unitId)
    );
  }

  return candidates[0];
};

export const targetsForAbility = (
  state: MutableCombatState,
  source: AbilitySource,
  ability: AbilityDefinition
): readonly MutableUnit[] => {
  const allied = aliveUnits(source.sideState);
  const enemy = aliveUnits(state.sides[opponentOf(source.sideState.side)]);
  const sourceUnit = source.unit;

  switch (ability.target.type) {
    case "Self":
    case "Source":
      return sourceUnit ? [sourceUnit] : [];
    case "NearestEnemy":
      return sourceUnit
        ? [...enemy]
            .sort(
              (a, b) =>
                distance(sourceUnit.position, a.position) -
                  distance(sourceUnit.position, b.position) ||
                a.unitId.localeCompare(b.unitId)
            )
            .slice(0, 1)
        : enemy.slice(0, 1);
    case "LowestHealthAlliedUnit":
      return [...allied]
        .sort(
          (a, b) => a.currentHealth - b.currentHealth || a.unitId.localeCompare(b.unitId)
        )
        .slice(0, 1);
    case "LowestHealthEnemy":
      return [...enemy]
        .sort(
          (a, b) => a.currentHealth - b.currentHealth || a.unitId.localeCompare(b.unitId)
        )
        .slice(0, 1);
    case "HighestAttackEnemy":
      return [...enemy]
        .sort((a, b) => b.attack - a.attack || a.unitId.localeCompare(b.unitId))
        .slice(0, 1);
    case "RandomEnemy":
      return enemy.length > 0 ? [state.rng.pick(enemy)] : [];
    case "AdjacentAllied":
      if (!sourceUnit) {
        return [];
      }
      return allied.filter((unit) => distance(sourceUnit.position, unit.position) === 1);
    case "AdjacentEnemy":
      if (!sourceUnit) {
        return [];
      }
      return enemy.filter((unit) => distance(sourceUnit.position, unit.position) === 1);
    case "SameRowEnemy":
      return sourceUnit
        ? enemy.filter((unit) => unit.position.row === sourceUnit.position.row)
        : [];
    case "SameColumnEnemy":
      return sourceUnit
        ? enemy.filter((unit) => unit.position.col === sourceUnit.position.col)
        : [];
    case "AllAllied":
      return allied;
    case "AllEnemies":
      return enemy;
    case "AlliedUnitWithTag": {
      const tag = ability.target.tag;
      return allied.filter((unit) => unit.def.tags.includes(tag));
    }
    case "EnemyUnitWithTag": {
      const tag = ability.target.tag;
      return enemy.filter((unit) => unit.def.tags.includes(tag));
    }
    case "EmptyAdjacentTile":
    case "EmptyBacklineTile":
    case "CardInAshes":
    case "CardInVoid":
      return [];
  }
};
