import type { ContentCatalog } from "@packbound/content";
import type {
  BoardPlacement,
  BoardState,
  CardInstanceId,
  PlayerSide
} from "@packbound/shared";

import {
  submitEncounterAction,
  type EncounterActor,
  type EncounterMatchState
} from "./encounterMatch";
import type {
  EncounterActionKind,
  EncounterBoardCardActionTarget
} from "./encounterActionContracts";

export type EncounterBoardCardTargetValidationCode =
  "missing_board_placement" | "unknown_card_definition" | "wrong_side";

export type EncounterBoardCardTargetValidationSuccess = {
  readonly ok: true;
  readonly target: EncounterBoardCardActionTarget;
};

export type EncounterBoardCardTargetValidationFailure = {
  readonly ok: false;
  readonly code: EncounterBoardCardTargetValidationCode;
  readonly message: string;
  readonly cardInstanceId: CardInstanceId;
};

export type EncounterBoardCardTargetValidationResult =
  EncounterBoardCardTargetValidationSuccess | EncounterBoardCardTargetValidationFailure;

export type BuildEncounterBoardCardTargetInput = {
  readonly catalog: ContentCatalog;
  readonly placement: BoardPlacement;
  readonly side: PlayerSide;
};

export type ValidateEncounterBoardCardTargetInput = {
  readonly catalog: ContentCatalog;
  readonly board: BoardState;
  readonly cardInstanceId: CardInstanceId;
  readonly side: PlayerSide;
  readonly requiredSide?: PlayerSide;
};

export type ListEncounterBoardCardTargetsInput = {
  readonly catalog: ContentCatalog;
  readonly board: BoardState;
  readonly side: PlayerSide;
  readonly requiredSide?: PlayerSide;
};

export type SubmitTargetProbeActionFromEncounterBoardInput = {
  readonly match: EncounterMatchState;
  readonly catalog: ContentCatalog;
  readonly board: BoardState;
  readonly cardInstanceId: CardInstanceId;
  readonly actor?: EncounterActor;
  readonly side?: PlayerSide;
};

const TARGET_PROBE_ACTION_KIND = "target_probe" satisfies EncounterActionKind;

const sideLabel = (side: PlayerSide): string => (side === "playerA" ? "ally" : "enemy");

const enemySideForActor = (actor: EncounterActor): PlayerSide =>
  actor === "player" ? "playerB" : "playerA";

const failure = (
  code: EncounterBoardCardTargetValidationCode,
  cardInstanceId: CardInstanceId,
  message: string
): EncounterBoardCardTargetValidationFailure => ({
  ok: false,
  code,
  cardInstanceId,
  message
});

export const buildEncounterBoardCardTarget = ({
  catalog,
  placement,
  side
}: BuildEncounterBoardCardTargetInput): EncounterBoardCardTargetValidationResult => {
  const def = catalog.cardsById.get(placement.defId);
  if (!def) {
    return failure(
      "unknown_card_definition",
      placement.cardInstanceId,
      `Board card ${placement.cardInstanceId} references unknown card definition ${placement.defId}.`
    );
  }

  return {
    ok: true,
    target: {
      type: "boardCard",
      side,
      cardInstanceId: placement.cardInstanceId,
      defId: placement.defId,
      ownerId: placement.ownerId,
      position: { ...placement.position },
      label: `${def.name} (${sideLabel(side)} ${placement.position.layer} r${placement.position.row} c${placement.position.col})`
    }
  };
};

export const validateEncounterBoardCardTarget = ({
  catalog,
  board,
  cardInstanceId,
  side,
  requiredSide
}: ValidateEncounterBoardCardTargetInput): EncounterBoardCardTargetValidationResult => {
  if (requiredSide && side !== requiredSide) {
    return failure(
      "wrong_side",
      cardInstanceId,
      `Card ${cardInstanceId} is on the ${sideLabel(
        side
      )} board, but this action requires the ${sideLabel(requiredSide)} board.`
    );
  }

  const placement = board.placements.find(
    (candidate) => candidate.cardInstanceId === cardInstanceId
  );
  if (!placement) {
    return failure(
      "missing_board_placement",
      cardInstanceId,
      `Card ${cardInstanceId} is not on the ${sideLabel(side)} board.`
    );
  }

  return buildEncounterBoardCardTarget({ catalog, placement, side });
};

export const listEncounterBoardCardTargets = ({
  catalog,
  board,
  side,
  requiredSide
}: ListEncounterBoardCardTargetsInput): readonly EncounterBoardCardActionTarget[] => {
  if (requiredSide && side !== requiredSide) {
    return [];
  }

  const targets: EncounterBoardCardActionTarget[] = [];
  for (const placement of board.placements) {
    const result = buildEncounterBoardCardTarget({ catalog, placement, side });
    if (result.ok) {
      targets.push(result.target);
    }
  }

  return targets;
};

export const submitTargetProbeActionFromEncounterBoard = ({
  match,
  catalog,
  board,
  cardInstanceId,
  actor = "player",
  side = enemySideForActor(actor)
}: SubmitTargetProbeActionFromEncounterBoardInput): EncounterMatchState => {
  const result = validateEncounterBoardCardTarget({
    catalog,
    board,
    cardInstanceId,
    side,
    requiredSide: enemySideForActor(actor)
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  return submitEncounterAction(match, {
    actor,
    kind: TARGET_PROBE_ACTION_KIND,
    target: result.target
  });
};
