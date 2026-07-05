import type { ReactNode } from "react";

export type RunGuideStepState = "done" | "active" | "blocked" | "todo";

export type RunGuideStep = {
  readonly label: string;
  readonly detail: string;
  readonly state: RunGuideStepState;
};

export type RunGuideStat = {
  readonly label: string;
  readonly value: ReactNode;
};

export const RunGuidePanel = ({
  isDefaultRoute,
  nextActionMessage,
  runDetails,
  stats,
  steps
}: {
  readonly isDefaultRoute: boolean;
  readonly nextActionMessage: string;
  readonly runDetails: readonly RunGuideStat[];
  readonly stats: readonly RunGuideStat[];
  readonly steps: readonly RunGuideStep[];
}) => (
  <div className="panel player-step-panel">
    <h2>{isDefaultRoute ? "What now?" : "Run State"}</h2>
    <p className="next-action">{nextActionMessage}</p>
    {isDefaultRoute ? (
      <ol className="run-guide" aria-label="Run flow">
        {steps.map((step) => (
          <li key={step.label} data-step-state={step.state}>
            <span>{step.label}</span>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
    ) : null}
    <dl className="run-stats">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
    {isDefaultRoute ? (
      <details className="compact-details run-metadata-details">
        <summary>Run details</summary>
        <dl className="run-stats">
          {runDetails.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    ) : (
      <dl className="run-stats">
        {runDetails.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
    )}
  </div>
);
