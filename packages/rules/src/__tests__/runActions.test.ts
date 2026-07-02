import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent
} from "@packbound/shared";

import {
  applyRunAction,
  applyRunActions,
  createCardInstance,
  createRunFromStarterKit,
  getCurrentRewardChoices,
  getLegalLoadoutActions,
  replayRunActions,
  toRunActionLog,
  validateRunLoadout,
  type CombatResultLike,
  type LoadoutAction,
  type RunAction,
  type RunState
} from "../index";

const combatStarted: CombatEvent = { type: "CombatStarted", timeMs: 0 };

const combatResult = (seed: string): CombatResultLike => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 3,
  events: [combatStarted, { type: "CombatEnded", timeMs: 100, winner: "playerA" }],
  warnings: [],
  seed,
  rulesVersion: "run-action-test"
});

const starterKitIds = ["ember_scrappers", "rotbloom_recall", "cloudspire_phase"] as const;

const createReplayRun = (starterKitId: (typeof starterKitIds)[number]): RunState =>
  createRunFromStarterKit({
    seed: `run-action-replay-seed:${starterKitId}`,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId("test-player"),
    maxRounds: 2
  });

const requireEncounterId = (run: RunState): string => {
  if (!run.currentEncounterId) {
    throw new Error("Expected a prepared encounter");
  }
  return run.currentEncounterId;
};

const firstRewardChoiceId = (run: RunState): string => {
  const choice = getCurrentRewardChoices(run, sampleCatalog)[0];
  if (!choice) {
    throw new Error("Expected a reward choice");
  }
  return choice.id;
};

const toRunAction = (
  cardInstanceId: CardInstanceId,
  action: LoadoutAction
): RunAction => {
  switch (action.type) {
    case "placeOnBoard":
      return {
        type: "placeCardOnBoard",
        cardInstanceId,
        position: action.position
      };
    case "addToSourceRow":
      return { type: "addCardToSourceRow", cardInstanceId };
    case "addToSpellrail":
      return { type: "addCardToSpellrail", cardInstanceId };
    case "returnToPool":
      return { type: "returnCardToPool", cardInstanceId };
  }
};

const firstLegalPoolAction = (run: RunState): RunAction | undefined => {
  for (const card of run.pool) {
    const action = getLegalLoadoutActions(run, sampleCatalog, card.instanceId)[0];
    if (action) {
      return toRunAction(card.instanceId, action);
    }
  }
  return undefined;
};

const duplicatePoolCard = (run: RunState, defId: string, suffix: string): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId: asCardDefId(defId),
    zone: "pool",
    instanceId: asCardInstanceId(`${run.runId}:run-action-upgrade:${suffix}`)
  });

const withUpgradeCopies = (run: RunState): RunState => ({
  ...run,
  pool: [
    ...run.pool,
    duplicatePoolCard(run, "cinder_scout", "c"),
    duplicatePoolCard(run, "cinder_scout", "a"),
    duplicatePoolCard(run, "cinder_scout", "b")
  ]
});

describe("run action reducer", () => {
  it.each(starterKitIds)(
    "applies and replays a full tiny run loop deterministically for %s",
    (starterKitId) => {
      const initialRun = createReplayRun(starterKitId);
      const actions: RunAction[] = [];
      let run = initialRun;
      const dispatch = (action: RunAction): void => {
        actions.push(action);
        run = applyRunAction(run, sampleCatalog, action);
      };

      dispatch({ type: "prepareEncounter" });
      expect(validateRunLoadout(run, sampleCatalog).ok).toBe(true);
      dispatch({ type: "markCombatReady" });
      dispatch({
        type: "recordCombatResult",
        encounterId: requireEncounterId(run),
        combatResult: combatResult("round-1")
      });
      dispatch({ type: "applyPackReward", choiceId: firstRewardChoiceId(run) });
      dispatch({ type: "advanceRunAfterCombat" });

      const loadoutAction = firstLegalPoolAction(run);
      if (loadoutAction) {
        dispatch(loadoutAction);
      }

      dispatch({ type: "markCombatReady" });
      dispatch({
        type: "recordCombatResult",
        encounterId: requireEncounterId(run),
        combatResult: combatResult("round-2")
      });
      dispatch({ type: "applyPackReward", choiceId: firstRewardChoiceId(run) });
      dispatch({ type: "advanceRunAfterCombat" });

      expect(run.status).toBe("won");
      expect(run.phase).toBe("complete");
      expect(replayRunActions(initialRun, sampleCatalog, actions)).toEqual(run);
      expect(applyRunActions(initialRun, sampleCatalog, actions)).toEqual(run);
      expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
        toRunActionLog(actions)
      );
      expect(JSON.parse(JSON.stringify(run))).toEqual(run);
    }
  );

  it("keeps action history external to RunState", () => {
    const initialRun = createReplayRun("ember_scrappers");
    const actions: RunAction[] = [{ type: "prepareEncounter" }];
    const replayed = replayRunActions(initialRun, sampleCatalog, actions);

    expect("actionHistory" in replayed).toBe(false);
    expect(toRunActionLog(actions)).toEqual([
      {
        id: "run-action:0:prepareEncounter",
        index: 0,
        action: { type: "prepareEncounter" }
      }
    ]);
  });

  it("applies and replays an upgrade action deterministically", () => {
    const initialRun = withUpgradeCopies(createReplayRun("ember_scrappers"));
    const actions: readonly RunAction[] = [
      {
        type: "upgradeCardGroup",
        defId: asCardDefId("cinder_scout"),
        upgradeLevel: 0
      }
    ];
    const run = applyRunActions(initialRun, sampleCatalog, actions);
    const cinderCards = run.pool.filter(
      (card) => card.defId === asCardDefId("cinder_scout")
    );

    expect(cinderCards).toHaveLength(1);
    expect(cinderCards[0]).toMatchObject({
      instanceId: asCardInstanceId(`${initialRun.runId}:run-action-upgrade:a`),
      upgradeLevel: 1,
      zone: "pool"
    });
    expect(replayRunActions(initialRun, sampleCatalog, actions)).toEqual(run);
    expect(JSON.parse(JSON.stringify(toRunActionLog(actions)))).toEqual(
      toRunActionLog(actions)
    );
  });

  it("rejects wrong-phase actions predictably through the reducer", () => {
    const initialRun = createReplayRun("ember_scrappers");

    expect(() =>
      applyRunAction(initialRun, sampleCatalog, { type: "markCombatReady" })
    ).toThrow(/prepared encounter/);
    expect(() =>
      applyRunAction(initialRun, sampleCatalog, {
        type: "recordCombatResult",
        encounterId: "missing",
        combatResult: combatResult("wrong-phase")
      })
    ).toThrow(/phase is planning/);
    expect(() =>
      applyRunAction(initialRun, sampleCatalog, {
        type: "applyPackReward",
        choiceId: "missing"
      })
    ).toThrow(/Cannot apply a reward/);
    expect(() =>
      applyRunAction(initialRun, sampleCatalog, {
        type: "upgradeCardGroup",
        defId: asCardDefId("signal_nest"),
        upgradeLevel: 0
      })
    ).toThrow(/Only Unit and Echo/);

    const readyRun = applyRunActions(initialRun, sampleCatalog, [
      { type: "prepareEncounter" },
      { type: "markCombatReady" }
    ]);
    const activeCardId = readyRun.board.placements[0]?.cardInstanceId;
    if (!activeCardId) {
      throw new Error("Expected an active card");
    }

    expect(() =>
      applyRunAction(readyRun, sampleCatalog, {
        type: "returnCardToPool",
        cardInstanceId: activeCardId
      })
    ).toThrow(/phase is combatReady/);
    expect(() =>
      applyRunAction(withUpgradeCopies(readyRun), sampleCatalog, {
        type: "upgradeCardGroup",
        defId: asCardDefId("cinder_scout"),
        upgradeLevel: 0
      })
    ).toThrow(/only be made during planning/);
  });
});
