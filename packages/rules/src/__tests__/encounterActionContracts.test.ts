import { describe, expect, it } from "vitest";
import {
  canUseEncounterActionDuringPhase,
  defaultTargetForEncounterAction,
  describeEncounterActionCosts,
  describeEncounterActionEffects,
  describeEncounterActionTarget,
  ENCOUNTER_ACTION_KINDS,
  getEncounterActionDefinition,
  labelForEncounterAction,
  resolveEncounterActionEffects,
  sourceLifecycleForEncounterAction,
  validateEncounterActionTarget
} from "../encounterActionContracts";

describe("encounter action contracts", () => {
  it("defines every supported encounter action kind", () => {
    expect(ENCOUNTER_ACTION_KINDS).toEqual([
      "debug_noop",
      "debug_pressure",
      "main_phase_pressure",
      "commander_rally"
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
    expect(labelForEncounterAction("main_phase_pressure", "Sparkfall Test")).toBe(
      "Sparkfall Test"
    );

    expect(sourceLifecycleForEncounterAction("debug_noop")).toBe("none");
    expect(sourceLifecycleForEncounterAction("debug_pressure")).toBe("none");
    expect(sourceLifecycleForEncounterAction("main_phase_pressure")).toBe(
      "usedOnResolve"
    );
    expect(sourceLifecycleForEncounterAction("commander_rally")).toBe("usedOnResolve");
  });

  it("uses contract timing for current legal phases", () => {
    expect(canUseEncounterActionDuringPhase("debug_noop", "start")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "firstMain")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "secondMain")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "end")).toBe(true);
    expect(canUseEncounterActionDuringPhase("debug_noop", "combat")).toBe(false);
    expect(canUseEncounterActionDuringPhase("debug_noop", "complete")).toBe(false);

    for (const kind of ["main_phase_pressure", "commander_rally"] as const) {
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
      "Uses Sparkfall on resolve."
    );
    expect(describeEncounterActionCosts("commander_rally", "Commander")).toBe(
      "Uses Commander on resolve."
    );
    expect(describeEncounterActionEffects("main_phase_pressure", "player")).toBe(
      "Enemy Stability -1."
    );
    expect(describeEncounterActionEffects("commander_rally", "player")).toBe(
      "Enemy Stability -1."
    );
  });

  it("derives and validates default Stability targets", () => {
    expect(defaultTargetForEncounterAction("debug_noop", "player")).toBeUndefined();
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
  });

  it("keeps the static registry JSON-serializable", () => {
    const definitions = ENCOUNTER_ACTION_KINDS.map((kind) =>
      getEncounterActionDefinition(kind)
    );

    expect(JSON.parse(JSON.stringify(definitions))).toEqual(definitions);
  });
});
