import { describe, expect, it } from "vitest";

import {
  loadContentCatalog,
  sampleCards,
  samplePacks,
  sampleTraitDefinitions
} from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
  type CombatEvent,
  type PlayerId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

import { resolveCombat, type CombatantSetup, type ResolveCombatInput } from "../index";

const playerA = asPlayerId("stat-player-a");
const playerB = asPlayerId("stat-player-b");

const statCards: readonly CardDefinition[] = [
  {
    id: asCardDefId("stat_plain_attacker"),
    name: "Stat Plain Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: [],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_quickstart_attacker"),
    name: "Stat Quickstart Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_fast_attacker"),
    name: "Stat Fast Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: [],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 4, range: 1 }
  },
  {
    id: asCardDefId("stat_heavy_attacker"),
    name: "Stat Heavy Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 4, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_anti_air_attacker"),
    name: "Stat AntiAir Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: ["AntiAir", "Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_airborne_attacker"),
    name: "Stat Airborne Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: ["Airborne", "Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_training_target"),
    name: "Stat Training Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_low_health_target"),
    name: "Stat Low Health Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 2, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_endless_target"),
    name: "Stat Endless Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 99, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_guard_target"),
    name: "Stat Guard Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_barrier_target"),
    name: "Stat Barrier Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: ["Barrier"],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_airborne_target"),
    name: "Stat Airborne Target",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Target"],
    keywords: ["Airborne"],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  }
];

const catalog = loadContentCatalog({
  cards: [...sampleCards, ...statCards],
  packs: samplePacks,
  traits: sampleTraitDefinitions
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
  suffix = `${row}-${col}`
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`stat:${sideSeed}:${defId}:${suffix}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer: "ground" }
});

const board = (...placements: BoardPlacement[]): BoardState => ({ placements });

const combatant = (playerId: PlayerId, combatBoard: BoardState): CombatantSetup => ({
  playerId,
  board: combatBoard,
  sourceRow: emptySourceRow(),
  spellrail: emptySpellrail()
});

const resolve = (input: Omit<ResolveCombatInput, "catalog" | "seed">) =>
  resolveCombat({
    catalog,
    seed: "combat-stat-model",
    ...input
  });

const unitId = (side: "playerA" | "playerB", cardInstanceId: string) =>
  asUnitInstanceId(`${side}:${cardInstanceId}`);

const attacksBySide = (events: readonly CombatEvent[], side: "playerA" | "playerB") =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitAttacked" }> =>
      event.type === "UnitAttacked" && event.attackerSide === side
  );

const firstAttack = (
  events: readonly CombatEvent[]
): Extract<CombatEvent, { readonly type: "UnitAttacked" }> => {
  const attack = events.find(
    (event): event is Extract<CombatEvent, { readonly type: "UnitAttacked" }> =>
      event.type === "UnitAttacked"
  );
  if (!attack) {
    throw new Error("Expected a UnitAttacked event");
  }
  return attack;
};

describe("combat stat model", () => {
  it("uses attack as basic-attack damage", () => {
    const target = placement(playerB, "b", "stat_training_target", 0, 6, "target");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_heavy_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "DamageDealt",
        targetId: unitId("playerB", target.cardInstanceId),
        amount: 4,
        damageType: "attack"
      })
    );
  });

  it("uses health to determine whether damage destroys a Unit", () => {
    const target = placement(playerB, "b", "stat_training_target", 0, 6, "target");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_heavy_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });
    const targetUnit = result.finalState.units.find(
      (unit) => unit.cardInstanceId === target.cardInstanceId
    );

    expect(targetUnit?.currentHealth).toBe(1);
    expect(
      result.events.some(
        (event) =>
          event.type === "UnitDestroyed" && event.cardInstanceId === target.cardInstanceId
      )
    ).toBe(false);
  });

  it("uses attack speed to change attack timing and count", () => {
    const runCase = (defId: string) =>
      resolve({
        playerA: combatant(
          playerA,
          board(placement(playerA, "a", defId, 0, 0, "attacker"))
        ),
        playerB: combatant(
          playerB,
          board(placement(playerB, "b", "stat_endless_target", 0, 6, "target"))
        ),
        maxDurationMs: 1000
      });

    expect(attacksBySide(runCase("stat_plain_attacker").events, "playerA")).toHaveLength(
      1
    );
    expect(attacksBySide(runCase("stat_fast_attacker").events, "playerA")).toHaveLength(
      4
    );
  });

  it("uses Quickstart to make a Unit attack before its normal first timer", () => {
    const runCase = (defId: string) =>
      resolve({
        playerA: combatant(
          playerA,
          board(placement(playerA, "a", defId, 0, 0, "attacker"))
        ),
        playerB: combatant(
          playerB,
          board(placement(playerB, "b", "stat_training_target", 0, 6, "target"))
        ),
        maxDurationMs: 100
      });

    expect(attacksBySide(runCase("stat_plain_attacker").events, "playerA")).toHaveLength(
      0
    );
    expect(
      attacksBySide(runCase("stat_quickstart_attacker").events, "playerA")[0]?.timeMs
    ).toBe(100);
  });

  it("uses board distance for normal target priority", () => {
    const nearTarget = placement(playerB, "b", "stat_training_target", 0, 1, "near");
    const farTarget = placement(playerB, "b", "stat_training_target", 0, 6, "far");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_quickstart_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(farTarget, nearTarget)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", nearTarget.cardInstanceId)
    );
  });

  it("lets Guard override distance target priority", () => {
    const nearTarget = placement(playerB, "b", "stat_training_target", 0, 1, "near");
    const guardTarget = placement(playerB, "b", "stat_guard_target", 0, 6, "guard");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_quickstart_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(nearTarget, guardTarget)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", guardTarget.cardInstanceId)
    );
  });

  it("uses Barrier to block one damage instance", () => {
    const target = placement(playerB, "b", "stat_barrier_target", 0, 6, "target");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_heavy_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "StatusRemoved",
        targetId: unitId("playerB", target.cardInstanceId),
        status: "Barrier",
        reason: "consumed"
      })
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "DamageDealt",
        targetId: unitId("playerB", target.cardInstanceId),
        amount: 0
      })
    );
  });

  it("uses AntiAir to prefer Airborne targets", () => {
    const nearGround = placement(playerB, "b", "stat_training_target", 0, 1, "near");
    const airborne = placement(playerB, "b", "stat_airborne_target", 0, 6, "air");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_anti_air_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(nearGround, airborne)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", airborne.cardInstanceId)
    );
  });

  it("uses Airborne attackers to prefer low-health targets before distance", () => {
    const nearTarget = placement(playerB, "b", "stat_training_target", 0, 1, "near");
    const farLowHealthTarget = placement(
      playerB,
      "b",
      "stat_low_health_target",
      0,
      6,
      "far-low"
    );
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_airborne_attacker", 0, 0, "attacker"))
      ),
      playerB: combatant(playerB, board(nearTarget, farLowHealthTarget)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", farLowHealthTarget.cardInstanceId)
    );
  });

  it("stores range but does not enforce it as max attack distance yet", () => {
    const attacker = placement(
      playerA,
      "a",
      "stat_quickstart_attacker",
      0,
      0,
      "attacker"
    );
    const farTarget = placement(playerB, "b", "stat_training_target", 0, 6, "far");
    const result = resolve({
      playerA: combatant(playerA, board(attacker)),
      playerB: combatant(playerB, board(farTarget)),
      maxDurationMs: 5000
    });

    expect(
      result.finalState.units.find(
        (unit) => unit.cardInstanceId === attacker.cardInstanceId
      )?.range
    ).toBe(1);
    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", farTarget.cardInstanceId)
    );
    expect(result.warnings).toEqual([]);
  });
});
