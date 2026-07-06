import { describe, expect, it } from "vitest";

import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  asUnitInstanceId,
  type CombatEvent
} from "@packbound/shared";

import { combatEventsToPixiReplayCommands } from "./pixiCombatReplay";

const playerId = asPlayerId("player");
const recalledCardInstanceId = asCardInstanceId("recalled-ember");
const recalledDefId = asCardDefId("ember_scraprunner");
const recallSourceCardInstanceId = asCardInstanceId("hollow-caller");
const recallSourceDefId = asCardDefId("hollow_caller");
const summonedCardInstanceId = asCardInstanceId("summoned-wisp");
const summonedDefId = asCardDefId("cloud_wisp");

describe("pixi combat replay commands", () => {
  it("includes token metadata on recalled units so missing replay tokens can materialize", () => {
    const events: readonly CombatEvent[] = [
      {
        type: "UnitRecalled",
        timeMs: 120,
        unitId: asUnitInstanceId("recalled-unit"),
        cardInstanceId: recalledCardInstanceId,
        defId: recalledDefId,
        side: "playerA",
        ownerId: playerId,
        isEcho: false,
        from: "ashes",
        position: { row: 3, col: 0, layer: "ground" },
        sourceCardInstanceId: recallSourceCardInstanceId,
        sourceDefId: recallSourceDefId,
        sourceSide: "playerA"
      }
    ];

    const commands = combatEventsToPixiReplayCommands(events, {
      cardNamesByDefId: new Map([[recalledDefId, "Ember Scraprunner"]])
    });

    expect(commands).toEqual([
      {
        type: "appear",
        timeMs: 120,
        cardInstanceId: recalledCardInstanceId,
        side: "playerA",
        position: { row: 3, col: 0, layer: "ground" },
        arrival: {
          kind: "recalled",
          sourceCardInstanceId: recallSourceCardInstanceId,
          sourceDefId: recallSourceDefId,
          sourceSide: "playerA"
        },
        token: {
          cardInstanceId: recalledCardInstanceId,
          defId: recalledDefId,
          name: "Ember Scraprunner",
          side: "playerA",
          cardType: "Unit",
          layer: "ground",
          position: { row: 3, col: 0, layer: "ground" },
          statChips: [],
          traits: [],
          keywords: []
        }
      }
    ]);
  });

  it("falls back to definition ids for summoned token names when no catalog name is provided", () => {
    const events: readonly CombatEvent[] = [
      {
        type: "UnitSummoned",
        timeMs: 240,
        unitId: asUnitInstanceId("summoned-unit"),
        cardInstanceId: summonedCardInstanceId,
        defId: summonedDefId,
        side: "playerB",
        ownerId: playerId,
        isEcho: true,
        position: { row: 1, col: 4, layer: "air" }
      }
    ];

    const commands = combatEventsToPixiReplayCommands(events);

    expect(commands).toEqual([
      {
        type: "appear",
        timeMs: 240,
        cardInstanceId: summonedCardInstanceId,
        side: "playerB",
        position: { row: 1, col: 4, layer: "air" },
        arrival: { kind: "summoned" },
        token: {
          cardInstanceId: summonedCardInstanceId,
          defId: summonedDefId,
          name: "cloud_wisp",
          side: "playerB",
          cardType: "Echo",
          layer: "air",
          position: { row: 1, col: 4, layer: "air" },
          statChips: [],
          traits: [],
          keywords: []
        }
      }
    ]);
  });
});
