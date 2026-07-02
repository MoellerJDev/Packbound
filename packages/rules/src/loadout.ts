import type { ContentCatalog } from "@packbound/content";
import {
  type BoardPlacement,
  type BoardPosition,
  type BoardState,
  type CardInstance,
  type CardInstanceId,
  type PlayerId,
  type SourceRowState,
  type SpellrailState,
  type ValidationResult
} from "@packbound/shared";

import type { RunState } from "./runState";
import { validatePlanningState } from "./validation";

export type RunCombatantSetup = {
  readonly playerId: PlayerId;
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const copyPlacement = (placement: BoardPlacement): BoardPlacement => ({
  ...placement,
  position: { ...placement.position }
});

const cardInZone = (card: CardInstance, zone: CardInstance["zone"]): CardInstance => ({
  ...copyCard(card),
  zone
});

const placementToPoolCard = (placement: BoardPlacement): CardInstance => ({
  instanceId: placement.cardInstanceId,
  defId: placement.defId,
  ownerId: placement.ownerId,
  zone: "pool",
  modifiers: [],
  upgradeLevel: 0
});

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

export const placeCardOnBoard = (
  run: RunState,
  cardInstanceId: CardInstanceId,
  position: BoardPosition
): RunState => {
  const card = requirePoolCard(run, cardInstanceId);

  return {
    ...run,
    pool: poolWithout(run, cardInstanceId),
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
  const placement = run.board.placements.find(
    (candidate) => candidate.cardInstanceId === cardInstanceId
  );
  if (!placement) {
    throw new Error(`Card ${cardInstanceId} is not on the board`);
  }

  return {
    ...run,
    pool: [...run.pool.map(copyCard), placementToPoolCard(placement)],
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
): ValidationResult =>
  validatePlanningState({
    catalog,
    board: run.board,
    sourceRow: run.sourceRow,
    spellrail: run.spellrail
  });

export const buildCombatantSetupForRun = (run: RunState): RunCombatantSetup => ({
  playerId: run.playerId,
  board: { placements: run.board.placements.map(copyPlacement) },
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
