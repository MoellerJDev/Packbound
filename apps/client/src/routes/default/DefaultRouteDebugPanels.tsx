import { CommandZonePanel } from "../../components/CommandZonePanel";
import { LoadoutZonesPanel } from "../../components/LoadoutZonesPanel";
import { RunGuidePanel } from "../../components/RunGuidePanel";
import { TraitSummaryView } from "../../components/TraitSummaryView";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

import { CurrentEncounterDetails } from "./CurrentEncounterDetails";
import { PlanningCheckPanel } from "./PlanningCheckPanel";

type DefaultRouteDebugPanelsProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DefaultRouteDebugPanels = ({
  view,
  controller
}: DefaultRouteDebugPanelsProps) => (
  <>
    <RunGuidePanel
      isDefaultRoute={view.isDefaultRoute}
      nextActionMessage={view.runGuide.nextActionMessage}
      runDetails={view.runGuide.runDetails}
      steps={view.runGuide.steps}
      stats={view.runGuide.stats}
    />
    <CommandZonePanel
      isDefaultRoute={view.isDefaultRoute}
      variant="panel"
      view={view.commandZone.view}
      deployDisabled={view.commandZone.deployDisabled}
      returnDisabled={view.commandZone.returnDisabled}
      onInspect={controller.onInspectCommander}
      onDeploy={controller.onDeployCommander}
      onReturn={controller.onReturnCommander}
    />
    {view.isDefaultRoute ? (
      <details className="panel advanced-panel" data-testid="opponent-details-panel">
        <summary className="advanced-summary">
          <h2>Opponent Details</h2>
          <span>{view.currentEncounter?.name ?? "No encounter"}</span>
        </summary>
        <div className="advanced-panel-body">
          <p className="muted">
            Opponent cards are inspectable directly from the battlefield; this panel keeps
            the full encounter loadout available when needed.
          </p>
          <CurrentEncounterDetails
            encounter={view.currentEncounter}
            controller={controller}
          />
        </div>
      </details>
    ) : (
      <div className="panel">
        <h2>Current Encounter</h2>
        <CurrentEncounterDetails
          encounter={view.currentEncounter}
          controller={controller}
        />
      </div>
    )}
    <PlanningCheckPanel view={view.planningCheck} />
    {view.isDefaultRoute ? (
      <details className="panel advanced-panel" data-testid="traits-panel">
        <summary className="advanced-summary">
          <h2>Traits / Teamups</h2>
          <span>Display-only prototype</span>
        </summary>
        <div className="advanced-panel-body">
          <TraitSummaryView summary={view.traitSummary} />
        </div>
      </details>
    ) : (
      <div className="panel" data-testid="traits-panel">
        <h2>Traits / Teamups</h2>
        <TraitSummaryView summary={view.traitSummary} />
      </div>
    )}
    <LoadoutZonesPanel
      cardName={controller.cardName}
      renderLoadoutActions={controller.renderLoadoutActions}
      view={view.loadoutZonesView}
      onUpgradeGroup={controller.onUpgradeGroup}
    />
  </>
);
