import type { DefaultRunRouteView } from "../defaultRunRouteTypes";

type PlanningCheckPanelProps = {
  readonly view: DefaultRunRouteView["planningCheck"];
};

export const PlanningCheckPanel = ({ view }: PlanningCheckPanelProps) => (
  <div className="panel" data-testid="planning-check-panel">
    <h2>Planning Check</h2>
    <div className={view.ok ? "status ok" : "status error"}>
      {view.ok ? "Legal" : "Illegal"}
    </div>
    <ul className="message-list">
      {view.errors.map((error) => (
        <li key={`${error.code}:${error.cardInstanceId ?? "state"}`}>{error.message}</li>
      ))}
    </ul>
  </div>
);
