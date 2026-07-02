import {
  asPlayerId,
  asRunId,
  type BoardPlacement,
  type BoardState,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CombatWinner,
  type PackId,
  type PackOpenResult,
  type PlayerId,
  type RunId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

export const DEFAULT_RUN_RULES_VERSION = "packbound-run-mvp-0";
export const DEFAULT_MAX_ROUNDS = 3;
export const DEFAULT_STARTING_HEALTH = 20;
export const DEFAULT_STARTING_GOLD = 0;
export const DEFAULT_SOURCE_ROW_SLOTS = 4;
export const DEFAULT_SPELLRAIL_SLOTS = 4;

export type RunStatus = "active" | "won" | "lost";

export type StarterKit = {
  readonly id: string;
  readonly name: string;
  readonly pool?: readonly CardInstance[];
  readonly board?: BoardState;
  readonly sourceRow?: SourceRowState;
  readonly spellrail?: SpellrailState;
  readonly ashes?: readonly CardInstance[];
  readonly void?: readonly CardInstance[];
};

export type RunConfig = {
  readonly runId?: RunId;
  readonly seed: string;
  readonly rulesVersion?: string;
  readonly maxRounds?: number;
  readonly startingHealth?: number;
  readonly startingGold?: number;
  readonly playerId?: PlayerId;
  readonly starterKit?: StarterKit;
};

export type PackRewardChoice = {
  readonly id: string;
  readonly type: "pack";
  readonly round: number;
  readonly packId: PackId;
  readonly label: string;
};

export type RewardChoice = PackRewardChoice;

export type RewardHistoryEntry = {
  readonly id: string;
  readonly type: "pack";
  readonly round: number;
  readonly choiceId: string;
  readonly packId: PackId;
  readonly openedPackSeed: string;
  readonly cardDefIds: readonly CardDefId[];
  readonly cardInstanceIds: readonly CardInstanceId[];
};

export type CombatSummary = {
  readonly round: number;
  readonly winner: CombatWinner;
  readonly damageToPlayer: number;
  readonly damageToOpponent: number;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly seed?: string;
  readonly rulesVersion?: string;
};

export type EncounterHistoryEntry = {
  readonly round: number;
  readonly encounterId: string;
  readonly combatSummaryIndex: number;
};

export type RunState = {
  readonly runId: RunId;
  readonly seed: string;
  readonly rulesVersion: string;
  readonly status: RunStatus;
  readonly currentRound: number;
  readonly maxRounds: number;
  readonly starterKitId?: string;
  readonly currentEncounterId?: string;
  readonly playerHealth: number;
  readonly playerGold: number;
  readonly playerId: PlayerId;
  readonly pool: readonly CardInstance[];
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly ashes: readonly CardInstance[];
  readonly void: readonly CardInstance[];
  readonly currentRewardChoices: readonly RewardChoice[];
  readonly rewardHistory: readonly RewardHistoryEntry[];
  readonly openedPacks: readonly PackOpenResult[];
  readonly combatHistory: readonly CombatSummary[];
  readonly encounterHistory: readonly EncounterHistoryEntry[];
};

const emptyBoard = (): BoardState => ({ placements: [] });

const emptySourceRow = (): SourceRowState => ({
  cards: [],
  maxSlots: DEFAULT_SOURCE_ROW_SLOTS
});

const emptySpellrail = (): SpellrailState => ({
  cards: [],
  maxSlots: DEFAULT_SPELLRAIL_SLOTS
});

const copyPlacement = (placement: BoardPlacement): BoardPlacement => ({
  ...placement,
  position: { ...placement.position }
});

const copyBoard = (board: BoardState): BoardState => ({
  placements: board.placements.map(copyPlacement)
});

const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const copySourceRow = (sourceRow: SourceRowState): SourceRowState => ({
  maxSlots: sourceRow.maxSlots,
  cards: sourceRow.cards.map(copyCard)
});

const copySpellrail = (spellrail: SpellrailState): SpellrailState => ({
  maxSlots: spellrail.maxSlots,
  cards: spellrail.cards.map(copyCard)
});

export const createRun = (config: RunConfig): RunState => {
  const starterKit = config.starterKit;

  return {
    runId: config.runId ?? asRunId(`run:${config.seed}`),
    seed: config.seed,
    rulesVersion: config.rulesVersion ?? DEFAULT_RUN_RULES_VERSION,
    status: "active",
    currentRound: 1,
    maxRounds: config.maxRounds ?? DEFAULT_MAX_ROUNDS,
    ...(starterKit ? { starterKitId: starterKit.id } : {}),
    playerHealth: config.startingHealth ?? DEFAULT_STARTING_HEALTH,
    playerGold: config.startingGold ?? DEFAULT_STARTING_GOLD,
    playerId: config.playerId ?? asPlayerId("player"),
    pool: (starterKit?.pool ?? []).map(copyCard),
    board: starterKit?.board ? copyBoard(starterKit.board) : emptyBoard(),
    sourceRow: starterKit?.sourceRow
      ? copySourceRow(starterKit.sourceRow)
      : emptySourceRow(),
    spellrail: starterKit?.spellrail
      ? copySpellrail(starterKit.spellrail)
      : emptySpellrail(),
    ashes: (starterKit?.ashes ?? []).map(copyCard),
    void: (starterKit?.void ?? []).map(copyCard),
    currentRewardChoices: [],
    rewardHistory: [],
    openedPacks: [],
    combatHistory: [],
    encounterHistory: []
  };
};
