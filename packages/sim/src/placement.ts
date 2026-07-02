import {
  BOARD_COLS,
  BOARD_ROWS,
  asCardInstanceId,
  chargeCostTotal,
  positionKey,
  type AbilityEffect,
  type BoardPlacement,
  type BoardPosition,
  type UnitInstanceId
} from "@packbound/shared";

import { addWarning, emit, isUnitDefinition, makeUnitFromPlacement } from "./state";
import type {
  AbilitySource,
  MutableCombatState,
  MutableSideState,
  MutableUnit,
  ResolveAbilities
} from "./types";

export const occupiedPositions = (side: MutableSideState): Set<string> =>
  new Set(side.units.map((unit) => positionKey(unit.position)));

export const findOpenPosition = (
  side: MutableSideState,
  placement: "FirstOpen" | "AdjacentToSource" | "Backline",
  sourcePosition?: BoardPosition
): BoardPosition | undefined => {
  const occupied = occupiedPositions(side);
  const rows =
    placement === "Backline"
      ? side.side === "playerA"
        ? [BOARD_ROWS - 1]
        : [0]
      : [...Array.from({ length: BOARD_ROWS }, (_, index) => index)];

  if (placement === "AdjacentToSource" && sourcePosition) {
    const adjacent = [
      { row: sourcePosition.row - 1, col: sourcePosition.col, layer: "ground" },
      { row: sourcePosition.row + 1, col: sourcePosition.col, layer: "ground" },
      { row: sourcePosition.row, col: sourcePosition.col - 1, layer: "ground" },
      { row: sourcePosition.row, col: sourcePosition.col + 1, layer: "ground" }
    ] satisfies BoardPosition[];
    const openAdjacent = adjacent.find(
      (position) =>
        position.row >= 0 &&
        position.row < BOARD_ROWS &&
        position.col >= 0 &&
        position.col < BOARD_COLS &&
        !occupied.has(positionKey(position))
    );
    if (openAdjacent) {
      return openAdjacent;
    }
  }

  for (const row of rows) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const position = { row, col, layer: "ground" } satisfies BoardPosition;
      if (!occupied.has(positionKey(position))) {
        return position;
      }
    }
  }

  return undefined;
};

export const removeUnit = (side: MutableSideState, unitId: UnitInstanceId): void => {
  side.units = side.units.filter((unit) => unit.unitId !== unitId);
};

export const summonUnit = (
  state: MutableCombatState,
  source: AbilitySource,
  effect: Extract<AbilityEffect, { readonly type: "SummonEcho" | "SummonUnit" }>,
  depth: number,
  resolveAbilities: ResolveAbilities
): void => {
  const def = state.catalog.cardsById.get(effect.cardDefId);
  if (!def || !isUnitDefinition(def)) {
    addWarning(
      state,
      "INVALID_SUMMON_DEF",
      `${effect.cardDefId} cannot be summoned because it is not a Unit or Echo.`
    );
    return;
  }

  const position = findOpenPosition(
    source.sideState,
    effect.placement,
    source.unit?.position ?? source.placement?.position
  );
  if (!position) {
    addWarning(state, "NO_SUMMON_TILE", `No open tile for ${def.name}.`);
    return;
  }

  const index = source.sideState.nextSummonIndex;
  source.sideState.nextSummonIndex += 1;
  const cardInstanceId = asCardInstanceId(
    `${source.sideState.side}:summon:${effect.cardDefId}:${index}`
  );
  const placement = {
    cardInstanceId,
    defId: def.id,
    ownerId: source.sideState.playerId,
    position
  } satisfies BoardPlacement;
  const unit = makeUnitFromPlacement(source.sideState.side, placement, def);
  unit.summonedThisCombat = true;
  unit.isEcho = effect.type === "SummonEcho" || def.cardType === "Echo";
  source.sideState.units.push(unit);

  emit(state, {
    type: "UnitSummoned",
    timeMs: state.timeMs,
    unitId: unit.unitId,
    cardInstanceId,
    defId: def.id,
    side: unit.side,
    ownerId: unit.ownerId,
    isEcho: unit.isEcho,
    position
  });

  resolveAbilities(
    state,
    {
      sideState: source.sideState,
      cardInstanceId,
      def,
      unit
    },
    "OnEntry",
    depth
  );
};

export const recallUnit = (
  state: MutableCombatState,
  source: AbilitySource,
  effect: Extract<AbilityEffect, { readonly type: "Recall" }>,
  depth: number,
  resolveAbilities: ResolveAbilities
): void => {
  const candidateIndex = source.sideState.ashes.findIndex((card) => {
    const def = state.catalog.cardsById.get(card.defId);
    if (!def || !isUnitDefinition(def)) {
      return false;
    }
    return (
      effect.maxChargeCost === undefined ||
      chargeCostTotal(def.cost) <= effect.maxChargeCost
    );
  });

  if (candidateIndex < 0) {
    return;
  }

  const card = source.sideState.ashes[candidateIndex];
  if (!card) {
    return;
  }
  const def = state.catalog.cardsById.get(card.defId);
  if (!def || !isUnitDefinition(def)) {
    return;
  }

  const position = findOpenPosition(source.sideState, effect.placement);
  if (!position) {
    addWarning(state, "NO_RECALL_TILE", `No open tile to Recall ${def.name}.`);
    return;
  }

  source.sideState.ashes = source.sideState.ashes.filter(
    (_entry, index) => index !== candidateIndex
  );

  const placement = {
    cardInstanceId: card.instanceId,
    defId: card.defId,
    ownerId: card.ownerId,
    position
  } satisfies BoardPlacement;
  const unit = makeUnitFromPlacement(source.sideState.side, placement, def, {
    ...card,
    zone: "board"
  });
  unit.currentHealth = Math.min(effect.healthOverride ?? unit.maxHealth, unit.maxHealth);
  unit.summonedThisCombat = true;
  unit.isEcho = effect.becomesEcho ?? unit.isEcho;
  source.sideState.units.push(unit);

  emit(state, {
    type: "UnitRecalled",
    timeMs: state.timeMs,
    unitId: unit.unitId,
    cardInstanceId: card.instanceId,
    defId: def.id,
    side: unit.side,
    ownerId: unit.ownerId,
    isEcho: unit.isEcho,
    from: "ashes",
    position
  });

  resolveAbilities(
    state,
    {
      sideState: source.sideState,
      cardInstanceId: card.instanceId,
      def,
      unit
    },
    "OnEntry",
    depth
  );
};

export const phaseUnit = (
  state: MutableCombatState,
  source: AbilitySource,
  unit: MutableUnit,
  effect: Extract<AbilityEffect, { readonly type: "Phase" }>
): void => {
  removeUnit(source.sideState, unit.unitId);
  if (effect.clearNegativeStatuses) {
    unit.statuses = unit.statuses.filter((status) => status.type === "Barrier");
  }
  source.sideState.void.push({
    unit,
    returnAtMs: state.timeMs + effect.delayMs,
    originalPosition: unit.position,
    retriggerEntryEffects: effect.retriggerEntryEffects
  });
  emit(state, {
    type: "UnitPhasedOut",
    timeMs: state.timeMs,
    unitId: unit.unitId,
    cardInstanceId: unit.cardInstanceId,
    defId: unit.def.id,
    side: unit.side,
    ownerId: unit.ownerId,
    isEcho: unit.isEcho
  });
};

export const returnPhasedUnits = (
  state: MutableCombatState,
  resolveAbilities: ResolveAbilities
): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    const returning = side.void.filter((entry) => entry.returnAtMs <= state.timeMs);
    side.void = side.void.filter((entry) => entry.returnAtMs > state.timeMs);

    for (const entry of returning) {
      const occupied = occupiedPositions(side);
      const originalOpen = !occupied.has(positionKey(entry.originalPosition));
      const fallback = findOpenPosition(side, "FirstOpen");
      const position = originalOpen ? entry.originalPosition : fallback;
      if (!position) {
        side.void.push(entry);
        continue;
      }

      entry.unit.position = position;
      side.units.push(entry.unit);
      emit(state, {
        type: "UnitPhasedIn",
        timeMs: state.timeMs,
        unitId: entry.unit.unitId,
        cardInstanceId: entry.unit.cardInstanceId,
        defId: entry.unit.def.id,
        side: entry.unit.side,
        ownerId: entry.unit.ownerId,
        isEcho: entry.unit.isEcho,
        position
      });

      if (entry.retriggerEntryEffects) {
        resolveAbilities(
          state,
          {
            sideState: side,
            cardInstanceId: entry.unit.cardInstanceId,
            def: entry.unit.def,
            unit: entry.unit
          },
          "OnEntry",
          0
        );
      }
    }
  }
};
