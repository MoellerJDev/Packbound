import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardState,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";
import { createCardInstance } from "@packbound/rules";

import { resolveCombat, type CombatantSetup } from "../combat";

const playerA = asPlayerId("player-a");
const playerB = asPlayerId("player-b");

const instance = (
  playerId: ReturnType<typeof asPlayerId>,
  defId: string,
  zone: "sourceRow" | "spellrail"
) =>
  createCardInstance({
    ownerId: playerId,
    defId: asCardDefId(defId),
    zone,
    instanceId: asCardInstanceId(`${playerId}:${defId}:${zone}`)
  });

const sourceRow = (
  playerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SourceRowState => ({
  maxSlots: 4,
  cards: defIds.map((defId) => instance(playerId, defId, "sourceRow"))
});

const spellrail = (
  playerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SpellrailState => ({
  maxSlots: 2,
  cards: defIds.map((defId) => instance(playerId, defId, "spellrail"))
});

const unitBoard = (
  playerId: ReturnType<typeof asPlayerId>,
  sideSeed: string,
  ...defIds: string[]
): BoardState => ({
  placements: defIds.map((defId, index) => ({
    cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${index}`),
    defId: asCardDefId(defId),
    ownerId: playerId,
    position: { row: 0, col: index, layer: "ground" }
  }))
});

const relicBoard = (playerId: ReturnType<typeof asPlayerId>): BoardState => ({
  placements: [
    {
      cardInstanceId: asCardInstanceId("a:signal_nest"),
      defId: asCardDefId("signal_nest"),
      ownerId: playerId,
      position: { row: 1, col: 1, layer: "support" }
    }
  ]
});

const combatant = (
  playerId: ReturnType<typeof asPlayerId>,
  board: BoardState,
  sources: SourceRowState,
  rail: SpellrailState
): CombatantSetup => ({
  playerId,
  board,
  sourceRow: sources,
  spellrail: rail
});

describe("deterministic combat", () => {
  it("produces the same event log for the same input and seed", () => {
    const input = {
      catalog: sampleCatalog,
      seed: "combat-seed",
      playerA: combatant(
        playerA,
        unitBoard(playerA, "a", "ember_scraprunner"),
        sourceRow(playerA, "ember_source"),
        spellrail(playerA, "sparkfall")
      ),
      playerB: combatant(
        playerB,
        unitBoard(playerB, "b", "debt_bound_colossus"),
        sourceRow(playerB, "bloom_source"),
        spellrail(playerB)
      )
    };

    const first = resolveCombat(input);
    const second = resolveCombat(input);

    expect(second.events).toEqual(first.events);
    expect(second.winner).toEqual(first.winner);
  });

  it("moves destroyed non-Echo units to Ashes", () => {
    const result = resolveCombat({
      catalog: sampleCatalog,
      seed: "ashes-flow",
      playerA: combatant(
        playerA,
        unitBoard(playerA, "a", "ember_scraprunner"),
        sourceRow(playerA, "ember_source"),
        spellrail(playerA)
      ),
      playerB: combatant(
        playerB,
        unitBoard(playerB, "b", "debt_bound_colossus"),
        sourceRow(playerB, "bloom_source"),
        spellrail(playerB)
      )
    });

    expect(result.finalState.ashes.playerA.map((card) => card.defId)).toContain(
      asCardDefId("ember_scraprunner")
    );
    expect(result.events.some((event) => event.type === "UnitDestroyed")).toBe(true);
  });

  it("summons Echoes from generic OnCombatStart abilities", () => {
    const result = resolveCombat({
      catalog: sampleCatalog,
      seed: "summon-flow",
      playerA: combatant(
        playerA,
        relicBoard(playerA),
        sourceRow(playerA, "ember_source"),
        spellrail(playerA)
      ),
      playerB: combatant(
        playerB,
        unitBoard(playerB, "b", "ember_scraprunner"),
        sourceRow(playerB, "ember_source"),
        spellrail(playerB)
      ),
      maxDurationMs: 2000
    });

    expect(result.events.some((event) => event.type === "UnitSummoned")).toBe(true);
    expect(result.finalState.ashes.playerA).toHaveLength(0);
  });
});
