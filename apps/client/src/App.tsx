import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  advanceRunAfterCombat,
  applyPackReward,
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  createRunFromStarterKit,
  getCurrentEncounter,
  getCurrentRewardChoices,
  prepareEncounterForRound,
  recordCombatResult,
  validateRunLoadout,
  type RunState
} from "@packbound/rules";
import { asPlayerId, type CardDefId } from "@packbound/shared";
import { resolveCombat } from "@packbound/sim";

const playerId = asPlayerId("debug-player");
const runSeed = "client-debug-run";

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;

const createDebugRun = (): RunState =>
  prepareEncounterForRound(
    createRunFromStarterKit({
      seed: runSeed,
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
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
  const playerSetup = useMemo(() => buildCombatantSetupForRun(run), [run]);
  const starterKitName =
    sampleCatalog.starterKitsById.get(run.starterKitId ?? "")?.name ?? "None";

  const validation = useMemo(() => validateRunLoadout(run, sampleCatalog), [run]);

  const combat = useMemo(() => {
    if (!opponentSetup) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-combat:${run.seed}:${run.currentRound}:${currentEncounter?.id}`,
      playerA: playerSetup,
      playerB: opponentSetup
    });
  }, [currentEncounter?.id, opponentSetup, playerSetup, run.currentRound, run.seed]);
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
            <div>
              <dt>Starter</dt>
              <dd>{starterKitName}</dd>
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
          <h2>Player Loadout</h2>
          <dl className="run-stats">
            <div>
              <dt>Board</dt>
              <dd>
                {run.board.placements.length > 0
                  ? run.board.placements
                      .map((placement) => cardName(placement.defId))
                      .join(", ")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>Source Row</dt>
              <dd>
                {run.sourceRow.cards.length > 0
                  ? run.sourceRow.cards.map((card) => cardName(card.defId)).join(", ")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>Spellrail</dt>
              <dd>
                {run.spellrail.cards.length > 0
                  ? run.spellrail.cards.map((card) => cardName(card.defId)).join(", ")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>Ashes</dt>
              <dd>
                {run.ashes.length > 0
                  ? run.ashes.map((card) => cardName(card.defId)).join(", ")
                  : "-"}
              </dd>
            </div>
          </dl>
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
          <h2>Pool Cards</h2>
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
