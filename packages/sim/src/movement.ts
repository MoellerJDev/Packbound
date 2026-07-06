import {
  hexStepToward,
  isCombatPositionInBounds,
  positionKey,
  type BoardPosition
} from "@packbound/shared";

import { aliveUnits, emit } from "./state";
import type { MutableCombatState, MutableUnit } from "./types";

const occupiedGroundPositionKeys = (
  state: MutableCombatState,
  movingUnit?: MutableUnit
): Set<string> =>
  new Set(
    [...aliveUnits(state.sides.playerA), ...aliveUnits(state.sides.playerB)]
      .filter(
        (unit) => unit.unitId !== movingUnit?.unitId && unit.position.layer === "ground"
      )
      .map((unit) => positionKey(unit.position))
  );

export const isGroundCellOccupied = (
  state: MutableCombatState,
  position: BoardPosition,
  movingUnit?: MutableUnit
): boolean => {
  if (position.layer !== "ground") {
    return false;
  }

  return occupiedGroundPositionKeys(state, movingUnit).has(positionKey(position));
};

export const nextStepToward = (
  attacker: MutableUnit,
  target: MutableUnit,
  state: MutableCombatState
): BoardPosition | undefined => {
  return hexStepToward(
    attacker.position,
    target.position,
    occupiedGroundPositionKeys(state, attacker),
    isCombatPositionInBounds
  );
};

export const moveUnitOneStepTowardTarget = (
  state: MutableCombatState,
  attacker: MutableUnit,
  target: MutableUnit
): boolean => {
  const nextPosition = nextStepToward(attacker, target, state);
  if (!nextPosition) {
    return false;
  }

  const from = attacker.position;
  attacker.position = nextPosition;
  emit(state, {
    type: "UnitMoved",
    timeMs: state.timeMs,
    unitId: attacker.unitId,
    cardInstanceId: attacker.cardInstanceId,
    defId: attacker.def.id,
    side: attacker.side,
    ownerId: attacker.ownerId,
    from,
    to: nextPosition,
    targetId: target.unitId,
    targetCardInstanceId: target.cardInstanceId,
    targetDefId: target.def.id,
    targetSide: target.side
  });

  return true;
};
