import {
  combatRowRangeForSide,
  type CardDefId,
  type CardInstanceId,
  type PlayerSide
} from "@packbound/shared";

import type { PixiReplayCommand } from "./pixiCombatReplay";

export type PixiReplayStatus = "idle" | "playing" | "paused" | "complete";

export type PixiReplayControlsState = {
  readonly status: PixiReplayStatus;
  readonly commandIndex: number;
  readonly resetKey: number;
  readonly stepRequestKey: number;
  readonly latestCommandSummary?: string;
};

export type PixiReplayCommandSummaryOptions = {
  readonly cardNamesByDefId?: ReadonlyMap<CardDefId, string>;
  readonly cardNameByInstanceId?: ReadonlyMap<CardInstanceId, string>;
};

export const MAX_PIXI_REPLAY_COMMANDS = 96;

export const createPixiReplayControlsState = (): PixiReplayControlsState => ({
  status: "idle",
  commandIndex: 0,
  resetKey: 0,
  stepRequestKey: 0
});

export const limitPixiReplayCommands = (
  commands: readonly PixiReplayCommand[]
): readonly PixiReplayCommand[] => commands.slice(0, MAX_PIXI_REPLAY_COMMANDS);

export const playPixiReplay = (
  state: PixiReplayControlsState,
  commandCount: number
): PixiReplayControlsState => {
  if (commandCount <= 0) {
    return {
      ...state,
      status: "complete",
      commandIndex: 0,
      latestCommandSummary: "No visual replay commands are available."
    };
  }

  if (state.status === "complete" || state.commandIndex >= commandCount) {
    return {
      status: "playing",
      commandIndex: 0,
      resetKey: state.resetKey + 1,
      stepRequestKey: state.stepRequestKey
    };
  }

  return {
    ...state,
    status: "playing"
  };
};

export const pausePixiReplay = (
  state: PixiReplayControlsState
): PixiReplayControlsState =>
  state.status === "playing"
    ? {
        ...state,
        status: "paused"
      }
    : state;

export const stepPixiReplay = (
  state: PixiReplayControlsState,
  commandCount: number
): PixiReplayControlsState => {
  if (commandCount <= 0 || state.commandIndex >= commandCount) {
    return {
      ...state,
      status: "complete",
      commandIndex: Math.min(state.commandIndex, Math.max(0, commandCount))
    };
  }

  if (state.status === "playing") {
    return state;
  }

  return {
    ...state,
    status: "paused",
    stepRequestKey: state.stepRequestKey + 1
  };
};

export const resetPixiReplay = (
  state: PixiReplayControlsState
): PixiReplayControlsState => ({
  ...createPixiReplayControlsState(),
  resetKey: state.resetKey + 1,
  stepRequestKey: state.stepRequestKey
});

const nameForCardId = (
  cardInstanceId: CardInstanceId,
  options: PixiReplayCommandSummaryOptions
): string => options.cardNameByInstanceId?.get(cardInstanceId) ?? cardInstanceId;

const nameForDefId = (
  cardDefId: CardDefId,
  options: PixiReplayCommandSummaryOptions
): string => options.cardNamesByDefId?.get(cardDefId) ?? cardDefId;

const sideLabel = (side: PlayerSide): string => (side === "playerA" ? "Player" : "Enemy");

const sideAreaLabel = (side: PlayerSide): string =>
  side === "playerA" ? "your side" : "enemy side";

const rowRoleLabel = (side: PlayerSide, row: number): string | undefined => {
  const range = combatRowRangeForSide(side);
  const frontline = side === "playerA" ? range.firstRow : range.lastRow;
  const backline = side === "playerA" ? range.lastRow : range.firstRow;

  if (row === frontline) {
    return `${side === "playerA" ? "your" : "enemy"} frontline`;
  }
  if (row === backline) {
    return `${side === "playerA" ? "your" : "enemy"} backline`;
  }
  return undefined;
};

const positionSummary = (command: Extract<PixiReplayCommand, { type: "appear" }>) => {
  const role = rowRoleLabel(command.side, command.position.row);
  const coordinate = `r${command.position.row} c${command.position.col}`;
  return role
    ? `${role} (${coordinate})`
    : `${sideAreaLabel(command.side)} ${coordinate}`;
};

const sourceNameForAppearCommand = (
  command: Extract<PixiReplayCommand, { type: "appear" }>,
  options: PixiReplayCommandSummaryOptions
): string | undefined => {
  if (command.arrival.sourceDefId) {
    return `${sideLabel(command.arrival.sourceSide ?? command.side)} ${nameForDefId(
      command.arrival.sourceDefId,
      options
    )}`;
  }
  if (command.arrival.sourceCardInstanceId) {
    return `${sideLabel(
      command.arrival.sourceSide ?? command.side
    )} ${nameForCardId(command.arrival.sourceCardInstanceId, options)}`;
  }
  return undefined;
};

export const summarizePixiReplayCommand = (
  command: PixiReplayCommand,
  options: PixiReplayCommandSummaryOptions = {}
): string => {
  switch (command.type) {
    case "move":
      return `${nameForCardId(command.cardInstanceId, options)} moved to r${command.to.row} c${command.to.col}.`;
    case "attack":
      return `${nameForCardId(command.sourceCardInstanceId, options)} attacked ${nameForCardId(command.targetCardInstanceId, options)}.`;
    case "damage":
      return `${nameForCardId(command.targetCardInstanceId, options)} took ${command.amount} damage.`;
    case "destroyed":
      return `${nameForCardId(command.cardInstanceId, options)} was destroyed; its marker is not a living unit.`;
    case "appear": {
      const sourceName = sourceNameForAppearCommand(command, options);
      const destination = positionSummary(command);
      switch (command.arrival.kind) {
        case "summoned":
          return sourceName
            ? `${sourceName} summoned ${command.token.name} to ${destination}.`
            : `${command.token.name} was summoned to ${destination}.`;
        case "recalled":
          return sourceName
            ? `${sourceName} recalled ${command.token.name} to ${destination}.`
            : `${command.token.name} returned from Ashes to ${destination}.`;
        case "phasedIn":
          return `${command.token.name} phased in at ${destination}.`;
      }
      return `${command.token.name} appeared at ${destination}.`;
    }
    case "phaseOut":
      return `${nameForCardId(command.cardInstanceId, options)} phased out.`;
  }
};

export const completePixiReplayCommand = (
  state: PixiReplayControlsState,
  commandCount: number,
  nextCommandIndex: number,
  command: PixiReplayCommand,
  options: PixiReplayCommandSummaryOptions = {},
  expectedResetKey = state.resetKey
): PixiReplayControlsState => {
  if (expectedResetKey !== state.resetKey) {
    return state;
  }

  const commandIndex = Math.max(0, Math.min(nextCommandIndex, commandCount));
  const complete = commandCount <= 0 || commandIndex >= commandCount;

  return {
    ...state,
    commandIndex,
    status: complete ? "complete" : state.status === "playing" ? "playing" : "paused",
    latestCommandSummary: summarizePixiReplayCommand(command, options)
  };
};
