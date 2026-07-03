import type { ContentCatalog } from "@packbound/content";
import {
  BOARD_COLS,
  BOARD_ROWS,
  isBoardPositionInBounds,
  positionKey,
  type BoardPosition,
  type CardDefinition,
  type CombatEvent
} from "@packbound/shared";

import { validateRunLoadout } from "./loadout";
import { cardInZone, copyCard, copyPlacement } from "./runCards";
import type { CommanderState, RunState } from "./runState";

export type CommanderActionCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

const ok = (): CommanderActionCheck => ({ ok: true });

const reason = (message: string): CommanderActionCheck => ({
  ok: false,
  reason: message
});

const assertCan = (check: CommanderActionCheck): void => {
  if (!check.ok) {
    throw new Error(check.reason);
  }
};

const firstValidationErrorReason = (
  result: ReturnType<typeof validateRunLoadout>
): string => result.errors[0]?.message ?? "Commander deployment would be illegal.";

const boardLayerForCommander = (
  def: CardDefinition
): BoardPosition["layer"] | undefined =>
  def.cardType === "Unit" || def.cardType === "Echo"
    ? "ground"
    : def.cardType === "Relic" || def.cardType === "Field"
      ? "support"
      : undefined;

const positionOccupied = (run: RunState, position: BoardPosition): boolean => {
  const key = positionKey(position);
  return run.board.placements.some(
    (placement) => positionKey(placement.position) === key
  );
};

const deployedCommanderCard = (run: RunState, commander: CommanderState) =>
  run.activeCards.find((card) => card.instanceId === commander.card.instanceId) ??
  commander.card;

const nextRunWithCommanderDeployed = (
  run: RunState,
  commander: CommanderState,
  position: BoardPosition
): RunState => {
  const card = cardInZone(commander.card, "board");

  return {
    ...run,
    commander: {
      ...commander,
      card,
      deployCount: commander.deployCount + 1
    },
    activeCards: [...run.activeCards.map(copyCard), card],
    board: {
      placements: [
        ...run.board.placements.map(copyPlacement),
        {
          cardInstanceId: card.instanceId,
          defId: card.defId,
          ownerId: run.playerId,
          position: { ...position }
        }
      ]
    }
  };
};

export const canDeployCommander = (
  run: RunState,
  catalog: ContentCatalog,
  position: BoardPosition
): CommanderActionCheck => {
  if (run.status !== "active" || run.phase !== "planning") {
    return reason("Commander can only be deployed during planning.");
  }

  const commander = run.commander;
  if (!commander) {
    return reason("Run has no Commander.");
  }
  if (commander.card.zone === "board") {
    return reason("Commander is already deployed.");
  }
  if (commander.card.zone !== "command") {
    return reason(`Commander cannot be deployed from ${commander.card.zone}.`);
  }

  const def = catalog.cardsById.get(commander.card.defId);
  if (!def) {
    return reason(`Unknown Commander definition: ${commander.card.defId}.`);
  }

  const layer = boardLayerForCommander(def);
  if (!layer) {
    return reason(`${def.name} cannot be deployed to the board yet.`);
  }
  if (position.layer !== layer) {
    return reason(`${def.name} cannot be deployed on the ${position.layer} layer.`);
  }
  if (!isBoardPositionInBounds(position)) {
    return reason(`${def.name} cannot be deployed outside the board.`);
  }
  if (positionOccupied(run, position)) {
    return reason(`${def.name} cannot be deployed on an occupied tile.`);
  }

  const validation = validateRunLoadout(
    nextRunWithCommanderDeployed(run, commander, position),
    catalog
  );
  return validation.ok ? ok() : reason(firstValidationErrorReason(validation));
};

export const getDefaultCommanderPosition = (
  run: RunState,
  catalog: ContentCatalog
): BoardPosition | undefined => {
  const positions = getCommanderDeploymentCandidatePositions(run, catalog);
  return positions.find((position) => canDeployCommander(run, catalog, position).ok);
};

export const getCommanderDeploymentCandidatePosition = (
  run: RunState,
  catalog: ContentCatalog
): BoardPosition | undefined => getCommanderDeploymentCandidatePositions(run, catalog)[0];

const getCommanderDeploymentCandidatePositions = (
  run: RunState,
  catalog: ContentCatalog
): readonly BoardPosition[] => {
  const commander = run.commander;
  if (!commander || commander.card.zone !== "command") {
    return [];
  }

  const def = catalog.cardsById.get(commander.card.defId);
  if (!def) {
    return [];
  }

  const layer = boardLayerForCommander(def);
  if (!layer) {
    return [];
  }

  const positions: BoardPosition[] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const position: BoardPosition = { row, col, layer };
      if (!positionOccupied(run, position)) {
        positions.push(position);
      }
    }
  }

  return positions;
};

export const deployCommander = (
  run: RunState,
  catalog: ContentCatalog,
  position: BoardPosition
): RunState => {
  assertCan(canDeployCommander(run, catalog, position));
  return nextRunWithCommanderDeployed(run, run.commander!, position);
};

export const canReturnCommanderToCommand = (run: RunState): CommanderActionCheck => {
  if (run.status !== "active" || run.phase !== "planning") {
    return reason("Commander can only return to Command during planning.");
  }

  const commander = run.commander;
  if (!commander) {
    return reason("Run has no Commander.");
  }
  if (commander.card.zone === "command") {
    return reason("Commander is already in the Command Zone.");
  }
  if (commander.card.zone !== "board") {
    return reason(`Commander cannot return to Command from ${commander.card.zone}.`);
  }
  if (
    !run.board.placements.some(
      (placement) => placement.cardInstanceId === commander.card.instanceId
    )
  ) {
    return reason("Commander has no board placement to return from.");
  }

  return ok();
};

export const returnCommanderToCommand = (run: RunState): RunState => {
  const commander = run.commander;
  assertCan(canReturnCommanderToCommand(run));

  const card = cardInZone(deployedCommanderCard(run, commander!), "command");

  return {
    ...run,
    commander: {
      ...commander!,
      card,
      rebindTax: commander!.rebindTax + 1
    },
    activeCards: run.activeCards
      .filter((activeCard) => activeCard.instanceId !== commander!.card.instanceId)
      .map(copyCard),
    board: {
      placements: run.board.placements
        .filter((placement) => placement.cardInstanceId !== commander!.card.instanceId)
        .map(copyPlacement)
    }
  };
};

export const applyCommanderCombatLifecycle = (
  run: RunState,
  combatEvents: readonly CombatEvent[]
): RunState => {
  const commander = run.commander;
  if (!commander || commander.card.zone !== "board") {
    return run;
  }

  const commanderWasDestroyed = combatEvents.some(
    (event) =>
      event.type === "UnitDestroyed" &&
      event.cardInstanceId === commander.card.instanceId &&
      event.ownerId === run.playerId
  );

  if (!commanderWasDestroyed) {
    return run;
  }

  const card = cardInZone(deployedCommanderCard(run, commander), "command");

  return {
    ...run,
    commander: {
      ...commander,
      card,
      rebindTax: commander.rebindTax + 1
    },
    activeCards: run.activeCards
      .filter((activeCard) => activeCard.instanceId !== commander.card.instanceId)
      .map(copyCard),
    board: {
      placements: run.board.placements
        .filter((placement) => placement.cardInstanceId !== commander.card.instanceId)
        .map(copyPlacement)
    }
  };
};
