import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asPlayerId, type BoardPosition } from "@packbound/shared";

import {
  applyRunAction,
  applyRunActions,
  canDeployCommander,
  canReturnCommanderToCommand,
  createRunFromStarterKit,
  deployCommander,
  getDefaultCommanderPosition,
  replayRunActions,
  returnCommanderToCommand,
  toRunActionLog,
  type RunAction,
  type RunState
} from "../index";

const createCommanderRun = (seed = "commander-seed"): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId: "ember_scrappers",
    playerId: asPlayerId("test-player")
  });

const requireCommanderPosition = (run: RunState): BoardPosition => {
  const position = getDefaultCommanderPosition(run, sampleCatalog);
  if (!position) {
    throw new Error("Expected a legal Commander deployment position");
  }
  return position;
};

describe("command zone commander prototype", () => {
  it("adds a JSON-serializable Commander to starter-created runs", () => {
    const run = createCommanderRun("starter-commander-seed");

    expect(run.commander).toMatchObject({
      deployCount: 0,
      rebindTax: 0,
      card: {
        defId: "sparkcatch_apprentice",
        ownerId: run.playerId,
        zone: "command",
        upgradeLevel: 0
      }
    });
    expect(run.commander?.card.instanceId).toContain(
      `${run.runId}:starter:ember_scrappers:command:0:`
    );
    expect(JSON.parse(JSON.stringify(run.commander))).toEqual(run.commander);
  });

  it("deploys the Commander from Command Zone during planning", () => {
    const run = createCommanderRun("deploy-commander-seed");
    const position = requireCommanderPosition(run);
    const deployed = deployCommander(run, sampleCatalog, position);

    expect(run.commander?.card.zone).toBe("command");
    expect(
      run.board.placements.map((placement) => placement.cardInstanceId)
    ).not.toContain(run.commander?.card.instanceId);
    expect(deployed.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 0,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "board"
      }
    });
    expect(deployed.board.placements).toContainEqual({
      cardInstanceId: run.commander?.card.instanceId,
      defId: run.commander?.card.defId,
      ownerId: run.playerId,
      position
    });
    expect(
      deployed.activeCards.find(
        (card) => card.instanceId === run.commander?.card.instanceId
      )
    ).toMatchObject({
      defId: run.commander?.card.defId,
      zone: "board"
    });
  });

  it("guards Commander deployment by phase and zone", () => {
    const run = createCommanderRun("deploy-guards-seed");
    const position = requireCommanderPosition(run);
    const deployed = deployCommander(run, sampleCatalog, position);
    const ready = applyRunActions(run, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(canDeployCommander(run, sampleCatalog, position)).toEqual({ ok: true });
    expect(canDeployCommander(ready, sampleCatalog, position)).toEqual({
      ok: false,
      reason: "Commander can only be deployed during planning."
    });
    expect(canDeployCommander(deployed, sampleCatalog, position)).toEqual({
      ok: false,
      reason: "Commander is already deployed."
    });
    expect(() => deployCommander(ready, sampleCatalog, position)).toThrow(/planning/);
    expect(() => deployCommander(deployed, sampleCatalog, position)).toThrow(
      /already deployed/
    );
  });

  it("returns a deployed Commander to Command Zone during planning and increments tax", () => {
    const run = createCommanderRun("return-commander-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const returned = returnCommanderToCommand(deployed);

    expect(returned.commander).toMatchObject({
      deployCount: 1,
      rebindTax: 1,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "command"
      }
    });
    expect(
      returned.board.placements.map((placement) => placement.cardInstanceId)
    ).not.toContain(run.commander?.card.instanceId);
    expect(returned.activeCards.map((card) => card.instanceId)).not.toContain(
      run.commander?.card.instanceId
    );
    expect(deployed.commander?.rebindTax).toBe(0);
  });

  it("guards Commander return by phase and zone", () => {
    const run = createCommanderRun("return-guards-seed");
    const deployed = deployCommander(run, sampleCatalog, requireCommanderPosition(run));
    const ready = applyRunActions(deployed, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(canReturnCommanderToCommand(run)).toEqual({
      ok: false,
      reason: "Commander is already in the Command Zone."
    });
    expect(canReturnCommanderToCommand(deployed)).toEqual({ ok: true });
    expect(canReturnCommanderToCommand(ready)).toEqual({
      ok: false,
      reason: "Commander can only return to Command during planning."
    });
    expect(() => returnCommanderToCommand(run)).toThrow(/already in the Command Zone/);
    expect(() => returnCommanderToCommand(ready)).toThrow(/planning/);
  });

  it("redeploys deterministically while preserving visible Rebind Tax", () => {
    const run = createCommanderRun("redeploy-commander-seed");
    const firstDeploy = deployCommander(
      run,
      sampleCatalog,
      requireCommanderPosition(run)
    );
    const returned = returnCommanderToCommand(firstDeploy);
    const redeployed = deployCommander(
      returned,
      sampleCatalog,
      requireCommanderPosition(returned)
    );

    expect(redeployed.commander).toMatchObject({
      deployCount: 2,
      rebindTax: 1,
      card: {
        instanceId: run.commander?.card.instanceId,
        zone: "board"
      }
    });
    expect(JSON.parse(JSON.stringify(redeployed))).toEqual(redeployed);
  });

  it("applies and replays Commander run actions without mutating prior state", () => {
    const initialRun = createCommanderRun("commander-action-seed");
    const firstPosition = requireCommanderPosition(initialRun);
    const actions: readonly RunAction[] = [
      { type: "deployCommander", position: firstPosition },
      { type: "returnCommanderToCommand" },
      { type: "deployCommander", position: firstPosition }
    ];
    const finalRun = applyRunActions(initialRun, sampleCatalog, actions);

    expect(initialRun.commander?.card.zone).toBe("command");
    expect(initialRun.commander?.deployCount).toBe(0);
    expect(initialRun.commander?.rebindTax).toBe(0);
    expect(finalRun.commander).toMatchObject({
      deployCount: 2,
      rebindTax: 1,
      card: { zone: "board" }
    });
    expect(replayRunActions(initialRun, sampleCatalog, actions)).toEqual(finalRun);
    expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
      toRunActionLog(actions)
    );
  });

  it("rejects Commander deployment through the reducer outside planning", () => {
    const run = createCommanderRun("commander-reducer-guards-seed");
    const ready = applyRunActions(run, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);

    expect(() =>
      applyRunAction(ready, sampleCatalog, {
        type: "deployCommander",
        position: requireCommanderPosition(run)
      })
    ).toThrow(/planning/);
  });
});
