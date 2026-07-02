import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  advanceRunAfterCombat,
  applyPackReward,
  buildCombatantSetupForEncounter,
  createCardInstance,
  createRun,
  getCurrentEncounter,
  getCurrentRewardChoices,
  prepareEncounterForRound,
  recordCombatResult,
  validatePlanningState,
  type RunState
} from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardState,
  type CardDefId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";
import { resolveCombat } from "@packbound/sim";

const playerId = asPlayerId("debug-player");
const runSeed = "client-debug-run";

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;

const makeInstance = (
  ownerId: ReturnType<typeof asPlayerId>,
  defId: string,
  zone: "sourceRow" | "spellrail"
) =>
  createCardInstance({
    ownerId,
    defId: asCardDefId(defId),
    zone,
    instanceId: asCardInstanceId(`${ownerId}:${defId}:${zone}`)
  });

const debugSourceRow = (
  ownerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SourceRowState => ({
  maxSlots: 4,
  cards: defIds.map((defId, index) =>
    createCardInstance({
      ownerId,
      defId: asCardDefId(defId),
      zone: "sourceRow",
      instanceId: asCardInstanceId(`${ownerId}:${defId}:source:${index}`)
    })
  )
});

const debugSpellrail = (
  ownerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SpellrailState => ({
  maxSlots: 2,
  cards: defIds.map((defId) => makeInstance(ownerId, defId, "spellrail"))
});

const playerBoard: BoardState = {
  placements: [
    {
      cardInstanceId: asCardInstanceId("debug-player:ember_scraprunner:board"),
      defId: asCardDefId("ember_scraprunner"),
      ownerId: playerId,
      position: { row: 0, col: 2, layer: "ground" }
    },
    {
      cardInstanceId: asCardInstanceId("debug-player:signal_nest:board"),
      defId: asCardDefId("signal_nest"),
      ownerId: playerId,
      position: { row: 1, col: 2, layer: "support" }
    }
  ]
};

const createDebugRun = (): RunState =>
  prepareEncounterForRound(
    createRun({
      seed: runSeed,
      playerId,
      maxRounds: 3
    }),
    sampleCatalog
  );

export function App() {
  const [run, setRun] = useState(createDebugRun);
  const rewardChoices = useMemo(() => getCurrentRewardChoices(run, sampleCatalog), [run]);
  const currentEncounter = useMemo(() => getCurrentEncounter(run, sampleCatalog), [run]);
  const opponentSetup = useMemo(
    () =>
      currentEncounter ? buildCombatantSetupForEncounter(currentEncounter) : undefined,
    [currentEncounter]
  );

  const sourceRow = useMemo(
    () => debugSourceRow(playerId, "ember_source", "ember_source"),
    []
  );
  const spellrail = useMemo(() => debugSpellrail(playerId, "sparkfall"), []);

  const validation = useMemo(
    () =>
      validatePlanningState({
        catalog: sampleCatalog,
        board: playerBoard,
        sourceRow,
        spellrail
      }),
    [sourceRow, spellrail]
  );

  const combat = useMemo(() => {
    if (!opponentSetup) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-combat:${run.seed}:${run.currentRound}:${currentEncounter?.id}`,
      playerA: {
        playerId,
        board: playerBoard,
        sourceRow,
        spellrail
      },
      playerB: opponentSetup
    });
  }, [
    currentEncounter?.id,
    opponentSetup,
    run.currentRound,
    run.seed,
    sourceRow,
    spellrail
  ]);
  const latestCombatSummary = run.combatHistory.at(-1);
  const latestOpenedPack = run.openedPacks.at(-1);

  const openReward = (choiceId: string) => {
    setRun((currentRun) => applyPackReward(currentRun, sampleCatalog, choiceId));
  };

  const recordCombat = () => {
    if (!combat || !currentEncounter) {
      return;
    }

    setRun((currentRun) =>
      advanceRunAfterCombat(
        recordCombatResult(currentRun, combat, { encounterId: currentEncounter.id }),
        sampleCatalog
      )
    );
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Packbound</h1>
          <p>Deterministic engine debug</p>
        </div>
        <div className="button-row">
          <button
            type="button"
            onClick={() => {
              const choice = rewardChoices[0];
              if (choice) {
                openReward(choice.id);
              }
            }}
            disabled={rewardChoices.length === 0}
          >
            Open Reward
          </button>
          <button
            type="button"
            onClick={recordCombat}
            disabled={run.status !== "active" || !combat}
          >
            Record Combat
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setRun(createDebugRun())}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="debug-grid">
        <div className="panel">
          <h2>Run State</h2>
          <dl className="run-stats">
            <div>
              <dt>Seed</dt>
              <dd>{run.seed}</dd>
            </div>
            <div>
              <dt>Round</dt>
              <dd>
                {run.currentRound} / {run.maxRounds}
              </dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{run.playerHealth}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{run.status}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h2>Current Encounter</h2>
          <dl className="run-stats">
            <div>
              <dt>Name</dt>
              <dd>{currentEncounter?.name ?? "None"}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{currentEncounter?.kind ?? "none"}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{currentEncounter?.difficulty ?? "-"}</dd>
            </div>
            <div>
              <dt>Opponent Board</dt>
              <dd>
                {currentEncounter
                  ? currentEncounter.loadout.board.placements
                      .map((placement) => cardName(placement.defId))
                      .join(", ")
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h2>Reward Choices</h2>
          <ol className="card-list">
            {rewardChoices.map((choice) => (
              <li key={choice.id}>
                <span>{choice.label}</span>
                <button type="button" onClick={() => openReward(choice.id)}>
                  Pick
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Planning Check</h2>
          <div className={validation.ok ? "status ok" : "status error"}>
            {validation.ok ? "Legal" : "Illegal"}
          </div>
          <ul className="message-list">
            {validation.errors.map((error) => (
              <li key={`${error.code}:${error.cardInstanceId ?? "state"}`}>
                {error.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Opened Cards</h2>
          <p className="muted">
            {latestOpenedPack ? latestOpenedPack.seed : "No pack opened"}
          </p>
          <ol className="card-list">
            {run.pool.map((card) => (
              <li key={card.instanceId}>
                <span>{cardName(card.defId)}</span>
                <small>{card.zone}</small>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel wide">
          <h2>Latest Combat</h2>
          <p className="muted">
            Winner: {latestCombatSummary?.winner ?? combat?.winner ?? "none"} | Events:{" "}
            {latestCombatSummary?.eventCount ?? combat?.events.length ?? 0}
          </p>
          <pre>
            {JSON.stringify(
              {
                runSummary: latestCombatSummary ?? null,
                previewEvents: combat?.events.slice(0, 28) ?? []
              },
              null,
              2
            )}
          </pre>
        </div>
      </section>
    </main>
  );
}
