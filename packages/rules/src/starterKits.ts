import type { ContentCatalog, StarterKitDefinition } from "@packbound/content";
import {
  asCardInstanceId,
  asPlayerId,
  asRunId,
  chargeCostTotal,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
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

type CommanderCandidate = {
  readonly card?: CardInstance;
  readonly placement?: BoardPlacement;
  readonly def: CardDefinition;
  readonly order: number;
};

const commanderCandidatesForStarterKit = (
  starterKit: StarterKitDefinition,
  catalog: ContentCatalog
): readonly CommanderCandidate[] => {
  const candidates: CommanderCandidate[] = [];

  starterKit.pool.forEach((card, index) => {
    const def = catalog.cardsById.get(card.defId);
    if (def?.cardType === "Unit" || def?.cardType === "Echo") {
      candidates.push({ card, def, order: index });
    }
  });

  starterKit.board.placements.forEach((placement, index) => {
    const def = catalog.cardsById.get(placement.defId);
    if (def?.cardType === "Unit" || def?.cardType === "Echo") {
      candidates.push({
        placement,
        def,
        order: starterKit.pool.length + index
      });
    }
  });

  return candidates.sort(
    (left, right) =>
      chargeCostTotal(left.def.cost) - chargeCostTotal(right.def.cost) ||
      left.order - right.order ||
      left.def.name.localeCompare(right.def.name)
  );
};

const commanderForStarterKit = (
  runId: RunId,
  starterKit: StarterKitDefinition,
  ownerId: PlayerId,
  catalog: ContentCatalog
): CardInstance | undefined => {
  const candidate = commanderCandidatesForStarterKit(starterKit, catalog)[0];
  if (!candidate) {
    return undefined;
  }

  const sourceInstanceId =
    candidate.card?.instanceId ?? candidate.placement?.cardInstanceId;
  if (!sourceInstanceId) {
    return undefined;
  }

  const instanceId = starterInstanceId(
    runId,
    starterKit.id,
    "command",
    0,
    sourceInstanceId
  );

  if (candidate.card) {
    return rewriteCard(candidate.card, ownerId, instanceId, "command");
  }

  return {
    instanceId,
    defId: candidate.def.id,
    ownerId,
    zone: "command",
    modifiers: [],
    upgradeLevel: 0
  };
};

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
  ownerId: PlayerId,
  catalog: ContentCatalog
): StarterKit => {
  const commander = commanderForStarterKit(runId, starterKit, ownerId, catalog);

  return {
    id: starterKit.id,
    name: starterKit.name,
    ...(commander ? { commander } : {}),
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
  };
};

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
    starterKit: starterKitForRun(runId, starterKit, playerId, input.catalog),
    ...(input.rulesVersion ? { rulesVersion: input.rulesVersion } : {}),
    ...(input.maxRounds !== undefined ? { maxRounds: input.maxRounds } : {}),
    ...(input.startingHealth !== undefined
      ? { startingHealth: input.startingHealth }
      : {}),
    ...(input.startingGold !== undefined ? { startingGold: input.startingGold } : {})
  });
};
