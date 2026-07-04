import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asCardDefId, asCardInstanceId } from "@packbound/shared";

import {
  buildEncounterBoardCardTarget,
  listEncounterBoardCardTargets,
  submitTargetProbeActionFromEncounterBoard,
  validateEncounterBoardCardTarget,
  type EncounterBoardCardTargetValidationCode,
  type EncounterBoardCardTargetValidationResult
} from "../encounterActionTargets";
import { createEncounterMatch, passEncounterPriority } from "../encounterMatch";

const earlyEmberEncounter = () => {
  const encounter = sampleCatalog.encountersById.get("early_ember_pressure");
  if (!encounter) {
    throw new Error("Expected early_ember_pressure sample encounter.");
  }
  return encounter;
};

const firstEnemyPlacement = () => {
  const placement = earlyEmberEncounter().loadout.board.placements[0];
  if (!placement) {
    throw new Error("Expected an enemy board placement.");
  }
  return placement;
};

const expectFailureCode = (
  result: EncounterBoardCardTargetValidationResult,
  code: EncounterBoardCardTargetValidationCode
): void => {
  if (result.ok) {
    throw new Error(`Expected validation failure, received ${result.target.label}.`);
  }
  expect(result.code).toBe(code);
  expect(result.message).toContain(String(result.cardInstanceId));
};

describe("encounter action board-card targets", () => {
  it("builds a serializable enemy encounter board target snapshot", () => {
    const placement = firstEnemyPlacement();
    const result = buildEncounterBoardCardTarget({
      catalog: sampleCatalog,
      placement,
      side: "playerB"
    });

    if (!result.ok) {
      throw new Error(`Expected a target, received ${result.code}.`);
    }

    expect(result.target).toEqual({
      type: "boardCard",
      side: "playerB",
      cardInstanceId: placement.cardInstanceId,
      defId: asCardDefId("ember_scraprunner"),
      ownerId: placement.ownerId,
      position: { row: 0, col: 3, layer: "ground" },
      label: "Ember Scraprunner (enemy ground r0 c3)"
    });
    expect(JSON.parse(JSON.stringify(result.target))).toEqual(result.target);
  });

  it("lists valid enemy encounter board card targets", () => {
    const encounter = earlyEmberEncounter();
    const targets = listEncounterBoardCardTargets({
      catalog: sampleCatalog,
      board: encounter.loadout.board,
      side: "playerB",
      requiredSide: "playerB"
    });

    expect(targets).toEqual([
      {
        type: "boardCard",
        side: "playerB",
        cardInstanceId: firstEnemyPlacement().cardInstanceId,
        defId: asCardDefId("ember_scraprunner"),
        ownerId: firstEnemyPlacement().ownerId,
        position: { row: 0, col: 3, layer: "ground" },
        label: "Ember Scraprunner (enemy ground r0 c3)"
      }
    ]);
  });

  it("fails clearly for missing, wrong-side, and unknown-definition targets", () => {
    const encounter = earlyEmberEncounter();
    const placement = firstEnemyPlacement();

    expectFailureCode(
      validateEncounterBoardCardTarget({
        catalog: sampleCatalog,
        board: encounter.loadout.board,
        cardInstanceId: asCardInstanceId("missing-target"),
        side: "playerB",
        requiredSide: "playerB"
      }),
      "missing_board_placement"
    );

    expectFailureCode(
      validateEncounterBoardCardTarget({
        catalog: sampleCatalog,
        board: encounter.loadout.board,
        cardInstanceId: placement.cardInstanceId,
        side: "playerA",
        requiredSide: "playerB"
      }),
      "wrong_side"
    );

    expectFailureCode(
      validateEncounterBoardCardTarget({
        catalog: sampleCatalog,
        board: {
          placements: [{ ...placement, defId: asCardDefId("missing_def") }]
        },
        cardInstanceId: placement.cardInstanceId,
        side: "playerB",
        requiredSide: "playerB"
      }),
      "unknown_card_definition"
    );
  });

  it("submits Target Probe from encounter board context", () => {
    const encounter = earlyEmberEncounter();
    const placement = firstEnemyPlacement();
    const submitted = submitTargetProbeActionFromEncounterBoard({
      match: createEncounterMatch({
        matchId: "target-probe-helper",
        seed: "target-probe-helper",
        playerCombatCharge: 1
      }),
      catalog: sampleCatalog,
      board: encounter.loadout.board,
      cardInstanceId: placement.cardInstanceId,
      actor: "player"
    });

    expect(submitted.stack[0]?.action).toMatchObject({
      kind: "target_probe",
      actor: "player",
      label: "Target Probe",
      target: {
        type: "boardCard",
        side: "playerB",
        cardInstanceId: placement.cardInstanceId,
        label: "Ember Scraprunner (enemy ground r0 c3)"
      }
    });
    expect(submitted.playerCombatCharge).toBe(0);

    const resolved = passEncounterPriority(
      passEncounterPriority(submitted, "enemy"),
      "player"
    );

    expect(resolved.playerStability).toBe(5);
    expect(resolved.enemyStability).toBe(5);
    expect(resolved.actionLog.at(-1)?.text).toBe(
      "Resolved Target Probe from Player targeting Ember Scraprunner (enemy ground r0 c3): No effect."
    );
  });
});
