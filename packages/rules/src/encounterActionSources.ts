import type { ContentCatalog } from "@packbound/content";
import type { CardInstanceId } from "@packbound/shared";

import {
  submitEncounterAction,
  type EncounterActionKind,
  type EncounterActionSource,
  type EncounterActor,
  type EncounterMatchState
} from "./encounterMatch";
import {
  encounterActionConsumesSourceOnResolve,
  labelForEncounterAction,
  sourceLifecycleForEncounterAction
} from "./encounterActionContracts";
import { findRunCard } from "./runCards";
import type { RunState } from "./runState";

export type PrototypePressureActionSourceValidationCode =
  | "unsupported_actor"
  | "card_not_in_run"
  | "wrong_owner"
  | "wrong_zone"
  | "unknown_card_definition"
  | "wrong_card_type"
  | "source_already_queued"
  | "source_already_used";

export type PrototypePressureActionSourceValidationSuccess = {
  readonly ok: true;
  readonly source: EncounterActionSource;
};

export type PrototypePressureActionSourceValidationFailure = {
  readonly ok: false;
  readonly code: PrototypePressureActionSourceValidationCode;
  readonly message: string;
  readonly cardInstanceId: CardInstanceId;
};

export type PrototypePressureActionSourceValidationResult =
  | PrototypePressureActionSourceValidationSuccess
  | PrototypePressureActionSourceValidationFailure;

export type CommanderRallyActionSourceValidationCode =
  | "unsupported_actor"
  | "missing_commander"
  | "wrong_owner"
  | "wrong_zone"
  | "missing_board_placement"
  | "unknown_card_definition"
  | "wrong_card_type"
  | "wrong_phase"
  | "priority_required"
  | "source_already_queued"
  | "source_already_used";

export type CommanderRallyActionSourceValidationSuccess = {
  readonly ok: true;
  readonly source: EncounterActionSource;
};

export type CommanderRallyActionSourceValidationFailure = {
  readonly ok: false;
  readonly code: CommanderRallyActionSourceValidationCode;
  readonly message: string;
  readonly cardInstanceId?: CardInstanceId;
};

export type CommanderRallyActionSourceValidationResult =
  | CommanderRallyActionSourceValidationSuccess
  | CommanderRallyActionSourceValidationFailure;

export type ValidatePrototypePressureActionSourceInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly cardInstanceId: CardInstanceId;
  readonly actor?: EncounterActor;
};

export type ValidateCommanderRallyActionSourceInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly match: EncounterMatchState;
  readonly actor?: EncounterActor;
};

export type ListPrototypePressureActionSourcesInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly actor?: EncounterActor;
  readonly match?: EncounterMatchState;
};

export type ListCommanderRallyActionSourcesInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly actor?: EncounterActor;
  readonly match: EncounterMatchState;
};

export type SubmitPrototypePressureActionFromRunInput = {
  readonly match: EncounterMatchState;
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly cardInstanceId: CardInstanceId;
  readonly actor?: EncounterActor;
};

export type SubmitCommanderRallyActionFromRunInput = {
  readonly match: EncounterMatchState;
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly actor?: EncounterActor;
};

const PROTOTYPE_PRESSURE_ACTION_KIND =
  "main_phase_pressure" satisfies EncounterActionKind;
const COMMANDER_RALLY_ACTION_KIND = "commander_rally" satisfies EncounterActionKind;
const PROTOTYPE_PRESSURE_LABEL = labelForEncounterAction(PROTOTYPE_PRESSURE_ACTION_KIND);
const COMMANDER_RALLY_LABEL = labelForEncounterAction(COMMANDER_RALLY_ACTION_KIND);

const failure = (
  code: PrototypePressureActionSourceValidationCode,
  cardInstanceId: CardInstanceId,
  message: string
): PrototypePressureActionSourceValidationFailure => ({
  ok: false,
  code,
  cardInstanceId,
  message
});

const commanderFailure = (
  code: CommanderRallyActionSourceValidationCode,
  message: string,
  cardInstanceId?: CardInstanceId
): CommanderRallyActionSourceValidationFailure => ({
  ok: false,
  code,
  message,
  ...(cardInstanceId ? { cardInstanceId } : {})
});

const sourceAlreadyQueued = (
  match: EncounterMatchState,
  cardInstanceId: CardInstanceId,
  actionKind: EncounterActionKind
): boolean =>
  match.stack.some(
    (item) =>
      item.action.kind === actionKind &&
      item.action.source?.cardInstanceId === cardInstanceId &&
      item.action.sourceLifecycle === sourceLifecycleForEncounterAction(actionKind)
  );

const sourceAlreadyUsed = (
  match: EncounterMatchState,
  cardInstanceId: CardInstanceId,
  actionKind: EncounterActionKind
): boolean =>
  match.sourceLifecycleEvents.some(
    (event) =>
      event.actionKind === actionKind &&
      event.source.cardInstanceId === cardInstanceId &&
      event.lifecycle === sourceLifecycleForEncounterAction(actionKind)
  );

const validateSourceAvailability = (
  match: EncounterMatchState,
  cardInstanceId: CardInstanceId
): PrototypePressureActionSourceValidationFailure | undefined => {
  if (
    encounterActionConsumesSourceOnResolve(PROTOTYPE_PRESSURE_ACTION_KIND) &&
    sourceAlreadyQueued(match, cardInstanceId, PROTOTYPE_PRESSURE_ACTION_KIND)
  ) {
    return failure(
      "source_already_queued",
      cardInstanceId,
      `Card ${cardInstanceId} is already queued for ${PROTOTYPE_PRESSURE_LABEL}.`
    );
  }

  if (
    encounterActionConsumesSourceOnResolve(PROTOTYPE_PRESSURE_ACTION_KIND) &&
    sourceAlreadyUsed(match, cardInstanceId, PROTOTYPE_PRESSURE_ACTION_KIND)
  ) {
    return failure(
      "source_already_used",
      cardInstanceId,
      `Card ${cardInstanceId} was already used for ${PROTOTYPE_PRESSURE_LABEL} this encounter.`
    );
  }

  return undefined;
};

const validateCommanderSourceAvailability = (
  match: EncounterMatchState,
  cardInstanceId: CardInstanceId
): CommanderRallyActionSourceValidationFailure | undefined => {
  if (
    encounterActionConsumesSourceOnResolve(COMMANDER_RALLY_ACTION_KIND) &&
    sourceAlreadyQueued(match, cardInstanceId, COMMANDER_RALLY_ACTION_KIND)
  ) {
    return commanderFailure(
      "source_already_queued",
      `${COMMANDER_RALLY_LABEL} is already queued for this Commander.`,
      cardInstanceId
    );
  }

  if (
    encounterActionConsumesSourceOnResolve(COMMANDER_RALLY_ACTION_KIND) &&
    sourceAlreadyUsed(match, cardInstanceId, COMMANDER_RALLY_ACTION_KIND)
  ) {
    return commanderFailure(
      "source_already_used",
      `${COMMANDER_RALLY_LABEL} was already used this encounter.`,
      cardInstanceId
    );
  }

  return undefined;
};

export const validatePrototypePressureActionSource = ({
  run,
  catalog,
  cardInstanceId,
  actor = "player"
}: ValidatePrototypePressureActionSourceInput): PrototypePressureActionSourceValidationResult => {
  if (actor !== "player") {
    return failure(
      "unsupported_actor",
      cardInstanceId,
      `Card ${cardInstanceId} cannot source ${PROTOTYPE_PRESSURE_LABEL} for ${actor}; run-sourced encounter actions currently support player actions only.`
    );
  }

  const card = findRunCard(run, cardInstanceId);
  if (!card) {
    return failure(
      "card_not_in_run",
      cardInstanceId,
      `Card ${cardInstanceId} is not in the run.`
    );
  }

  if (card.ownerId !== run.playerId) {
    return failure(
      "wrong_owner",
      cardInstanceId,
      `Card ${cardInstanceId} is owned by ${card.ownerId}, not the run player ${run.playerId}.`
    );
  }

  if (card.zone !== "spellrail") {
    return failure(
      "wrong_zone",
      cardInstanceId,
      `Card ${cardInstanceId} is in ${card.zone}, but ${PROTOTYPE_PRESSURE_LABEL} requires a spellrail source.`
    );
  }

  const def = catalog.cardsById.get(card.defId);
  if (!def) {
    return failure(
      "unknown_card_definition",
      cardInstanceId,
      `Card ${cardInstanceId} references unknown card definition ${card.defId}.`
    );
  }

  if (def.cardType !== "Technique") {
    return failure(
      "wrong_card_type",
      cardInstanceId,
      `Card ${cardInstanceId} references ${def.cardType}, but ${PROTOTYPE_PRESSURE_LABEL} requires a Technique source.`
    );
  }

  return {
    ok: true,
    source: {
      cardInstanceId: card.instanceId,
      cardDefId: card.defId,
      cardName: def.name,
      zone: card.zone
    }
  };
};

export const listPrototypePressureActionSources = ({
  run,
  catalog,
  actor = "player",
  match
}: ListPrototypePressureActionSourcesInput): readonly EncounterActionSource[] => {
  const sources: EncounterActionSource[] = [];

  for (const card of run.spellrail.cards) {
    const result = validatePrototypePressureActionSource({
      run,
      catalog,
      actor,
      cardInstanceId: card.instanceId
    });
    if (result.ok) {
      if (match && validateSourceAvailability(match, result.source.cardInstanceId)) {
        continue;
      }
      sources.push(result.source);
    }
  }

  return sources;
};

export const validateCommanderRallyActionSource = ({
  run,
  catalog,
  match,
  actor = "player"
}: ValidateCommanderRallyActionSourceInput): CommanderRallyActionSourceValidationResult => {
  if (actor !== "player") {
    return commanderFailure(
      "unsupported_actor",
      `${COMMANDER_RALLY_LABEL} currently supports player Commanders only.`
    );
  }

  const commander = run.commander;
  if (!commander) {
    return commanderFailure(
      "missing_commander",
      `Run has no Commander for ${COMMANDER_RALLY_LABEL}.`
    );
  }

  const commanderCard = commander.card;
  if (commanderCard.ownerId !== run.playerId) {
    return commanderFailure(
      "wrong_owner",
      `Commander ${commanderCard.instanceId} is owned by ${commanderCard.ownerId}, not the run player ${run.playerId}.`,
      commanderCard.instanceId
    );
  }

  if (commanderCard.zone !== "board") {
    return commanderFailure(
      "wrong_zone",
      `Commander must be deployed to use ${COMMANDER_RALLY_LABEL}.`,
      commanderCard.instanceId
    );
  }

  const placement = run.board.placements.find(
    (candidate) => candidate.cardInstanceId === commanderCard.instanceId
  );
  if (!placement) {
    return commanderFailure(
      "missing_board_placement",
      `${COMMANDER_RALLY_LABEL} requires the deployed Commander to have a matching board placement.`,
      commanderCard.instanceId
    );
  }

  const def = catalog.cardsById.get(commanderCard.defId);
  if (!def) {
    return commanderFailure(
      "unknown_card_definition",
      `Commander ${commanderCard.instanceId} references unknown card definition ${commanderCard.defId}.`,
      commanderCard.instanceId
    );
  }

  if (def.cardType !== "Unit" && def.cardType !== "Echo") {
    return commanderFailure(
      "wrong_card_type",
      `Commander ${commanderCard.instanceId} references ${def.cardType}, but ${COMMANDER_RALLY_LABEL} requires a Unit or Echo source.`,
      commanderCard.instanceId
    );
  }

  if (match.phase !== "firstMain" && match.phase !== "secondMain") {
    return commanderFailure(
      "wrong_phase",
      `${COMMANDER_RALLY_LABEL} can only be used during main phases.`,
      commanderCard.instanceId
    );
  }

  if (match.priorityHolder !== "player") {
    return commanderFailure(
      "priority_required",
      `${COMMANDER_RALLY_LABEL} requires player priority.`,
      commanderCard.instanceId
    );
  }

  const sourceAvailabilityFailure = validateCommanderSourceAvailability(
    match,
    commanderCard.instanceId
  );
  if (sourceAvailabilityFailure) {
    return sourceAvailabilityFailure;
  }

  return {
    ok: true,
    source: {
      cardInstanceId: commanderCard.instanceId,
      cardDefId: commanderCard.defId,
      cardName: def.name,
      zone: commanderCard.zone
    }
  };
};

export const listCommanderRallyActionSources = ({
  run,
  catalog,
  match,
  actor = "player"
}: ListCommanderRallyActionSourcesInput): readonly EncounterActionSource[] => {
  const result = validateCommanderRallyActionSource({
    run,
    catalog,
    match,
    actor
  });

  return result.ok ? [result.source] : [];
};

export const submitPrototypePressureActionFromRun = ({
  match,
  run,
  catalog,
  cardInstanceId,
  actor = "player"
}: SubmitPrototypePressureActionFromRunInput): EncounterMatchState => {
  const result = validatePrototypePressureActionSource({
    run,
    catalog,
    actor,
    cardInstanceId
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  const sourceAvailabilityFailure = validateSourceAvailability(
    match,
    result.source.cardInstanceId
  );
  if (sourceAvailabilityFailure) {
    throw new Error(sourceAvailabilityFailure.message);
  }

  return submitEncounterAction(match, {
    actor,
    kind: PROTOTYPE_PRESSURE_ACTION_KIND,
    source: result.source,
    sourceLifecycle: sourceLifecycleForEncounterAction(PROTOTYPE_PRESSURE_ACTION_KIND)
  });
};

export const submitCommanderRallyActionFromRun = ({
  match,
  run,
  catalog,
  actor = "player"
}: SubmitCommanderRallyActionFromRunInput): EncounterMatchState => {
  const result = validateCommanderRallyActionSource({
    run,
    catalog,
    match,
    actor
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  return submitEncounterAction(match, {
    actor,
    kind: COMMANDER_RALLY_ACTION_KIND,
    source: result.source,
    sourceLifecycle: sourceLifecycleForEncounterAction(COMMANDER_RALLY_ACTION_KIND)
  });
};
