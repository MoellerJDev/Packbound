import { describe, expect, it } from "vitest";

import { asCardDefId, asCardInstanceId, asPlayerId } from "@packbound/shared";

import {
  canUseEncounterActionDuringPhase,
  combatChargeCostForEncounterAction,
  defaultTargetForEncounterAction,
  describeEncounterActionCosts,
  describeEncounterActionEffects,
  describeEncounterActionTarget,
  describeEncounterActionTargetRequirement,
  ENCOUNTER_ACTION_KINDS,
  getEncounterActionDefinition,
  labelForEncounterAction,
  resolveEncounterActionEffects,
  sourceLifecycleForEncounterAction,
  validateEncounterActionTarget
} from "../encounterActionContracts";

const enemyBoardCardTarget = {
  type: "boardCard",
  side: "playerB",
  cardInstanceId: asCardInstanceId("encounter:ember_scraprunner:board:0"),
  defId: asCardDefId("ember_scraprunner"),
  ownerId: asPlayerId("encounter:early_ember_pressure"),
  position: { row: 0, col: 3, layer: "ground" },
  label: "Ember Scraprunner (enemy ground r0 c3)"
} as const;

const friendlyBoardCardTarget = {
  ...enemyBoardCardTarget,
  side: "playerA",
  label: "Ember Scraprunner (ally ground r0 c3)"
} as const;

describe("encounter action contracts", () => {
  it("defines every supported encounter action kind", () => {
    expect(ENCOUNTER_ACTION_KINDS).toEqual([
      "debug_noop",
      "debug_pressure",
      "main_phase_pressure",
      "commander_rally",
      "target_probe"
    ]);

    for (const kind of ENCOUNTER_ACTION_KINDS) {
      const definition = getEncounterActionDefinition(kind);
      expect(definition.kind).toBe(kind);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.targetRequirement).toBeDefined();
    }
  });

  it("keeps current labels and source lifecycle costs stable", () => {
    expect(labelForEncounterAction("debug_noop")).toBe("Debug no-op");
    expect(labelForEncounterAction("debug_pressure")).toBe("Debug pressure");
    expect(labelForEncounterAction("main_phase_pressure")).toBe(
      "Prototype Pressure Technique"
    );
    expect(labelForEncounterAction("commander_rally")).toBe("Commander Rally");
    expect(labelForEncounterAction("target_probe")).toBe("Target Probe");
    expect(labelForEncounterAction("main_phase_pressure", "Sparkfall Test")).toBe(
      "Sparkfall Test"
    );

    expect(sourceLifecycleForEncounterAction("debug_noop")).toBe("none");
    expect(sourceLifecycleForEncounterAction("debug_pressure")).toBe("none");
    expect(sourceLifecycleForEncounterAction("main_phase_pressure")).toBe(
      "usedOnResolve"
    );
    expect(sourceLifecycleForEncounterAction("commander_rally")).toBe("usedOnResolve");
    expect(sourceLifecycleForEncounterAction("target_probe")).toBe("none");
  });

  it("declares Combat Charge costs for the prototype real actions", () => {
    expect(combatChargeCostForEncounterAction("debug_noop")).toBe(0);
    expect(combatChargeCostForEncounterAction("debug_pressure")).toBe(0);
    expect(combatChargeCostForEncounterAction("main_phase_pressure")).toBe(1);
    expect(combatChargeCostForEncounterAction("commander_rally")).toBe(1);
    expect(combatChargeCostForEncounterAction("target_probe")).toBe(1);

    expect(getEncounterActionDefinition("main_phase_pressure").costs).toEqual([
      { type: "combatCharge", amount: 1 },
      { type: "sourceUsedOnResolve" }
    ]);
    expect(getEncounterActionDefinition("commander_rally").costs).toEqual([
      { type: "combatCharge", amount: 1 },
      { type: "sourceUsedOnResolve" }
    ]);
    expect(getEncounterActionDefinition("target_probe").costs).toEqual([
      { type: "combatCharge", amount: 1 }
    ]);
  });

  it("uses contract timing for current legal phases", () => {
    expect(canUseEncounterActionDuringPhase("debug_noop", "start")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "firstMain")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "secondMain")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "end")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "combat")).toBe(false);
    expect(canUseEncounterActionDuringPhase("debug_noop", "complete")).toBe(false);

    for (const kind of [
      "main_phase_pressure",
      "commander_rally",
      "target_probe"
    ] as const) {
      expect(canUseEncounterActionDuringPhase(kind, "firstMain")).toBe(true);
      expect(canUseEncounterActionDuringPhase(kind, "secondMain")).toBe(true);
      expect(canUseEncounterActionDuringPhase(kind, "start")).toBe(false);
      expect(canUseEncounterActionDuringPhase(kind, "combat")).toBe(false);
      expect(canUseEncounterActionDuringPhase(kind, "end")).toBe(false);
      expect(canUseEncounterActionDuringPhase(kind, "complete")).toBe(false);
    }
  });

  it("describes current costs and effects from contract data", () => {
    expect(describeEncounterActionCosts("debug_noop")).toBe("No cost.");
    expect(describeEncounterActionTarget(undefined)).toBe("None");
    expect(describeEncounterActionEffects("debug_noop", "player")).toBe("No effect.");
    expect(describeEncounterActionCosts("main_phase_pressure", "Sparkfall")).toBe(
      "Pay 1 Combat Charge. Uses Sparkfall on resolve."
    );
    expect(describeEncounterActionCosts("commander_rally", "Commander")).toBe(
      "Pay 1 Combat Charge. Uses Commander on resolve."
    );
    expect(describeEncounterActionCosts("target_probe")).toBe("Pay 1 Combat Charge.");
    expect(describeEncounterActionEffects("main_phase_pressure", "player")).toBe(
      "Enemy Stability -1."
    );
    expect(describeEncounterActionEffects("commander_rally", "player")).toBe(
      "Enemy Stability -1."
    );
    expect(describeEncounterActionEffects("target_probe", "player")).toBe("No effect.");
    expect(describeEncounterActionTargetRequirement("target_probe")).toBe(
      "Enemy board card"
    );
  });

  it("derives and validates default Stability targets", () => {
    expect(defaultTargetForEncounterAction("debug_noop", "player")).toBeUndefined();
    expect(defaultTargetForEncounterAction("target_probe", "player")).toBeUndefined();
    expect(defaultTargetForEncounterAction("main_phase_pressure", "player")).toEqual({
      type: "stability",
      actor: "enemy",
      label: "Enemy Stability"
    });
    expect(defaultTargetForEncounterAction("commander_rally", "player")).toEqual({
      type: "stability",
      actor: "enemy",
      label: "Enemy Stability"
    });
    expect(defaultTargetForEncounterAction("debug_pressure", "enemy")).toEqual({
      type: "stability",
      actor: "player",
      label: "Player Stability"
    });
    expect(
      validateEncounterActionTarget("main_phase_pressure", "player", {
        type: "stability",
        actor: "enemy",
        label: "Enemy Stability"
      })
    ).toEqual({
      type: "stability",
      actor: "enemy",
      label: "Enemy Stability"
    });
    expect(
      describeEncounterActionTarget({
        type: "stability",
        actor: "enemy",
        label: "Enemy Stability"
      })
    ).toBe("Enemy Stability");
    expect(() =>
      validateEncounterActionTarget("main_phase_pressure", "player", {
        type: "stability",
        actor: "player",
        label: "Player Stability"
      })
    ).toThrow(/Prototype Pressure Technique must target Enemy Stability/);
    expect(() =>
      validateEncounterActionTarget("debug_noop", "player", {
        type: "stability",
        actor: "enemy",
        label: "Enemy Stability"
      })
    ).toThrow(/Debug no-op does not use a target/);
  });

  it("validates prototype board card targets", () => {
    expect(
      validateEncounterActionTarget("target_probe", "player", enemyBoardCardTarget)
    ).toEqual(enemyBoardCardTarget);
    expect(describeEncounterActionTarget(enemyBoardCardTarget)).toBe(
      "Ember Scraprunner (enemy ground r0 c3)"
    );
    expect(() =>
      validateEncounterActionTarget("target_probe", "player", undefined)
    ).toThrow(/Target Probe requires Enemy board card/);
    expect(() =>
      validateEncounterActionTarget("target_probe", "player", friendlyBoardCardTarget)
    ).toThrow(/Target Probe must target an enemy board card/);
    expect(() =>
      validateEncounterActionTarget("target_probe", "player", {
        type: "stability",
        actor: "enemy",
        label: "Enemy Stability"
      })
    ).toThrow(/Target Probe requires an enemy board card target/);
  });

  it("evaluates stability effects for either actor deterministically", () => {
    expect(
      resolveEncounterActionEffects({
        actor: "player",
        kind: "main_phase_pressure"
      })
    ).toEqual({
      enemyStabilityDelta: -1,
      playerStabilityDelta: 0
    });

    expect(
      resolveEncounterActionEffects({
        actor: "enemy",
        kind: "debug_pressure"
      })
    ).toEqual({
      enemyStabilityDelta: 0,
      playerStabilityDelta: -1
    });

    expect(
      resolveEncounterActionEffects({
        actor: "player",
        kind: "main_phase_pressure",
        target: {
          type: "stability",
          actor: "enemy",
          label: "Enemy Stability"
        }
      })
    ).toEqual({
      enemyStabilityDelta: -1,
      playerStabilityDelta: 0
    });
    expect(() =>
      resolveEncounterActionEffects({
        actor: "player",
        kind: "main_phase_pressure",
        target: {
          type: "stability",
          actor: "player",
          label: "Player Stability"
        }
      })
    ).toThrow(/must target Enemy Stability/);

    expect(
      resolveEncounterActionEffects({
        actor: "player",
        kind: "target_probe",
        target: enemyBoardCardTarget
      })
    ).toEqual({
      enemyStabilityDelta: 0,
      playerStabilityDelta: 0
    });
  });

  it("keeps the static registry JSON-serializable", () => {
    const definitions = ENCOUNTER_ACTION_KINDS.map((kind) =>
      getEncounterActionDefinition(kind)
    );

    expect(JSON.parse(JSON.stringify(definitions))).toEqual(definitions);
  });
});
