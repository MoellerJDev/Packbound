import type {
  EncounterActionSource,
  EncounterActor,
  EncounterMatchState
} from "@packbound/rules";

type PriorityLabPanelProps = {
  readonly match: EncounterMatchState;
  readonly canRunCombat: boolean;
  readonly prototypeActionSource: EncounterActionSource | undefined;
  readonly onSubmitPrototypeAction: () => void;
  readonly onPassPlayer: () => void;
  readonly onPassEnemy: () => void;
  readonly onRunSkirmish: () => void;
  readonly onReset: () => void;
};

const encounterActorLabel = (actor: EncounterActor | null): string => {
  switch (actor) {
    case "player":
      return "Player";
    case "enemy":
      return "Enemy";
    case null:
      return "None";
  }
};

const encounterPhaseLabel = (phase: EncounterMatchState["phase"]): string => {
  switch (phase) {
    case "start":
      return "Start";
    case "firstMain":
      return "First main";
    case "combat":
      return "Combat skirmish";
    case "secondMain":
      return "Second main";
    case "end":
      return "End";
    case "complete":
      return "Complete";
  }
};

const encounterOutcomeLabel = (outcome: EncounterMatchState["outcome"]): string => {
  if (outcome.kind === "inProgress") {
    return "In progress";
  }

  return outcome.reason ? `${outcome.kind} (${outcome.reason})` : outcome.kind;
};

const sourceContextLabel = (source: EncounterActionSource): string =>
  `${source.cardName} (${source.zone})`;

export const PriorityLabPanel = ({
  match,
  canRunCombat,
  prototypeActionSource,
  onSubmitPrototypeAction,
  onPassPlayer,
  onPassEnemy,
  onRunSkirmish,
  onReset
}: PriorityLabPanelProps) => {
  const complete = match.outcome.kind !== "inProgress";
  const playerHasPriority = match.priorityHolder === "player";
  const enemyHasPriority = match.priorityHolder === "enemy";
  const playerMainPhasePriority =
    (match.phase === "firstMain" || match.phase === "secondMain") &&
    playerHasPriority &&
    !complete;
  const priorityPhase = match.phase !== "combat" && !complete;
  const visibleStack = [...match.stack].reverse();
  const visibleLog = match.actionLog.slice(-10);

  return (
    <section className="debug-grid" aria-labelledby="priority-lab-heading">
      <div className="panel wide">
        <h2 id="priority-lab-heading">Priority Lab</h2>
        <dl className="run-stats">
          <div>
            <dt>Encounter / Match</dt>
            <dd>{match.matchId}</dd>
          </div>
          <div>
            <dt>Turn</dt>
            <dd>{match.turnNumber}</dd>
          </div>
          <div>
            <dt>Phase</dt>
            <dd>{encounterPhaseLabel(match.phase)}</dd>
          </div>
          <div>
            <dt>Active actor</dt>
            <dd>{encounterActorLabel(match.activeActor)}</dd>
          </div>
          <div>
            <dt>Priority holder</dt>
            <dd>{encounterActorLabel(match.priorityHolder)}</dd>
          </div>
          <div>
            <dt>Consecutive passes</dt>
            <dd>{match.consecutivePasses}</dd>
          </div>
          <div>
            <dt>Player stability</dt>
            <dd>{match.playerStability}</dd>
          </div>
          <div>
            <dt>Enemy stability</dt>
            <dd>{match.enemyStability}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{encounterOutcomeLabel(match.outcome)}</dd>
          </div>
        </dl>
        <div className="button-row">
          <button
            type="button"
            onClick={onSubmitPrototypeAction}
            disabled={!playerMainPhasePriority}
          >
            Queue Prototype Technique
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onPassPlayer}
            disabled={!priorityPhase || !playerHasPriority}
          >
            Pass Priority
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onPassEnemy}
            disabled={!priorityPhase || !enemyHasPriority}
          >
            Enemy Pass
          </button>
          <button
            type="button"
            onClick={onRunSkirmish}
            disabled={!canRunCombat || complete}
          >
            Run Combat Skirmish
          </button>
          <button type="button" className="secondary" onClick={onReset}>
            Reset Encounter Lab
          </button>
        </div>
        <p className="muted">
          Source:{" "}
          {prototypeActionSource
            ? sourceContextLabel(prototypeActionSource)
            : "none selected"}
        </p>

        <div className="encounter-loadout">
          <h3>Action Stack</h3>
          {visibleStack.length > 0 ? (
            <ol className="card-list compact">
              {visibleStack.map((item) => (
                <li key={item.id}>
                  <span>{item.action.label}</span>
                  <small>
                    {item.action.source
                      ? `Source: ${sourceContextLabel(item.action.source)} | `
                      : ""}
                    #{item.index} | {encounterActorLabel(item.action.actor)} |{" "}
                    {item.action.kind}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Empty</p>
          )}

          <h3>Skirmish Records</h3>
          {match.skirmishes.length > 0 ? (
            <ol className="card-list compact">
              {match.skirmishes.map((skirmish, index) => (
                <li key={skirmish.id}>
                  <span>
                    Skirmish {index + 1}: {skirmish.winner}
                  </span>
                  <small>
                    Turn {skirmish.turnNumber} | Stability{" "}
                    {skirmish.stabilityDelta.player}/{skirmish.stabilityDelta.enemy} |
                    Events {skirmish.eventCount}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">None</p>
          )}

          <h3>Action Log</h3>
          <ol className="message-list action-log-list">
            {visibleLog.map((entry) => (
              <li key={entry.id} className="action-log-entry">
                <span className="action-log-text">{entry.text}</span>
                <small className="action-log-meta">
                  Turn {entry.turnNumber} | {encounterPhaseLabel(entry.phase)} | Stack{" "}
                  {entry.stackDepth}
                </small>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
