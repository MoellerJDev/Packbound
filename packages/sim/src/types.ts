import type { ContentCatalog } from "@packbound/content";
import type { SeededRng } from "@packbound/rules";
import type {
  AbilityDefinition,
  BoardPlacement,
  BoardPosition,
  BoardState,
  CardDefinition,
  CardInstance,
  CardInstanceId,
  CombatEvent,
  CombatWinner,
  DestroyedUnitTriggerCause,
  EchoCardDefinition,
  PlayerId,
  PlayerSide,
  SimulationWarning,
  SourceRowState,
  SpellrailState,
  TechniqueCardDefinition,
  UnitCardDefinition,
  UnitInstance,
  UnitInstanceId
} from "@packbound/shared";

export type UnitLikeDefinition = UnitCardDefinition | EchoCardDefinition;

export type CombatantSetup = {
  readonly playerId: PlayerId;
  readonly board: BoardState;
  readonly activeCards?: readonly CardInstance[];
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

export type ResolveCombatInput = {
  readonly catalog: ContentCatalog;
  readonly seed: string;
  readonly rulesVersion?: string;
  readonly playerA: CombatantSetup;
  readonly playerB: CombatantSetup;
  readonly maxDurationMs?: number;
};

export type CombatStateSnapshot = {
  readonly timeMs: number;
  readonly units: readonly UnitInstance[];
  readonly ashes: Readonly<Record<PlayerSide, readonly CardInstance[]>>;
  readonly void: Readonly<Record<PlayerSide, readonly UnitInstance[]>>;
  readonly combatCharge: Readonly<Record<PlayerSide, number>>;
};

export type CombatResult = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly finalState: CombatStateSnapshot;
  readonly events: readonly CombatEvent[];
  readonly warnings: readonly SimulationWarning[];
  readonly rulesVersion: string;
  readonly seed: string;
};

export type MutableUnit = {
  unitId: UnitInstanceId;
  cardInstanceId: CardInstanceId;
  def: UnitLikeDefinition;
  ownerId: PlayerId;
  side: PlayerSide;
  position: BoardPosition;
  attack: number;
  maxHealth: number;
  currentHealth: number;
  attackSpeed: number;
  range: number;
  keywords: string[];
  statuses: UnitInstance["statuses"];
  attackTimerMs: number;
  summonedThisCombat: boolean;
  isEcho: boolean;
  sourceCard?: CardInstance;
};

export type TechniqueRuntime = {
  readonly card: CardInstance;
  readonly def: TechniqueCardDefinition;
  used: boolean;
};

export type PermanentRuntime = {
  readonly cardInstanceId: CardInstanceId;
  readonly placement: BoardPlacement;
  readonly def: CardDefinition;
};

export type PhasedUnit = {
  readonly unit: MutableUnit;
  readonly returnAtMs: number;
  readonly originalPosition: BoardPosition;
  readonly retriggerEntryEffects: boolean;
};

export type MutableSideState = {
  readonly side: PlayerSide;
  readonly playerId: PlayerId;
  units: MutableUnit[];
  readonly permanents: PermanentRuntime[];
  readonly techniques: TechniqueRuntime[];
  ashes: CardInstance[];
  void: PhasedUnit[];
  combatCharge: number;
  readonly combatChargePerSecond: number;
  nextSummonIndex: number;
  firstAllyBelowHealthTriggered: boolean;
  destroyedUnitsThisCombat: number;
  readonly firstAllyDestroyedTriggerSources: Set<CardInstanceId>;
  readonly firstEnemyDestroyedTriggerSources: Set<CardInstanceId>;
};

export type MutableCombatState = {
  readonly catalog: ContentCatalog;
  readonly rng: SeededRng;
  readonly events: CombatEvent[];
  readonly warnings: SimulationWarning[];
  readonly sides: Record<PlayerSide, MutableSideState>;
  timeMs: number;
  ended: boolean;
};

export type AbilitySource = {
  readonly sideState: MutableSideState;
  readonly cardInstanceId: CardInstanceId;
  readonly def: CardDefinition;
  readonly unit?: MutableUnit;
  readonly placement?: BoardPlacement;
};

export type TriggerContext = {
  readonly causedBy?: DestroyedUnitTriggerCause;
};

export type ResolveAbilities = (
  state: MutableCombatState,
  source: AbilitySource,
  triggerType: AbilityDefinition["trigger"]["type"],
  depth: number,
  context?: TriggerContext
) => void;
