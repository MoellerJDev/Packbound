import { describe, expect, it } from "vitest";

import { buildDefaultPixiCommanderEditView } from "./defaultPixiCommanderEditView";

describe("default Pixi commander edit view", () => {
  it("shows command-zone deploy guidance when the Commander can deploy", () => {
    const view = buildDefaultPixiCommanderEditView({
      commanderName: "Sparkcatch Apprentice",
      deployBlockedReason: undefined,
      hasCommander: true,
      returnBlockedReason: "Commander is not deployed.",
      zone: "command"
    });

    expect(view).toMatchObject({
      modeLabel: "Commander",
      commanderName: "Sparkcatch Apprentice",
      zoneLabel: "Command Zone",
      statusText: "Commander is ready to deploy.",
      canInspect: true,
      canDeploy: true,
      canReturn: false
    });
  });

  it("shows board return guidance when the Commander is deployed", () => {
    const view = buildDefaultPixiCommanderEditView({
      commanderName: "Sparkcatch Apprentice",
      deployBlockedReason: "Commander is already deployed.",
      hasCommander: true,
      returnBlockedReason: undefined,
      zone: "board"
    });

    expect(view).toMatchObject({
      commanderName: "Sparkcatch Apprentice",
      zoneLabel: "Board",
      statusText: "Commander is deployed and can return to Command.",
      canInspect: true,
      canDeploy: false,
      canReturn: true
    });
  });

  it("shows the blocked deploy reason in Command Zone", () => {
    const view = buildDefaultPixiCommanderEditView({
      commanderName: "Sparkcatch Apprentice",
      deployBlockedReason:
        "Commander Rebind Tax requires 4 total Board Charge, but the Source Row provides 3.",
      hasCommander: true,
      returnBlockedReason: "Commander is not deployed.",
      zone: "command"
    });

    expect(view).toMatchObject({
      zoneLabel: "Command Zone",
      statusText:
        "Deploy blocked: Commander Rebind Tax requires 4 total Board Charge, but the Source Row provides 3.",
      canInspect: true,
      canDeploy: false,
      canReturn: false
    });
  });

  it("shows empty Commander copy when no Commander exists", () => {
    const view = buildDefaultPixiCommanderEditView({
      commanderName: "None",
      deployBlockedReason: "Run has no Commander.",
      hasCommander: false,
      returnBlockedReason: "Run has no Commander.",
      zone: "none"
    });

    expect(view).toMatchObject({
      commanderName: "None",
      zoneLabel: "None",
      statusText: "No Commander is available.",
      canInspect: false,
      canDeploy: false,
      canReturn: false
    });
  });
});
