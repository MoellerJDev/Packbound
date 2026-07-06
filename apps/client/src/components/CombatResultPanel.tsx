import type { CombatSummary } from "@packbound/rules";
import type { CombatDisplaySummary, CombatResult } from "@packbound/sim";

import { CombatSummaryView } from "./CombatSummaryView";
import { RawDebugDetails } from "./RawDebugDetails";

export type LastRecordedCombatPanelView = {
  readonly commanderReturnedToCommand: boolean;
  readonly displaySummary: CombatDisplaySummary | undefined;
  readonly emptyText: string;
  readonly flowNote: string;
  readonly rawDebugValue: unknown;
  readonly summary: CombatSummary | undefined;
};

export type UpcomingCombatPanelView = {
  readonly combat: CombatResult;
  readonly currentEncounterId: string | undefined;
  readonly displaySummary: CombatDisplaySummary;
  readonly phase: string;
};

export const CombatResultPanel = ({
  isDefaultRoute,
  lastRecorded,
  showDeveloperDetails,
  upcoming
}: {
  readonly isDefaultRoute: boolean;
  readonly lastRecorded: LastRecordedCombatPanelView;
  readonly showDeveloperDetails: boolean;
  readonly upcoming: UpcomingCombatPanelView | undefined;
}) => {
  const recordedPanel = (
    <div className="panel wide">
      <h2>Last Recorded Combat</h2>
      {lastRecorded.summary ? (
        <>
          <p className="muted">
            Round {lastRecorded.summary.round} | Winner: {lastRecorded.summary.winner} |
            Damage: {lastRecorded.summary.damageToPlayer}/
            {lastRecorded.summary.damageToOpponent} | Events:{" "}
            {lastRecorded.summary.eventCount} | Gold: +{lastRecorded.summary.goldEarned}
          </p>
          <dl className="combat-result-strip">
            <div>
              <dt>Winner</dt>
              <dd>{lastRecorded.summary.winner}</dd>
            </div>
            <div>
              <dt>Damage</dt>
              <dd>
                You {lastRecorded.summary.damageToPlayer} / Enemy{" "}
                {lastRecorded.summary.damageToOpponent}
              </dd>
            </div>
            <div>
              <dt>Gold</dt>
              <dd>+{lastRecorded.summary.goldEarned}</dd>
            </div>
            <div>
              <dt>Events</dt>
              <dd>{lastRecorded.summary.eventCount}</dd>
            </div>
            <div>
              <dt>Commander</dt>
              <dd>
                {lastRecorded.commanderReturnedToCommand
                  ? "Returned to Command"
                  : "No combat return"}
              </dd>
            </div>
          </dl>
          <p className="flow-note">{lastRecorded.flowNote}</p>
          {lastRecorded.displaySummary ? (
            <>
              {isDefaultRoute ? (
                <CombatSummaryView
                  mode="keyMoments"
                  summary={lastRecorded.displaySummary}
                />
              ) : null}
              {isDefaultRoute ? (
                <details className="combat-feed-details">
                  <summary>Combat Event Feed</summary>
                  <CombatSummaryView
                    mode="eventFeed"
                    summary={lastRecorded.displaySummary}
                  />
                </details>
              ) : (
                <CombatSummaryView summary={lastRecorded.displaySummary} />
              )}
              {showDeveloperDetails ? (
                <RawDebugDetails
                  label="Developer event JSON"
                  value={lastRecorded.rawDebugValue}
                />
              ) : null}
            </>
          ) : (
            <p className="muted combat-empty">{lastRecorded.emptyText}</p>
          )}
        </>
      ) : (
        <p className="muted">No combat has been recorded for this run.</p>
      )}
    </div>
  );

  const upcomingPanel = upcoming ? (
    <div className="panel wide">
      <h2>Upcoming Combat Preview</h2>
      <p className="muted">
        Preview only, not yet recorded. Winner: {upcoming.combat.winner} | Events:{" "}
        {upcoming.combat.events.length}
      </p>
      <dl className="combat-result-strip">
        <div>
          <dt>Winner</dt>
          <dd>{upcoming.combat.winner}</dd>
        </div>
        <div>
          <dt>Damage</dt>
          <dd>
            You {upcoming.combat.damageToPlayerA} / Enemy{" "}
            {upcoming.combat.damageToPlayerB}
          </dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd>{upcoming.combat.events.length}</dd>
        </div>
        <div>
          <dt>Warnings</dt>
          <dd>{upcoming.combat.warnings.length}</dd>
        </div>
      </dl>
      {isDefaultRoute ? (
        <>
          <CombatSummaryView mode="keyMoments" summary={upcoming.displaySummary} />
          <details className="combat-feed-details">
            <summary>Preview Event Feed</summary>
            <CombatSummaryView mode="eventFeed" summary={upcoming.displaySummary} />
          </details>
        </>
      ) : (
        <CombatSummaryView summary={upcoming.displaySummary} />
      )}
      {showDeveloperDetails ? (
        <RawDebugDetails
          label="Developer event JSON"
          value={{
            phase: upcoming.phase,
            currentEncounterId: upcoming.currentEncounterId ?? null,
            events: upcoming.combat.events,
            warnings: upcoming.combat.warnings
          }}
        />
      ) : null}
    </div>
  ) : null;

  if (isDefaultRoute) {
    return (
      <>
        {!lastRecorded.summary && !upcoming ? (
          <div
            className="panel wide default-combat-status-panel"
            data-testid="default-combat-preview-status"
          >
            <h2>Combat Preview</h2>
            <p className="muted">
              Ready Combat when the board looks good. The preview, Key Moments, and Record
              Combat action will appear here.
            </p>
          </div>
        ) : null}
        {upcomingPanel}
        {lastRecorded.summary ? recordedPanel : null}
      </>
    );
  }

  return (
    <>
      {recordedPanel}
      {upcomingPanel}
    </>
  );
};
