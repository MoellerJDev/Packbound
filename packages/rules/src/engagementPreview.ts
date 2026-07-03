import type { ContentCatalog } from "@packbound/content";
import {
  BOARD_COLS,
  BOARD_ROWS,
  hexDistance,
  hexStepToward,
  positionKey,
  type BoardPosition,
  type BoardState,
  type CardDefinition,
  type CardInstance,
  type CardInstanceId,
  type Keyword,
  type PlayerSide
} from "@packbound/shared";

import { buildCombatStatSummary, type CombatRole } from "./combatStats";

export type EngagementPreviewSide = PlayerSide;

export type EngagementPreviewSelected = {
  readonly instanceId: CardInstanceId;
  readonly name: string;
  readonly side: EngagementPreviewSide;
  readonly position: BoardPosition;
  readonly range: number;
  readonly attack: number;
  readonly health: number;
  readonly attackSpeed: number;
  readonly identity: CombatRole;
};

export type EngagementPreviewTarget = {
  readonly instanceId: CardInstanceId;
  readonly name: string;
  readonly side: EngagementPreviewSide;
  readonly position: BoardPosition;
  readonly distance: number;
  readonly inRange: boolean;
};

export type EngagementPreviewMove = {
  readonly from: BoardPosition;
  readonly to: BoardPosition;
  readonly reason: string;
};

export type EngagementPreview = {
  readonly selected?: EngagementPreviewSelected;
  readonly rangeCells: readonly BoardPosition[];
  readonly likelyTarget?: EngagementPreviewTarget;
  readonly nextMove?: EngagementPreviewMove;
  readonly blockedMovementReason?: string;
  readonly targetingReason?: string;
  readonly explanation: readonly string[];
};

export type BuildEngagementPreviewInput = {
  readonly catalog: ContentCatalog;
  readonly selectedCardInstanceId?: CardInstanceId;
  readonly selectedSide?: EngagementPreviewSide;
  readonly playerBoard: BoardState;
  readonly enemyBoard: BoardState;
  readonly playerActiveCards?: readonly CardInstance[];
  readonly enemyActiveCards?: readonly CardInstance[];
};

type PreviewUnit = {
  readonly instanceId: CardInstanceId;
  readonly name: string;
  readonly side: EngagementPreviewSide;
  readonly position: BoardPosition;
  readonly attack: number;
  readonly health: number;
  readonly attackSpeed: number;
  readonly range: number;
  readonly identity: CombatRole;
  readonly keywords: readonly Keyword[];
};

const isUnitLike = (
  def: CardDefinition | undefined
): def is Extract<CardDefinition, { readonly cardType: "Unit" | "Echo" }> =>
  def?.cardType === "Unit" || def?.cardType === "Echo";

const activeCardsById = (
  cards: readonly CardInstance[] | undefined
): ReadonlyMap<CardInstanceId, CardInstance> =>
  new Map((cards ?? []).map((card) => [card.instanceId, card]));

const buildUnits = (
  board: BoardState,
  side: EngagementPreviewSide,
  catalog: ContentCatalog,
  activeCards: ReadonlyMap<CardInstanceId, CardInstance>
): readonly PreviewUnit[] =>
  board.placements
    .map((placement): PreviewUnit | undefined => {
      const def = catalog.cardsById.get(placement.defId);
      if (!isUnitLike(def)) {
        return undefined;
      }

      const stats = buildCombatStatSummary(
        def,
        activeCards.get(placement.cardInstanceId)?.upgradeLevel ?? 0
      );
      if (!stats) {
        return undefined;
      }

      return {
        instanceId: placement.cardInstanceId,
        name: def.name,
        side,
        position: placement.position,
        attack: stats.attack,
        health: stats.health,
        attackSpeed: stats.attackSpeed,
        range: stats.range,
        identity: stats.role,
        keywords: def.keywords
      };
    })
    .filter((unit): unit is PreviewUnit => unit !== undefined)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));

const hasKeyword = (unit: PreviewUnit, keyword: Keyword): boolean =>
  unit.keywords.includes(keyword);

const positionEquals = (a: BoardPosition, b: BoardPosition): boolean =>
  a.row === b.row && a.col === b.col && a.layer === b.layer;

const inBoardBounds = (position: BoardPosition): boolean =>
  position.row >= 0 &&
  position.row < BOARD_ROWS &&
  position.col >= 0 &&
  position.col < BOARD_COLS;

const rangeCellsFor = (unit: PreviewUnit): readonly BoardPosition[] => {
  const cells: BoardPosition[] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const position = { row, col, layer: unit.position.layer };
      if (hexDistance(unit.position, position) <= unit.range) {
        cells.push(position);
      }
    }
  }

  return cells;
};

const targetingReason = (
  attacker: PreviewUnit,
  originalCandidates: readonly PreviewUnit[],
  candidates: readonly PreviewUnit[]
): string => {
  if (originalCandidates.length === 0) {
    return "No valid target.";
  }

  if (candidates.some((unit) => hasKeyword(unit, "Guard"))) {
    return "Guard is prioritized.";
  }

  if (
    hasKeyword(attacker, "AntiAir") &&
    candidates.some((unit) => hasKeyword(unit, "Airborne"))
  ) {
    return "AntiAir prioritizes Airborne targets.";
  }

  if (hasKeyword(attacker, "Airborne")) {
    return "Airborne attacker prioritizes lowest health before distance.";
  }

  return "Nearest valid target.";
};

const selectLikelyTarget = (
  attacker: PreviewUnit,
  enemies: readonly PreviewUnit[]
): { readonly target?: PreviewUnit; readonly reason: string } => {
  let candidates = [...enemies];
  if (candidates.length === 0) {
    return { reason: "No valid target." };
  }

  const allCandidates = [...candidates];
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
        a.health - b.health ||
        hexDistance(attacker.position, a.position) -
          hexDistance(attacker.position, b.position) ||
        a.instanceId.localeCompare(b.instanceId)
    );
  } else {
    candidates.sort(
      (a, b) =>
        hexDistance(attacker.position, a.position) -
          hexDistance(attacker.position, b.position) ||
        a.health - b.health ||
        a.instanceId.localeCompare(b.instanceId)
    );
  }

  const target = candidates[0];
  const reason = targetingReason(attacker, allCandidates, candidates);
  return target ? { target, reason } : { reason };
};

const occupiedGroundPositionKeys = (
  units: readonly PreviewUnit[],
  movingUnit: PreviewUnit
): ReadonlySet<string> =>
  new Set(
    units
      .filter(
        (unit) =>
          unit.instanceId !== movingUnit.instanceId && unit.position.layer === "ground"
      )
      .map((unit) => positionKey(unit.position))
  );

const coordinateText = (position: Pick<BoardPosition, "row" | "col">): string =>
  `r${position.row} c${position.col}`;

const buildNoSelectionPreview = (message: string): EngagementPreview => ({
  rangeCells: [],
  explanation: [message]
});

export const buildEngagementPreview = ({
  catalog,
  selectedCardInstanceId,
  selectedSide,
  playerBoard,
  enemyBoard,
  playerActiveCards,
  enemyActiveCards
}: BuildEngagementPreviewInput): EngagementPreview => {
  if (!selectedCardInstanceId || !selectedSide) {
    return buildNoSelectionPreview("Select a board Unit or Echo to preview range.");
  }

  const playerUnits = buildUnits(
    playerBoard,
    "playerA",
    catalog,
    activeCardsById(playerActiveCards)
  );
  const enemyUnits = buildUnits(
    enemyBoard,
    "playerB",
    catalog,
    activeCardsById(enemyActiveCards)
  );
  const allUnits = [...playerUnits, ...enemyUnits];
  const selected = allUnits.find(
    (unit) => unit.side === selectedSide && unit.instanceId === selectedCardInstanceId
  );

  if (!selected) {
    const placement =
      selectedSide === "playerA"
        ? playerBoard.placements.find(
            (candidate) => candidate.cardInstanceId === selectedCardInstanceId
          )
        : enemyBoard.placements.find(
            (candidate) => candidate.cardInstanceId === selectedCardInstanceId
          );
    const def = placement ? catalog.cardsById.get(placement.defId) : undefined;
    const name = def?.name ?? selectedCardInstanceId;

    return buildNoSelectionPreview(
      `${name} is not a Unit or Echo; only Units and Echoes have basic attack ranges.`
    );
  }

  const enemies = selected.side === "playerA" ? enemyUnits : playerUnits;
  const targetResult = selectLikelyTarget(selected, enemies);
  const target = targetResult.target;
  const rangeCells = rangeCellsFor(selected);
  const selectedPreview: EngagementPreviewSelected = {
    instanceId: selected.instanceId,
    name: selected.name,
    side: selected.side,
    position: selected.position,
    range: selected.range,
    attack: selected.attack,
    health: selected.health,
    attackSpeed: selected.attackSpeed,
    identity: selected.identity
  };

  if (!target) {
    return {
      selected: selectedPreview,
      rangeCells,
      targetingReason: targetResult.reason,
      explanation: [`${selected.name} has ${selected.range} RNG.`, targetResult.reason]
    };
  }

  const distance = hexDistance(selected.position, target.position);
  const inRange = distance <= selected.range;
  const targetPreview: EngagementPreviewTarget = {
    instanceId: target.instanceId,
    name: target.name,
    side: target.side,
    position: target.position,
    distance,
    inRange
  };
  const explanation = [
    `${selected.name} has ${selected.range} RNG.`,
    `${target.name} is ${distance} hex${distance === 1 ? "" : "es"} away.`,
    targetResult.reason
  ];

  if (inRange) {
    return {
      selected: selectedPreview,
      rangeCells,
      likelyTarget: targetPreview,
      targetingReason: targetResult.reason,
      explanation: [...explanation, "In range: can attack this target now."]
    };
  }

  const nextStep = hexStepToward(
    selected.position,
    target.position,
    occupiedGroundPositionKeys(allUnits, selected),
    inBoardBounds
  );

  return {
    selected: selectedPreview,
    rangeCells,
    likelyTarget: targetPreview,
    ...(nextStep
      ? {
          nextMove: {
            from: selected.position,
            to: nextStep,
            reason: "Target is out of range."
          }
        }
      : {
          blockedMovementReason: "Movement blocked by occupied ground hex or board edge."
        }),
    targetingReason: targetResult.reason,
    explanation: [
      ...explanation,
      nextStep
        ? `Out of range: would move one hex toward ${coordinateText(nextStep)}.`
        : "Out of range: movement blocked by occupied ground hex or board edge."
    ]
  };
};

export const engagementPositionKey = (position: BoardPosition): string =>
  positionKey(position);

export const previewHasPosition = (
  positions: readonly BoardPosition[],
  position: BoardPosition
): boolean => positions.some((candidate) => positionEquals(candidate, position));
