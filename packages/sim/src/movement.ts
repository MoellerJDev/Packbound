import {
  isBoardPositionInBounds,
  positionKey,
  type BoardPosition
} from "@packbound/shared";

import { aliveUnits, distance, emit } from "./state";
import type { MutableCombatState, MutableUnit } from "./types";

const groundPosition = (row: number, col: number): BoardPosition => ({
  row,
  col,
  layer: "ground"
});

export const isGroundCellOccupied = (
  state: MutableCombatState,
  position: BoardPosition,
  movingUnit?: MutableUnit
): boolean => {
  if (position.layer !== "ground") {
    return false;
  }

  const occupied = [
    ...aliveUnits(state.sides.playerA),
    ...aliveUnits(state.sides.playerB)
  ].some(
    (unit) =>
      unit.unitId !== movingUnit?.unitId &&
      unit.position.layer === "ground" &&
      positionKey(unit.position) === positionKey(position)
  );

  return occupied;
};

export const nextStepToward = (
  attacker: MutableUnit,
  target: MutableUnit,
  state: MutableCombatState
): BoardPosition | undefined => {
  const rowDistance = Math.abs(target.position.row - attacker.position.row);
  const colDistance = Math.abs(target.position.col - attacker.position.col);
  const rowDelta = Math.sign(target.position.row - attacker.position.row);
  const colDelta = Math.sign(target.position.col - attacker.position.col);
  const currentDistance = distance(attacker.position, target.position);
  const rowStep =
    rowDelta === 0
      ? undefined
      : groundPosition(attacker.position.row + rowDelta, attacker.position.col);
  const colStep =
    colDelta === 0
      ? undefined
      : groundPosition(attacker.position.row, attacker.position.col + colDelta);
  const primarySteps =
    colDistance >= rowDistance ? [colStep, rowStep] : [rowStep, colStep];

  return primarySteps.find(
    (position): position is BoardPosition =>
      position !== undefined &&
      isBoardPositionInBounds(position) &&
      distance(position, target.position) < currentDistance &&
      !isGroundCellOccupied(state, position, attacker)
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
