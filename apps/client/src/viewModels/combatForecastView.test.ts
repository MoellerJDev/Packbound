import { describe, expect, it } from "vitest";

import type { CombatResult } from "@packbound/sim";

import { buildCombatForecastView } from "./combatForecastView";

const combatResult = (overrides: Partial<CombatResult>): CombatResult => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 1,
  finalState: {
    timeMs: 100,
    units: [],
    ashes: { playerA: [], playerB: [] },
    void: { playerA: [], playerB: [] },
    combatCharge: { playerA: 0, playerB: 0 }
  },
  events: [],
  warnings: [],
  rulesVersion: "test",
  seed: "combat-forecast-test",
  ...overrides
});

describe("combat forecast view", () => {
  it("softens a favorable player result", () => {
    const view = buildCombatForecastView(
      combatResult({
        winner: "playerA",
        damageToPlayerA: 0,
        damageToPlayerB: 2
      })
    );

    expect(view).toMatchObject({
      label: "Favored",
      tone: "favored",
      pressureText: "Low pressure"
    });
    expect(view.summaryText).not.toContain("Winner");
    expect(view.summaryText).not.toContain("playerA");
  });

  it("treats draws as close fights", () => {
    const view = buildCombatForecastView(
      combatResult({
        winner: "draw",
        damageToPlayerA: 0,
        damageToPlayerB: 0,
        events: Array.from({ length: 32 }, (_, index) => ({
          type: "CombatStarted",
          timeMs: index
        }))
      })
    );

    expect(view).toMatchObject({
      label: "Close fight",
      tone: "close",
      shapeText: "Developing fight"
    });
  });

  it("flags enemy wins or high incoming damage as danger", () => {
    const view = buildCombatForecastView(
      combatResult({
        winner: "playerB",
        damageToPlayerA: 2,
        damageToPlayerB: 0,
        events: Array.from({ length: 90 }, (_, index) => ({
          type: "CombatStarted",
          timeMs: index
        }))
      })
    );

    expect(view).toMatchObject({
      label: "Danger",
      tone: "danger",
      pressureText: "High pressure",
      shapeText: "Long exchange"
    });
  });

  it("keeps setup warnings coarse", () => {
    const view = buildCombatForecastView(
      combatResult({
        warnings: [{ code: "missing_card_definition", message: "Missing card." }]
      })
    );

    expect(view.warningsText).toBe("Check setup");
  });
});
