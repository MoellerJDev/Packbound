import type { ContentCatalog } from "@packbound/content";
import {
  type CardInstanceId,
  type CombatEvent,
  type CombatWinner,
  type PackOpenResult,
  type SimulationWarning
} from "@packbound/shared";

import {
  applyCommanderCombatLifecycle,
  awardCommanderDoctrinePoint,
  getCurrentCommanderDoctrineChoices
} from "./commander";
import { calculateCombatGoldReward } from "./economy";
import { prepareEncounterForRound } from "./encounters";
import { validateRunLoadout } from "./loadout";
import { openPack } from "./packOpening";
import { getCurrentRewardChoices } from "./rewards";
import { cardInZone } from "./runCards";
import type {
  CombatSummary,
  EncounterHistoryEntry,
  PendingPackOffer,
  RewardHistoryEntry,
  RunState
} from "./runState";

export const PACK_OFFER_REVEAL_COUNT = 5;
export const PACK_OFFER_PICK_COUNT = 2;

export type CombatResultLike = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
  readonly seed?: string;
  readonly rulesVersion?: string;
};

export type RecordCombatOptions = {
  readonly encounterId?: string;
};

export const canApplyReward = (run: RunState): boolean =>
  run.status === "active" && run.phase === "reward";

export const canRecordCombat = (run: RunState, catalog: ContentCatalog): boolean =>
  run.status === "active" &&
  run.phase === "combatReady" &&
  Boolean(run.currentEncounterId) &&
  validateRunLoadout(run, catalog).ok;

export const markCombatReady = (run: RunState, catalog: ContentCatalog): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (run.phase !== "planning") {
    throw new Error(`Cannot mark combat ready while run phase is ${run.phase}`);
  }
  if (!run.currentEncounterId) {
    throw new Error("Cannot mark combat ready without a prepared encounter");
  }

  const validation = validateRunLoadout(run, catalog);
  if (!validation.ok) {
    throw new Error(
      `Cannot mark combat ready with an illegal loadout: ${validation.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return {
    ...run,
    phase: "combatReady"
  };
};

const clearCurrentEncounter = (run: RunState): RunState => {
  const next: Omit<RunState, "currentEncounterId"> & {
    currentEncounterId?: string;
  } = { ...run };
  delete next.currentEncounterId;
  return next;
};

const clearPendingPackOffer = (run: RunState): RunState => {
  const next: Omit<RunState, "pendingPackOffer"> & {
    pendingPackOffer?: PendingPackOffer;
  } = { ...run };
  delete next.pendingPackOffer;
  return next;
};

const createPendingPackOffer = ({
  choiceId,
  cost,
  goldAfter,
  goldBefore,
  openedPack,
  packName,
  round
}: {
  readonly choiceId: string;
  readonly cost: number;
  readonly goldAfter: number;
  readonly goldBefore: number;
  readonly openedPack: PackOpenResult;
  readonly packName: string;
  readonly round: number;
}): PendingPackOffer => {
  const revealCount = Math.min(PACK_OFFER_REVEAL_COUNT, openedPack.cards.length);
  const revealedCards = openedPack.cards
    .slice(0, revealCount)
    .map((card) => cardInZone(card, "pack"));
  const revealedCardIds = new Set(revealedCards.map((card) => card.instanceId));

  return {
    id: `pack-offer:${round}:${choiceId}`,
    round,
    choiceId,
    packId: openedPack.packId,
    packName,
    cost,
    goldBefore,
    goldAfter,
    openedPackSeed: openedPack.seed,
    revealCount,
    pickLimit: Math.min(PACK_OFFER_PICK_COUNT, revealedCards.length),
    cards: revealedCards,
    slots: openedPack.slots.filter((slot) => revealedCardIds.has(slot.cardInstanceId)),
    generatedCardDefIds: openedPack.slots.map((slot) => slot.cardDefId),
    generatedCardInstanceIds: openedPack.slots.map((slot) => slot.cardInstanceId)
  };
};

const selectedCardIds = (
  pendingOffer: PendingPackOffer,
  cardInstanceIds: readonly CardInstanceId[]
): ReadonlySet<CardInstanceId> => {
  if (cardInstanceIds.length !== pendingOffer.pickLimit) {
    throw new Error(
      `Pack Offer requires exactly ${pendingOffer.pickLimit} ${pendingOffer.pickLimit === 1 ? "pick" : "picks"}; received ${cardInstanceIds.length}.`
    );
  }

  const selectedIds = new Set(cardInstanceIds);
  if (selectedIds.size !== cardInstanceIds.length) {
    throw new Error("Pack Offer picks cannot include duplicate card ids.");
  }

  const offeredIds = new Set(pendingOffer.cards.map((card) => card.instanceId));
  const unknownId = cardInstanceIds.find(
    (cardInstanceId) => !offeredIds.has(cardInstanceId)
  );
  if (unknownId) {
    throw new Error(`Cannot pick ${unknownId}; it is not in the pending Pack Offer.`);
  }

  return selectedIds;
};

const openedPackForChosenCards = (
  pendingOffer: PendingPackOffer,
  chosenIds: ReadonlySet<CardInstanceId>
): PackOpenResult => {
  const cards = pendingOffer.cards
    .filter((card) => chosenIds.has(card.instanceId))
    .map((card) => cardInZone(card, "pool"));
  const chosenSlotIds = new Set(cards.map((card) => card.instanceId));

  return {
    packId: pendingOffer.packId,
    seed: pendingOffer.openedPackSeed,
    cards,
    slots: pendingOffer.slots.filter((slot) => chosenSlotIds.has(slot.cardInstanceId))
  };
};

export const applyPackReward = (
  run: RunState,
  catalog: ContentCatalog,
  choiceId: string
): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (!canApplyReward(run)) {
    throw new Error(`Cannot apply a reward while run phase is ${run.phase}`);
  }
  if (run.pendingPackOffer) {
    throw new Error(
      `Cannot open another reward pack while Pack Offer ${run.pendingPackOffer.id} is unresolved.`
    );
  }

  const choice = getCurrentRewardChoices(run, catalog).find(
    (candidate) => candidate.id === choiceId
  );
  if (!choice) {
    throw new Error(`Unknown reward choice id: ${choiceId}`);
  }
  if (!choice.affordable) {
    throw new Error(
      `Cannot afford ${choice.label}: need ${choice.cost} gold, have ${run.playerGold}.`
    );
  }

  const goldBefore = run.playerGold;
  const goldAfter = goldBefore - choice.cost;
  const openedPackSeed = `${run.seed}:round:${run.currentRound}:choice:${choice.id}`;
  const openedPack = openPack({
    catalog,
    packId: choice.packId,
    seed: openedPackSeed,
    ownerId: run.playerId
  });

  return {
    ...run,
    playerGold: goldAfter,
    currentRewardChoices: [],
    pendingPackOffer: createPendingPackOffer({
      choiceId: choice.id,
      cost: choice.cost,
      goldAfter,
      goldBefore,
      openedPack,
      packName: choice.label,
      round: run.currentRound
    })
  };
};

export const commitPackOfferPicks = (
  run: RunState,
  cardInstanceIds: readonly CardInstanceId[]
): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (run.phase !== "reward") {
    throw new Error(`Cannot commit Pack Offer picks while run phase is ${run.phase}`);
  }

  const pendingOffer = run.pendingPackOffer;
  if (!pendingOffer) {
    throw new Error("No pending Pack Offer to commit.");
  }

  const chosenIds = selectedCardIds(pendingOffer, cardInstanceIds);
  const openedPack = openedPackForChosenCards(pendingOffer, chosenIds);
  const releasedCards = pendingOffer.cards.filter(
    (card) => !chosenIds.has(card.instanceId)
  );
  const historyEntry: RewardHistoryEntry = {
    id: `reward-history:${run.rewardHistory.length}:${pendingOffer.choiceId}`,
    type: "pack",
    round: pendingOffer.round,
    choiceId: pendingOffer.choiceId,
    packId: pendingOffer.packId,
    cost: pendingOffer.cost,
    goldBefore: pendingOffer.goldBefore,
    goldAfter: pendingOffer.goldAfter,
    openedPackSeed: pendingOffer.openedPackSeed,
    offerId: pendingOffer.id,
    pickLimit: pendingOffer.pickLimit,
    offeredCardDefIds: pendingOffer.slots.map((slot) => slot.cardDefId),
    offeredCardInstanceIds: pendingOffer.slots.map((slot) => slot.cardInstanceId),
    chosenCardDefIds: openedPack.slots.map((slot) => slot.cardDefId),
    chosenCardInstanceIds: openedPack.slots.map((slot) => slot.cardInstanceId),
    releasedCardDefIds: releasedCards.map((card) => card.defId),
    releasedCardInstanceIds: releasedCards.map((card) => card.instanceId),
    cardDefIds: openedPack.slots.map((slot) => slot.cardDefId),
    cardInstanceIds: openedPack.slots.map((slot) => slot.cardInstanceId)
  };
  const nextRun = clearPendingPackOffer({
    ...run,
    pool: [...run.pool, ...openedPack.cards],
    currentRewardChoices: [],
    rewardHistory: [...run.rewardHistory, historyEntry],
    openedPacks: [...run.openedPacks, openedPack]
  });

  return {
    ...nextRun,
    phase:
      getCurrentCommanderDoctrineChoices(nextRun).length > 0 ? "reward" : "combatResolved"
  };
};

export const recordCombatResult = (
  run: RunState,
  combatResult: CombatResultLike,
  options: RecordCombatOptions = {}
): RunState => {
  if (run.status !== "active") {
    return run;
  }

  if (run.phase !== "combatReady") {
    throw new Error(`Cannot record combat while run phase is ${run.phase}`);
  }

  if (!run.currentEncounterId) {
    throw new Error("Cannot record combat without a prepared encounter");
  }

  if (options.encounterId && options.encounterId !== run.currentEncounterId) {
    throw new Error(
      `Combat was recorded for ${options.encounterId}, but current encounter is ${run.currentEncounterId}`
    );
  }

  const nextHealth = Math.max(0, run.playerHealth - combatResult.damageToPlayerA);
  const combatSummaryIndex = run.combatHistory.length;
  const goldEarned = calculateCombatGoldReward(combatResult);
  const summary: CombatSummary = {
    round: run.currentRound,
    winner: combatResult.winner,
    damageToPlayer: combatResult.damageToPlayerA,
    damageToOpponent: combatResult.damageToPlayerB,
    eventCount: combatResult.events.length,
    warningCodes: combatResult.warnings.map((warning) => warning.code),
    goldEarned,
    ...(combatResult.seed ? { seed: combatResult.seed } : {}),
    ...(combatResult.rulesVersion ? { rulesVersion: combatResult.rulesVersion } : {})
  };
  const encounterHistoryEntry: EncounterHistoryEntry = {
    round: run.currentRound,
    encounterId: run.currentEncounterId,
    combatSummaryIndex
  };
  const lifecycleRun = applyCommanderCombatLifecycle(run, combatResult.events);
  const rewardLifecycleRun =
    nextHealth <= 0 ? lifecycleRun : awardCommanderDoctrinePoint(lifecycleRun);

  return {
    ...rewardLifecycleRun,
    status: nextHealth <= 0 ? "lost" : run.status,
    phase: nextHealth <= 0 ? "complete" : "reward",
    playerHealth: nextHealth,
    playerGold: rewardLifecycleRun.playerGold + goldEarned,
    combatHistory: [...rewardLifecycleRun.combatHistory, summary],
    encounterHistory: [...rewardLifecycleRun.encounterHistory, encounterHistoryEntry]
  };
};

export const advanceRunAfterCombat = (
  run: RunState,
  catalog?: ContentCatalog
): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (run.phase !== "combatResolved") {
    throw new Error(`Cannot advance after combat while run phase is ${run.phase}`);
  }

  const nextRound = run.currentRound + 1;
  const advanced = clearCurrentEncounter({
    ...run,
    currentRound: nextRound,
    status: nextRound > run.maxRounds ? "won" : "active",
    phase: nextRound > run.maxRounds ? "complete" : "planning",
    currentRewardChoices: []
  });

  if (advanced.status !== "active" || !catalog) {
    return advanced;
  }

  return prepareEncounterForRound(advanced, catalog);
};
