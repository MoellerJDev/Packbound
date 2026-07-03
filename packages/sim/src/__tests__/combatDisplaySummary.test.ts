import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type CombatEvent
} from "@packbound/shared";

import { buildCombatDisplaySummary, type CombatDisplayResultLike } from "../index";

const playerA = asPlayerId("display-summary:player-a");
const playerB = asPlayerId("display-summary:player-b");

const card = (id: string) => asCardInstanceId(`display-summary:card:${id}`);
const unit = (id: string) => asUnitInstanceId(`display-summary:unit:${id}`);
const def = (id: string) => asCardDefId(id);

const sampleEvents: readonly CombatEvent[] = [
  { type: "CombatStarted", timeMs: 0 },
  {
    type: "TechniqueQueued",
    timeMs: 0,
    cardInstanceId: card("sparkfall"),
    defId: def("sparkfall"),
    side: "playerA",
    ownerId: playerA
  },
  {
    type: "TechniqueUsed",
    timeMs: 600,
    cardInstanceId: card("sparkfall"),
    defId: def("sparkfall"),
    side: "playerA",
    ownerId: playerA,
    targets: [unit("enemy-scrapper")]
  },
  {
    type: "UnitSummoned",
    timeMs: 700,
    unitId: unit("signal-wisp"),
    cardInstanceId: card("signal-wisp"),
    defId: def("signal_wisp_echo"),
    side: "playerA",
    ownerId: playerA,
    isEcho: true,
    position: { row: 3, col: 0, layer: "ground" }
  },
  {
    type: "UnitMoved",
    timeMs: 750,
    unitId: unit("warden"),
    cardInstanceId: card("warden"),
    defId: def("vanishing_warden"),
    side: "playerA",
    ownerId: playerA,
    from: { row: 0, col: 0, layer: "ground" },
    to: { row: 0, col: 1, layer: "ground" },
    targetId: unit("enemy-scrapper"),
    targetCardInstanceId: card("enemy-scrapper"),
    targetDefId: def("ember_scraprunner"),
    targetSide: "playerB"
  },
  {
    type: "UnitAttacked",
    timeMs: 800,
    attackerId: unit("enemy-scrapper"),
    attackerCardInstanceId: card("enemy-scrapper"),
    attackerDefId: def("ember_scraprunner"),
    attackerSide: "playerB",
    targetId: unit("warden"),
    targetCardInstanceId: card("warden"),
    targetDefId: def("vanishing_warden"),
    targetSide: "playerA"
  },
  {
    type: "StatusRemoved",
    timeMs: 800,
    targetId: unit("warden"),
    status: "Barrier",
    reason: "consumed"
  },
  {
    type: "DamageDealt",
    timeMs: 800,
    sourceId: unit("enemy-scrapper"),
    sourceCardInstanceId: card("enemy-scrapper"),
    sourceDefId: def("ember_scraprunner"),
    sourceSide: "playerB",
    targetId: unit("warden"),
    targetCardInstanceId: card("warden"),
    targetDefId: def("vanishing_warden"),
    targetSide: "playerA",
    amount: 0,
    damageType: "attack"
  },
  {
    type: "DamageDealt",
    timeMs: 900,
    sourceId: card("sparkfall"),
    sourceCardInstanceId: card("sparkfall"),
    sourceDefId: def("sparkfall"),
    sourceSide: "playerA",
    targetId: unit("enemy-scrapper"),
    targetCardInstanceId: card("enemy-scrapper"),
    targetDefId: def("ember_scraprunner"),
    targetSide: "playerB",
    amount: 2,
    damageType: "technique"
  },
  {
    type: "UnitPhasedOut",
    timeMs: 1000,
    unitId: unit("warden"),
    cardInstanceId: card("warden"),
    defId: def("vanishing_warden"),
    side: "playerA",
    ownerId: playerA,
    isEcho: false
  },
  {
    type: "UnitPhasedIn",
    timeMs: 1500,
    unitId: unit("warden"),
    cardInstanceId: card("warden"),
    defId: def("vanishing_warden"),
    side: "playerA",
    ownerId: playerA,
    isEcho: false,
    position: { row: 0, col: 0, layer: "ground" }
  },
  {
    type: "UnitRecalled",
    timeMs: 1600,
    unitId: unit("hollow-caller"),
    cardInstanceId: card("hollow-caller"),
    defId: def("hollow_caller"),
    side: "playerA",
    ownerId: playerA,
    isEcho: false,
    from: "ashes",
    position: { row: 0, col: 1, layer: "ground" }
  },
  {
    type: "UnitDestroyed",
    timeMs: 1700,
    unitId: unit("signal-wisp"),
    cardInstanceId: card("signal-wisp"),
    defId: def("signal_wisp_echo"),
    side: "playerA",
    ownerId: playerA,
    isEcho: true,
    reason: "combatDamage"
  },
  {
    type: "AbilityTriggered",
    timeMs: 1700,
    abilityId: "sparkcatch-ally-destroyed",
    trigger: "OnAllyDestroyed",
    sourceCardInstanceId: card("sparkcatch"),
    sourceDefId: def("sparkcatch_apprentice"),
    sourceSide: "playerA",
    ownerId: playerA,
    causedBy: {
      type: "unitDestroyed",
      unitId: unit("signal-wisp"),
      cardInstanceId: card("signal-wisp"),
      defId: def("signal_wisp_echo"),
      side: "playerA",
      ownerId: playerA,
      isEcho: true,
      reason: "combatDamage"
    }
  },
  {
    type: "UnitDestroyed",
    timeMs: 1800,
    unitId: unit("enemy-scrapper"),
    cardInstanceId: card("enemy-scrapper"),
    defId: def("ember_scraprunner"),
    side: "playerB",
    ownerId: playerB,
    isEcho: false,
    reason: "techniqueDamage"
  },
  { type: "CombatEnded", timeMs: 1900, winner: "playerA" }
];

const sampleResult: CombatDisplayResultLike = {
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 2,
  events: sampleEvents,
  warnings: [
    {
      code: "TEST_WARNING",
      message: "A test warning was emitted."
    }
  ]
};

const buildSummary = () =>
  buildCombatDisplaySummary({
    catalog: sampleCatalog,
    combatResult: sampleResult,
    perspectiveSide: "playerA"
  });

const allText = (): string =>
  buildSummary()
    .lines.map((line) => line.text)
    .join("\n");

describe("combat display summary", () => {
  it("builds a deterministic summary for the same combat result", () => {
    expect(buildSummary()).toEqual(buildSummary());
  });

  it("builds a JSON-serializable summary", () => {
    const summary = buildSummary();

    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("includes winner and damage fields", () => {
    const summary = buildSummary();

    expect(summary.title).toContain("You win");
    expect(summary.winner).toBe("playerA");
    expect(summary.damageToPlayerA).toBe(0);
    expect(summary.damageToPlayerB).toBe(2);
    expect(summary.eventCount).toBe(sampleEvents.length);
  });

  it("uses card names instead of only definition ids", () => {
    const text = allText();

    expect(text).toContain("Sparkfall");
    expect(text).toContain("Ember Scraprunner");
    expect(text).not.toContain("sparkfall");
    expect(text).not.toContain("ember_scraprunner");
  });

  it("includes Technique queue and usage lines", () => {
    const text = allText();

    expect(text).toContain("queued Sparkfall");
    expect(text).toContain("used Sparkfall");
  });

  it("includes destroyed unit names and Echo vanish behavior", () => {
    const text = allText();

    expect(text).toContain("Ember Scraprunner was destroyed");
    expect(text).toContain("Signal Wisp Echo");
    expect(text).toContain("vanished");
  });

  it("includes readable trigger source and cause lines", () => {
    const text = allText();

    expect(text).toContain(
      "Sparkcatch Apprentice reacted when Signal Wisp Echo vanished."
    );
  });

  it("includes Barrier block, summon, phase, recall, and warning lines", () => {
    const text = allText();

    expect(text).toContain("Barrier on Vanishing Warden blocked Ember Scraprunner");
    expect(text).toContain("summoned Signal Wisp Echo");
    expect(text).toContain(
      "Vanishing Warden moved from r0 c0 ground to r0 c1 ground toward Ember Scraprunner"
    );
    expect(text).toContain("Vanishing Warden phased out");
    expect(text).toContain("Vanishing Warden phased in");
    expect(text).toContain("recalled Hollow Caller from Ashes");
    expect(text).toContain("Warning TEST_WARNING");
  });
});
