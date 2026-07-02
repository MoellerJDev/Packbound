import { describe, expect, it } from "vitest";

import { loadContentCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
  type CombatEvent,
  type PlayerId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

import { resolveCombat, type CombatantSetup, type ResolveCombatInput } from "../index";

const playerA = asPlayerId("destroyed-triggers:player-a");
const playerB = asPlayerId("destroyed-triggers:player-b");

const destroyedTriggerCards: readonly CardDefinition[] = [
  {
    id: asCardDefId("test_destroy_listener"),
    name: "Test Destroy Listener",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Listener"],
    keywords: [],
    abilities: [
      {
        id: "ally-destroyed-charge",
        trigger: { type: "OnAllyDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 2 }
      },
      {
        id: "enemy-destroyed-charge",
        trigger: { type: "OnEnemyDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 3 }
      },
      {
        id: "first-ally-destroyed-charge",
        trigger: { type: "WhenFirstAllyDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 5 }
      },
      {
        id: "first-enemy-destroyed-charge",
        trigger: { type: "WhenFirstEnemyDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 7 }
      }
    ],
    stats: { attack: 0, health: 6, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_destroy_condition_listener"),
    name: "Test Destroy Condition Listener",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Listener"],
    keywords: [],
    abilities: [
      {
        id: "ally-condition-before",
        trigger: { type: "OnCombatStart" },
        condition: { type: "AllyDestroyedThisCombat" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 11 }
      },
      {
        id: "ally-condition-after",
        trigger: { type: "OnAllyDestroyed" },
        condition: { type: "AllyDestroyedThisCombat" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 12 }
      },
      {
        id: "enemy-condition-before",
        trigger: { type: "OnCombatStart" },
        condition: { type: "EnemyDestroyedThisCombat" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 13 }
      },
      {
        id: "enemy-condition-after",
        trigger: { type: "OnEnemyDestroyed" },
        condition: { type: "EnemyDestroyedThisCombat" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 14 }
      }
    ],
    stats: { attack: 0, health: 6, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_destroy_relic_listener"),
    name: "Test Destroy Relic Listener",
    set: "test_lab",
    rarity: "common",
    cardType: "Relic",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Listener", "Relic"],
    keywords: [],
    abilities: [
      {
        id: "relic-ally-destroyed-charge",
        trigger: { type: "OnAllyDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 17 }
      }
    ],
    supportSlots: 1
  },
  {
    id: asCardDefId("test_reactive_destroyer"),
    name: "Test Reactive Destroyer",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Listener"],
    keywords: [],
    abilities: [
      {
        id: "enemy-destroyed-destroy-next",
        trigger: { type: "OnEnemyDestroyed" },
        condition: { type: "Always" },
        target: { type: "LowestHealthEnemy" },
        effect: { type: "Destroy" }
      }
    ],
    stats: { attack: 0, health: 6, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_loop_summoner"),
    name: "Test Loop Summoner",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Listener"],
    keywords: [],
    abilities: [
      {
        id: "ally-destroyed-summon-self-destroying-echo",
        trigger: { type: "OnAllyDestroyed" },
        condition: { type: "Always" },
        target: { type: "EmptyBacklineTile" },
        effect: {
          type: "SummonEcho",
          cardDefId: asCardDefId("test_self_destroying_echo"),
          placement: "Backline"
        }
      }
    ],
    stats: { attack: 0, health: 6, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_self_destroying_echo"),
    name: "Test Self-Destroying Echo",
    set: "test_lab",
    rarity: "common",
    cardType: "Echo",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Echo"],
    keywords: [],
    abilities: [
      {
        id: "self-destroy-on-entry",
        trigger: { type: "OnEntry" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "Destroy" }
      }
    ],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_fragile_ally"),
    name: "Test Fragile Ally",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Fragile"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_fragile_enemy"),
    name: "Test Fragile Enemy",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Fragile"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_fragile_echo"),
    name: "Test Fragile Echo",
    set: "test_lab",
    rarity: "common",
    cardType: "Echo",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Fragile", "Echo"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_quick_destroyer"),
    name: "Test Quick Destroyer",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Destroyer"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 6, attackSpeed: 5, range: 1 }
  }
];

const testCatalog = loadContentCatalog({
  cards: destroyedTriggerCards,
  packs: []
});

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
  index = `${row}-${col}`
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer: "ground" }
});

const supportPlacement = (
  ownerId: PlayerId,
  sideSeed: string,
  defId: string,
  row: number,
  col: number,
  index = `${row}-${col}`
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer: "support" }
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

const resolve = (input: Omit<ResolveCombatInput, "catalog" | "seed">) =>
  resolveCombat({
    catalog: testCatalog,
    seed: "destroyed-trigger-seed",
    ...input
  });

const combatChargeGains = (
  events: readonly CombatEvent[],
  playerId: PlayerId,
  amount?: number
) =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "CombatChargeGained" }> =>
      event.type === "CombatChargeGained" &&
      event.playerId === playerId &&
      (amount === undefined || event.amount === amount)
  );

const destroyedEvents = (events: readonly CombatEvent[]) =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitDestroyed" }> =>
      event.type === "UnitDestroyed"
  );

describe("destroyed-unit triggers", () => {
  it("fires OnAllyDestroyed when another allied Unit is destroyed", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_ally", 0, 0, "doomed"),
          placement(playerA, "a", "test_destroy_listener", 0, 6, "listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 300
    });

    expect(destroyedEvents(result.events)).toContainEqual(
      expect.objectContaining({
        defId: asCardDefId("test_fragile_ally"),
        side: "playerA",
        isEcho: false
      })
    );
    expect(combatChargeGains(result.events, playerA, 2)).toHaveLength(1);
  });

  it("does not fire OnAllyDestroyed for the destroyed source itself", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "test_destroy_listener", 0, 0, "listener"))
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 1500
    });

    expect(destroyedEvents(result.events)).toContainEqual(
      expect.objectContaining({
        defId: asCardDefId("test_destroy_listener"),
        side: "playerA"
      })
    );
    expect(combatChargeGains(result.events, playerA, 2)).toHaveLength(0);
    expect(combatChargeGains(result.events, playerA, 5)).toHaveLength(0);
  });

  it("fires OnEnemyDestroyed when an enemy Unit is destroyed", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_quick_destroyer", 0, 0, "attacker"),
          placement(playerA, "a", "test_destroy_listener", 0, 6, "listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_fragile_enemy", 0, 0, "doomed"))
      ),
      maxDurationMs: 300
    });

    expect(destroyedEvents(result.events)).toContainEqual(
      expect.objectContaining({
        defId: asCardDefId("test_fragile_enemy"),
        side: "playerB"
      })
    );
    expect(combatChargeGains(result.events, playerA, 3)).toHaveLength(1);
  });

  it("uses Relic permanents as destroyed-trigger sources", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_ally", 0, 0, "doomed"),
          supportPlacement(playerA, "a", "test_destroy_relic_listener", 1, 1, "relic")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 300
    });

    expect(combatChargeGains(result.events, playerA, 17)).toHaveLength(1);
  });

  it("fires WhenFirstAllyDestroyed only once per source per combat", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_ally", 0, 0, "first"),
          placement(playerA, "a", "test_fragile_ally", 0, 1, "second"),
          placement(playerA, "a", "test_destroy_listener", 0, 5, "listener-a"),
          placement(playerA, "a", "test_destroy_listener", 0, 6, "listener-b")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 500
    });

    expect(
      destroyedEvents(result.events).filter((event) => event.side === "playerA")
    ).toHaveLength(2);
    expect(combatChargeGains(result.events, playerA, 2)).toHaveLength(4);
    expect(combatChargeGains(result.events, playerA, 5)).toHaveLength(2);
  });

  it("fires WhenFirstEnemyDestroyed only once per source per combat", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_quick_destroyer", 0, 0, "attacker"),
          placement(playerA, "a", "test_destroy_listener", 0, 5, "listener-a"),
          placement(playerA, "a", "test_destroy_listener", 0, 6, "listener-b")
        )
      ),
      playerB: combatant(
        playerB,
        board(
          placement(playerB, "b", "test_fragile_enemy", 0, 0, "first"),
          placement(playerB, "b", "test_fragile_enemy", 0, 1, "second")
        )
      ),
      maxDurationMs: 500
    });

    expect(
      destroyedEvents(result.events).filter((event) => event.side === "playerB")
    ).toHaveLength(2);
    expect(combatChargeGains(result.events, playerA, 3)).toHaveLength(4);
    expect(combatChargeGains(result.events, playerA, 7)).toHaveLength(2);
  });

  it("makes AllyDestroyedThisCombat false before and true after allied destruction", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_ally", 0, 0, "doomed"),
          placement(playerA, "a", "test_destroy_condition_listener", 0, 6, "listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 300
    });

    expect(combatChargeGains(result.events, playerA, 11)).toHaveLength(0);
    expect(combatChargeGains(result.events, playerA, 12)).toHaveLength(1);
  });

  it("makes EnemyDestroyedThisCombat false before and true after enemy destruction", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_quick_destroyer", 0, 0, "attacker"),
          placement(playerA, "a", "test_destroy_condition_listener", 0, 6, "listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_fragile_enemy", 0, 0, "doomed"))
      ),
      maxDurationMs: 300
    });

    expect(combatChargeGains(result.events, playerA, 13)).toHaveLength(0);
    expect(combatChargeGains(result.events, playerA, 14)).toHaveLength(1);
  });

  it("counts destroyed Echoes for ally and enemy destroyed triggers without moving them to Ashes", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_echo", 0, 0, "echo"),
          placement(playerA, "a", "test_destroy_listener", 0, 6, "ally-listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(
          placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"),
          placement(playerB, "b", "test_destroy_listener", 0, 6, "enemy-listener")
        )
      ),
      maxDurationMs: 300
    });
    const destroyedEcho = destroyedEvents(result.events).find(
      (event) => event.defId === asCardDefId("test_fragile_echo")
    );

    expect(destroyedEcho).toMatchObject({ isEcho: true, side: "playerA" });
    expect(result.finalState.ashes.playerA).toHaveLength(0);
    expect(combatChargeGains(result.events, playerA, 2)).toHaveLength(1);
    expect(combatChargeGains(result.events, playerB, 3)).toHaveLength(1);
  });

  it("resolves nested destruction deterministically", () => {
    const input = {
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_quick_destroyer", 0, 0, "attacker"),
          placement(playerA, "a", "test_reactive_destroyer", 0, 6, "listener")
        )
      ),
      playerB: combatant(
        playerB,
        board(
          placement(playerB, "b", "test_fragile_enemy", 0, 0, "first"),
          placement(playerB, "b", "test_fragile_enemy", 0, 1, "second")
        )
      ),
      maxDurationMs: 300
    };
    const first = resolve(input);
    const second = resolve(input);
    const destroyedEnemies = destroyedEvents(first.events).filter(
      (event) => event.side === "playerB"
    );

    expect(second.events).toEqual(first.events);
    expect(destroyedEnemies).toHaveLength(2);
    expect(destroyedEnemies.map((event) => event.reason)).toEqual([
      "combatDamage",
      "effectDestroy"
    ]);
  });

  it("keeps trigger-depth protection for destroyed-trigger loops", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "test_fragile_ally", 0, 0, "doomed"),
          placement(playerA, "a", "test_loop_summoner", 0, 6, "summoner")
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "test_quick_destroyer", 0, 0, "attacker"))
      ),
      maxDurationMs: 2000
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "MAX_TRIGGER_DEPTH_REACHED" })
    );
    expect(result.events.length).toBeLessThan(500);
  });
});
