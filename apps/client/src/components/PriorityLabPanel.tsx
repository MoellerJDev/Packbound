import {
  describeEncounterActionCosts,
  describeEncounterActionEffects,
  type EncounterActionSource,
  type EncounterActor,
  type EncounterMatchState
} from "@packbound/rules";

type PriorityLabPanelProps = {
  readonly match: EncounterMatchState;
  readonly canRunCombat: boolean;
  readonly prototypeActionSource: EncounterActionSource | undefined;
  readonly canSubmitPrototypeAction: boolean;
  readonly prototypeActionSourceUnavailableText?: string;
  readonly commanderName: string;
  readonly commanderZone: string;
  readonly commanderActionSource: EncounterActionSource | undefined;
  readonly canSubmitCommanderAction: boolean;
  readonly commanderActionUnavailableText: string | undefined;
  readonly onSubmitCommanderAction: () => void;
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
  canSubmitPrototypeAction,
  prototypeActionSourceUnavailableText,
  commanderName,
  commanderZone,
  commanderActionSource,
  canSubmitCommanderAction,
  commanderActionUnavailableText,
  onSubmitCommanderAction,
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
  const prototypeCostText = describeEncounterActionCosts(
    "main_phase_pressure",
    prototypeActionSource?.cardName ?? "source"
  );
  const prototypeEffectText = describeEncounterActionEffects(
    "main_phase_pressure",
    "player"
  );
  const commanderCostText = describeEncounterActionCosts("commander_rally", "Commander");
  const commanderEffectText = describeEncounterActionEffects("commander_rally", "player");

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
            disabled={
              !playerMainPhasePriority ||
              !prototypeActionSource ||
              !canSubmitPrototypeAction
            }
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
            : (prototypeActionSourceUnavailableText ?? "No valid source selected.")}
          {prototypeActionSource && !canSubmitPrototypeAction
            ? ` - ${prototypeActionSourceUnavailableText ?? "Source unavailable."}`
            : ""}
        </p>
        <div
          className="encounter-action-contract"
          data-testid="prototype-action-contract"
        >
          <span>
            <strong>Cost:</strong> {prototypeCostText}
          </span>
          <span>
            <strong>Effect:</strong> {prototypeEffectText}
          </span>
        </div>

        <div className="encounter-action-section" data-testid="commander-action-section">
          <h3>Commander Action</h3>
          <dl className="run-stats">
            <div>
              <dt>Commander</dt>
              <dd>{commanderName}</dd>
            </div>
            <div>
              <dt>Zone</dt>
              <dd data-testid="priority-commander-action-zone">{commanderZone}</dd>
            </div>
          </dl>
          <div className="mini-actions">
            <button
              type="button"
              onClick={onSubmitCommanderAction}
              disabled={
                !playerMainPhasePriority ||
                !commanderActionSource ||
                !canSubmitCommanderAction
              }
            >
              Queue Commander Rally
            </button>
          </div>
          <p className="muted" data-testid="commander-action-status">
            {commanderActionSource
              ? `Source: ${sourceContextLabel(commanderActionSource)}`
              : (commanderActionUnavailableText ?? "Commander Rally unavailable.")}
          </p>
          <div
            className="encounter-action-contract"
            data-testid="commander-action-contract"
          >
            <span>
              <strong>Cost:</strong> {commanderCostText}
            </span>
            <span>
              <strong>Effect:</strong> {commanderEffectText}
            </span>
          </div>
        </div>

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

          <h3>Used Sources</h3>
          {match.sourceLifecycleEvents.length > 0 ? (
            <ol className="card-list compact">
              {match.sourceLifecycleEvents.map((event) => (
                <li key={event.id}>
                  <span>
                    {event.source.cardName} used by {event.actionLabel}
                  </span>
                  <small>
                    Turn {event.turnNumber} | {encounterPhaseLabel(event.phase)} |{" "}
                    {encounterActorLabel(event.actor)} | {event.lifecycle}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">None</p>
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
