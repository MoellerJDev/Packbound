import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asCardDefId } from "@packbound/shared";

import {
  buildCombatStatSummary,
  COMBAT_MODEL_FACTS,
  combatRoleFromRange,
  RANGE_MODEL_TEXT
} from "../index";

const requireCard = (defId: string) => {
  const def = sampleCatalog.cardsById.get(asCardDefId(defId));
  if (!def) {
    throw new Error(`Expected sample card ${defId}`);
  }
  return def;
};

describe("combat stat summaries", () => {
  it("summarizes Unit stats with upgrade bonuses and board chips", () => {
    const summary = buildCombatStatSummary(requireCard("cinder_scout"), 1);

    expect(summary).toMatchObject({
      attack: 2,
      health: 3,
      attackSpeed: 1.1,
      range: 1,
      role: "Melee",
      summaryText: "2 ATK / 3 HP / 1.1 speed / 1 range",
      chips: ["2 ATK", "3 HP", "1.1 AS", "1 RNG", "Melee"]
    });
    expect(summary?.details.map((detail) => detail.label)).toEqual([
      "Attack",
      "Health",
      "Attack speed",
      "Range",
      "Melee/Ranged"
    ]);
    expect(summary?.details.find((detail) => detail.label === "Range")?.description).toBe(
      RANGE_MODEL_TEXT
    );
  });

  it("derives ranged identity from range greater than one", () => {
    const summary = buildCombatStatSummary(requireCard("sparkcatch_apprentice"));

    expect(summary?.range).toBe(2);
    expect(summary?.role).toBe("Ranged");
    expect(summary?.chips).toContain("2 RNG");
    expect(combatRoleFromRange(1)).toBe("Melee");
    expect(combatRoleFromRange(2)).toBe("Ranged");
  });

  it("does not produce combat stats for non-Unit cards", () => {
    expect(buildCombatStatSummary(requireCard("ember_source"))).toBeUndefined();
    expect(buildCombatStatSummary(requireCard("sparkfall"))).toBeUndefined();
  });

  it("documents the current combat model facts used by the client", () => {
    expect(COMBAT_MODEL_FACTS.map((fact) => fact.label)).toEqual([
      "Automatic combat",
      "Attack and health",
      "Attack speed",
      "Positioning",
      "Keywords",
      "Support and Techniques",
      "Range"
    ]);
    expect(COMBAT_MODEL_FACTS.find((fact) => fact.label === "Range")?.text).toBe(
      RANGE_MODEL_TEXT
    );
  });
});
