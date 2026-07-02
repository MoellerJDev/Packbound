import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  canApplyReward,
  canEditLoadout,
  canRecordCombat,
  createRunFromStarterKit,
  getCurrentEncounter,
  getCurrentRewardChoices,
  getLegalLoadoutActions,
  getRunPhase,
  validateRunLoadout,
  type CombatResultLike,
  type LoadoutAction,
  type RunState
} from "@packbound/rules";
import { asPlayerId, type CardDefId, type CardInstanceId } from "@packbound/shared";
import {
  buildCombatDisplaySummary,
  resolveCombat,
  type CombatDisplaySummary,
  type CombatResult
} from "@packbound/sim";

const playerId = asPlayerId("debug-player");
const runSeed = "client-debug-run";

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;

const combatResultForAction = (result: CombatResultLike): CombatResultLike => ({
  winner: result.winner,
  damageToPlayerA: result.damageToPlayerA,
  damageToPlayerB: result.damageToPlayerB,
  events: result.events,
  warnings: result.warnings,
  ...(result.seed ? { seed: result.seed } : {}),
  ...(result.rulesVersion ? { rulesVersion: result.rulesVersion } : {})
});

const createDebugRun = (starterKitId: string): RunState =>
  applyRunAction(
    createRunFromStarterKit({
      seed: `${runSeed}:${starterKitId}`,
      catalog: sampleCatalog,
      starterKitId,
      playerId,
      maxRounds: 3
    }),
    sampleCatalog,
    { type: "prepareEncounter" }
  );

const firstStarterKitId = sampleCatalog.starterKits[0]?.id ?? "ember_scrappers";

type RecordedCombatDebug = {
  readonly round: number;
  readonly encounterId: string;
  readonly result: CombatResult;
};

const timeLabel = (timeMs?: number): string =>
  timeMs === undefined ? "--" : `${(timeMs / 1000).toFixed(1)}s`;

const CombatSummaryView = ({ summary }: { readonly summary: CombatDisplaySummary }) => (
  <div className="combat-summary">
    <div className="combat-summary-title">{summary.title}</div>
    <dl className="combat-summary-stats">
      <div>
        <dt>Damage to you</dt>
        <dd>{summary.damageToPlayerA}</dd>
      </div>
      <div>
        <dt>Damage to enemy</dt>
        <dd>{summary.damageToPlayerB}</dd>
      </div>
      <div>
        <dt>Events</dt>
        <dd>{summary.eventCount}</dd>
      </div>
      <div>
        <dt>Warnings</dt>
        <dd>
          {summary.warningCodes.length > 0 ? summary.warningCodes.join(", ") : "None"}
        </dd>
      </div>
    </dl>
    <ol className="combat-lines">
      {summary.lines.map((line, index) => (
        <li
          key={`${line.timeMs ?? "na"}:${line.kind}:${index}`}
          className={`combat-line ${line.severity ?? "info"}`}
        >
          <span className="combat-time">{timeLabel(line.timeMs)}</span>
          <span className="combat-kind">{line.kind}</span>
          <span>{line.text}</span>
        </li>
      ))}
    </ol>
  </div>
);

const RawDebugDetails = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: unknown;
}) => (
  <details className="raw-debug">
    <summary>{label}</summary>
    <pre>{JSON.stringify(value, null, 2)}</pre>
  </details>
);

export function App() {
  const [selectedStarterKitId, setSelectedStarterKitId] = useState(firstStarterKitId);
  const [run, setRun] = useState(() => createDebugRun(firstStarterKitId));
  const [lastRecordedCombat, setLastRecordedCombat] = useState<
    RecordedCombatDebug | undefined
  >();
  const phase = getRunPhase(run);
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
  const recordReady = canRecordCombat(run, sampleCatalog);
  const editable = canEditLoadout(run);

  const combat = useMemo(() => {
    if (!opponentSetup || !recordReady) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-combat:${run.seed}:${run.currentRound}:${currentEncounter?.id}`,
      playerA: playerSetup,
      playerB: opponentSetup
    });
  }, [
    currentEncounter?.id,
    opponentSetup,
    playerSetup,
    recordReady,
    run.currentRound,
    run.seed
  ]);
  const latestCombatSummary = run.combatHistory.at(-1);
  const latestOpenedPack = run.openedPacks.at(-1);
  const upcomingCombatDisplaySummary = useMemo(
    () =>
      combat
        ? buildCombatDisplaySummary({
            catalog: sampleCatalog,
            combatResult: combat,
            perspectiveSide: "playerA"
          })
        : undefined,
    [combat]
  );
  const lastRecordedCombatDisplaySummary = useMemo(
    () =>
      lastRecordedCombat
        ? buildCombatDisplaySummary({
            catalog: sampleCatalog,
            combatResult: lastRecordedCombat.result,
            perspectiveSide: "playerA"
          })
        : undefined,
    [lastRecordedCombat]
  );

  const resetRun = (starterKitId = selectedStarterKitId) => {
    setSelectedStarterKitId(starterKitId);
    setRun(createDebugRun(starterKitId));
    setLastRecordedCombat(undefined);
  };

  const performLoadoutAction = (
    cardInstanceId: CardInstanceId,
    action: LoadoutAction
  ) => {
    setRun((currentRun) => {
      switch (action.type) {
        case "placeOnBoard":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "placeCardOnBoard",
            cardInstanceId,
            position: action.position
          });
        case "addToSourceRow":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "addCardToSourceRow",
            cardInstanceId
          });
        case "addToSpellrail":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "addCardToSpellrail",
            cardInstanceId
          });
        case "returnToPool":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "returnCardToPool",
            cardInstanceId
          });
      }
    });
  };

  const renderLoadoutActions = (cardInstanceId: CardInstanceId) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, cardInstanceId);
    if (actions.length === 0) {
      return editable ? <small>No legal action</small> : null;
    }

    return (
      <div className="mini-actions">
        {actions.map((action) => (
          <button
            key={`${cardInstanceId}:${action.type}`}
            type="button"
            onClick={() => performLoadoutAction(cardInstanceId, action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  const markReady = () => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "markCombatReady" })
    );
  };

  const recordCombat = () => {
    if (!combat || !currentEncounter) {
      return;
    }

    setLastRecordedCombat({
      round: run.currentRound,
      encounterId: currentEncounter.id,
      result: combat
    });
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "recordCombatResult",
        combatResult: combatResultForAction(combat),
        encounterId: currentEncounter.id
      })
    );
  };

  const openReward = (choiceId: string) => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "applyPackReward",
        choiceId
      })
    );
  };

  const advanceRound = () => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "advanceRunAfterCombat" })
    );
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Packbound</h1>
          <p>Ugly playable deterministic run loop</p>
        </div>
        <div className="button-row">
          <label className="starter-picker">
            Starter
            <select
              value={selectedStarterKitId}
              onChange={(event) => resetRun(event.target.value)}
            >
              {sampleCatalog.starterKits.map((starterKit) => (
                <option key={starterKit.id} value={starterKit.id}>
                  {starterKit.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={markReady}
            disabled={!currentEncounter || !validation.ok || phase !== "planning"}
          >
            Ready Combat
          </button>
          <button type="button" onClick={recordCombat} disabled={!combat}>
            Record Combat
          </button>
          <button
            type="button"
            onClick={advanceRound}
            disabled={run.status !== "active" || phase !== "combatResolved"}
          >
            Advance
          </button>
          <button type="button" className="secondary" onClick={() => resetRun()}>
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
              <dt>Phase</dt>
              <dd>{phase}</dd>
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
          <h2>Reward Choices</h2>
          <p className="muted">
            {canApplyReward(run)
              ? "Pick one pack to add to the pool."
              : "Rewards appear after combat is recorded."}
          </p>
          <ol className="card-list">
            {rewardChoices.map((choice) => (
              <li key={choice.id}>
                <span>{choice.label}</span>
                <button type="button" onClick={() => openReward(choice.id)}>
                  Open
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Board</h2>
          <ol className="card-list">
            {run.board.placements.map((placement) => (
              <li key={placement.cardInstanceId}>
                <span>{cardName(placement.defId)}</span>
                <small>
                  r{placement.position.row} c{placement.position.col}{" "}
                  {placement.position.layer}
                </small>
                {renderLoadoutActions(placement.cardInstanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Source Row</h2>
          <ol className="card-list">
            {run.sourceRow.cards.map((card) => (
              <li key={card.instanceId}>
                <span>{cardName(card.defId)}</span>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Spellrail</h2>
          <ol className="card-list">
            {run.spellrail.cards.map((card) => (
              <li key={card.instanceId}>
                <span>{cardName(card.defId)}</span>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Pool Cards</h2>
          <p className="muted">
            {latestOpenedPack ? latestOpenedPack.seed : "Open rewards to grow the pool."}
          </p>
          <ol className="card-list">
            {run.pool.map((card) => (
              <li key={card.instanceId}>
                <span>{cardName(card.defId)}</span>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel wide">
          <h2>Last Recorded Combat</h2>
          {latestCombatSummary ? (
            <>
              <p className="muted">
                Round {latestCombatSummary.round} | Winner: {latestCombatSummary.winner} |
                Damage: {latestCombatSummary.damageToPlayer}/
                {latestCombatSummary.damageToOpponent} | Events:{" "}
                {latestCombatSummary.eventCount}
              </p>
              {lastRecordedCombatDisplaySummary ? (
                <>
                  <CombatSummaryView summary={lastRecordedCombatDisplaySummary} />
                  <RawDebugDetails
                    label="Raw debug events"
                    value={{
                      round: lastRecordedCombat?.round,
                      encounterId: lastRecordedCombat?.encounterId,
                      runSummary: latestCombatSummary,
                      events: lastRecordedCombat?.result.events ?? [],
                      warnings: lastRecordedCombat?.result.warnings ?? []
                    }}
                  />
                </>
              ) : (
                <p className="muted combat-empty">
                  Compact run summary is available; full event details are not stored in
                  run state.
                </p>
              )}
            </>
          ) : (
            <p className="muted">No combat has been recorded for this run.</p>
          )}
        </div>

        {combat && upcomingCombatDisplaySummary ? (
          <div className="panel wide">
            <h2>Upcoming Combat Preview</h2>
            <p className="muted">
              Preview only, not yet recorded. Winner: {combat.winner} | Events:{" "}
              {combat.events.length}
            </p>
            <CombatSummaryView summary={upcomingCombatDisplaySummary} />
            <RawDebugDetails
              label="Raw debug events"
              value={{
                phase,
                currentEncounterId: currentEncounter?.id ?? null,
                events: combat.events,
                warnings: combat.warnings
              }}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
