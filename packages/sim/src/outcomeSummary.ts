import type {
  CardDefId,
  CardInstance,
  CardInstanceId,
  CombatWinner,
  PlayerSide
} from "@packbound/shared";

import type { CombatResult } from "./types";

export type CombatOutcomeSummary = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly eventCount: number;
  readonly warningCodes: readonly string[];
  readonly finalUnitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly ashesDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly usedTechniqueDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly destroyedUnitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly durationMs: number;
};

const sides: readonly PlayerSide[] = ["playerA", "playerB"];

const emptyDefIdsBySide = (): Record<PlayerSide, CardDefId[]> => ({
  playerA: [],
  playerB: []
});

const cardInstanceIdFromUnitId = (
  unitId: string
): { readonly side: PlayerSide; readonly cardInstanceId: CardInstanceId } | undefined => {
  for (const side of sides) {
    const prefix = `${side}:`;
    if (unitId.startsWith(prefix)) {
      return {
        side,
        cardInstanceId: unitId.slice(prefix.length) as CardInstanceId
      };
    }
  }
  return undefined;
};

const cardBySideAndInstanceId = (
  ashes: CombatResult["finalState"]["ashes"]
): ReadonlyMap<
  CardInstanceId,
  { readonly side: PlayerSide; readonly card: CardInstance }
> => {
  const cards = new Map<
    CardInstanceId,
    { readonly side: PlayerSide; readonly card: CardInstance }
  >();

  for (const side of sides) {
    for (const card of ashes[side]) {
      cards.set(card.instanceId, { side, card });
    }
  }

  return cards;
};

export const summarizeCombatOutcome = (result: CombatResult): CombatOutcomeSummary => {
  const finalUnitDefIdsBySide = emptyDefIdsBySide();
  for (const unit of result.finalState.units) {
    finalUnitDefIdsBySide[unit.side].push(unit.defId);
  }

  const ashesDefIdsBySide = emptyDefIdsBySide();
  for (const side of sides) {
    ashesDefIdsBySide[side].push(
      ...result.finalState.ashes[side].map((card) => card.defId)
    );
  }

  const ashesByInstanceId = cardBySideAndInstanceId(result.finalState.ashes);
  const usedTechniqueDefIdsBySide = emptyDefIdsBySide();
  const destroyedUnitDefIdsBySide = emptyDefIdsBySide();

  for (const event of result.events) {
    if (event.type === "TechniqueUsed") {
      const usedCard = ashesByInstanceId.get(event.cardInstanceId);
      if (usedCard) {
        usedTechniqueDefIdsBySide[usedCard.side].push(usedCard.card.defId);
      }
    }

    if (event.type === "UnitDestroyed") {
      const destroyed = cardInstanceIdFromUnitId(event.unitId);
      if (!destroyed) {
        continue;
      }
      const destroyedCard = ashesByInstanceId.get(destroyed.cardInstanceId);
      if (destroyedCard) {
        destroyedUnitDefIdsBySide[destroyed.side].push(destroyedCard.card.defId);
      }
    }
  }

  return {
    winner: result.winner,
    damageToPlayerA: result.damageToPlayerA,
    damageToPlayerB: result.damageToPlayerB,
    eventCount: result.events.length,
    warningCodes: result.warnings.map((warning) => warning.code),
    finalUnitDefIdsBySide,
    ashesDefIdsBySide,
    usedTechniqueDefIdsBySide,
    destroyedUnitDefIdsBySide,
    durationMs: result.finalState.timeMs
  };
};
