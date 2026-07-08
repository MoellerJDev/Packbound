import { DefaultLoadoutTray } from "../../components/DefaultLoadoutTray";
import { DefaultPixiBattlefieldSection } from "../../components/DefaultPixiBattlefieldSection";
import { PostPackSuggestionsPanel } from "../../components/PostPackSuggestionsPanel";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

import { DefaultActionRail } from "./DefaultActionRail";
import { DefaultRouteDebugPanels } from "./DefaultRouteDebugPanels";

type DefaultPlaytestRouteProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DefaultPlaytestRoute = ({ view, controller }: DefaultPlaytestRouteProps) => {
  return (
    <section className="default-playtest-route" data-testid="default-playtest-route">
      <div
        className="default-playtest-dashboard"
        data-testid="default-playtest-dashboard"
      >
        <div className="default-playtest-dashboard-left">
          <DefaultLoadoutTray
            cardName={controller.cardName}
            renderLoadoutActions={controller.renderLoadoutTrayActions}
            view={view.loadoutZonesView}
          />
        </div>
        <div className="default-playtest-dashboard-center">
          <DefaultPixiBattlefieldSection
            controller={controller.battlefield}
            view={view.battlefield}
          />
        </div>
        <div className="default-playtest-dashboard-right">
          <DefaultActionRail view={view} controller={controller} />
          {view.loadoutZonesView.phase === "planning" &&
          view.postPackSuggestions.latestOpenedCardCount > 0 ? (
            <PostPackSuggestionsPanel
              summary={view.postPackSuggestions}
              onApplySuggestion={controller.onApplyPostPackSuggestion}
            />
          ) : null}
        </div>
      </div>
      {view.showDeveloperDetails ? (
        <details
          className="panel advanced-panel default-playtest-debug"
          data-testid="advanced-debug-panels"
        >
          <summary
            className="advanced-summary"
            data-testid="advanced-debug-panels-summary"
          >
            <h2>Advanced Debug Panels</h2>
            <span>Loadout lists, opponent details, traits, Command Zone audit</span>
          </summary>
          <div className="advanced-panel-body debug-grid default-playtest-debug-grid">
            <DefaultRouteDebugPanels view={view} controller={controller} />
          </div>
        </details>
      ) : null}
    </section>
  );
};
