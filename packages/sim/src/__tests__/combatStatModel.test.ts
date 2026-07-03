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
    id: asCardDefId("stat_ranged_attacker"),
    name: "Stat Ranged Attacker",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 3 }
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
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 3 }
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
    stats: { attack: 1, health: 10, attackSpeed: 1, range: 3 }
  },
  {
    id: asCardDefId("stat_hex_adjacent_leader"),
    name: "Stat Hex Adjacent Leader",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: [],
    abilities: [
      {
        id: "stat-hex-adjacent-rally",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "ModifyStats", attack: 1 }
      }
    ],
    stats: { attack: 0, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("stat_hex_adjacent_zapper"),
    name: "Stat Hex Adjacent Zapper",
    set: "stat_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Tester"],
    keywords: [],
    abilities: [
      {
        id: "stat-hex-adjacent-zap",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "AdjacentEnemy" },
        effect: { type: "DealDamage", amount: 1 }
      }
    ],
    stats: { attack: 0, health: 10, attackSpeed: 1, range: 1 }
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

const movesBySide = (events: readonly CombatEvent[], side: "playerA" | "playerB") =>
  events.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitMoved" }> =>
      event.type === "UnitMoved" && event.side === side
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

const firstMove = (
  events: readonly CombatEvent[]
): Extract<CombatEvent, { readonly type: "UnitMoved" }> => {
  const move = events.find(
    (event): event is Extract<CombatEvent, { readonly type: "UnitMoved" }> =>
      event.type === "UnitMoved"
  );
  if (!move) {
    throw new Error("Expected a UnitMoved event");
  }
  return move;
};

describe("combat stat model", () => {
  it("uses attack as basic-attack damage", () => {
    const target = placement(playerB, "b", "stat_training_target", 0, 1, "target");
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
    const target = placement(playerB, "b", "stat_training_target", 0, 1, "target");
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
          board(placement(playerB, "b", "stat_endless_target", 0, 1, "target"))
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
          board(placement(playerB, "b", "stat_training_target", 0, 1, "target"))
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

  it("uses hex board distance for normal target priority", () => {
    const hexNearTarget = placement(
      playerB,
      "b",
      "stat_training_target",
      3,
      0,
      "hex-near"
    );
    const hexFarTarget = placement(playerB, "b", "stat_training_target", 0, 6, "hex-far");
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_ranged_attacker", 0, 2, "attacker"))
      ),
      playerB: combatant(playerB, board(hexFarTarget, hexNearTarget)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", hexNearTarget.cardInstanceId)
    );
  });

  it("lets Guard override distance target priority", () => {
    const nearTarget = placement(playerB, "b", "stat_training_target", 0, 0, "near");
    const guardTarget = placement(playerB, "b", "stat_guard_target", 0, 1, "guard");
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
    const target = placement(playerB, "b", "stat_barrier_target", 0, 1, "target");
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
    const airborne = placement(playerB, "b", "stat_airborne_target", 0, 3, "air");
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
      3,
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

  it("uses six-neighbor hex adjacency for allied ability selectors", () => {
    const hexAdjacent = placement(playerA, "a", "stat_training_target", 1, 0, "adjacent");
    const squareDiagonal = placement(
      playerA,
      "a",
      "stat_training_target",
      1,
      1,
      "diagonal"
    );
    const result = resolve({
      playerA: combatant(
        playerA,
        board(
          placement(playerA, "a", "stat_hex_adjacent_leader", 0, 0, "leader"),
          hexAdjacent,
          squareDiagonal
        )
      ),
      playerB: combatant(
        playerB,
        board(placement(playerB, "b", "stat_endless_target", 3, 6, "target"))
      ),
      maxDurationMs: 0
    });
    const unitAttack = (cardInstanceId: string) =>
      result.finalState.units.find((unit) => unit.cardInstanceId === cardInstanceId)
        ?.attack;

    expect(unitAttack(hexAdjacent.cardInstanceId)).toBe(1);
    expect(unitAttack(squareDiagonal.cardInstanceId)).toBe(0);
  });

  it("uses six-neighbor hex adjacency for enemy ability selectors", () => {
    const hexAdjacent = placement(playerB, "b", "stat_training_target", 1, 0, "adjacent");
    const squareDiagonal = placement(
      playerB,
      "b",
      "stat_training_target",
      1,
      1,
      "diagonal"
    );
    const result = resolve({
      playerA: combatant(
        playerA,
        board(placement(playerA, "a", "stat_hex_adjacent_zapper", 0, 0, "zapper"))
      ),
      playerB: combatant(playerB, board(hexAdjacent, squareDiagonal)),
      maxDurationMs: 0
    });
    const unitHealth = (cardInstanceId: string) =>
      result.finalState.units.find((unit) => unit.cardInstanceId === cardInstanceId)
        ?.currentHealth;

    expect(unitHealth(hexAdjacent.cardInstanceId)).toBe(4);
    expect(unitHealth(squareDiagonal.cardInstanceId)).toBe(5);
  });

  it("uses range as the maximum basic-attack distance", () => {
    const attacker = placement(
      playerA,
      "a",
      "stat_quickstart_attacker",
      0,
      0,
      "attacker"
    );
    const target = placement(playerB, "b", "stat_training_target", 0, 1, "target");
    const result = resolve({
      playerA: combatant(playerA, board(attacker)),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });

    expect(firstAttack(result.events).targetId).toBe(
      unitId("playerB", target.cardInstanceId)
    );
    expect(movesBySide(result.events, "playerA")).toHaveLength(0);
  });

  it("moves outside range instead of attacking", () => {
    const attacker = placement(
      playerA,
      "a",
      "stat_quickstart_attacker",
      0,
      0,
      "attacker"
    );
    const farTarget = placement(playerB, "b", "stat_training_target", 0, 3, "far");
    const result = resolve({
      playerA: combatant(playerA, board(attacker)),
      playerB: combatant(playerB, board(farTarget)),
      maxDurationMs: 100
    });

    expect(
      result.finalState.units.find(
        (unit) => unit.cardInstanceId === attacker.cardInstanceId
      )?.range
    ).toBe(1);
    expect(movesBySide(result.events, "playerA")).toHaveLength(1);
    expect(firstMove(result.events)).toMatchObject({
      cardInstanceId: attacker.cardInstanceId,
      from: { row: 0, col: 0, layer: "ground" },
      to: { row: 0, col: 1, layer: "ground" },
      targetCardInstanceId: farTarget.cardInstanceId
    });
    expect(attacksBySide(result.events, "playerA")).toHaveLength(0);
  });

  it("lets ranged Units attack from farther away than melee Units", () => {
    const target = placement(playerB, "b", "stat_training_target", 0, 3, "target");
    const runCase = (defId: string) =>
      resolve({
        playerA: combatant(
          playerA,
          board(placement(playerA, "a", defId, 0, 0, "attacker"))
        ),
        playerB: combatant(playerB, board(target)),
        maxDurationMs: 100
      });

    expect(
      attacksBySide(runCase("stat_quickstart_attacker").events, "playerA")
    ).toHaveLength(0);
    expect(
      movesBySide(runCase("stat_quickstart_attacker").events, "playerA")
    ).toHaveLength(1);
    expect(firstAttack(runCase("stat_ranged_attacker").events).targetId).toBe(
      unitId("playerB", target.cardInstanceId)
    );
  });

  it("moves deterministically toward the selected target", () => {
    const runCase = () =>
      resolve({
        playerA: combatant(
          playerA,
          board(placement(playerA, "a", "stat_quickstart_attacker", 0, 0, "attacker"))
        ),
        playerB: combatant(
          playerB,
          board(placement(playerB, "b", "stat_training_target", 1, 1, "target"))
        ),
        maxDurationMs: 100
      });

    const first = runCase();
    const second = runCase();

    expect(second.events).toEqual(first.events);
    expect(firstMove(first.events)).toMatchObject({
      from: { row: 0, col: 0, layer: "ground" },
      to: { row: 0, col: 1, layer: "ground" }
    });
  });

  it("does not move into occupied ground cells", () => {
    const attacker = placement(
      playerA,
      "a",
      "stat_quickstart_attacker",
      0,
      0,
      "attacker"
    );
    const blocker = placement(playerA, "a", "stat_training_target", 0, 1, "blocker");
    const target = placement(playerB, "b", "stat_training_target", 0, 3, "target");
    const result = resolve({
      playerA: combatant(playerA, board(attacker, blocker)),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });

    expect(movesBySide(result.events, "playerA")).toHaveLength(0);
    expect(attacksBySide(result.events, "playerA")).toHaveLength(0);
  });

  it("does move through support layers when the ground cell is open", () => {
    const attacker = placement(
      playerA,
      "a",
      "stat_quickstart_attacker",
      0,
      0,
      "attacker"
    );
    const support = {
      cardInstanceId: asCardInstanceId("stat:a:cinder_tally_relic:support"),
      defId: asCardDefId("cinder_tally_relic"),
      ownerId: playerA,
      position: { row: 0, col: 1, layer: "support" }
    } satisfies BoardPlacement;
    const target = placement(playerB, "b", "stat_training_target", 0, 3, "target");
    const result = resolve({
      playerA: combatant(playerA, board(attacker, support)),
      playerB: combatant(playerB, board(target)),
      maxDurationMs: 100
    });

    expect(firstMove(result.events)).toMatchObject({
      from: { row: 0, col: 0, layer: "ground" },
      to: { row: 0, col: 1, layer: "ground" }
    });
  });
});
