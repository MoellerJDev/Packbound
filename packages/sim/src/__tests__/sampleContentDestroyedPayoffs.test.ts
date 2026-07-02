import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardPlacement,
  type BoardState,
  type CardDefId,
  type CombatEvent,
  type PlayerId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

import {
  buildCombatDisplaySummary,
  resolveCombat,
  type CombatantSetup,
  type ResolveCombatInput
} from "../index";

const playerA = asPlayerId("sample-destroyed-content:player-a");
const playerB = asPlayerId("sample-destroyed-content:player-b");

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
  index = `${row}-${col}`,
  layer: BoardPlacement["position"]["layer"] = "ground"
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer }
});

const board = (...placements: BoardPlacement[]): BoardState => ({
  placements
});

const combatant = (playerId: PlayerId, combatBoard: BoardState): CombatantSetup => ({
  playerId,
  board: combatBoard,
  sourceRow: emptySourceRow(),
  spellrail: emptySpellrail()
});

const resolveSample = (input: Omit<ResolveCombatInput, "catalog" | "seed">) =>
  resolveCombat({
    catalog: sampleCatalog,
    seed: "sample-destroyed-payoffs",
    ...input
  });

const damageFrom = (events: readonly CombatEvent[], defId: CardDefId) =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "DamageDealt" }> =>
      event.type === "DamageDealt" && event.sourceDefId === defId
  );

const destroyed = (events: readonly CombatEvent[], defId: CardDefId) =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitDestroyed" }> =>
      event.type === "UnitDestroyed" && event.defId === defId
  );

const recalled = (events: readonly CombatEvent[], defId: CardDefId) =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitRecalled" }> =>
      event.type === "UnitRecalled" && event.defId === defId
  );

const summaryText = (
  result: ReturnType<typeof resolveCombat>,
  perspectiveSide: "playerA" | "playerB" = "playerA"
): string =>
  buildCombatDisplaySummary({
    catalog: sampleCatalog,
    combatResult: result,
    perspectiveSide
  })
    .lines.map((line) => line.text)
    .join("\n");

describe("sample destroyed-trigger payoffs", () => {
  it("turns Coal Wisp Echo death into Sparkcatch Apprentice trigger damage", () => {
    const result = resolveSample({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "coal_wisp_echo", 0, 0, "fodder"),
          placement(playerA, "a", "sparkcatch_apprentice", 0, 6, "payoff")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "ember_scraprunner", 0, 1, "attacker"))
      ),
      maxDurationMs: 500
    });
    const triggerDamage = damageFrom(result.events, asCardDefId("sparkcatch_apprentice"));
    const text = summaryText(result);

    expect(destroyed(result.events, asCardDefId("coal_wisp_echo"))).toContainEqual(
      expect.objectContaining({ isEcho: true, side: "playerA" })
    );
    expect(triggerDamage).toContainEqual(
      expect.objectContaining({
        amount: 1,
        damageType: "trigger",
        targetSide: "playerB"
      })
    );
    expect(text).toContain("Coal Wisp Echo vanished");
    expect(text).toContain("Sparkcatch Apprentice dealt 1 trigger damage");
  });

  it("lets Last-Word Broker trigger from the first enemy destroyed", () => {
    const result = resolveSample({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "ember_scraprunner", 0, 0, "attacker"),
          placement(playerA, "a", "last_word_broker", 0, 6, "broker")
        )
      ),
      playerB: combatant(
        playerB,
        board(
          placement(playerB, "b", "coal_wisp_echo", 0, 1, "first"),
          placement(playerB, "b", "coal_wisp_echo", 0, 2, "second")
        )
      ),
      maxDurationMs: 500
    });
    const brokerDamage = damageFrom(result.events, asCardDefId("last_word_broker"));

    expect(destroyed(result.events, asCardDefId("coal_wisp_echo"))).toHaveLength(2);
    expect(brokerDamage).toContainEqual(
      expect.objectContaining({
        amount: 1,
        damageType: "trigger",
        targetSide: "playerB"
      })
    );
    expect(summaryText(result)).toContain("Last-Word Broker dealt 1 trigger damage");
  });

  it("lets Ash Ledger recall a destroyed ally from Ashes", () => {
    const result = resolveSample({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "slag_sparkler", 0, 0, "fodder"),
          placement(playerA, "a", "ash_ledger_relic", 1, 0, "ledger", "support")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "ember_scraprunner", 0, 1, "attacker"))
      ),
      maxDurationMs: 500
    });

    expect(recalled(result.events, asCardDefId("slag_sparkler"))).toContainEqual(
      expect.objectContaining({ side: "playerA" })
    );
    expect(summaryText(result)).toContain("recalled Slag Sparkler from Ashes");
    expect(result.warnings).toEqual([]);
  });
});
