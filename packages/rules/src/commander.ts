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
import type {
  CommanderLifecycleEntryType,
  CommanderLifecycleSource,
  CommanderState,
  CommanderUpgradeId,
  RunState
} from "./runState";

export type CommanderActionCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

export type CommanderUpgradeChoice = {
  readonly id: CommanderUpgradeId;
  readonly label: string;
  readonly effectText: string;
};

const COMMANDER_UPGRADE_CHOICES: readonly CommanderUpgradeChoice[] = [
  {
    id: "combat_training",
    label: "Combat Training",
    effectText: "Increase this Commander's upgrade level by 1."
  },
  {
    id: "rebind_calibration",
    label: "Rebind Calibration",
    effectText: "Add 1 Rebind Tax discount for future Commander deployments."
  }
];

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

export const getCommanderEffectiveRebindTax = (
  commander: CommanderState | undefined
): number =>
  Math.max(0, (commander?.rebindTax ?? 0) - (commander?.rebindTaxDiscount ?? 0));

type CommanderLifecycleDetails = {
  readonly type: CommanderLifecycleEntryType;
  readonly source: CommanderLifecycleSource;
  readonly label: string;
  readonly fromZone?: CommanderState["card"]["zone"];
  readonly toZone?: CommanderState["card"]["zone"];
  readonly combatEvent?: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>;
  readonly combatEventIndex?: number;
  readonly upgradeId?: CommanderUpgradeId;
  readonly upgradeLabel?: string;
};

const withCommanderLifecycleEntry = (
  run: RunState,
  before: CommanderState,
  after: CommanderState,
  details: CommanderLifecycleDetails
): CommanderState => {
  const previousHistory = before.lifecycleHistory ?? [];
  const entry = {
    id: `commander-lifecycle:${run.currentRound}:${previousHistory.length}:${details.type}`,
    round: run.currentRound,
    type: details.type,
    label: details.label,
    cardInstanceId: after.card.instanceId,
    cardDefId: after.card.defId,
    source: details.source,
    phase: run.phase,
    ...(details.fromZone ? { fromZone: details.fromZone } : {}),
    ...(details.toZone ? { toZone: details.toZone } : {}),
    deployCountBefore: before.deployCount,
    deployCountAfter: after.deployCount,
    rebindTaxBefore: before.rebindTax,
    rebindTaxAfter: after.rebindTax,
    rebindTaxDiscountBefore: before.rebindTaxDiscount,
    rebindTaxDiscountAfter: after.rebindTaxDiscount,
    effectiveRebindTaxBefore: getCommanderEffectiveRebindTax(before),
    effectiveRebindTaxAfter: getCommanderEffectiveRebindTax(after),
    upgradeLevelBefore: before.card.upgradeLevel,
    upgradeLevelAfter: after.card.upgradeLevel,
    ...(details.combatEvent
      ? {
          combatEventType: details.combatEvent.type,
          combatEventIndex: details.combatEventIndex,
          combatEventTimeMs: details.combatEvent.timeMs,
          destructionReason: details.combatEvent.reason
        }
      : {}),
    ...(details.upgradeId ? { upgradeId: details.upgradeId } : {}),
    ...(details.upgradeLabel ? { upgradeLabel: details.upgradeLabel } : {})
  };

  return {
    ...after,
    lifecycleHistory: [...previousHistory, entry]
  };
};

const hasCommanderUpgradeForRound = (run: RunState, round = run.currentRound): boolean =>
  run.commander?.upgradeHistory.some((entry) => entry.round === round) ?? false;

const hasPackRewardForRound = (run: RunState, round = run.currentRound): boolean =>
  run.rewardHistory.some((entry) => entry.type === "pack" && entry.round === round);

const nextRunWithCommanderDeployed = (
  run: RunState,
  commander: CommanderState,
  position: BoardPosition
): RunState => {
  const card = cardInZone(commander.card, "board");
  const nextCommander = withCommanderLifecycleEntry(
    run,
    commander,
    {
      ...commander,
      card,
      deployCount: commander.deployCount + 1
    },
    {
      type: "deployed",
      source: "planning",
      label: "Commander deployed from Command Zone.",
      fromZone: "command",
      toZone: "board"
    }
  );

  return {
    ...run,
    commander: nextCommander,
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

export const getCurrentCommanderUpgradeChoices = (
  run: RunState
): readonly CommanderUpgradeChoice[] => {
  if (
    run.status !== "active" ||
    run.phase !== "reward" ||
    !run.commander ||
    hasCommanderUpgradeForRound(run)
  ) {
    return [];
  }

  return COMMANDER_UPGRADE_CHOICES.map((choice) => ({ ...choice }));
};

export const applyCommanderUpgradeChoice = (
  run: RunState,
  choiceId: CommanderUpgradeId
): RunState => {
  if (run.status !== "active") {
    return run;
  }
  if (run.phase !== "reward") {
    throw new Error(`Cannot apply a Commander upgrade while run phase is ${run.phase}`);
  }

  const commander = run.commander;
  if (!commander) {
    throw new Error("Run has no Commander to upgrade.");
  }
  if (hasCommanderUpgradeForRound(run)) {
    throw new Error(`Commander upgrade already claimed for round ${run.currentRound}.`);
  }

  const choice = COMMANDER_UPGRADE_CHOICES.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown Commander upgrade choice id: ${choiceId}`);
  }

  const previousUpgradeLevel = commander.card.upgradeLevel;
  const previousRebindTaxDiscount = commander.rebindTaxDiscount;
  const card =
    choice.id === "combat_training"
      ? { ...commander.card, upgradeLevel: commander.card.upgradeLevel + 1 }
      : { ...commander.card };
  const nextRebindTaxDiscount =
    choice.id === "rebind_calibration"
      ? commander.rebindTaxDiscount + 1
      : commander.rebindTaxDiscount;
  const nextCommander = withCommanderLifecycleEntry(
    run,
    commander,
    {
      ...commander,
      card,
      rebindTaxDiscount: nextRebindTaxDiscount,
      upgradeHistory: [
        ...commander.upgradeHistory,
        {
          id: `commander-upgrade:${run.currentRound}:${commander.upgradeHistory.length}:${choice.id}`,
          round: run.currentRound,
          upgradeId: choice.id,
          label: choice.label,
          cardInstanceId: card.instanceId,
          cardDefId: card.defId,
          previousUpgradeLevel,
          nextUpgradeLevel: card.upgradeLevel,
          previousRebindTaxDiscount,
          nextRebindTaxDiscount
        }
      ]
    },
    {
      type: "upgraded",
      source: "reward",
      label: `Commander upgraded: ${choice.label}.`,
      fromZone: commander.card.zone,
      toZone: card.zone,
      upgradeId: choice.id,
      upgradeLabel: choice.label
    }
  );

  return {
    ...run,
    phase: hasPackRewardForRound(run) ? "combatResolved" : run.phase,
    commander: nextCommander,
    activeCards: run.activeCards.map((activeCard) =>
      activeCard.instanceId === commander.card.instanceId
        ? cardInZone(card, "board")
        : copyCard(activeCard)
    )
  };
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
  const nextCommander = withCommanderLifecycleEntry(
    run,
    commander!,
    {
      ...commander!,
      card,
      rebindTax: commander!.rebindTax + 1
    },
    {
      type: "returned_to_command",
      source: "planning",
      label: "Commander returned to Command Zone.",
      fromZone: "board",
      toZone: "command"
    }
  );

  return {
    ...run,
    commander: nextCommander,
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

  const commanderDestruction = combatEvents
    .map((event, index) => ({ event, index }))
    .find(
      (
        candidate
      ): candidate is {
        readonly event: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>;
        readonly index: number;
      } =>
        candidate.event.type === "UnitDestroyed" &&
        candidate.event.cardInstanceId === commander.card.instanceId &&
        candidate.event.ownerId === run.playerId &&
        candidate.event.side === "playerA"
    );

  if (!commanderDestruction) {
    return run;
  }

  const card = cardInZone(deployedCommanderCard(run, commander), "command");
  const nextCommander = withCommanderLifecycleEntry(
    run,
    commander,
    {
      ...commander,
      card,
      rebindTax: commander.rebindTax + 1
    },
    {
      type: "destroyed_to_command",
      source: "combat_result",
      label: "Commander returned to Command Zone after combat destruction.",
      fromZone: "board",
      toZone: "command",
      combatEvent: commanderDestruction.event,
      combatEventIndex: commanderDestruction.index
    }
  );

  return {
    ...run,
    commander: nextCommander,
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
