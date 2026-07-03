import type { ContentCatalog } from "@packbound/content";
import type { CardInstanceId } from "@packbound/shared";

import {
  submitEncounterAction,
  type EncounterActionSource,
  type EncounterActor,
  type EncounterMatchState
} from "./encounterMatch";
import { findRunCard } from "./runCards";
import type { RunState } from "./runState";

export type PrototypePressureActionSourceValidationCode =
  | "unsupported_actor"
  | "card_not_in_run"
  | "wrong_owner"
  | "wrong_zone"
  | "unknown_card_definition"
  | "wrong_card_type";

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

export type ValidatePrototypePressureActionSourceInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly cardInstanceId: CardInstanceId;
  readonly actor?: EncounterActor;
};

export type ListPrototypePressureActionSourcesInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly actor?: EncounterActor;
};

export type SubmitPrototypePressureActionFromRunInput = {
  readonly match: EncounterMatchState;
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly cardInstanceId: CardInstanceId;
  readonly actor?: EncounterActor;
};

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
      `Card ${cardInstanceId} cannot source Prototype Pressure Technique for ${actor}; run-sourced encounter actions currently support player actions only.`
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
      `Card ${cardInstanceId} is in ${card.zone}, but Prototype Pressure Technique requires a spellrail source.`
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
      `Card ${cardInstanceId} references ${def.cardType}, but Prototype Pressure Technique requires a Technique source.`
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
  actor = "player"
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
      sources.push(result.source);
    }
  }

  return sources;
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

  return submitEncounterAction(match, {
    actor,
    kind: "main_phase_pressure",
    source: result.source
  });
};
