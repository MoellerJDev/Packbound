import { describe, expect, it } from "vitest";

import { asCardDefId, asCardInstanceId, type CardInstanceId } from "@packbound/shared";

import type { PixiReplayCommand } from "./pixiCombatReplay";
import {
  completePixiReplayCommand,
  createPixiReplayControlsState,
  limitPixiReplayCommands,
  MAX_PIXI_REPLAY_COMMANDS,
  pausePixiReplay,
  playPixiReplay,
  resetPixiReplay,
  stepPixiReplay,
  summarizePixiReplayCommand
} from "./pixiReplayControls";

const emberCardId = asCardInstanceId("ember-card");
const ashCardId = asCardInstanceId("ash-card");

const damageCommand: PixiReplayCommand = {
  type: "damage",
  timeMs: 320,
  targetCardInstanceId: ashCardId,
  amount: 2
};

const moveCommand: PixiReplayCommand = {
  type: "move",
  timeMs: 160,
  cardInstanceId: emberCardId,
  side: "playerA",
  from: { row: 0, col: 1, layer: "ground" },
  to: { row: 0, col: 2, layer: "ground" }
};

const appearCommand: PixiReplayCommand = {
  type: "appear",
  timeMs: 480,
  cardInstanceId: emberCardId,
  side: "playerA",
  position: { row: 3, col: 0, layer: "ground" },
  token: {
    cardInstanceId: emberCardId,
    defId: asCardDefId("ember_scraprunner"),
    name: "Ember Scraprunner",
    side: "playerA",
    cardType: "Unit",
    layer: "ground",
    position: { row: 3, col: 0, layer: "ground" },
    statChips: [],
    traits: [],
    keywords: []
  }
};

const nameMap = new Map<CardInstanceId, string>([
  [emberCardId, "Ember Scraprunner"],
  [ashCardId, "Ash Debt Collector"]
]);

describe("pixi replay controls", () => {
  it("plays, pauses, steps, completes, and resets deterministically", () => {
    const initial = createPixiReplayControlsState();

    const playing = playPixiReplay(initial, 2);
    expect(playing).toMatchObject({
      status: "playing",
      commandIndex: 0,
      resetKey: 0
    });

    const paused = pausePixiReplay(playing);
    expect(paused.status).toBe("paused");

    const stepRequested = stepPixiReplay(paused, 2);
    expect(stepRequested).toMatchObject({
      status: "paused",
      commandIndex: 0,
      stepRequestKey: 1
    });

    const afterStep = completePixiReplayCommand(stepRequested, 2, 1, moveCommand, {
      cardNameByInstanceId: nameMap
    });
    expect(afterStep).toMatchObject({
      status: "paused",
      commandIndex: 1,
      latestCommandSummary: "Ember Scraprunner moved to r0 c2."
    });

    const resumed = playPixiReplay(afterStep, 2);
    const completed = completePixiReplayCommand(resumed, 2, 2, damageCommand, {
      cardNameByInstanceId: nameMap
    });
    expect(completed).toMatchObject({
      status: "complete",
      commandIndex: 2,
      latestCommandSummary: "Ash Debt Collector took 2 damage."
    });

    const replayedFromStart = playPixiReplay(completed, 2);
    expect(replayedFromStart).toMatchObject({
      status: "playing",
      commandIndex: 0,
      resetKey: 1
    });

    expect(resetPixiReplay(replayedFromStart)).toMatchObject({
      status: "idle",
      commandIndex: 0,
      resetKey: 2
    });
  });

  it("keeps step requests inert during automatic playback", () => {
    const playing = playPixiReplay(createPixiReplayControlsState(), 2);

    expect(stepPixiReplay(playing, 2)).toBe(playing);
  });

  it("summarizes appear commands with source token names", () => {
    expect(
      summarizePixiReplayCommand(appearCommand, { cardNameByInstanceId: nameMap })
    ).toBe("Ember Scraprunner appeared at r3 c0.");
  });

  it("limits visual replay commands to the renderer command cap", () => {
    const commands = Array.from(
      { length: MAX_PIXI_REPLAY_COMMANDS + 3 },
      () => moveCommand
    );

    expect(limitPixiReplayCommands(commands)).toHaveLength(MAX_PIXI_REPLAY_COMMANDS);
  });
});
