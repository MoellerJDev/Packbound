import {
  asPlayerId,
  asRunId,
  type BoardState,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CombatWinner,
  type DestructionReason,
  type PackId,
  type PackOpenResult,
  type PlayerId,
  type RunId,
  type SourceRowState,
  type SpellrailState,
  type Zone
} from "@packbound/shared";

import {
  cardFromBoardPlacement,
  cardInZone,
  copyBoard,
  copyCard,
  copySourceRow,
  copySpellrail
} from "./runCards";

export const DEFAULT_RUN_RULES_VERSION = "packbound-run-mvp-0";
export const DEFAULT_MAX_ROUNDS = 3;
export const DEFAULT_STARTING_HEALTH = 20;
export const DEFAULT_STARTING_GOLD = 0;
export const DEFAULT_SOURCE_ROW_SLOTS = 4;
export const DEFAULT_SPELLRAIL_SLOTS = 4;

export type RunStatus = "active" | "won" | "lost";
export type RunPhase =
  "planning" | "combatReady" | "combatResolved" | "reward" | "complete";

export type StarterKit = {
  readonly id: string;
  readonly name: string;
  readonly commander?: CardInstance;
  readonly pool?: readonly CardInstance[];
  readonly board?: BoardState;
  readonly activeCards?: readonly CardInstance[];
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
  readonly cost: number;
  readonly affordable: boolean;
  readonly goldAfterPurchase: number;
};

export type RewardChoice = PackRewardChoice;

export type RewardHistoryEntry = {
  readonly id: string;
  readonly type: "pack";
  readonly round: number;
  readonly choiceId: string;
  readonly packId: PackId;
  readonly cost: number;
  readonly goldBefore: number;
  readonly goldAfter: number;
  readonly openedPackSeed: string;
  readonly cardDefIds: readonly CardDefId[];
  readonly cardInstanceIds: readonly CardInstanceId[];
};

export type CommanderUpgradeId = "combat_training" | "rebind_calibration";

export type CommanderUpgradeHistoryEntry = {
  readonly id: string;
  readonly round: number;
  readonly upgradeId: CommanderUpgradeId;
  readonly label: string;
  readonly cardInstanceId: CardInstanceId;
  readonly cardDefId: CardDefId;
  readonly previousUpgradeLevel: number;
  readonly nextUpgradeLevel: number;
  readonly previousRebindTaxDiscount: number;
  readonly nextRebindTaxDiscount: number;
};

export type CommanderLifecycleEntryType =
  "created" | "deployed" | "returned_to_command" | "destroyed_to_command" | "upgraded";

export type CommanderLifecycleSource =
  "starter" | "planning" | "combat_result" | "reward";

export type CommanderLifecycleHistoryEntry = {
  readonly id: string;
  readonly round: number;
  readonly type: CommanderLifecycleEntryType;
  readonly label: string;
  readonly cardInstanceId: CardInstanceId;
  readonly cardDefId: CardDefId;
  readonly source: CommanderLifecycleSource;
  readonly phase: RunPhase;
  readonly fromZone?: Zone;
  readonly toZone?: Zone;
  readonly deployCountBefore: number;
  readonly deployCountAfter: number;
  readonly rebindTaxBefore: number;
  readonly rebindTaxAfter: number;
  readonly rebindTaxDiscountBefore: number;
  readonly rebindTaxDiscountAfter: number;
  readonly effectiveRebindTaxBefore: number;
  readonly effectiveRebindTaxAfter: number;
  readonly upgradeLevelBefore: number;
  readonly upgradeLevelAfter: number;
  readonly combatEventType?: "UnitDestroyed";
  readonly combatEventIndex?: number;
  readonly combatEventTimeMs?: number;
  readonly destructionReason?: DestructionReason;
  readonly upgradeId?: CommanderUpgradeId;
  readonly upgradeLabel?: string;
};

export type CombatSummary = {
  readonly round: number;
  readonly winner: CombatWinner;
  readonly damageToPlayer: number;
  readonly damageToOpponent: number;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly goldEarned: number;
  readonly seed?: string;
  readonly rulesVersion?: string;
};

export type EncounterHistoryEntry = {
  readonly round: number;
  readonly encounterId: string;
  readonly combatSummaryIndex: number;
};

export type CommanderState = {
  readonly card: CardInstance;
  readonly deployCount: number;
  readonly rebindTax: number;
  readonly rebindTaxDiscount: number;
  readonly upgradeHistory: readonly CommanderUpgradeHistoryEntry[];
  readonly lifecycleHistory: readonly CommanderLifecycleHistoryEntry[];
};

export type RunState = {
  readonly runId: RunId;
  readonly seed: string;
  readonly rulesVersion: string;
  readonly status: RunStatus;
  readonly phase: RunPhase;
  readonly currentRound: number;
  readonly maxRounds: number;
  readonly starterKitId?: string;
  readonly currentEncounterId?: string;
  readonly playerHealth: number;
  readonly playerGold: number;
  readonly playerId: PlayerId;
  readonly commander?: CommanderState;
  readonly pool: readonly CardInstance[];
  readonly board: BoardState;
  readonly activeCards: readonly CardInstance[];
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

const commanderEffectiveRebindTax = (
  rebindTax: number,
  rebindTaxDiscount: number
): number => Math.max(0, rebindTax - rebindTaxDiscount);

const createdCommanderLifecycleEntry = (
  card: CardInstance
): CommanderLifecycleHistoryEntry => ({
  id: "commander-lifecycle:1:0:created",
  round: 1,
  type: "created",
  label: "Commander initialized in Command Zone.",
  cardInstanceId: card.instanceId,
  cardDefId: card.defId,
  source: "starter",
  phase: "planning",
  toZone: "command",
  deployCountBefore: 0,
  deployCountAfter: 0,
  rebindTaxBefore: 0,
  rebindTaxAfter: 0,
  rebindTaxDiscountBefore: 0,
  rebindTaxDiscountAfter: 0,
  effectiveRebindTaxBefore: commanderEffectiveRebindTax(0, 0),
  effectiveRebindTaxAfter: commanderEffectiveRebindTax(0, 0),
  upgradeLevelBefore: card.upgradeLevel,
  upgradeLevelAfter: card.upgradeLevel
});

const commanderForStarterKit = (
  starterKit: StarterKit | undefined
): CommanderState | undefined => {
  if (!starterKit?.commander) {
    return undefined;
  }

  const card = cardInZone(starterKit.commander, "command");
  return {
    card,
    deployCount: 0,
    rebindTax: 0,
    rebindTaxDiscount: 0,
    upgradeHistory: [],
    lifecycleHistory: [createdCommanderLifecycleEntry(card)]
  };
};

const activeCardsForStarterKit = (
  starterKit: StarterKit | undefined
): readonly CardInstance[] => {
  if (!starterKit?.board) {
    return [];
  }

  if (starterKit.activeCards) {
    return starterKit.activeCards.map((card) => cardInZone(card, "board"));
  }

  return starterKit.board.placements.map(cardFromBoardPlacement);
};

export const getRunPhase = (run: RunState): RunPhase =>
  run.status === "active" ? run.phase : "complete";

export const canEditLoadout = (run: RunState): boolean => getRunPhase(run) === "planning";

export const createRun = (config: RunConfig): RunState => {
  const starterKit = config.starterKit;
  const commander = commanderForStarterKit(starterKit);

  return {
    runId: config.runId ?? asRunId(`run:${config.seed}`),
    seed: config.seed,
    rulesVersion: config.rulesVersion ?? DEFAULT_RUN_RULES_VERSION,
    status: "active",
    phase: "planning",
    currentRound: 1,
    maxRounds: config.maxRounds ?? DEFAULT_MAX_ROUNDS,
    ...(starterKit ? { starterKitId: starterKit.id } : {}),
    playerHealth: config.startingHealth ?? DEFAULT_STARTING_HEALTH,
    playerGold: config.startingGold ?? DEFAULT_STARTING_GOLD,
    playerId: config.playerId ?? asPlayerId("player"),
    ...(commander ? { commander } : {}),
    pool: (starterKit?.pool ?? []).map(copyCard),
    board: starterKit?.board ? copyBoard(starterKit.board) : emptyBoard(),
    activeCards: activeCardsForStarterKit(starterKit),
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
