export type DefaultPixiCommanderEditView = {
  readonly modeLabel: "Commander";
  readonly hasCommander: boolean;
  readonly commanderName: string;
  readonly zone: string;
  readonly zoneLabel: string;
  readonly statusText: string;
  readonly canInspect: boolean;
  readonly canDeploy: boolean;
  readonly canCancelPlacement: boolean;
  readonly canReturn: boolean;
  readonly deployBlockedReason: string | undefined;
  readonly returnBlockedReason: string | undefined;
  readonly legalDeployCount: number;
};

export type BuildDefaultPixiCommanderEditViewInput = {
  readonly hasCommander: boolean;
  readonly commanderName: string;
  readonly zone: string;
  readonly deployBlockedReason: string | undefined;
  readonly placementActive?: boolean;
  readonly legalDeployCount?: number;
  readonly returnBlockedReason: string | undefined;
};

const zoneLabel = (zone: string): string => {
  switch (zone) {
    case "command":
      return "Command Zone";
    case "board":
      return "Board";
    case "none":
      return "None";
    default:
      return zone;
  }
};

const commanderStatusText = ({
  deployBlockedReason,
  hasCommander,
  returnBlockedReason,
  zone
}: BuildDefaultPixiCommanderEditViewInput): string => {
  if (!hasCommander) {
    return "No Commander is available.";
  }

  if (zone === "command") {
    return deployBlockedReason
      ? `Deploy blocked: ${deployBlockedReason}`
      : "Commander is ready to deploy.";
  }

  if (zone === "board") {
    return returnBlockedReason
      ? `Return blocked: ${returnBlockedReason}`
      : "Commander is deployed and can return to Command.";
  }

  return "Commander state is available in the Command Zone panel.";
};

export const buildDefaultPixiCommanderEditView = (
  input: BuildDefaultPixiCommanderEditViewInput
): DefaultPixiCommanderEditView => {
  const placementActive = input.placementActive ?? false;
  const legalDeployCount = input.legalDeployCount ?? 0;

  return {
    modeLabel: "Commander",
    hasCommander: input.hasCommander,
    commanderName: input.commanderName,
    zone: input.zone,
    zoneLabel: zoneLabel(input.zone),
    statusText: placementActive
      ? legalDeployCount > 0
        ? `Placing ${input.commanderName}. Click a highlighted Pixi hex.`
        : `Deploy blocked: ${input.deployBlockedReason ?? "No legal Commander deployment hex is available."}`
      : commanderStatusText(input),
    canInspect: input.hasCommander,
    canDeploy:
      input.hasCommander &&
      input.zone === "command" &&
      !input.deployBlockedReason &&
      !placementActive,
    canCancelPlacement: placementActive,
    canReturn: input.hasCommander && input.zone === "board" && !input.returnBlockedReason,
    deployBlockedReason: input.deployBlockedReason,
    returnBlockedReason: input.returnBlockedReason,
    legalDeployCount
  };
};
