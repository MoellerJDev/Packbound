import type { CombatDisplaySummary } from "@packbound/sim";

import { timeLabel } from "./formatting";

export const CombatSummaryView = ({
  summary
}: {
  readonly summary: CombatDisplaySummary;
}) => (
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
