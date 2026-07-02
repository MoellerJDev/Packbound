import type { CardDefId, CombatWinner, PlayerSide } from "@packbound/shared";

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

  const usedTechniqueDefIdsBySide = emptyDefIdsBySide();
  const destroyedUnitDefIdsBySide = emptyDefIdsBySide();

  for (const event of result.events) {
    if (event.type === "TechniqueUsed") {
      usedTechniqueDefIdsBySide[event.side].push(event.defId);
    }

    if (event.type === "UnitDestroyed") {
      destroyedUnitDefIdsBySide[event.side].push(event.defId);
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
