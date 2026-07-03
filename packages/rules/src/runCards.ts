import type {
  BoardPlacement,
  BoardState,
  CardInstance,
  CardInstanceId,
  SourceRowState,
  SpellrailState,
  Zone
} from "@packbound/shared";

import type { RunState } from "./runState";

export type RunActiveCardEntry = {
  readonly card: CardInstance;
  readonly zone: Zone;
};

export const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

export const copyPlacement = (placement: BoardPlacement): BoardPlacement => ({
  ...placement,
  position: { ...placement.position }
});

export const copyBoard = (board: BoardState): BoardState => ({
  placements: board.placements.map(copyPlacement)
});

export const copySourceRow = (sourceRow: SourceRowState): SourceRowState => ({
  maxSlots: sourceRow.maxSlots,
  cards: sourceRow.cards.map(copyCard)
});

export const copySpellrail = (spellrail: SpellrailState): SpellrailState => ({
  maxSlots: spellrail.maxSlots,
  cards: spellrail.cards.map(copyCard)
});

export const cardInZone = (card: CardInstance, zone: Zone): CardInstance => ({
  ...copyCard(card),
  zone
});

export const cardFromBoardPlacement = (placement: BoardPlacement): CardInstance => ({
  instanceId: placement.cardInstanceId,
  defId: placement.defId,
  ownerId: placement.ownerId,
  zone: "board",
  modifiers: [],
  upgradeLevel: 0
});

export const activeCardForBoardPlacement = (
  run: RunState,
  placement: BoardPlacement
): CardInstance => {
  const activeCard = run.activeCards.find(
    (candidate) => candidate.instanceId === placement.cardInstanceId
  );
  return activeCard ? copyCard(activeCard) : cardFromBoardPlacement(placement);
};

export const uniqueActiveCardEntriesForRun = (
  run: RunState
): readonly RunActiveCardEntry[] => {
  const entries: RunActiveCardEntry[] = [];
  const seenInstanceIds = new Set<CardInstanceId>();

  const addCard = (card: CardInstance, zone: Zone): void => {
    if (seenInstanceIds.has(card.instanceId)) {
      return;
    }
    seenInstanceIds.add(card.instanceId);
    entries.push({ card: cardInZone(card, zone), zone });
  };

  for (const card of run.activeCards) {
    addCard(card, "board");
  }

  for (const placement of run.board.placements) {
    if (seenInstanceIds.has(placement.cardInstanceId)) {
      continue;
    }
    addCard(cardFromBoardPlacement(placement), "board");
  }

  for (const card of run.sourceRow.cards) {
    addCard(card, "sourceRow");
  }

  for (const card of run.spellrail.cards) {
    addCard(card, "spellrail");
  }

  return entries.sort((left, right) =>
    left.card.instanceId.localeCompare(right.card.instanceId)
  );
};

export const ownedRunCards = (run: RunState): readonly CardInstance[] => {
  const byId = new Map<CardInstanceId, CardInstance>();

  const addCard = (card: CardInstance): void => {
    if (!byId.has(card.instanceId)) {
      byId.set(card.instanceId, copyCard(card));
    }
  };

  for (const card of [
    ...run.pool,
    ...run.activeCards,
    ...run.sourceRow.cards,
    ...run.spellrail.cards,
    ...run.ashes,
    ...run.void
  ]) {
    addCard(card);
  }

  return [...byId.values()].sort((left, right) =>
    left.instanceId.localeCompare(right.instanceId)
  );
};

export const findRunCard = (
  run: RunState,
  cardInstanceId: CardInstanceId
): CardInstance | undefined => {
  const placement = run.board.placements.find(
    (candidate) => candidate.cardInstanceId === cardInstanceId
  );
  if (placement) {
    return activeCardForBoardPlacement(run, placement);
  }

  const card = [
    ...run.pool,
    ...run.sourceRow.cards,
    ...run.spellrail.cards,
    ...run.ashes,
    ...run.void
  ].find((candidate) => candidate.instanceId === cardInstanceId);

  return card ? copyCard(card) : undefined;
};

export const isCardActiveInRun = (
  run: RunState,
  cardInstanceId: CardInstanceId
): boolean =>
  uniqueActiveCardEntriesForRun(run).some(
    (entry) => entry.card.instanceId === cardInstanceId
  );
