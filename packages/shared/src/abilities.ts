import type { BoardPosition } from "./board";
import type { Keyword, StatusEffectType } from "./cards";
import type { CardDefId } from "./ids";

export type Trigger =
  | { readonly type: "OnCombatStart" }
  | { readonly type: "OnCombatEnd" }
  | { readonly type: "OnEntry" }
  | { readonly type: "OnLeaveBoard" }
  | { readonly type: "OnDestroyed" }
  | { readonly type: "OnOffered" }
  | { readonly type: "OnAllyDestroyed" }
  | { readonly type: "OnEnemyDestroyed" }
  | { readonly type: "OnSummoned" }
  | { readonly type: "OnTechniqueUsed" }
  | { readonly type: "OnTakeDamage" }
  | { readonly type: "OnDealDamage" }
  | { readonly type: "OnAttack" }
  | { readonly type: "OnKill" }
  | { readonly type: "OnCombatChargeGained" }
  | { readonly type: "WhenCombatChargeAtLeast"; readonly amount: number }
  | { readonly type: "WhenFirstAllyDestroyed" }
  | { readonly type: "WhenFirstEnemyDestroyed" }
  | { readonly type: "WhenFirstEnemyUsesTechnique" }
  | {
      readonly type: "WhenFirstAllyBelowHealthPercent";
      readonly percent: number;
    }
  | { readonly type: "AfterSeconds"; readonly seconds: number };

export type Condition =
  | { readonly type: "Always" }
  | { readonly type: "HasTag"; readonly tag: string }
  | { readonly type: "HasKeyword"; readonly keyword: Keyword }
  | { readonly type: "IsDamaged" }
  | { readonly type: "IsAdjacent" }
  | { readonly type: "IsInRow"; readonly row: number }
  | { readonly type: "IsInColumn"; readonly col: number }
  | { readonly type: "HasStatus"; readonly status: StatusEffectType }
  | { readonly type: "CombatChargeAvailable"; readonly amount: number }
  | { readonly type: "AshesHasCard" }
  | { readonly type: "AllyDestroyedThisCombat" }
  | { readonly type: "EnemyDestroyedThisCombat" };

export type TargetSelector =
  | { readonly type: "Self" }
  | { readonly type: "Source" }
  | { readonly type: "NearestEnemy" }
  | { readonly type: "LowestHealthAlliedUnit" }
  | { readonly type: "LowestHealthEnemy" }
  | { readonly type: "HighestAttackEnemy" }
  | { readonly type: "RandomEnemy" }
  | { readonly type: "AdjacentAllied" }
  | { readonly type: "AdjacentEnemy" }
  | { readonly type: "SameRowEnemy" }
  | { readonly type: "SameColumnEnemy" }
  | { readonly type: "AllAllied" }
  | { readonly type: "AllEnemies" }
  | { readonly type: "AlliedUnitWithTag"; readonly tag: string }
  | { readonly type: "EnemyUnitWithTag"; readonly tag: string }
  | { readonly type: "EmptyAdjacentTile" }
  | { readonly type: "EmptyBacklineTile" }
  | { readonly type: "CardInAshes"; readonly maxChargeCost?: number }
  | { readonly type: "CardInVoid" };

export type PhaseOptions = {
  readonly delayMs: number;
  readonly clearNegativeStatuses: boolean;
  readonly retriggerEntryEffects: boolean;
  readonly returnPreference: "originalTile" | "nearestOpenTile" | "backline";
};

export type AbilityEffect =
  | { readonly type: "DealDamage"; readonly amount: number }
  | { readonly type: "Heal"; readonly amount: number }
  | {
      readonly type: "ModifyStats";
      readonly attack?: number;
      readonly health?: number;
      readonly attackSpeed?: number;
    }
  | {
      readonly type: "ApplyStatus";
      readonly status: StatusEffectType;
      readonly durationMs?: number;
      readonly stacks?: number;
    }
  | { readonly type: "RemoveStatus"; readonly status: StatusEffectType }
  | { readonly type: "GrantKeyword"; readonly keyword: Keyword }
  | { readonly type: "RemoveKeyword"; readonly keyword: Keyword }
  | {
      readonly type: "SummonEcho";
      readonly cardDefId: CardDefId;
      readonly placement: "FirstOpen" | "AdjacentToSource" | "Backline";
    }
  | {
      readonly type: "SummonUnit";
      readonly cardDefId: CardDefId;
      readonly placement: "FirstOpen" | "AdjacentToSource" | "Backline";
    }
  | { readonly type: "Offer" }
  | { readonly type: "Destroy" }
  | { readonly type: "SendToVoid" }
  | { readonly type: "ReturnFromVoid" }
  | ({ readonly type: "Phase" } & PhaseOptions)
  | {
      readonly type: "Recall";
      readonly maxChargeCost?: number;
      readonly healthOverride?: number;
      readonly placement: "FirstOpen" | "Backline";
      readonly becomesEcho?: boolean;
    }
  | { readonly type: "MoveUnit"; readonly to: BoardPosition }
  | { readonly type: "Attach" }
  | { readonly type: "Detach" }
  | { readonly type: "GainCombatCharge"; readonly amount: number }
  | { readonly type: "DrainCombatCharge"; readonly amount: number }
  | { readonly type: "CopyTechnique" }
  | { readonly type: "InterruptTechnique" }
  | { readonly type: "MillToAshes"; readonly count: number };

export type AbilityDefinition = {
  readonly id: string;
  readonly trigger: Trigger;
  readonly condition: Condition;
  readonly target: TargetSelector;
  readonly effect: AbilityEffect;
};
