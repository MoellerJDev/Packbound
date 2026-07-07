import { CombatResultPanel } from "../../components/CombatResultPanel";
import { CommanderUpgradePanel } from "../../components/CommanderUpgradePanel";
import { DefaultLoadoutTray } from "../../components/DefaultLoadoutTray";
import { DefaultPixiBattlefieldSection } from "../../components/DefaultPixiBattlefieldSection";
import { PackOfferPanel } from "../../components/PackOfferPanel";
import { PostPackSuggestionsPanel } from "../../components/PostPackSuggestionsPanel";
import { RewardChoicesPanel } from "../../components/RewardChoicesPanel";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

import { DefaultPlaytestDecisionPanel } from "./DefaultPlaytestDecisionPanel";
import { DefaultRouteDebugPanels } from "./DefaultRouteDebugPanels";

type DefaultPlaytestRouteProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DefaultPlaytestRoute = ({ view, controller }: DefaultPlaytestRouteProps) => {
  const showRewards =
    view.rewards.rewardChoices.length > 0 ||
    view.rewards.pendingPackOffer !== undefined ||
    view.commanderUpgradePanelView.phase === "reward";

  return (
    <section className="default-playtest-route" data-testid="default-playtest-route">
      <DefaultPlaytestDecisionPanel view={view} controller={controller} />
      <DefaultLoadoutTray
        cardName={controller.cardName}
        renderLoadoutActions={controller.renderLoadoutActions}
        view={view.loadoutZonesView}
      />
      <DefaultPixiBattlefieldSection
        controller={controller.battlefield}
        view={view.battlefield}
      />
      <div className="default-playtest-loop-grid">
        <CombatResultPanel
          isDefaultRoute
          lastRecorded={view.combat.lastRecorded}
          showDeveloperDetails={view.showDeveloperDetails}
          upcoming={view.combat.upcoming}
        />
        {showRewards ? (
          <>
            <RewardChoicesPanel
              collapseExplanations
              description={view.rewards.description}
              explanationsByChoiceId={view.rewards.explanationsByChoiceId}
              onOpenReward={controller.onOpenReward}
              playerGold={view.rewards.playerGold}
              rewardChoices={view.rewards.rewardChoices}
            />
            {view.rewards.pendingPackOffer ? (
              <PackOfferPanel
                cardViews={view.rewards.pendingPackOfferCardViews}
                offer={view.rewards.pendingPackOffer}
                onCommit={controller.onCommitPackOfferPicks}
              />
            ) : null}
            <CommanderUpgradePanel
              variant="panel"
              view={view.commanderUpgradePanelView}
              onApplyUpgrade={controller.onApplyCommanderUpgrade}
            />
          </>
        ) : null}
        {view.postPackSuggestions.latestOpenedCardCount > 0 ? (
          <PostPackSuggestionsPanel
            summary={view.postPackSuggestions}
            onApplySuggestion={controller.onApplyPostPackSuggestion}
          />
        ) : null}
      </div>
      <details
        className="panel advanced-panel default-playtest-debug"
        data-testid="advanced-debug-panels"
      >
        <summary className="advanced-summary" data-testid="advanced-debug-panels-summary">
          <h2>Advanced Debug Panels</h2>
          <span>Loadout lists, opponent details, traits, Command Zone audit</span>
        </summary>
        <div className="advanced-panel-body debug-grid default-playtest-debug-grid">
          <DefaultRouteDebugPanels view={view} controller={controller} />
        </div>
      </details>
    </section>
  );
};
