import { CombatResultPanel } from "../../components/CombatResultPanel";
import { CommanderUpgradePanel } from "../../components/CommanderUpgradePanel";
import { PackOfferPanel } from "../../components/PackOfferPanel";
import { RewardChoicesPanel } from "../../components/RewardChoicesPanel";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

import { DefaultRouteDebugPanels } from "./DefaultRouteDebugPanels";

type DebugGridRouteProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DebugGridRoute = ({ view, controller }: DebugGridRouteProps) => (
  <section className="debug-grid">
    <DefaultRouteDebugPanels view={view} controller={controller} />
    <RewardChoicesPanel
      collapseExplanations={view.isDefaultRoute}
      description={view.rewards.description}
      explanationsByChoiceId={view.rewards.explanationsByChoiceId}
      onOpenReward={controller.onOpenReward}
      playerGold={view.rewards.playerGold}
      rewardChoices={view.rewards.rewardChoices}
    />
    {view.rewards.pendingPackOffer ? (
      <PackOfferPanel
        cardName={controller.cardName}
        offer={view.rewards.pendingPackOffer}
        onCommit={controller.onCommitPackOfferPicks}
      />
    ) : null}
    <CommanderUpgradePanel
      variant="panel"
      view={view.commanderUpgradePanelView}
      onApplyUpgrade={controller.onApplyCommanderUpgrade}
    />
    <CombatResultPanel
      isDefaultRoute={view.isDefaultRoute}
      lastRecorded={view.combat.lastRecorded}
      showDeveloperDetails={view.showDeveloperDetails}
      upcoming={view.combat.upcoming}
    />
  </section>
);
