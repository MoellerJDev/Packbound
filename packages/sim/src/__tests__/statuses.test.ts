import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { createRng } from "@packbound/rules";
import {
  COMBAT_TICK_MS,
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type PlayerSide,
  type UnitCardDefinition
} from "@packbound/shared";

import { applyStatus, hasStatus, tickStatuses } from "../statuses";
import type { MutableCombatState, MutableSideState, MutableUnit } from "../types";

const playerA = asPlayerId("status-player-a");
const playerB = asPlayerId("status-player-b");

const testUnitDef: UnitCardDefinition = {
  id: asCardDefId("status_test_unit"),
  name: "Status Test Unit",
  set: "test_lab",
  rarity: "common",
  cardType: "Unit",
  aspects: ["Ember"],
  cost: { generic: 1 },
  tags: ["Scout"],
  keywords: [],
  abilities: [],
  stats: { attack: 1, health: 3, attackSpeed: 1, range: 1 }
};

const createUnit = (side: PlayerSide, suffix: string): MutableUnit => ({
  unitId: asUnitInstanceId(`${side}:status-unit-${suffix}`),
  cardInstanceId: asCardInstanceId(`${side}:status-card-${suffix}`),
  def: testUnitDef,
  ownerId: side === "playerA" ? playerA : playerB,
  side,
  position: { row: 0, col: side === "playerA" ? 0 : 3, layer: "ground" },
  attack: 1,
  maxHealth: 3,
  currentHealth: 3,
  attackSpeed: 1,
  range: 1,
  keywords: [],
  statuses: [],
  attackTimerMs: 1000,
  summonedThisCombat: false,
  isEcho: false
});

const createSide = (side: PlayerSide, units: MutableUnit[]): MutableSideState => ({
  side,
  playerId: side === "playerA" ? playerA : playerB,
  units,
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

const createState = (
  playerAUnits: MutableUnit[],
  playerBUnits: MutableUnit[] = []
): MutableCombatState => ({
  catalog: sampleCatalog,
  rng: createRng("status-test"),
  events: [],
  warnings: [],
  sides: {
    playerA: createSide("playerA", playerAUnits),
    playerB: createSide("playerB", playerBUnits)
  },
  timeMs: 300,
  ended: false
});

describe("combat statuses", () => {
  it("detects applied statuses by type", () => {
    const unit = createUnit("playerA", "has-status");

    expect(hasStatus(unit, "Burning")).toBe(false);

    unit.statuses = [{ type: "Burning", remainingMs: 500 }];

    expect(hasStatus(unit, "Burning")).toBe(true);
    expect(hasStatus(unit, "Barrier")).toBe(false);
  });

  it("replaces matching non-Barrier statuses and records each application", () => {
    const unit = createUnit("playerA", "replace");
    const state = createState([unit]);

    applyStatus(state, unit, { type: "Burning", remainingMs: 500, stacks: 1 });
    applyStatus(state, unit, { type: "Burning", remainingMs: 900, stacks: 2 });

    expect(unit.statuses).toEqual([{ type: "Burning", remainingMs: 900, stacks: 2 }]);
    expect(state.events).toEqual([
      {
        type: "StatusApplied",
        timeMs: 300,
        targetId: unit.unitId,
        status: "Burning",
        durationMs: 500
      },
      {
        type: "StatusApplied",
        timeMs: 300,
        targetId: unit.unitId,
        status: "Burning",
        durationMs: 900
      }
    ]);
  });

  it("does not duplicate Barrier or emit a redundant application event", () => {
    const unit = createUnit("playerA", "barrier");
    const state = createState([unit]);

    applyStatus(state, unit, { type: "Barrier" });
    applyStatus(state, unit, { type: "Barrier" });

    expect(unit.statuses).toEqual([{ type: "Barrier" }]);
    expect(state.events).toEqual([
      {
        type: "StatusApplied",
        timeMs: 300,
        targetId: unit.unitId,
        status: "Barrier"
      }
    ]);
  });

  it("preserves permanent statuses while expiring timed statuses on both sides", () => {
    const playerAUnit = createUnit("playerA", "ticker-a");
    const playerBUnit = createUnit("playerB", "ticker-b");
    playerAUnit.statuses = [
      { type: "Marked" },
      { type: "Slowed", remainingMs: COMBAT_TICK_MS * 2 },
      { type: "Burning", remainingMs: COMBAT_TICK_MS }
    ];
    playerBUnit.statuses = [{ type: "Frozen", remainingMs: COMBAT_TICK_MS }];
    const state = createState([playerAUnit], [playerBUnit]);

    tickStatuses(state);

    expect(playerAUnit.statuses).toEqual([
      { type: "Marked" },
      { type: "Slowed", remainingMs: COMBAT_TICK_MS }
    ]);
    expect(playerBUnit.statuses).toEqual([]);
    expect(state.events).toEqual([
      {
        type: "StatusRemoved",
        timeMs: 300,
        targetId: playerAUnit.unitId,
        status: "Burning",
        reason: "expired"
      },
      {
        type: "StatusRemoved",
        timeMs: 300,
        targetId: playerBUnit.unitId,
        status: "Frozen",
        reason: "expired"
      }
    ]);
  });
});
