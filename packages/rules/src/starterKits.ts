import type { ContentCatalog, StarterKitDefinition } from "@packbound/content";
import {
  asCardInstanceId,
  asPlayerId,
  asRunId,
  type BoardPlacement,
  type BoardState,
  type CardInstance,
  type CardInstanceId,
  type PlayerId,
  type RunId,
  type Zone
} from "@packbound/shared";

import { createRun, type RunState, type StarterKit } from "./runState";

export type CreateRunFromStarterKitInput = {
  readonly seed: string;
  readonly catalog: ContentCatalog;
  readonly starterKitId: string;
  readonly runId?: RunId;
  readonly playerId?: PlayerId;
  readonly rulesVersion?: string;
  readonly maxRounds?: number;
  readonly startingHealth?: number;
  readonly startingGold?: number;
};

const starterInstanceId = (
  runId: RunId,
  starterKitId: string,
  zone: Zone | "board",
  index: number,
  oldInstanceId: CardInstanceId
): CardInstanceId =>
  asCardInstanceId(`${runId}:starter:${starterKitId}:${zone}:${index}:${oldInstanceId}`);

const rewriteCard = (
  card: CardInstance,
  ownerId: PlayerId,
  instanceId: CardInstanceId,
  zone: Zone
): CardInstance => ({
  ...card,
  instanceId,
  ownerId,
  zone,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const rewriteCards = (
  runId: RunId,
  starterKit: StarterKitDefinition,
  ownerId: PlayerId,
  zone: Zone,
  cards: readonly CardInstance[] = []
): readonly CardInstance[] =>
  cards.map((card, index) =>
    rewriteCard(
      card,
      ownerId,
      starterInstanceId(runId, starterKit.id, zone, index, card.instanceId),
      zone
    )
  );

const rewriteBoard = (
  runId: RunId,
  starterKit: StarterKitDefinition,
  ownerId: PlayerId
): BoardState => ({
  placements: starterKit.board.placements.map((placement, index): BoardPlacement => ({
    ...placement,
    cardInstanceId: starterInstanceId(
      runId,
      starterKit.id,
      "board",
      index,
      placement.cardInstanceId
    ),
    ownerId,
    position: { ...placement.position }
  }))
});

const starterKitForRun = (
  runId: RunId,
  starterKit: StarterKitDefinition,
  ownerId: PlayerId
): StarterKit => ({
  id: starterKit.id,
  name: starterKit.name,
  pool: rewriteCards(runId, starterKit, ownerId, "pool", starterKit.pool),
  board: rewriteBoard(runId, starterKit, ownerId),
  sourceRow: {
    maxSlots: starterKit.sourceRow.maxSlots,
    cards: rewriteCards(
      runId,
      starterKit,
      ownerId,
      "sourceRow",
      starterKit.sourceRow.cards
    )
  },
  spellrail: {
    maxSlots: starterKit.spellrail.maxSlots,
    cards: rewriteCards(
      runId,
      starterKit,
      ownerId,
      "spellrail",
      starterKit.spellrail.cards
    )
  },
  ashes: rewriteCards(runId, starterKit, ownerId, "ashes", starterKit.ashes),
  void: rewriteCards(runId, starterKit, ownerId, "void", starterKit.void)
});

export const createRunFromStarterKit = (
  input: CreateRunFromStarterKitInput
): RunState => {
  const starterKit = input.catalog.starterKitsById.get(input.starterKitId);
  if (!starterKit) {
    throw new Error(`Unknown starter kit id: ${input.starterKitId}`);
  }

  const runId = input.runId ?? asRunId(`run:${input.seed}`);
  const playerId = input.playerId ?? asPlayerId("player");

  return createRun({
    runId,
    seed: input.seed,
    playerId,
    starterKit: starterKitForRun(runId, starterKit, playerId),
    ...(input.rulesVersion ? { rulesVersion: input.rulesVersion } : {}),
    ...(input.maxRounds !== undefined ? { maxRounds: input.maxRounds } : {}),
    ...(input.startingHealth !== undefined
      ? { startingHealth: input.startingHealth }
      : {}),
    ...(input.startingGold !== undefined ? { startingGold: input.startingGold } : {})
  });
};
