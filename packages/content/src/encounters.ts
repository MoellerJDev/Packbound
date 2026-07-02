import type {
  Aspect,
  BoardState,
  CardInstance,
  PackId,
  PlayerId,
  SourceRowState,
  SpellrailState
} from "@packbound/shared";

export const ENCOUNTER_KINDS = ["normal", "elite", "boss", "tutorial", "rival"] as const;
export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

export const ENCOUNTER_TIERS = ["early", "mid", "late", "final"] as const;
export type EncounterTier = (typeof ENCOUNTER_TIERS)[number];

export type EncounterBoard = BoardState;

export type EncounterLoadout = {
  readonly playerId: PlayerId;
  readonly board: EncounterBoard;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

export type EncounterRewardProfile = {
  readonly packBias?: readonly PackId[];
  readonly bonusGold?: number;
};

export type EncounterDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: EncounterKind;
  readonly tier: EncounterTier;
  readonly minRound: number;
  readonly maxRound: number;
  readonly difficulty: number;
  readonly loadout: EncounterLoadout;
  readonly tags?: readonly string[];
  readonly aspects?: readonly Aspect[];
  readonly rewardProfile?: EncounterRewardProfile;
};
