import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type BoardPlacement,
  type BoardState,
  type CardDefId,
  type CardInstanceId,
  type CombatEvent,
  type CombatWinner,
  type PlayerId,
  type PlayerSide,
  type SourceRowState,
  type SpellrailState,
  type UnitInstanceId
} from "@packbound/shared";

import type { ResolveCombatInput } from "../types";

export type ExpectedEventStep = Pick<CombatEvent, "type"> &
  Partial<{
    readonly unitId: UnitInstanceId;
    readonly cardInstanceId: CardInstanceId;
    readonly winner: CombatWinner;
  }>;

export type ExpectedCombatSummary = {
  readonly winner: CombatWinner;
  readonly damageToPlayerA: number;
  readonly damageToPlayerB: number;
  readonly warningCodes: readonly string[];
  readonly finalState: {
    readonly unitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
    readonly ashesDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
    readonly voidUnitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  };
  readonly selectedEventSequence: readonly ExpectedEventStep[];
};

export type CombatFixture = {
  readonly id: string;
  readonly name: string;
  readonly input: Omit<ResolveCombatInput, "catalog">;
  readonly expected: ExpectedCombatSummary;
};

const fixturePlayerA = asPlayerId("fixture-player-a");
const fixturePlayerB = asPlayerId("fixture-player-b");

const emptySourceRow = (): SourceRowState => ({
  maxSlots: 4,
  cards: []
});

const emptySpellrail = (): SpellrailState => ({
  maxSlots: 4,
  cards: []
});

const placement = (
  ownerId: PlayerId,
  sideSeed: string,
  defId: string,
  row: number,
  col: number,
  layer: BoardPlacement["position"]["layer"] = "ground"
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${layer}:${row}-${col}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer }
});

const board = (...placements: readonly BoardPlacement[]): BoardState => ({
  placements
});

const combatant = (
  playerId: PlayerId,
  combatBoard: BoardState,
  sourceRow: SourceRowState = emptySourceRow(),
  spellrail: SpellrailState = emptySpellrail()
) => ({
  playerId,
  board: combatBoard,
  sourceRow,
  spellrail
});

const unitId = (
  side: PlayerSide,
  cardInstanceId: BoardPlacement["cardInstanceId"]
): UnitInstanceId => asUnitInstanceId(`${side}:${cardInstanceId}`);

const playerAEmberScraprunner = placement(
  fixturePlayerA,
  "fixture-a",
  "ember_scraprunner",
  0,
  2
);
const playerBDebtBoundColossus = placement(
  fixturePlayerB,
  "fixture-b",
  "debt_bound_colossus",
  0,
  3
);
const playerASignalNest = placement(
  fixturePlayerA,
  "fixture-a",
  "signal_nest",
  1,
  2,
  "support"
);
const playerBEmberScraprunner = placement(
  fixturePlayerB,
  "fixture-b",
  "ember_scraprunner",
  3,
  1
);
const summonedSignalWispCardInstanceId = asCardInstanceId(
  "playerA:summon:signal_wisp_echo:0"
);
const summonedSignalWispUnitId = asUnitInstanceId(
  `playerA:${summonedSignalWispCardInstanceId}`
);

export const combatFixtures: readonly CombatFixture[] = [
  {
    id: "ember-scraprunner-colossus",
    name: "Ember Scraprunner trades with Debt-Bound Colossus",
    input: {
      seed: "fixture-ember-colossus",
      playerA: combatant(fixturePlayerA, board(playerAEmberScraprunner)),
      playerB: combatant(fixturePlayerB, board(playerBDebtBoundColossus))
    },
    expected: {
      winner: "draw",
      damageToPlayerA: 0,
      damageToPlayerB: 0,
      warningCodes: [],
      finalState: {
        unitDefIdsBySide: { playerA: [], playerB: [] },
        ashesDefIdsBySide: {
          playerA: [asCardDefId("ember_scraprunner")],
          playerB: [asCardDefId("debt_bound_colossus")]
        },
        voidUnitDefIdsBySide: { playerA: [], playerB: [] }
      },
      selectedEventSequence: [
        { type: "CombatStarted" },
        {
          type: "UnitDestroyed",
          unitId: unitId("playerA", playerAEmberScraprunner.cardInstanceId)
        },
        {
          type: "UnitDestroyed",
          unitId: unitId("playerB", playerBDebtBoundColossus.cardInstanceId)
        },
        { type: "CombatEnded", winner: "draw" }
      ]
    }
  },
  {
    id: "signal-nest-echo-cleanup",
    name: "Signal Nest Echo vanishes instead of entering Ashes",
    input: {
      seed: "fixture-signal-nest",
      playerA: combatant(fixturePlayerA, board(playerASignalNest)),
      playerB: combatant(fixturePlayerB, board(playerBEmberScraprunner)),
      maxDurationMs: 1000
    },
    expected: {
      winner: "playerB",
      damageToPlayerA: 1,
      damageToPlayerB: 0,
      warningCodes: [],
      finalState: {
        unitDefIdsBySide: {
          playerA: [],
          playerB: [asCardDefId("ember_scraprunner")]
        },
        ashesDefIdsBySide: { playerA: [], playerB: [] },
        voidUnitDefIdsBySide: { playerA: [], playerB: [] }
      },
      selectedEventSequence: [
        { type: "CombatStarted" },
        {
          type: "UnitSummoned",
          unitId: summonedSignalWispUnitId,
          cardInstanceId: summonedSignalWispCardInstanceId
        },
        {
          type: "UnitDestroyed",
          unitId: summonedSignalWispUnitId
        },
        { type: "CombatEnded", winner: "playerB" }
      ]
    }
  }
];
