import { createRng } from "@packbound/rules";
import {
  COMBAT_TICK_MS,
  MAX_COMBAT_EVENTS,
  asUnitInstanceId,
  hexDistance,
  type BoardPlacement,
  type BoardPosition,
  type CardDefinition,
  type CardInstance,
  type CombatEvent,
  type CombatWinner,
  type PlayerSide,
  type UnitInstance
} from "@packbound/shared";

import type {
  AbilitySource,
  CombatantSetup,
  CombatStateSnapshot,
  MutableCombatState,
  MutableSideState,
  MutableUnit,
  ResolveCombatInput,
  UnitLikeDefinition
} from "./types";

export const opponentOf = (side: PlayerSide): PlayerSide =>
  side === "playerA" ? "playerB" : "playerA";

export const isUnitDefinition = (def: CardDefinition): def is UnitLikeDefinition =>
  def.cardType === "Unit" || def.cardType === "Echo";

export const attackIntervalMs = (unit: MutableUnit): number =>
  Math.max(COMBAT_TICK_MS, Math.round(1000 / unit.attackSpeed));

export const toUnitInstance = (unit: MutableUnit): UnitInstance => ({
  unitId: unit.unitId,
  cardInstanceId: unit.cardInstanceId,
  defId: unit.def.id,
  ownerId: unit.ownerId,
  side: unit.side,
  position: unit.position,
  attack: unit.attack,
  maxHealth: unit.maxHealth,
  currentHealth: unit.currentHealth,
  attackSpeed: unit.attackSpeed,
  range: unit.range,
  keywords: unit.keywords as UnitInstance["keywords"],
  statuses: unit.statuses,
  attachments: [],
  attackTimerMs: unit.attackTimerMs,
  summonedThisCombat: unit.summonedThisCombat,
  isEcho: unit.isEcho
});

export const emit = (state: MutableCombatState, event: CombatEvent): void => {
  if (state.events.length >= MAX_COMBAT_EVENTS) {
    if (!state.ended) {
      state.warnings.push({
        code: "MAX_COMBAT_EVENTS_REACHED",
        message: `Combat event cap of ${MAX_COMBAT_EVENTS} was reached.`
      });
      state.ended = true;
    }
    return;
  }
  state.events.push(event);
};

export const addWarning = (
  state: MutableCombatState,
  code: string,
  message: string
): void => {
  state.warnings.push({ code, message });
};

export const distance = (a: BoardPosition, b: BoardPosition): number => hexDistance(a, b);

export const hasKeyword = (unit: MutableUnit, keyword: string): boolean =>
  unit.keywords.includes(keyword);

export const aliveUnits = (side: MutableSideState): readonly MutableUnit[] =>
  side.units.filter((unit) => unit.currentHealth > 0);

export const collectAbilitySources = (
  side: MutableSideState
): readonly AbilitySource[] => {
  const sources: AbilitySource[] = [];

  for (const unit of aliveUnits(side)) {
    sources.push({
      sideState: side,
      cardInstanceId: unit.cardInstanceId,
      def: unit.def,
      unit
    });
  }

  for (const permanent of side.permanents) {
    sources.push({
      sideState: side,
      cardInstanceId: permanent.cardInstanceId,
      def: permanent.def,
      placement: permanent.placement
    });
  }

  sources.sort((a, b) => a.cardInstanceId.localeCompare(b.cardInstanceId));
  return sources;
};

const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

export const makeUnitFromPlacement = (
  side: PlayerSide,
  placement: BoardPlacement,
  def: UnitLikeDefinition,
  sourceCard?: CardInstance
): MutableUnit => {
  const upgradeLevel = sourceCard?.upgradeLevel ?? 0;
  const attack = def.stats.attack + upgradeLevel;
  const health = def.stats.health + upgradeLevel;

  return {
    unitId: asUnitInstanceId(`${side}:${placement.cardInstanceId}`),
    cardInstanceId: placement.cardInstanceId,
    def,
    ownerId: placement.ownerId,
    side,
    position: placement.position,
    attack,
    maxHealth: health,
    currentHealth: health,
    attackSpeed: def.stats.attackSpeed,
    range: def.stats.range,
    keywords: [...def.keywords],
    statuses: def.keywords.includes("Barrier") ? [{ type: "Barrier" }] : [],
    attackTimerMs: def.keywords.includes("Quickstart")
      ? 0
      : Math.round(1000 / def.stats.attackSpeed),
    summonedThisCombat: false,
    isEcho: def.cardType === "Echo",
    ...(sourceCard ? { sourceCard: copyCard({ ...sourceCard, zone: "board" }) } : {})
  };
};

const buildSideState = (
  inputCatalog: ResolveCombatInput["catalog"],
  setup: CombatantSetup,
  side: PlayerSide
): MutableSideState => {
  const units: MutableUnit[] = [];
  const permanents: MutableSideState["permanents"] = [];
  const activeCardsById = new Map(
    (setup.activeCards ?? []).map((card) => [card.instanceId, copyCard(card)] as const)
  );

  for (const placement of setup.board.placements) {
    const def = inputCatalog.cardsById.get(placement.defId);
    if (!def) {
      continue;
    }

    if (isUnitDefinition(def)) {
      units.push(
        makeUnitFromPlacement(
          side,
          placement,
          def,
          activeCardsById.get(placement.cardInstanceId)
        )
      );
    } else if (def.cardType === "Relic" || def.cardType === "Field") {
      permanents.push({
        cardInstanceId: placement.cardInstanceId,
        placement,
        def
      });
    }
  }

  const techniques: MutableSideState["techniques"] = [];
  for (const card of setup.spellrail.cards) {
    const def = inputCatalog.cardsById.get(card.defId);
    if (def?.cardType === "Technique") {
      techniques.push({ card, def, used: false });
    }
  }

  let combatChargePerSecond = 0;
  for (const source of setup.sourceRow.cards) {
    const def = inputCatalog.cardsById.get(source.defId);
    if (def?.cardType === "Source") {
      combatChargePerSecond += def.source.combatChargePerSecond;
    }
  }

  return {
    side,
    playerId: setup.playerId,
    units,
    permanents,
    techniques,
    ashes: [...(setup.startingAshes ?? [])],
    void: [],
    combatCharge: 0,
    combatChargePerSecond,
    nextSummonIndex: 0,
    firstAllyBelowHealthTriggered: false,
    destroyedUnitsThisCombat: 0,
    firstAllyDestroyedTriggerSources: new Set(),
    firstEnemyDestroyedTriggerSources: new Set()
  };
};

export const createInitialState = (input: ResolveCombatInput): MutableCombatState => ({
  catalog: input.catalog,
  rng: createRng(input.seed),
  events: [],
  warnings: [],
  sides: {
    playerA: buildSideState(input.catalog, input.playerA, "playerA"),
    playerB: buildSideState(input.catalog, input.playerB, "playerB")
  },
  timeMs: 0,
  ended: false
});

export const winnerForState = (state: MutableCombatState): CombatWinner | undefined => {
  const playerAAlive = aliveUnits(state.sides.playerA).length > 0;
  const playerBAlive = aliveUnits(state.sides.playerB).length > 0;

  if (playerAAlive && playerBAlive) {
    return undefined;
  }
  if (playerAAlive) {
    return "playerA";
  }
  if (playerBAlive) {
    return "playerB";
  }
  return "draw";
};

export const snapshot = (state: MutableCombatState): CombatStateSnapshot => ({
  timeMs: state.timeMs,
  units: [...state.sides.playerA.units, ...state.sides.playerB.units]
    .map(toUnitInstance)
    .sort((a, b) => a.unitId.localeCompare(b.unitId)),
  ashes: {
    playerA: [...state.sides.playerA.ashes],
    playerB: [...state.sides.playerB.ashes]
  },
  void: {
    playerA: state.sides.playerA.void.map((entry) => toUnitInstance(entry.unit)),
    playerB: state.sides.playerB.void.map((entry) => toUnitInstance(entry.unit))
  },
  combatCharge: {
    playerA: state.sides.playerA.combatCharge,
    playerB: state.sides.playerB.combatCharge
  }
});
