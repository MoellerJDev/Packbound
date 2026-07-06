import type {
  BoardLayer,
  BoardPosition,
  CardDefId,
  CardInstanceId,
  CardType,
  CombatEvent,
  Keyword,
  PlayerSide
} from "@packbound/shared";

export type PixiReplayTokenDescriptor = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly name: string;
  readonly side: PlayerSide;
  readonly cardType: CardType | "Unknown";
  readonly layer: BoardLayer;
  readonly position: BoardPosition;
  readonly statChips: readonly string[];
  readonly traits: readonly string[];
  readonly keywords: readonly Keyword[];
};

export type PixiReplayCommandOptions = {
  readonly cardNamesByDefId?: ReadonlyMap<CardDefId, string>;
};

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
      readonly arrival: {
        readonly kind: "summoned" | "recalled" | "phasedIn";
        readonly sourceCardInstanceId?: CardInstanceId;
        readonly sourceDefId?: CardDefId;
        readonly sourceSide?: PlayerSide;
      };
      readonly token: PixiReplayTokenDescriptor;
    }
  | {
      readonly type: "phaseOut";
      readonly timeMs: number;
      readonly cardInstanceId: CardInstanceId;
    };

const cardNameForDefId = (defId: CardDefId, options: PixiReplayCommandOptions): string =>
  options.cardNamesByDefId?.get(defId) ?? defId;

const replayTokenForAppearEvent = (
  event: Extract<
    CombatEvent,
    { readonly type: "UnitSummoned" | "UnitRecalled" | "UnitPhasedIn" }
  >,
  options: PixiReplayCommandOptions
): PixiReplayTokenDescriptor => ({
  cardInstanceId: event.cardInstanceId,
  defId: event.defId,
  name: cardNameForDefId(event.defId, options),
  side: event.side,
  cardType: event.isEcho ? "Echo" : "Unit",
  layer: event.position.layer,
  position: event.position,
  statChips: [],
  traits: [],
  keywords: []
});

export const combatEventsToPixiReplayCommands = (
  events: readonly CombatEvent[],
  options: PixiReplayCommandOptions = {}
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
            position: event.position,
            arrival: {
              kind:
                event.type === "UnitSummoned"
                  ? "summoned"
                  : event.type === "UnitRecalled"
                    ? "recalled"
                    : "phasedIn",
              ...("sourceCardInstanceId" in event &&
              event.sourceCardInstanceId !== undefined
                ? { sourceCardInstanceId: event.sourceCardInstanceId }
                : {}),
              ...("sourceDefId" in event && event.sourceDefId !== undefined
                ? { sourceDefId: event.sourceDefId }
                : {}),
              ...("sourceSide" in event && event.sourceSide !== undefined
                ? { sourceSide: event.sourceSide }
                : {})
            },
            token: replayTokenForAppearEvent(event, options)
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
