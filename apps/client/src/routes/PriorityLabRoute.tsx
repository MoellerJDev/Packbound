import type { ContentCatalog } from "@packbound/content";
import {
  combatChargeCostForEncounterAction,
  listEncounterBoardCardTargets,
  listPrototypePressureActionSources,
  validateCommanderRallyActionSource
} from "@packbound/rules";
import type {
  EncounterActionSource,
  EncounterBoardCardActionTarget,
  EncounterCombatChargeProfile,
  EncounterMatchState,
  RunState
} from "@packbound/rules";
import type { BoardState, CardInstanceId } from "@packbound/shared";

import { PriorityLabPanel } from "../components/PriorityLabPanel";

export type PriorityLabRouteView = {
  readonly availablePrototypeActionSource: EncounterActionSource | undefined;
  readonly canRunCombat: boolean;
  readonly canSubmitCommanderAction: boolean;
  readonly canSubmitPrototypeAction: boolean;
  readonly canSubmitTargetProbeAction: boolean;
  readonly combatChargeProfile: EncounterCombatChargeProfile;
  readonly commanderActionSource: EncounterActionSource | undefined;
  readonly commanderActionUnavailableText: string | undefined;
  readonly commanderName: string;
  readonly commanderZone: string;
  readonly debugCombatChargeTopUp: number;
  readonly match: EncounterMatchState;
  readonly prototypeActionSource: EncounterActionSource | undefined;
  readonly prototypeActionSourceUnavailableText: string | undefined;
  readonly selectedTargetProbeCardInstanceId: CardInstanceId | undefined;
  readonly selectedTargetProbeTarget: EncounterBoardCardActionTarget | undefined;
  readonly targetProbeTargets: readonly EncounterBoardCardActionTarget[];
  readonly targetProbeUnavailableText: string | undefined;
};

export type BuildPriorityLabRouteViewInput = {
  readonly canRunCombat: boolean;
  readonly catalog: ContentCatalog;
  readonly combatChargeProfile: EncounterCombatChargeProfile;
  readonly currentEncounterBoard: BoardState | undefined;
  readonly debugCombatChargeTopUp: number;
  readonly match: EncounterMatchState;
  readonly run: RunState;
  readonly selectedTargetProbeCardInstanceId: CardInstanceId | undefined;
};

export type PriorityLabRouteController = {
  readonly onPassEnemy: () => void;
  readonly onPassPlayer: () => void;
  readonly onReset: () => void;
  readonly onRunSkirmish: () => void;
  readonly onSelectTargetProbeTarget: (cardInstanceId: CardInstanceId) => void;
  readonly onSubmitCommanderAction: () => void;
  readonly onSubmitPrototypeAction: () => void;
  readonly onSubmitTargetProbeAction: () => void;
};

export const buildPriorityLabRouteView = ({
  canRunCombat,
  catalog,
  combatChargeProfile,
  currentEncounterBoard,
  debugCombatChargeTopUp,
  match,
  run,
  selectedTargetProbeCardInstanceId
}: BuildPriorityLabRouteViewInput): PriorityLabRouteView => {
  const prototypeActionSource = listPrototypePressureActionSources({
    run,
    catalog,
    actor: "player"
  })[0];
  const availablePrototypeActionSource = listPrototypePressureActionSources({
    run,
    catalog,
    actor: "player",
    match
  })[0];
  const commanderActionValidation = validateCommanderRallyActionSource({
    run,
    catalog,
    match,
    actor: "player"
  });
  const commanderActionSource = commanderActionValidation.ok
    ? commanderActionValidation.source
    : undefined;
  const targetProbeTargets = currentEncounterBoard
    ? listEncounterBoardCardTargets({
        catalog,
        board: currentEncounterBoard,
        side: "playerB",
        requiredSide: "playerB"
      })
    : [];
  const selectedTargetProbeTarget =
    targetProbeTargets.find(
      (target) => target.cardInstanceId === selectedTargetProbeCardInstanceId
    ) ?? targetProbeTargets[0];
  const prototypeActionCombatChargeCost =
    combatChargeCostForEncounterAction("main_phase_pressure");
  const commanderActionCombatChargeCost =
    combatChargeCostForEncounterAction("commander_rally");
  const targetProbeActionCombatChargeCost =
    combatChargeCostForEncounterAction("target_probe");
  const canPayPrototypeAction =
    match.playerCombatCharge >= prototypeActionCombatChargeCost;
  const canPayCommanderAction =
    match.playerCombatCharge >= commanderActionCombatChargeCost;
  const canPayTargetProbeAction =
    match.playerCombatCharge >= targetProbeActionCombatChargeCost;
  const prototypeCostUnavailableText = `Prototype Pressure Technique requires ${prototypeActionCombatChargeCost} Combat Charge, but Player has ${match.playerCombatCharge}.`;
  const commanderCostUnavailableText = `Commander Rally requires ${commanderActionCombatChargeCost} Combat Charge, but Player has ${match.playerCombatCharge}.`;
  const targetProbeCostUnavailableText = `Target Probe requires ${targetProbeActionCombatChargeCost} Combat Charge, but Player has ${match.playerCombatCharge}.`;
  const prototypeActionSourceUnavailableText = availablePrototypeActionSource
    ? canPayPrototypeAction
      ? undefined
      : prototypeCostUnavailableText
    : prototypeActionSource
      ? `${prototypeActionSource.cardName} is already queued or used this encounter.`
      : "No valid player Spellrail Technique source.";
  const commanderActionUnavailableText = commanderActionValidation.ok
    ? canPayCommanderAction
      ? undefined
      : commanderCostUnavailableText
    : commanderActionValidation.message;
  const targetProbeUnavailableText = selectedTargetProbeTarget
    ? canPayTargetProbeAction
      ? undefined
      : targetProbeCostUnavailableText
    : "No valid enemy board-card target.";
  const commanderDefinition = run.commander
    ? catalog.cardsById.get(run.commander.card.defId)
    : undefined;

  return {
    availablePrototypeActionSource,
    canRunCombat,
    canSubmitCommanderAction:
      commanderActionSource !== undefined && canPayCommanderAction,
    canSubmitPrototypeAction:
      availablePrototypeActionSource !== undefined && canPayPrototypeAction,
    canSubmitTargetProbeAction:
      selectedTargetProbeTarget !== undefined && canPayTargetProbeAction,
    combatChargeProfile,
    commanderActionSource,
    commanderActionUnavailableText,
    commanderName: commanderDefinition?.name ?? "No Commander",
    commanderZone: run.commander?.card.zone ?? "none",
    debugCombatChargeTopUp,
    match,
    prototypeActionSource,
    prototypeActionSourceUnavailableText,
    selectedTargetProbeCardInstanceId: selectedTargetProbeTarget?.cardInstanceId,
    selectedTargetProbeTarget,
    targetProbeTargets,
    targetProbeUnavailableText
  };
};

export const PriorityLabRoute = ({
  controller,
  view
}: {
  readonly controller: PriorityLabRouteController;
  readonly view: PriorityLabRouteView;
}) => (
  <PriorityLabPanel
    match={view.match}
    combatChargeProfile={view.combatChargeProfile}
    debugCombatChargeTopUp={view.debugCombatChargeTopUp}
    canRunCombat={view.canRunCombat}
    prototypeActionSource={view.prototypeActionSource}
    canSubmitPrototypeAction={view.canSubmitPrototypeAction}
    prototypeActionSourceUnavailableText={view.prototypeActionSourceUnavailableText}
    commanderName={view.commanderName}
    commanderZone={view.commanderZone}
    commanderActionSource={view.commanderActionSource}
    canSubmitCommanderAction={view.canSubmitCommanderAction}
    commanderActionUnavailableText={view.commanderActionUnavailableText}
    targetProbeTargets={view.targetProbeTargets}
    selectedTargetProbeTarget={view.selectedTargetProbeTarget}
    selectedTargetProbeCardInstanceId={view.selectedTargetProbeCardInstanceId}
    canSubmitTargetProbeAction={view.canSubmitTargetProbeAction}
    targetProbeUnavailableText={view.targetProbeUnavailableText}
    onSelectTargetProbeTarget={controller.onSelectTargetProbeTarget}
    onSubmitCommanderAction={controller.onSubmitCommanderAction}
    onSubmitTargetProbeAction={controller.onSubmitTargetProbeAction}
    onSubmitPrototypeAction={controller.onSubmitPrototypeAction}
    onPassPlayer={controller.onPassPlayer}
    onPassEnemy={controller.onPassEnemy}
    onRunSkirmish={controller.onRunSkirmish}
    onReset={controller.onReset}
  />
);
