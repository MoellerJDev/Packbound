import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  advanceRunAfterCombat,
  applyPackReward,
  createCardInstance,
  createRun,
  getCurrentRewardChoices,
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
const opponentId = asPlayerId("debug-opponent");
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

const opponentBoard: BoardState = {
  placements: [
    {
      cardInstanceId: asCardInstanceId("debug-opponent:sporeback_beast:board"),
      defId: asCardDefId("sporeback_beast"),
      ownerId: opponentId,
      position: { row: 0, col: 3, layer: "ground" }
    }
  ]
};

const createDebugRun = (): RunState =>
  createRun({
    seed: runSeed,
    playerId,
    maxRounds: 3
  });

export function App() {
  const [run, setRun] = useState(createDebugRun);
  const rewardChoices = useMemo(() => getCurrentRewardChoices(run, sampleCatalog), [run]);

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

  const combat = useMemo(
    () =>
      resolveCombat({
        catalog: sampleCatalog,
        seed: "client-debug-combat",
        playerA: {
          playerId,
          board: playerBoard,
          sourceRow,
          spellrail
        },
        playerB: {
          playerId: opponentId,
          board: opponentBoard,
          sourceRow: debugSourceRow(opponentId, "bloom_source"),
          spellrail: debugSpellrail(opponentId)
        }
      }),
    [sourceRow, spellrail]
  );
  const latestCombatSummary = run.combatHistory.at(-1);
  const latestOpenedPack = run.openedPacks.at(-1);

  const openReward = (choiceId: string) => {
    setRun((currentRun) => applyPackReward(currentRun, sampleCatalog, choiceId));
  };

  const recordCombat = () => {
    setRun((currentRun) => advanceRunAfterCombat(recordCombatResult(currentRun, combat)));
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
          <button type="button" onClick={recordCombat} disabled={run.status !== "active"}>
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
            Winner: {latestCombatSummary?.winner ?? combat.winner} | Events:{" "}
            {latestCombatSummary?.eventCount ?? combat.events.length}
          </p>
          <pre>
            {JSON.stringify(
              {
                runSummary: latestCombatSummary ?? null,
                previewEvents: combat.events.slice(0, 28)
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
