import type { ContentCatalog } from "@packbound/content";
import { createRng, type SeededRng } from "@packbound/rules";
import {
  BOARD_COLS,
  BOARD_ROWS,
  COMBAT_TICK_MS,
  MAX_COMBAT_DURATION_MS,
  MAX_COMBAT_EVENTS,
  MAX_TRIGGER_DEPTH,
  asCardInstanceId,
  asUnitInstanceId,
  chargeCostTotal,
  positionKey,
  type AbilityDefinition,
  type AbilityEffect,
  type ActiveStatus,
  type BoardPlacement,
  type BoardPosition,
  type BoardState,
  type CardDefinition,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent,
  type CombatWinner,
  type DestructionReason,
  type EchoCardDefinition,
  type PlayerId,
  type PlayerSide,
  type SimulationWarning,
  type SourceRowState,
  type SpellrailState,
  type TechniqueCardDefinition,
  type UnitCardDefinition,
  type UnitInstance,
  type UnitInstanceId
} from "@packbound/shared";

type UnitLikeDefinition = UnitCardDefinition | EchoCardDefinition;

export type CombatantSetup = {
  readonly playerId: PlayerId;
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

export type ResolveCombatInput = {
  readonly catalog: ContentCatalog;
  readonly seed: string;
  readonly rulesVersion?: string;
  readonly playerA: CombatantSetup;
  readonly playerB: CombatantSetup;
  readonly maxDurationMs?: number;
};

export type CombatStateSnapshot = {
  readonly timeMs: number;
  readonly units: readonly UnitInstance[];
  readonly ashes: Readonly<Record<PlayerSide, readonly CardInstance[]>>;
  readonly void: Readonly<Record<PlayerSide, readonly UnitInstance[]>>;
  readonly combatCharge: Readonly<Record<PlayerSide, number>>;
};

export type CombatResult = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly finalState: CombatStateSnapshot;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
  readonly rulesVersion: string;
  readonly seed: string;
};

type MutableUnit = {
  unitId: UnitInstanceId;
  cardInstanceId: CardInstanceId;
  def: UnitLikeDefinition;
  ownerId: PlayerId;
  side: PlayerSide;
  position: BoardPosition;
  attack: number;
  maxHealth: number;
  currentHealth: number;
  attackSpeed: number;
  range: number;
  keywords: string[];
  statuses: ActiveStatus[];
  attackTimerMs: number;
  summonedThisCombat: boolean;
  isEcho: boolean;
};

type TechniqueRuntime = {
  readonly card: CardInstance;
  readonly def: TechniqueCardDefinition;
  used: boolean;
};

type PermanentRuntime = {
  readonly cardInstanceId: CardInstanceId;
  readonly placement: BoardPlacement;
  readonly def: CardDefinition;
};

type PhasedUnit = {
  readonly unit: MutableUnit;
  readonly returnAtMs: number;
  readonly originalPosition: BoardPosition;
  readonly retriggerEntryEffects: boolean;
};

type MutableSideState = {
  readonly side: PlayerSide;
  readonly playerId: PlayerId;
  units: MutableUnit[];
  readonly permanents: PermanentRuntime[];
  readonly techniques: TechniqueRuntime[];
  ashes: CardInstance[];
  void: PhasedUnit[];
  combatCharge: number;
  readonly combatChargePerSecond: number;
  nextSummonIndex: number;
  firstAllyBelowHealthTriggered: boolean;
};

type MutableCombatState = {
  readonly catalog: ContentCatalog;
  readonly rng: SeededRng;
  readonly events: CombatEvent[];
  readonly warnings: SimulationWarning[];
  readonly sides: Record<PlayerSide, MutableSideState>;
  timeMs: number;
  ended: boolean;
};

type AbilitySource = {
  readonly sideState: MutableSideState;
  readonly cardInstanceId: CardInstanceId;
  readonly def: CardDefinition;
  readonly unit?: MutableUnit;
  readonly placement?: BoardPlacement;
};

const opponentOf = (side: PlayerSide): PlayerSide =>
  side === "playerA" ? "playerB" : "playerA";

const isUnitDefinition = (def: CardDefinition): def is UnitLikeDefinition =>
  def.cardType === "Unit" || def.cardType === "Echo";

const attackIntervalMs = (unit: MutableUnit): number =>
  Math.max(COMBAT_TICK_MS, Math.round(1000 / unit.attackSpeed));

const toUnitInstance = (unit: MutableUnit): UnitInstance => ({
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

const emit = (state: MutableCombatState, event: CombatEvent): void => {
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

const addWarning = (state: MutableCombatState, code: string, message: string): void => {
  state.warnings.push({ code, message });
};

const distance = (a: BoardPosition, b: BoardPosition): number =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const hasKeyword = (unit: MutableUnit, keyword: string): boolean =>
  unit.keywords.includes(keyword);

const hasStatus = (unit: MutableUnit, status: string): boolean =>
  unit.statuses.some((entry) => entry.type === status);

const aliveUnits = (side: MutableSideState): readonly MutableUnit[] =>
  side.units.filter((unit) => unit.currentHealth > 0);

const makeUnitFromPlacement = (
  side: PlayerSide,
  placement: BoardPlacement,
  def: UnitLikeDefinition
): MutableUnit => ({
  unitId: asUnitInstanceId(`${side}:${placement.cardInstanceId}`),
  cardInstanceId: placement.cardInstanceId,
  def,
  ownerId: placement.ownerId,
  side,
  position: placement.position,
  attack: def.stats.attack,
  maxHealth: def.stats.health,
  currentHealth: def.stats.health,
  attackSpeed: def.stats.attackSpeed,
  range: def.stats.range,
  keywords: [...def.keywords],
  statuses: def.keywords.includes("Barrier") ? [{ type: "Barrier" }] : [],
  attackTimerMs: def.keywords.includes("Quickstart")
    ? 0
    : Math.round(1000 / def.stats.attackSpeed),
  summonedThisCombat: false,
  isEcho: def.cardType === "Echo"
});

const buildSideState = (
  catalog: ContentCatalog,
  setup: CombatantSetup,
  side: PlayerSide
): MutableSideState => {
  const units: MutableUnit[] = [];
  const permanents: PermanentRuntime[] = [];

  for (const placement of setup.board.placements) {
    const def = catalog.cardsById.get(placement.defId);
    if (!def) {
      continue;
    }

    if (isUnitDefinition(def)) {
      units.push(makeUnitFromPlacement(side, placement, def));
    } else if (def.cardType === "Relic" || def.cardType === "Field") {
      permanents.push({
        cardInstanceId: placement.cardInstanceId,
        placement,
        def
      });
    }
  }

  const techniques: TechniqueRuntime[] = [];
  for (const card of setup.spellrail.cards) {
    const def = catalog.cardsById.get(card.defId);
    if (def?.cardType === "Technique") {
      techniques.push({ card, def, used: false });
    }
  }

  let combatChargePerSecond = 0;
  for (const source of setup.sourceRow.cards) {
    const def = catalog.cardsById.get(source.defId);
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
    firstAllyBelowHealthTriggered: false
  };
};

const createInitialState = (input: ResolveCombatInput): MutableCombatState => ({
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

const occupiedPositions = (side: MutableSideState): Set<string> =>
  new Set(side.units.map((unit) => positionKey(unit.position)));

const findOpenPosition = (
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

const selectEnemyTarget = (
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

const unitCardInstanceToAshes = (unit: MutableUnit): CardInstance => ({
  instanceId: unit.cardInstanceId,
  defId: unit.def.id,
  ownerId: unit.ownerId,
  zone: "ashes",
  modifiers: [],
  upgradeLevel: 0
});

const applyStatus = (
  state: MutableCombatState,
  target: MutableUnit,
  status: ActiveStatus
): void => {
  if (status.type === "Barrier" && hasStatus(target, "Barrier")) {
    return;
  }

  target.statuses = [
    ...target.statuses.filter((entry) => entry.type !== status.type),
    status
  ];
  emit(state, {
    type: "StatusApplied",
    timeMs: state.timeMs,
    targetId: target.unitId,
    status: status.type,
    ...(status.remainingMs ? { durationMs: status.remainingMs } : {})
  });
};

const removeUnit = (side: MutableSideState, unitId: UnitInstanceId): void => {
  side.units = side.units.filter((unit) => unit.unitId !== unitId);
};

const resolveAbilities = (
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
    if (ability.trigger.type !== triggerType || !conditionPasses(source, ability)) {
      continue;
    }
    applyEffect(state, source, ability, ability.effect, depth + 1);
  }
};

const destroyUnit = (
  state: MutableCombatState,
  unit: MutableUnit,
  reason: DestructionReason,
  depth: number
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

const applyDamage = (
  state: MutableCombatState,
  sourceId: string,
  target: MutableUnit,
  amount: number,
  reason: DestructionReason,
  depth: number
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
    destroyUnit(state, target, reason, depth + 1);
  }
};

const conditionPasses = (source: AbilitySource, ability: AbilityDefinition): boolean => {
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
    case "EnemyDestroyedThisCombat":
      return true;
  }
};

const targetsForAbility = (
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

const summonUnit = (
  state: MutableCombatState,
  source: AbilitySource,
  effect: Extract<AbilityEffect, { readonly type: "SummonEcho" | "SummonUnit" }>,
  depth: number
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

const recallUnit = (
  state: MutableCombatState,
  source: AbilitySource,
  effect: Extract<AbilityEffect, { readonly type: "Recall" }>,
  depth: number
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
  const unit = makeUnitFromPlacement(source.sideState.side, placement, def);
  unit.currentHealth = Math.min(effect.healthOverride ?? unit.maxHealth, unit.maxHealth);
  unit.summonedThisCombat = true;
  unit.isEcho = effect.becomesEcho ?? unit.isEcho;
  source.sideState.units.push(unit);

  emit(state, {
    type: "UnitRecalled",
    timeMs: state.timeMs,
    unitId: unit.unitId,
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

const phaseUnit = (
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
    unitId: unit.unitId
  });
};

const applyEffect = (
  state: MutableCombatState,
  source: AbilitySource,
  ability: AbilityDefinition,
  effect: AbilityEffect,
  depth: number
): void => {
  const targets = targetsForAbility(state, source, ability);

  switch (effect.type) {
    case "DealDamage":
      for (const target of targets) {
        applyDamage(
          state,
          source.cardInstanceId,
          target,
          effect.amount,
          "techniqueDamage",
          depth
        );
      }
      return;
    case "Heal":
      for (const target of targets) {
        target.currentHealth = Math.min(
          target.maxHealth,
          target.currentHealth + effect.amount
        );
      }
      return;
    case "ModifyStats":
      for (const target of targets) {
        target.attack += effect.attack ?? 0;
        target.maxHealth += effect.health ?? 0;
        target.currentHealth += effect.health ?? 0;
        target.attackSpeed += effect.attackSpeed ?? 0;
      }
      return;
    case "ApplyStatus":
      for (const target of targets) {
        applyStatus(state, target, {
          type: effect.status,
          ...(effect.durationMs ? { remainingMs: effect.durationMs } : {}),
          ...(effect.stacks ? { stacks: effect.stacks } : {})
        });
      }
      return;
    case "RemoveStatus":
      for (const target of targets) {
        target.statuses = target.statuses.filter(
          (status) => status.type !== effect.status
        );
        emit(state, {
          type: "StatusRemoved",
          timeMs: state.timeMs,
          targetId: target.unitId,
          status: effect.status,
          reason: "cleansed"
        });
      }
      return;
    case "GrantKeyword":
      for (const target of targets) {
        if (!target.keywords.includes(effect.keyword)) {
          target.keywords.push(effect.keyword);
        }
      }
      return;
    case "RemoveKeyword":
      for (const target of targets) {
        target.keywords = target.keywords.filter((keyword) => keyword !== effect.keyword);
      }
      return;
    case "SummonEcho":
    case "SummonUnit":
      summonUnit(state, source, effect, depth);
      return;
    case "Offer":
    case "Destroy":
      for (const target of targets) {
        destroyUnit(
          state,
          target,
          effect.type === "Offer" ? "offered" : "effectDestroy",
          depth
        );
      }
      return;
    case "Phase":
      for (const target of targets.slice(0, 1)) {
        phaseUnit(state, source, target, effect);
      }
      return;
    case "Recall":
      recallUnit(state, source, effect, depth);
      return;
    case "GainCombatCharge":
      source.sideState.combatCharge += effect.amount;
      emit(state, {
        type: "CombatChargeGained",
        timeMs: state.timeMs,
        playerId: source.sideState.playerId,
        amount: effect.amount
      });
      return;
    case "DrainCombatCharge":
      source.sideState.combatCharge = Math.max(
        0,
        source.sideState.combatCharge - effect.amount
      );
      return;
    case "SendToVoid":
    case "ReturnFromVoid":
    case "MoveUnit":
    case "Attach":
    case "Detach":
    case "CopyTechnique":
    case "InterruptTechnique":
    case "MillToAshes":
      addWarning(
        state,
        "UNIMPLEMENTED_EFFECT",
        `${effect.type} is schema-ready but not implemented in the MVP simulator.`
      );
      return;
  }
};

const resolveEntryTriggers = (state: MutableCombatState): void => {
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

const resolveCombatStartTriggers = (state: MutableCombatState): void => {
  const sources: AbilitySource[] = [];

  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const unit of side.units) {
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
  }

  sources.sort((a, b) => a.cardInstanceId.localeCompare(b.cardInstanceId));
  for (const source of sources) {
    resolveAbilities(state, source, "OnCombatStart", 0);
  }
};

const tickStatuses = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const unit of side.units) {
      const remaining: ActiveStatus[] = [];
      for (const status of unit.statuses) {
        if (status.remainingMs === undefined) {
          remaining.push(status);
          continue;
        }

        const nextRemaining = status.remainingMs - COMBAT_TICK_MS;
        if (nextRemaining > 0) {
          remaining.push({ ...status, remainingMs: nextRemaining });
        } else {
          emit(state, {
            type: "StatusRemoved",
            timeMs: state.timeMs,
            targetId: unit.unitId,
            status: status.type,
            reason: "expired"
          });
        }
      }
      unit.statuses = remaining;
    }
  }
};

const returnPhasedUnits = (state: MutableCombatState): void => {
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

const tickCombatCharge = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    const gain = side.combatChargePerSecond * (COMBAT_TICK_MS / 1000);
    if (gain <= 0) {
      continue;
    }
    const roundedGain = Number(gain.toFixed(4));
    side.combatCharge = Number((side.combatCharge + roundedGain).toFixed(4));
    emit(state, {
      type: "CombatChargeGained",
      timeMs: state.timeMs,
      playerId: side.playerId,
      amount: roundedGain
    });
  }
};

const techniqueTriggerReady = (
  side: MutableSideState,
  technique: TechniqueRuntime
): boolean => {
  const trigger = technique.def.technique.trigger;

  if (side.combatCharge < technique.def.technique.combatChargeCost) {
    return false;
  }

  switch (trigger.type) {
    case "AfterSeconds":
      return side.combatCharge >= technique.def.technique.combatChargeCost;
    case "WhenCombatChargeAtLeast":
      return side.combatCharge >= trigger.amount;
    case "WhenFirstAllyBelowHealthPercent": {
      if (side.firstAllyBelowHealthTriggered) {
        return false;
      }
      return side.units.some(
        (unit) => unit.currentHealth / unit.maxHealth <= trigger.percent / 100
      );
    }
    default:
      return false;
  }
};

const techniqueDelayReady = (technique: TechniqueRuntime, timeMs: number): boolean => {
  const trigger = technique.def.technique.trigger;
  return trigger.type !== "AfterSeconds" || timeMs >= trigger.seconds * 1000;
};

const resolveTechniques = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const technique of side.techniques) {
      if (
        technique.used ||
        !techniqueDelayReady(technique, state.timeMs) ||
        !techniqueTriggerReady(side, technique)
      ) {
        continue;
      }

      technique.used = true;
      side.combatCharge = Number(
        (side.combatCharge - technique.def.technique.combatChargeCost).toFixed(4)
      );

      const source: AbilitySource = {
        sideState: side,
        cardInstanceId: technique.card.instanceId,
        def: technique.def
      };
      const ability: AbilityDefinition = {
        id: `${technique.def.id}:technique`,
        trigger: technique.def.technique.trigger,
        condition: { type: "Always" },
        target: technique.def.technique.target,
        effect: technique.def.technique.effect
      };
      const targets = targetsForAbility(state, source, ability);

      emit(state, {
        type: "TechniqueUsed",
        timeMs: state.timeMs,
        cardInstanceId: technique.card.instanceId,
        targets: targets.map((target) => target.unitId)
      });

      applyEffect(state, source, ability, technique.def.technique.effect, 0);
      side.ashes.push({ ...technique.card, zone: "ashes" });

      if (technique.def.technique.trigger.type === "WhenFirstAllyBelowHealthPercent") {
        side.firstAllyBelowHealthTriggered = true;
      }
    }
  }
};

const processAttacks = (state: MutableCombatState): void => {
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
    applyDamage(state, unit.unitId, target, unit.attack, "combatDamage", 0);
    unit.attackTimerMs += attackIntervalMs(unit);
  }
};

const queueTechniques = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const technique of side.techniques) {
      emit(state, {
        type: "TechniqueQueued",
        timeMs: 0,
        cardInstanceId: technique.card.instanceId
      });
    }
  }
};

const winnerForState = (state: MutableCombatState): CombatWinner | undefined => {
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

const snapshot = (state: MutableCombatState): CombatStateSnapshot => ({
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

export const resolveCombat = (input: ResolveCombatInput): CombatResult => {
  const rulesVersion = input.rulesVersion ?? "packbound-mvp-0";
  const state = createInitialState(input);
  const maxDurationMs = input.maxDurationMs ?? MAX_COMBAT_DURATION_MS;

  emit(state, { type: "CombatStarted", timeMs: 0 });
  queueTechniques(state);
  resolveEntryTriggers(state);
  resolveCombatStartTriggers(state);

  let winner = winnerForState(state);

  while (!state.ended && winner === undefined && state.timeMs < maxDurationMs) {
    state.timeMs += COMBAT_TICK_MS;
    tickCombatCharge(state);
    tickStatuses(state);
    returnPhasedUnits(state);
    resolveTechniques(state);
    processAttacks(state);
    winner = winnerForState(state);
  }

  if (winner === undefined) {
    winner = "draw";
    addWarning(
      state,
      "MAX_DURATION_REACHED",
      `Combat reached max duration of ${maxDurationMs}ms.`
    );
  }

  emit(state, {
    type: "CombatEnded",
    timeMs: state.timeMs,
    winner
  });

  return {
    winner,
    damageToPlayerA: winner === "playerB" ? aliveUnits(state.sides.playerB).length : 0,
    damageToPlayerB: winner === "playerA" ? aliveUnits(state.sides.playerA).length : 0,
    finalState: snapshot(state),
    events: state.events,
    warnings: state.warnings,
    rulesVersion,
    seed: input.seed
  };
};
