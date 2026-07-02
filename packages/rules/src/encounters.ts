import type { ContentCatalog, EncounterDefinition } from "@packbound/content";
import type {
  BoardPlacement,
  BoardState,
  CardInstance,
  PlayerId,
  SourceRowState,
  SpellrailState
} from "@packbound/shared";

import { createRng } from "./rng";
import type { RunState } from "./runState";

export type EncounterCombatantSetup = {
  readonly playerId: PlayerId;
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly startingAshes?: readonly CardInstance[];
};

const copyCard = (card: CardInstance): CardInstance => ({
  ...card,
  modifiers: card.modifiers.map((modifier) => ({
    ...modifier,
    ...(modifier.metadata ? { metadata: { ...modifier.metadata } } : {})
  }))
});

const copyPlacement = (placement: BoardPlacement): BoardPlacement => ({
  ...placement,
  position: { ...placement.position }
});

const copyBoard = (board: BoardState): BoardState => ({
  placements: board.placements.map(copyPlacement)
});

const copySourceRow = (sourceRow: SourceRowState): SourceRowState => ({
  maxSlots: sourceRow.maxSlots,
  cards: sourceRow.cards.map(copyCard)
});

const copySpellrail = (spellrail: SpellrailState): SpellrailState => ({
  maxSlots: spellrail.maxSlots,
  cards: spellrail.cards.map(copyCard)
});

const eligibleForRound = (
  run: RunState,
  catalog: ContentCatalog
): readonly EncounterDefinition[] =>
  catalog.encounters.filter(
    (encounter) =>
      encounter.minRound <= run.currentRound && encounter.maxRound >= run.currentRound
  );

const pickDeterministicEncounter = (
  run: RunState,
  encounters: readonly EncounterDefinition[]
): EncounterDefinition => {
  const pool = [...encounters].sort((left, right) => left.id.localeCompare(right.id));
  if (pool.length === 0) {
    throw new Error(`No eligible encounter for round ${run.currentRound}`);
  }

  const rng = createRng(
    `${run.seed}:round:${run.currentRound}:encounter:${run.encounterHistory.length}`
  );
  return rng.pick(pool);
};

export const getCurrentEncounter = (
  run: RunState,
  catalog: ContentCatalog
): EncounterDefinition | undefined =>
  run.currentEncounterId ? catalog.encountersById.get(run.currentEncounterId) : undefined;

export const selectEncounterForRound = (
  run: RunState,
  catalog: ContentCatalog
): EncounterDefinition => {
  const currentEncounter = getCurrentEncounter(run, catalog);
  if (currentEncounter) {
    return currentEncounter;
  }
  if (run.currentEncounterId) {
    throw new Error(`Unknown current encounter id: ${run.currentEncounterId}`);
  }

  const eligible = eligibleForRound(run, catalog);
  if (run.currentRound >= run.maxRounds) {
    const bossEncounters = eligible.filter((encounter) => encounter.kind === "boss");
    if (bossEncounters.length > 0) {
      return pickDeterministicEncounter(run, bossEncounters);
    }
  }

  const nonBossEncounters = eligible.filter((encounter) => encounter.kind !== "boss");
  const basePool = nonBossEncounters.length > 0 ? nonBossEncounters : eligible;
  const foughtEncounterIds = new Set(
    run.encounterHistory.map((entry) => entry.encounterId)
  );
  const freshPool = basePool.filter((encounter) => !foughtEncounterIds.has(encounter.id));

  return pickDeterministicEncounter(run, freshPool.length > 0 ? freshPool : basePool);
};

export const prepareEncounterForRound = (
  run: RunState,
  catalog: ContentCatalog
): RunState => {
  if (run.status !== "active" || run.phase !== "planning" || run.currentEncounterId) {
    return run;
  }

  const encounter = selectEncounterForRound(run, catalog);
  return {
    ...run,
    currentEncounterId: encounter.id
  };
};

export const buildCombatantSetupForEncounter = (
  encounter: EncounterDefinition
): EncounterCombatantSetup => ({
  playerId: encounter.loadout.playerId,
  board: copyBoard(encounter.loadout.board),
  sourceRow: copySourceRow(encounter.loadout.sourceRow),
  spellrail: copySpellrail(encounter.loadout.spellrail),
  ...(encounter.loadout.startingAshes
    ? { startingAshes: encounter.loadout.startingAshes.map(copyCard) }
    : {})
});
