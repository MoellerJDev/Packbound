import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { createRng } from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type AbilityDefinition,
  type BoardPlacement,
  type Keyword,
  type PlayerSide,
  type TargetSelector,
  type UnitCardDefinition
} from "@packbound/shared";

import { isTargetInRange, selectEnemyTarget, targetsForAbility } from "../targeting";
import type {
  AbilitySource,
  MutableCombatState,
  MutableSideState,
  MutableUnit
} from "../types";

const testUnitDef = (
  id: string,
  tags: readonly string[] = [],
  keywords: readonly Keyword[] = []
): UnitCardDefinition => ({
  id: asCardDefId(id),
  name: id,
  set: "targeting_test",
  rarity: "common",
  cardType: "Unit",
  aspects: ["Ember"],
  cost: { generic: 1 },
  tags,
  traits: [],
  keywords,
  abilities: [],
  stats: { attack: 1, health: 5, attackSpeed: 1, range: 1 }
});

const unit = (
  side: PlayerSide,
  id: string,
  row: number,
  col: number,
  overrides: Partial<MutableUnit> = {}
): MutableUnit => {
  const def =
    overrides.def ??
    testUnitDef(id, [], (overrides.keywords ?? []) as readonly Keyword[]);

  return {
    unitId: asUnitInstanceId(`${side}:${id}`),
    cardInstanceId: asCardInstanceId(`${side}:${id}:card`),
    def,
    ownerId: asPlayerId(`${side}-owner`),
    side,
    position: { row, col, layer: "ground" },
    attack: def.stats.attack,
    maxHealth: def.stats.health,
    currentHealth: def.stats.health,
    attackSpeed: def.stats.attackSpeed,
    range: def.stats.range,
    keywords: [...def.keywords],
    statuses: [],
    attackTimerMs: 0,
    summonedThisCombat: false,
    isEcho: false,
    ...overrides
  };
};

const sideState = (
  side: PlayerSide,
  units: readonly MutableUnit[]
): MutableSideState => ({
  side,
  playerId: asPlayerId(`${side}-owner`),
  units: [...units],
  permanents: [],
  techniques: [],
  ashes: [],
  void: [],
  combatCharge: 0,
  combatChargePerSecond: 0,
  nextSummonIndex: 0,
  firstAllyBelowHealthTriggered: false,
  destroyedUnitsThisCombat: 0,
  firstAllyDestroyedTriggerSources: new Set(),
  firstEnemyDestroyedTriggerSources: new Set()
});

const combatState = (
  playerAUnits: readonly MutableUnit[],
  playerBUnits: readonly MutableUnit[]
): MutableCombatState => ({
  catalog: sampleCatalog,
  rng: createRng("targeting-test"),
  events: [],
  warnings: [],
  sides: {
    playerA: sideState("playerA", playerAUnits),
    playerB: sideState("playerB", playerBUnits)
  },
  timeMs: 0,
  ended: false
});

const targetingAbility = (target: TargetSelector): AbilityDefinition => ({
  id: `targeting-test:${target.type}`,
  trigger: { type: "OnCombatStart" },
  condition: { type: "Always" },
  target,
  effect: { type: "Heal", amount: 1 }
});

const boardPlacement = (defId: string, row: number, col: number): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`placement:${defId}`),
  defId: asCardDefId(defId),
  ownerId: asPlayerId("playerA-owner"),
  position: { row, col, layer: "support" }
});

describe("combat targeting", () => {
  it("keeps Guard priority ahead of AntiAir's airborne preference", () => {
    const attacker = unit("playerA", "anti-air", 0, 0, {
      def: testUnitDef("anti-air", [], ["AntiAir"]),
      keywords: ["AntiAir"]
    });
    const guarded = unit("playerB", "guarded-ground", 3, 3, {
      def: testUnitDef("guarded-ground", [], ["Guard"]),
      keywords: ["Guard"]
    });
    const airborne = unit("playerB", "near-airborne", 0, 1, {
      def: testUnitDef("near-airborne", [], ["Airborne"]),
      keywords: ["Airborne"]
    });
    const state = combatState([attacker], [airborne, guarded]);

    expect(selectEnemyTarget(attacker, state)).toBe(guarded);
  });

  it("lets Airborne attackers prefer low health targets before distance", () => {
    const attacker = unit("playerA", "airborne-attacker", 0, 0, {
      def: testUnitDef("airborne-attacker", [], ["Airborne"]),
      keywords: ["Airborne"]
    });
    const nearbyHealthy = unit("playerB", "nearby-healthy", 0, 1, {
      currentHealth: 5
    });
    const distantWounded = unit("playerB", "distant-wounded", 3, 3, {
      currentHealth: 1
    });
    const state = combatState([attacker], [nearbyHealthy, distantWounded]);

    expect(selectEnemyTarget(attacker, state)).toBe(distantWounded);
  });

  it("checks range with clamped negative range values", () => {
    const attacker = unit("playerA", "negative-range", 0, 0, { range: -3 });
    const sameHex = unit("playerB", "same-hex", 0, 0);
    const adjacent = unit("playerB", "adjacent", 0, 1);

    expect(isTargetInRange(attacker, sameHex)).toBe(true);
    expect(isTargetInRange(attacker, adjacent)).toBe(false);
  });

  it("uses permanent placement origin for nearest enemy targeting", () => {
    const ally = unit("playerA", "ally", 0, 0);
    const nearEnemy = unit("playerB", "near-enemy", 1, 2);
    const farEnemy = unit("playerB", "far-enemy", 3, 3);
    const state = combatState([ally], [farEnemy, nearEnemy]);
    const source: AbilitySource = {
      sideState: state.sides.playerA,
      cardInstanceId: asCardInstanceId("placement:signal_nest"),
      def: testUnitDef("signal_nest_source"),
      placement: boardPlacement("signal_nest_source", 1, 1)
    };

    expect(
      targetsForAbility(state, source, targetingAbility({ type: "NearestEnemy" }))
    ).toEqual([nearEnemy]);
    expect(
      targetsForAbility(state, source, targetingAbility({ type: "Source" }))
    ).toEqual([]);
  });

  it("only returns alive units for tag-based selectors", () => {
    const taggedAlive = unit("playerA", "tagged-alive", 0, 0, {
      def: testUnitDef("tagged-alive", ["Medic"])
    });
    const taggedDestroyed = unit("playerA", "tagged-destroyed", 0, 1, {
      def: testUnitDef("tagged-destroyed", ["Medic"]),
      currentHealth: 0
    });
    const enemyTagged = unit("playerB", "enemy-tagged", 3, 3, {
      def: testUnitDef("enemy-tagged", ["Medic"])
    });
    const state = combatState([taggedDestroyed, taggedAlive], [enemyTagged]);
    const source: AbilitySource = {
      sideState: state.sides.playerA,
      cardInstanceId: taggedAlive.cardInstanceId,
      def: taggedAlive.def,
      unit: taggedAlive
    };

    expect(
      targetsForAbility(
        state,
        source,
        targetingAbility({ type: "AlliedUnitWithTag", tag: "Medic" })
      )
    ).toEqual([taggedAlive]);
    expect(
      targetsForAbility(
        state,
        source,
        targetingAbility({ type: "EnemyUnitWithTag", tag: "Medic" })
      )
    ).toEqual([enemyTagged]);
  });
});
