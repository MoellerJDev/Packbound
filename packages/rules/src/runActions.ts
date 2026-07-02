import type { ContentCatalog } from "@packbound/content";
import type { BoardPosition, CardDefId, CardInstanceId } from "@packbound/shared";

import { prepareEncounterForRound } from "./encounters";
import {
  addCardToSourceRow,
  addCardToSpellrail,
  placeCardOnBoard,
  removeCardFromSourceRow,
  removeCardFromSpellrail,
  returnCardToPool
} from "./loadout";
import {
  advanceRunAfterCombat,
  applyPackReward,
  markCombatReady,
  recordCombatResult,
  type CombatResultLike
} from "./runProgression";
import type { RunState } from "./runState";
import { upgradeCardGroup } from "./upgrades";

export type RunAction =
  | { readonly type: "prepareEncounter" }
  | {
      readonly type: "placeCardOnBoard";
      readonly cardInstanceId: CardInstanceId;
      readonly position: BoardPosition;
    }
  | { readonly type: "returnCardToPool"; readonly cardInstanceId: CardInstanceId }
  | { readonly type: "addCardToSourceRow"; readonly cardInstanceId: CardInstanceId }
  | {
      readonly type: "removeCardFromSourceRow";
      readonly cardInstanceId: CardInstanceId;
    }
  | { readonly type: "addCardToSpellrail"; readonly cardInstanceId: CardInstanceId }
  | {
      readonly type: "removeCardFromSpellrail";
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "upgradeCardGroup";
      readonly defId: CardDefId;
      readonly upgradeLevel: number;
    }
  | { readonly type: "markCombatReady" }
  | {
      readonly type: "recordCombatResult";
      readonly combatResult: CombatResultLike;
      readonly encounterId: string;
    }
  | { readonly type: "applyPackReward"; readonly choiceId: string }
  | { readonly type: "advanceRunAfterCombat" };

export type RunActionLogEntry = {
  readonly id: string;
  readonly index: number;
  readonly action: RunAction;
};

export const applyRunAction = (
  run: RunState,
  catalog: ContentCatalog,
  action: RunAction
): RunState => {
  switch (action.type) {
    case "prepareEncounter":
      return prepareEncounterForRound(run, catalog);
    case "placeCardOnBoard":
      return placeCardOnBoard(run, action.cardInstanceId, action.position);
    case "returnCardToPool":
      return returnCardToPool(run, action.cardInstanceId);
    case "addCardToSourceRow":
      return addCardToSourceRow(run, action.cardInstanceId);
    case "removeCardFromSourceRow":
      return removeCardFromSourceRow(run, action.cardInstanceId);
    case "addCardToSpellrail":
      return addCardToSpellrail(run, action.cardInstanceId);
    case "removeCardFromSpellrail":
      return removeCardFromSpellrail(run, action.cardInstanceId);
    case "upgradeCardGroup":
      return upgradeCardGroup(run, catalog, action.defId, action.upgradeLevel);
    case "markCombatReady":
      return markCombatReady(run, catalog);
    case "recordCombatResult":
      return recordCombatResult(run, action.combatResult, {
        encounterId: action.encounterId
      });
    case "applyPackReward":
      return applyPackReward(run, catalog, action.choiceId);
    case "advanceRunAfterCombat":
      return advanceRunAfterCombat(run, catalog);
  }
};

export const applyRunActions = (
  run: RunState,
  catalog: ContentCatalog,
  actions: readonly RunAction[]
): RunState =>
  actions.reduce(
    (currentRun, action) => applyRunAction(currentRun, catalog, action),
    run
  );

export const replayRunActions = (
  initialRun: RunState,
  catalog: ContentCatalog,
  actions: readonly RunAction[]
): RunState => applyRunActions(initialRun, catalog, actions);

export const toRunActionLog = (
  actions: readonly RunAction[],
  prefix = "run-action"
): readonly RunActionLogEntry[] =>
  actions.map((action, index) => ({
    id: `${prefix}:${index}:${action.type}`,
    index,
    action
  }));
