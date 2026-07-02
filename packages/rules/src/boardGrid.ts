import type { ContentCatalog } from "@packbound/content";
import {
  BOARD_COLS,
  BOARD_ROWS,
  type BoardLayer,
  type BoardState,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CardType,
  type Keyword,
  type PlayerId
} from "@packbound/shared";

import { buildCombatStatSummary, type CombatStatSummary } from "./combatStats";

export const BOARD_GRID_LAYER_ORDER: readonly BoardLayer[] = [
  "ground",
  "support",
  "air",
  "terrain"
];

export type BoardGridCardSummary = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly name: string;
  readonly cardType: CardType | "Unknown";
  readonly layer: BoardLayer;
  readonly ownerId: PlayerId;
  readonly upgradeLevel?: number;
  readonly combatStats?: CombatStatSummary;
  readonly traits: readonly string[];
  readonly keywords: readonly Keyword[];
  readonly definitionMissing?: true;
};

export type BoardGridCellSummary = {
  readonly row: number;
  readonly col: number;
  readonly ground?: BoardGridCardSummary;
  readonly support?: BoardGridCardSummary;
  readonly air?: BoardGridCardSummary;
  readonly terrain?: BoardGridCardSummary;
  readonly cards: readonly BoardGridCardSummary[];
};

export type BoardGridSummary = {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly BoardGridCellSummary[];
};

const layerRank = (layer: BoardLayer): number => {
  const index = BOARD_GRID_LAYER_ORDER.indexOf(layer);
  return index >= 0 ? index : BOARD_GRID_LAYER_ORDER.length;
};

const coordKey = (row: number, col: number): string => `${row}:${col}`;

const sortCardsForCell = (
  cards: readonly BoardGridCardSummary[]
): readonly BoardGridCardSummary[] =>
  [...cards].sort(
    (left, right) =>
      layerRank(left.layer) - layerRank(right.layer) ||
      left.name.localeCompare(right.name) ||
      left.defId.localeCompare(right.defId) ||
      left.cardInstanceId.localeCompare(right.cardInstanceId)
  );

const buildCardSummary = (
  boardCard: BoardState["placements"][number],
  catalog: ContentCatalog,
  activeCardsById: ReadonlyMap<CardInstanceId, CardInstance>
): BoardGridCardSummary => {
  const def = catalog.cardsById.get(boardCard.defId);
  const activeCard = activeCardsById.get(boardCard.cardInstanceId);
  const upgradeLevel = activeCard?.upgradeLevel ?? 0;
  const combatStats = def ? buildCombatStatSummary(def, upgradeLevel) : undefined;

  return {
    cardInstanceId: boardCard.cardInstanceId,
    defId: boardCard.defId,
    name: def?.name ?? boardCard.defId,
    cardType: def?.cardType ?? "Unknown",
    layer: boardCard.position.layer,
    ownerId: boardCard.ownerId,
    ...(activeCard ? { upgradeLevel: activeCard.upgradeLevel } : {}),
    ...(combatStats ? { combatStats } : {}),
    traits: [...(def?.traits ?? [])],
    keywords: [...(def?.keywords ?? [])],
    ...(!def ? { definitionMissing: true as const } : {})
  };
};

const buildCellSummary = (
  row: number,
  col: number,
  cards: readonly BoardGridCardSummary[]
): BoardGridCellSummary => {
  const sortedCards = sortCardsForCell(cards);
  const ground = sortedCards.find((card) => card.layer === "ground");
  const support = sortedCards.find((card) => card.layer === "support");
  const air = sortedCards.find((card) => card.layer === "air");
  const terrain = sortedCards.find((card) => card.layer === "terrain");

  return {
    row,
    col,
    ...(ground ? { ground } : {}),
    ...(support ? { support } : {}),
    ...(air ? { air } : {}),
    ...(terrain ? { terrain } : {}),
    cards: sortedCards
  };
};

export const buildBoardGridSummary = (
  board: BoardState,
  catalog: ContentCatalog,
  activeCards: readonly CardInstance[] = []
): BoardGridSummary => {
  const activeCardsById = new Map<CardInstanceId, CardInstance>(
    activeCards.map((card) => [card.instanceId, card])
  );
  const cardsByCoord = new Map<string, BoardGridCardSummary[]>();

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      cardsByCoord.set(coordKey(row, col), []);
    }
  }

  for (const placement of board.placements) {
    const key = coordKey(placement.position.row, placement.position.col);
    cardsByCoord.set(key, [
      ...(cardsByCoord.get(key) ?? []),
      buildCardSummary(placement, catalog, activeCardsById)
    ]);
  }

  const cells = [...cardsByCoord.entries()]
    .map(([key, cards]) => {
      const [rowText, colText] = key.split(":");
      return buildCellSummary(Number(rowText), Number(colText), cards);
    })
    .sort((left, right) => left.row - right.row || left.col - right.col);

  return {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    cells
  };
};
