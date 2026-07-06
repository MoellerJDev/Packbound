import { describeUpgradeProgressGroup } from "@packbound/rules";

import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

type DefaultPlaytestDecisionPanelProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DefaultPlaytestDecisionPanel = ({
  view,
  controller
}: DefaultPlaytestDecisionPanelProps) => {
  const readyUpgrade = view.loadoutZonesView.readyUpgradeGroups[0];

  return (
    <section
      className="panel default-playtest-decision-panel"
      data-testid="default-playtest-decision-panel"
      aria-labelledby="default-playtest-decision-heading"
    >
      <div className="default-playtest-decision-copy">
        <h2 id="default-playtest-decision-heading">Current Decision</h2>
        <p className="next-action" data-testid="default-playtest-decision">
          {view.runGuide.nextActionMessage}
        </p>
      </div>
      <dl className="run-stats default-playtest-status-grid">
        {view.runGuide.stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
        <div>
          <dt>Loadout</dt>
          <dd>{view.planningCheck.ok ? "Legal" : "Needs fix"}</dd>
        </div>
        <div>
          <dt>Board Charge</dt>
          <dd>{view.loadoutZonesView.resourceSummary.boardChargeText}</dd>
        </div>
      </dl>
      <div className="default-playtest-upgrade-card">
        <h3>Build Decision</h3>
        {readyUpgrade ? (
          <>
            <p data-testid="default-playtest-upgrade-copy">
              {describeUpgradeProgressGroup(readyUpgrade)}
            </p>
            <button
              type="button"
              data-testid="default-playtest-upgrade-button"
              onClick={() => controller.onUpgradeGroup(readyUpgrade)}
              disabled={!view.loadoutZonesView.editable}
            >
              Upgrade
            </button>
          </>
        ) : (
          <p className="muted">
            No duplicate upgrade is ready. Use Pixi controls, rewards, or Pool cards to
            tune the loadout.
          </p>
        )}
      </div>
    </section>
  );
};
