import type { ContentCatalog } from "@packbound/content";
import {
  BOARD_COLS,
  BOARD_ROWS,
  type BoardPosition,
  type BoardState,
  type CardInstance,
  type CardInstanceId,
  isBoardPositionInBounds,
  type PlayerId,
  positionKey,
  type SourceRowState,
  type SpellrailState,
  type ValidationResult
} from "@packbound/shared";

import {
  activeCardForBoardPlacement,
  cardInZone,
  copyCard,
  copyPlacement
} from "./runCards";
import type { RunState } from "./runState";
import { validatePlanningState } from "./validation";

export type RunCombatantSetup = {
  readonly playerId: PlayerId;
  readonly board: BoardState;
  readonly activeCards?: readonly CardInstance[];
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

export type LoadoutAction =
  | {
      readonly type: "placeOnBoard";
      readonly position: BoardPosition;
      readonly label: string;
    }
  | { readonly type: "addToSourceRow"; readonly label: string }
  | { readonly type: "addToSpellrail"; readonly label: string }
  | { readonly type: "returnToPool"; readonly label: string };

export type LoadoutActionCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

const assertCanEditLoadout = (run: RunState): void => {
  if (run.status !== "active" || run.phase !== "planning") {
    throw new Error(`Cannot edit loadout while run phase is ${run.phase}`);
  }
};

const requirePoolCard = (run: RunState, cardInstanceId: CardInstanceId): CardInstance => {
  const card = run.pool.find((candidate) => candidate.instanceId === cardInstanceId);
  if (!card) {
    throw new Error(`Card ${cardInstanceId} is not in the run pool`);
  }
  if (card.ownerId !== run.playerId) {
    throw new Error(`Card ${cardInstanceId} is not owned by the run player`);
  }
  return card;
};

const poolWithout = (
  run: RunState,
  cardInstanceId: CardInstanceId
): readonly CardInstance[] =>
  run.pool.filter((card) => card.instanceId !== cardInstanceId).map(copyCard);

const activeCardsWithout = (
  run: RunState,
  cardInstanceId: CardInstanceId
): readonly CardInstance[] =>
  run.activeCards.filter((card) => card.instanceId !== cardInstanceId).map(copyCard);

const ok = (): LoadoutActionCheck => ({ ok: true });

const reason = (message: string): LoadoutActionCheck => ({
  ok: false,
  reason: message
});

const getPoolCardForAction = (
  run: RunState,
  cardInstanceId: CardInstanceId
): CardInstance | undefined =>
  run.pool.find((candidate) => candidate.instanceId === cardInstanceId);

const firstValidationErrorReason = (result: ValidationResult): string =>
  result.errors[0]?.message ?? "Loadout would be illegal.";

const commanderRebindTaxSurcharges = (run: RunState) =>
  run.commander?.card.zone === "board" && run.commander.rebindTax > 0
    ? [
        {
          amount: run.commander.rebindTax,
          label: "Commander Rebind Tax",
          cardInstanceId: run.commander.card.instanceId
        }
      ]
    : [];

export const placeCardOnBoard = (
  run: RunState,
  cardInstanceId: CardInstanceId,
  position: BoardPosition
): RunState => {
  assertCanEditLoadout(run);
  const card = requirePoolCard(run, cardInstanceId);

  return {
    ...run,
    pool: poolWithout(run, cardInstanceId),
    activeCards: [...run.activeCards.map(copyCard), cardInZone(card, "board")],
    board: {
      placements: [
        ...run.board.placements.map(copyPlacement),
        {
          cardInstanceId: card.instanceId,
          defId: card.defId,
          ownerId: run.playerId,
          position: { ...position }
        }
      ]
    }
  };
};

export const removeCardFromBoard = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  const placement = run.board.placements.find(
    (candidate) => candidate.cardInstanceId === cardInstanceId
  );
  if (!placement) {
    throw new Error(`Card ${cardInstanceId} is not on the board`);
  }

  return {
    ...run,
    pool: [
      ...run.pool.map(copyCard),
      cardInZone(activeCardForBoardPlacement(run, placement), "pool")
    ],
    activeCards: activeCardsWithout(run, cardInstanceId),
    board: {
      placements: run.board.placements
        .filter((candidate) => candidate.cardInstanceId !== cardInstanceId)
        .map(copyPlacement)
    }
  };
};

export const addCardToSourceRow = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  const card = requirePoolCard(run, cardInstanceId);

  return {
    ...run,
    pool: poolWithout(run, cardInstanceId),
    sourceRow: {
      maxSlots: run.sourceRow.maxSlots,
      cards: [...run.sourceRow.cards.map(copyCard), cardInZone(card, "sourceRow")]
    }
  };
};

export const removeCardFromSourceRow = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  const card = run.sourceRow.cards.find(
    (candidate) => candidate.instanceId === cardInstanceId
  );
  if (!card) {
    throw new Error(`Card ${cardInstanceId} is not in the Source Row`);
  }

  return {
    ...run,
    pool: [...run.pool.map(copyCard), cardInZone(card, "pool")],
    sourceRow: {
      maxSlots: run.sourceRow.maxSlots,
      cards: run.sourceRow.cards
        .filter((candidate) => candidate.instanceId !== cardInstanceId)
        .map(copyCard)
    }
  };
};

export const addCardToSpellrail = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  const card = requirePoolCard(run, cardInstanceId);

  return {
    ...run,
    pool: poolWithout(run, cardInstanceId),
    spellrail: {
      maxSlots: run.spellrail.maxSlots,
      cards: [...run.spellrail.cards.map(copyCard), cardInZone(card, "spellrail")]
    }
  };
};

export const removeCardFromSpellrail = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  const card = run.spellrail.cards.find(
    (candidate) => candidate.instanceId === cardInstanceId
  );
  if (!card) {
    throw new Error(`Card ${cardInstanceId} is not on the Spellrail`);
  }

  return {
    ...run,
    pool: [...run.pool.map(copyCard), cardInZone(card, "pool")],
    spellrail: {
      maxSlots: run.spellrail.maxSlots,
      cards: run.spellrail.cards
        .filter((candidate) => candidate.instanceId !== cardInstanceId)
        .map(copyCard)
    }
  };
};

export const returnCardToPool = (
  run: RunState,
  cardInstanceId: CardInstanceId
): RunState => {
  assertCanEditLoadout(run);
  if (
    run.board.placements.some((placement) => placement.cardInstanceId === cardInstanceId)
  ) {
    return removeCardFromBoard(run, cardInstanceId);
  }
  if (run.sourceRow.cards.some((card) => card.instanceId === cardInstanceId)) {
    return removeCardFromSourceRow(run, cardInstanceId);
  }
  if (run.spellrail.cards.some((card) => card.instanceId === cardInstanceId)) {
    return removeCardFromSpellrail(run, cardInstanceId);
  }
  if (run.pool.some((card) => card.instanceId === cardInstanceId)) {
    return run;
  }
  throw new Error(`Card ${cardInstanceId} is not in a returnable run zone`);
};

export const validateRunLoadout = (
  run: RunState,
  catalog: ContentCatalog
): ValidationResult => {
  const base = validatePlanningState({
    catalog,
    board: run.board,
    sourceRow: run.sourceRow,
    spellrail: run.spellrail,
    boardChargeSurcharges: commanderRebindTaxSurcharges(run)
  });
  const boardCardIds = new Set(
    run.board.placements.map((placement) => placement.cardInstanceId)
  );
  const activeCardIds = new Set(run.activeCards.map((card) => card.instanceId));
  const activeErrors = [
    ...run.board.placements
      .filter((placement) => !activeCardIds.has(placement.cardInstanceId))
      .map((placement) => ({
        code: "MISSING_ACTIVE_CARD_INSTANCE",
        message: `Board placement ${placement.cardInstanceId} has no active card instance.`,
        cardInstanceId: placement.cardInstanceId,
        position: placement.position
      })),
    ...run.activeCards
      .filter((card) => !boardCardIds.has(card.instanceId))
      .map((card) => ({
        code: "STALE_ACTIVE_CARD_INSTANCE",
        message: `Active card ${card.instanceId} is not placed on the board.`,
        cardInstanceId: card.instanceId
      }))
  ];

  return {
    ok: base.ok && activeErrors.length === 0,
    errors: [...base.errors, ...activeErrors],
    warnings: base.warnings
  };
};

export const buildCombatantSetupForRun = (run: RunState): RunCombatantSetup => ({
  playerId: run.playerId,
  board: { placements: run.board.placements.map(copyPlacement) },
  ...(run.activeCards.length > 0 ? { activeCards: run.activeCards.map(copyCard) } : {}),
  sourceRow: {
    maxSlots: run.sourceRow.maxSlots,
    cards: run.sourceRow.cards.map(copyCard)
  },
  spellrail: {
    maxSlots: run.spellrail.maxSlots,
    cards: run.spellrail.cards.map(copyCard)
  },
  ...(run.ashes.length > 0 ? { startingAshes: run.ashes.map(copyCard) } : {})
});

const positionOccupied = (run: RunState, position: BoardPosition): boolean => {
  const key = positionKey(position);
  return run.board.placements.some(
    (placement) => positionKey(placement.position) === key
  );
};

export const getDefaultBoardPositionForCard = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId
): BoardPosition | undefined => {
  const card = getPoolCardForAction(run, cardInstanceId);
  if (!card) {
    return undefined;
  }

  const def = catalog.cardsById.get(card.defId);
  const layer =
    def?.cardType === "Unit" || def?.cardType === "Echo"
      ? "ground"
      : def?.cardType === "Relic" || def?.cardType === "Field"
        ? "support"
        : undefined;
  if (!layer) {
    return undefined;
  }

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const position: BoardPosition = { row, col, layer };
      if (!positionOccupied(run, position)) {
        return position;
      }
    }
  }

  return undefined;
};

export const canPlaceCardOnBoard = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId,
  position: BoardPosition
): LoadoutActionCheck => {
  if (run.status !== "active" || run.phase !== "planning") {
    return reason(`Loadout can only be edited during planning.`);
  }

  const card = getPoolCardForAction(run, cardInstanceId);
  if (!card) {
    return reason(`Card ${cardInstanceId} is not in the run pool.`);
  }
  if (card.ownerId !== run.playerId) {
    return reason(`Card ${cardInstanceId} is not owned by the run player.`);
  }

  const def = catalog.cardsById.get(card.defId);
  if (!def) {
    return reason(`Unknown card definition: ${card.defId}.`);
  }
  if (
    def.cardType !== "Unit" &&
    def.cardType !== "Echo" &&
    def.cardType !== "Relic" &&
    def.cardType !== "Field"
  ) {
    return reason(`${def.name} cannot be placed on the board yet.`);
  }
  if (!isBoardPositionInBounds(position)) {
    return reason(`${def.name} cannot be placed outside the board.`);
  }
  if (positionOccupied(run, position)) {
    return reason(`${def.name} cannot be placed on an occupied tile.`);
  }

  const next = placeCardOnBoard(run, cardInstanceId, position);
  const validation = validateRunLoadout(next, catalog);
  return validation.ok ? ok() : reason(firstValidationErrorReason(validation));
};

export const canAddCardToSourceRow = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId
): LoadoutActionCheck => {
  if (run.status !== "active" || run.phase !== "planning") {
    return reason(`Loadout can only be edited during planning.`);
  }

  const card = getPoolCardForAction(run, cardInstanceId);
  if (!card) {
    return reason(`Card ${cardInstanceId} is not in the run pool.`);
  }
  if (card.ownerId !== run.playerId) {
    return reason(`Card ${cardInstanceId} is not owned by the run player.`);
  }
  const def = catalog.cardsById.get(card.defId);
  if (!def) {
    return reason(`Unknown card definition: ${card.defId}.`);
  }
  if (def.cardType !== "Source") {
    return reason(`${def.name} is not a Source.`);
  }
  if (run.sourceRow.cards.length >= run.sourceRow.maxSlots) {
    return reason(`Source Row is full.`);
  }

  const validation = validateRunLoadout(addCardToSourceRow(run, cardInstanceId), catalog);
  return validation.ok ? ok() : reason(firstValidationErrorReason(validation));
};

export const canAddCardToSpellrail = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId
): LoadoutActionCheck => {
  if (run.status !== "active" || run.phase !== "planning") {
    return reason(`Loadout can only be edited during planning.`);
  }

  const card = getPoolCardForAction(run, cardInstanceId);
  if (!card) {
    return reason(`Card ${cardInstanceId} is not in the run pool.`);
  }
  if (card.ownerId !== run.playerId) {
    return reason(`Card ${cardInstanceId} is not owned by the run player.`);
  }
  const def = catalog.cardsById.get(card.defId);
  if (!def) {
    return reason(`Unknown card definition: ${card.defId}.`);
  }
  if (def.cardType !== "Technique") {
    return reason(`${def.name} is not a Technique.`);
  }
  if (run.spellrail.cards.length >= run.spellrail.maxSlots) {
    return reason(`Spellrail is full.`);
  }

  const validation = validateRunLoadout(addCardToSpellrail(run, cardInstanceId), catalog);
  return validation.ok ? ok() : reason(firstValidationErrorReason(validation));
};

export const getLegalLoadoutActions = (
  run: RunState,
  catalog: ContentCatalog,
  cardInstanceId: CardInstanceId
): readonly LoadoutAction[] => {
  if (run.status !== "active" || run.phase !== "planning") {
    return [];
  }

  const isActive =
    run.board.placements.some(
      (placement) => placement.cardInstanceId === cardInstanceId
    ) ||
    run.sourceRow.cards.some((card) => card.instanceId === cardInstanceId) ||
    run.spellrail.cards.some((card) => card.instanceId === cardInstanceId);
  if (isActive) {
    return [{ type: "returnToPool", label: "Return to Pool" }];
  }

  if (!getPoolCardForAction(run, cardInstanceId)) {
    return [];
  }

  const actions: LoadoutAction[] = [];
  const defaultPosition = getDefaultBoardPositionForCard(run, catalog, cardInstanceId);
  if (
    defaultPosition &&
    canPlaceCardOnBoard(run, catalog, cardInstanceId, defaultPosition).ok
  ) {
    actions.push({
      type: "placeOnBoard",
      position: defaultPosition,
      label: "Place on Board"
    });
  }
  if (canAddCardToSourceRow(run, catalog, cardInstanceId).ok) {
    actions.push({ type: "addToSourceRow", label: "Add to Source Row" });
  }
  if (canAddCardToSpellrail(run, catalog, cardInstanceId).ok) {
    actions.push({ type: "addToSpellrail", label: "Add to Spellrail" });
  }

  return actions;
};
