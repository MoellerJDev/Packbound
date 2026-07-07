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
  CommanderDoctrineNodeId,
  CommanderDoctrinePathId,
  CommanderDoctrineState,
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

export type CommanderDoctrineNodeStatus = "unlocked" | "available" | "locked";

export type CommanderDoctrineNodeDefinition = {
  readonly id: CommanderDoctrineNodeId;
  readonly path: CommanderDoctrinePathId;
  readonly pathLabel: string;
  readonly displayName: string;
  readonly description: string;
  readonly prerequisiteIds: readonly CommanderDoctrineNodeId[];
  readonly futureEffectLabel: string;
  readonly futureEffectText: string;
};

export type CommanderDoctrineNodeView = CommanderDoctrineNodeDefinition & {
  readonly status: CommanderDoctrineNodeStatus;
  readonly lockedReason?: string;
};

export type CommanderDoctrineUnlockCheck =
  | { readonly ok: true; readonly node: CommanderDoctrineNodeView }
  | {
      readonly ok: false;
      readonly reason: string;
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

const COMMANDER_DOCTRINE_NODES: readonly CommanderDoctrineNodeDefinition[] = [
  {
    id: "ash_ledger",
    path: "ashbound",
    pathLabel: "Ashbound",
    displayName: "Ash Ledger",
    description:
      "Track fallen units as Ashes after combat. Future Ashbound nodes can recall or consume them.",
    prerequisiteIds: [],
    futureEffectLabel: "Doctrine unlocked; Ashes payoff coming soon.",
    futureEffectText:
      "This node is a foundation marker today. It makes the Ashes layer visible without changing combat."
  },
  {
    id: "memory_vault",
    path: "ashbound",
    pathLabel: "Ashbound",
    displayName: "Memory Vault",
    description:
      "Prepare a future death-memory reward line that can care about what fell earlier in the run.",
    prerequisiteIds: ["ash_ledger"],
    futureEffectLabel: "Preview doctrine; memory mechanics coming soon.",
    futureEffectText:
      "Future versions can convert Ashes history into recall or sacrifice payoffs."
  },
  {
    id: "edge_mason",
    path: "field_architect",
    pathLabel: "Field Architect",
    displayName: "Edge Mason",
    description:
      "Unlocks the Wall/Edge layer display and prepares future wall placement rewards.",
    prerequisiteIds: [],
    futureEffectLabel: "Doctrine unlocked; wall mechanics coming soon.",
    futureEffectText:
      "This node exposes the terrain layer scaffold without blocking movement or line of sight yet."
  },
  {
    id: "wall_pattern",
    path: "field_architect",
    pathLabel: "Field Architect",
    displayName: "Wall Pattern",
    description:
      "Sketch future formation rewards that can care about edges, walls, and board geometry.",
    prerequisiteIds: ["edge_mason"],
    futureEffectLabel: "Preview doctrine; terrain rewards coming soon.",
    futureEffectText:
      "Future versions can add placement rewards for walls or edge terrain without changing this node data."
  },
  {
    id: "queued_trigger",
    path: "spellrail_conductor",
    pathLabel: "Spellrail Conductor",
    displayName: "Queued Trigger",
    description:
      "Marks Spellrail as a future triggered-script system rather than passive spell slots.",
    prerequisiteIds: [],
    futureEffectLabel: "Doctrine unlocked; Technique triggers coming soon.",
    futureEffectText:
      "This node is display-only today. It points Spellrail toward triggered scripts later."
  },
  {
    id: "hidden_rail",
    path: "spellrail_conductor",
    pathLabel: "Spellrail Conductor",
    displayName: "Hidden Rail",
    description:
      "Prepare future delayed Technique scripts that can wait for a clear combat condition.",
    prerequisiteIds: ["queued_trigger"],
    futureEffectLabel: "Preview doctrine; hidden scripts coming soon.",
    futureEffectText:
      "Future versions can use this path for delayed Technique programming without adding traps today."
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
  readonly doctrineNodeId?: CommanderDoctrineNodeId;
  readonly doctrineNodeLabel?: string;
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
    ...(details.upgradeLabel ? { upgradeLabel: details.upgradeLabel } : {}),
    ...(details.doctrineNodeId ? { doctrineNodeId: details.doctrineNodeId } : {}),
    ...(details.doctrineNodeLabel ? { doctrineNodeLabel: details.doctrineNodeLabel } : {})
  };

  return {
    ...after,
    lifecycleHistory: [...previousHistory, entry]
  };
};

const hasCommanderUpgradeForRound = (run: RunState, round = run.currentRound): boolean =>
  run.commander?.upgradeHistory.some((entry) => entry.round === round) ?? false;

export const hasCommanderDoctrineUnlockForRound = (
  run: RunState,
  round = run.currentRound
): boolean =>
  run.commander?.doctrine.unlockHistory.some((entry) => entry.round === round) ?? false;

export const hasCommanderRewardForRound = (
  run: RunState,
  round = run.currentRound
): boolean =>
  !run.commander ||
  hasCommanderDoctrineUnlockForRound(run, round) ||
  hasCommanderUpgradeForRound(run, round);

const hasPackRewardForRound = (run: RunState, round = run.currentRound): boolean =>
  run.rewardHistory.some((entry) => entry.type === "pack" && entry.round === round);

const doctrineForCommander = (commander: CommanderState): CommanderDoctrineState =>
  commander.doctrine ?? {
    points: 0,
    unlockedNodeIds: [],
    unlockHistory: []
  };

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
  return getLegalCommanderDeployPositions(run, catalog)[0];
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

export const getLegalCommanderDeployPositions = (
  run: RunState,
  catalog: ContentCatalog
): readonly BoardPosition[] =>
  getCommanderDeploymentCandidatePositions(run, catalog).filter(
    (position) => canDeployCommander(run, catalog, position).ok
  );

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

export const getCommanderDoctrineDefinitions =
  (): readonly CommanderDoctrineNodeDefinition[] =>
    COMMANDER_DOCTRINE_NODES.map((node) => ({
      ...node,
      prerequisiteIds: [...node.prerequisiteIds]
    }));

export const getCommanderDoctrineNodes = (
  run: RunState
): readonly CommanderDoctrineNodeView[] => {
  const commander = run.commander;
  if (!commander) {
    return [];
  }

  const doctrine = doctrineForCommander(commander);
  const unlockedIds = new Set(doctrine.unlockedNodeIds);

  return COMMANDER_DOCTRINE_NODES.map((node) => {
    if (unlockedIds.has(node.id)) {
      return {
        ...node,
        prerequisiteIds: [...node.prerequisiteIds],
        status: "unlocked" as const
      };
    }

    const missingPrerequisites = node.prerequisiteIds.filter(
      (prerequisiteId) => !unlockedIds.has(prerequisiteId)
    );
    if (missingPrerequisites.length > 0) {
      return {
        ...node,
        prerequisiteIds: [...node.prerequisiteIds],
        status: "locked" as const,
        lockedReason: `Requires ${missingPrerequisites
          .map((prerequisiteId) => {
            const prerequisite = COMMANDER_DOCTRINE_NODES.find(
              (candidate) => candidate.id === prerequisiteId
            );
            return prerequisite?.displayName ?? prerequisiteId;
          })
          .join(", ")}.`
      };
    }

    return {
      ...node,
      prerequisiteIds: [...node.prerequisiteIds],
      status: "available" as const
    };
  });
};

export const getCurrentCommanderDoctrineChoices = (
  run: RunState
): readonly CommanderDoctrineNodeView[] => {
  if (
    run.status !== "active" ||
    run.phase !== "reward" ||
    !run.commander ||
    doctrineForCommander(run.commander).points <= 0 ||
    hasCommanderRewardForRound(run)
  ) {
    return [];
  }

  return getCommanderDoctrineNodes(run).filter((node) => node.status === "available");
};

export const canUnlockCommanderDoctrineNode = (
  run: RunState,
  nodeId: CommanderDoctrineNodeId
): CommanderDoctrineUnlockCheck => {
  if (run.status !== "active") {
    return { ok: false, reason: "Run is not active." };
  }
  if (run.phase !== "reward") {
    return {
      ok: false,
      reason: `Cannot unlock Commander doctrine while run phase is ${run.phase}.`
    };
  }

  const commander = run.commander;
  if (!commander) {
    return { ok: false, reason: "Run has no Commander doctrine to unlock." };
  }
  const doctrine = doctrineForCommander(commander);
  if (hasCommanderRewardForRound(run)) {
    return {
      ok: false,
      reason: `Commander doctrine reward already claimed for round ${run.currentRound}.`
    };
  }
  if (doctrine.points <= 0) {
    return { ok: false, reason: "No Commander doctrine points are available." };
  }

  const node = getCommanderDoctrineNodes(run).find(
    (candidate) => candidate.id === nodeId
  );
  if (!node) {
    return { ok: false, reason: `Unknown Commander doctrine node id: ${nodeId}.` };
  }
  if (node.status === "unlocked") {
    return { ok: false, reason: `${node.displayName} is already unlocked.` };
  }
  if (node.status === "locked") {
    return {
      ok: false,
      reason: node.lockedReason ?? `${node.displayName} is locked.`
    };
  }

  return { ok: true, node };
};

export const awardCommanderDoctrinePoint = (run: RunState): RunState => {
  const commander = run.commander;
  if (!commander) {
    return run;
  }

  const doctrine = doctrineForCommander(commander);
  return {
    ...run,
    commander: {
      ...commander,
      doctrine: {
        ...doctrine,
        points: doctrine.points + 1,
        unlockedNodeIds: [...doctrine.unlockedNodeIds],
        unlockHistory: [...doctrine.unlockHistory]
      }
    }
  };
};

export const applyCommanderDoctrineUnlock = (
  run: RunState,
  nodeId: CommanderDoctrineNodeId
): RunState => {
  const check = canUnlockCommanderDoctrineNode(run, nodeId);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const commander = run.commander!;
  const doctrine = doctrineForCommander(commander);
  const node = check.node;
  const pointsAfter = doctrine.points - 1;
  const nextDoctrine: CommanderDoctrineState = {
    points: pointsAfter,
    unlockedNodeIds: [...doctrine.unlockedNodeIds, node.id],
    unlockHistory: [
      ...doctrine.unlockHistory,
      {
        id: `commander-doctrine:${run.currentRound}:${doctrine.unlockHistory.length}:${node.id}`,
        round: run.currentRound,
        nodeId: node.id,
        path: node.path,
        label: node.displayName,
        cardInstanceId: commander.card.instanceId,
        cardDefId: commander.card.defId,
        pointsBefore: doctrine.points,
        pointsAfter
      }
    ]
  };
  const nextCommander = withCommanderLifecycleEntry(
    run,
    commander,
    {
      ...commander,
      doctrine: nextDoctrine
    },
    {
      type: "doctrine_unlocked",
      source: "reward",
      label: `Commander doctrine unlocked: ${node.displayName}.`,
      fromZone: commander.card.zone,
      toZone: commander.card.zone,
      doctrineNodeId: node.id,
      doctrineNodeLabel: node.displayName
    }
  );

  return {
    ...run,
    phase:
      hasPackRewardForRound(run) && !run.pendingPackOffer ? "combatResolved" : run.phase,
    commander: nextCommander
  };
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
    phase:
      hasPackRewardForRound(run) && !run.pendingPackOffer ? "combatResolved" : run.phase,
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
