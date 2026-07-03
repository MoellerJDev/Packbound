import type {
  BoardPosition,
  CardInstanceId,
  CombatEvent,
  PlayerSide
} from "@packbound/shared";

export type PixiReplayCommand =
  | {
      readonly type: "move";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly side: PlayerSide;
      readonly from: BoardPosition;
      readonly to: BoardPosition;
    }
  | {
      readonly type: "attack";
      readonly timeMs: number;
      readonly sourceCardInstanceId: CardInstanceId;
      readonly targetCardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "damage";
      readonly timeMs: number;
      readonly targetCardInstanceId: CardInstanceId;
      readonly amount: number;
    }
  | {
      readonly type: "destroyed";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "appear";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
      readonly side: PlayerSide;
      readonly position: BoardPosition;
    }
  | {
      readonly type: "phaseOut";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
    };

export const combatEventsToPixiReplayCommands = (
  events: readonly CombatEvent[]
): readonly PixiReplayCommand[] =>
  events.flatMap((event): readonly PixiReplayCommand[] => {
    switch (event.type) {
      case "UnitMoved":
        return [
          {
            type: "move",
            timeMs: event.timeMs,
            cardInstanceId: event.cardInstanceId,
            side: event.side,
            from: event.from,
            to: event.to
          }
        ];
      case "UnitAttacked":
        return [
          {
            type: "attack",
            timeMs: event.timeMs,
            sourceCardInstanceId: event.attackerCardInstanceId,
            targetCardInstanceId: event.targetCardInstanceId
          }
        ];
      case "DamageDealt":
        return event.amount > 0
          ? [
              {
                type: "damage",
                timeMs: event.timeMs,
                targetCardInstanceId: event.targetCardInstanceId,
                amount: event.amount
              }
            ]
          : [];
      case "UnitDestroyed":
        return [
          {
            type: "destroyed",
            timeMs: event.timeMs,
            cardInstanceId: event.cardInstanceId
          }
        ];
      case "UnitSummoned":
      case "UnitRecalled":
      case "UnitPhasedIn":
        return [
          {
            type: "appear",
            timeMs: event.timeMs,
            cardInstanceId: event.cardInstanceId,
            side: event.side,
            position: event.position
          }
        ];
      case "UnitPhasedOut":
        return [
          {
            type: "phaseOut",
            timeMs: event.timeMs,
            cardInstanceId: event.cardInstanceId
          }
        ];
      case "AbilityTriggered":
      case "CombatChargeGained":
      case "CombatEnded":
      case "CombatStarted":
      case "StatusApplied":
      case "StatusRemoved":
      case "TechniqueInterrupted":
      case "TechniqueQueued":
      case "TechniqueUsed":
      case "TraitActivated":
        return [];
    }
  });
