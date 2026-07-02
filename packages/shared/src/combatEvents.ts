import type { BoardPosition } from "./board";
import type { ActiveStatus, Keyword, StatusEffectType } from "./cards";
import type { CardDefId, CardInstanceId, PlayerId, UnitInstanceId } from "./ids";

export type PlayerSide = "playerA" | "playerB";
export type CombatWinner = PlayerSide | "draw";
export type DamageType = "attack" | "technique" | "relic" | "status" | "trigger";
export type DestructionReason =
  | "combatDamage"
  | "techniqueDamage"
  | "offered"
  | "effectDestroy"
  | "poison"
  | "burning"
  | "unknown";

export type UnitInstance = {
  readonly unitId: UnitInstanceId;
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly side: PlayerSide;
  readonly position: BoardPosition;
  readonly attack: number;
  readonly maxHealth: number;
  readonly currentHealth: number;
  readonly attackSpeed: number;
  readonly range: number;
  readonly keywords: readonly Keyword[];
  readonly statuses: readonly ActiveStatus[];
  readonly attachments: readonly CardInstanceId[];
  readonly attackTimerMs: number;
  readonly summonedThisCombat: boolean;
  readonly isEcho: boolean;
};

export type CombatEvent =
  | { readonly type: "CombatStarted"; readonly timeMs: number }
  | {
      readonly type: "TraitActivated";
      readonly timeMs: number;
      readonly playerId: PlayerId;
      readonly traitId: string;
      readonly tier: number;
    }
  | {
      readonly type: "CombatChargeGained";
      readonly timeMs: number;
      readonly playerId: PlayerId;
      readonly amount: number;
    }
  | {
      readonly type: "UnitMoved";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly from: BoardPosition;
      readonly to: BoardPosition;
    }
  | {
      readonly type: "UnitAttacked";
      readonly timeMs: number;
      readonly attackerId: UnitInstanceId;
      readonly targetId: UnitInstanceId;
    }
  | {
      readonly type: "DamageDealt";
      readonly timeMs: number;
      readonly sourceId?: string;
      readonly targetId: UnitInstanceId;
      readonly amount: number;
      readonly damageType: DamageType;
    }
  | {
      readonly type: "StatusApplied";
      readonly timeMs: number;
      readonly targetId: UnitInstanceId;
      readonly status: StatusEffectType;
      readonly durationMs?: number;
    }
  | {
      readonly type: "StatusRemoved";
      readonly timeMs: number;
      readonly targetId: UnitInstanceId;
      readonly status: StatusEffectType;
      readonly reason: "expired" | "consumed" | "cleansed";
    }
  | {
      readonly type: "UnitDestroyed";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly reason: DestructionReason;
    }
  | {
      readonly type: "UnitSummoned";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly cardInstanceId: CardInstanceId;
      readonly position: BoardPosition;
    }
  | {
      readonly type: "UnitRecalled";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly from: "ashes";
      readonly position: BoardPosition;
    }
  | {
      readonly type: "UnitPhasedOut";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
    }
  | {
      readonly type: "UnitPhasedIn";
      readonly timeMs: number;
      readonly unitId: UnitInstanceId;
      readonly position: BoardPosition;
    }
  | {
      readonly type: "TechniqueQueued";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "TechniqueUsed";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly targets: readonly string[];
    }
  | {
      readonly type: "TechniqueInterrupted";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly byCardInstanceId?: CardInstanceId;
    }
  | {
      readonly type: "CombatEnded";
      readonly timeMs: number;
      readonly winner: CombatWinner;
    };

export type SimulationWarning = {
  readonly code: string;
  readonly message: string;
};
