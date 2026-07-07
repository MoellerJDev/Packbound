import { CombatResultPanel } from "../../components/CombatResultPanel";
import { CommanderDoctrinePanel } from "../../components/CommanderDoctrinePanel";
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
        cardViews={view.rewards.pendingPackOfferCardViews}
        offer={view.rewards.pendingPackOffer}
        onCommit={controller.onCommitPackOfferPicks}
      />
    ) : null}
    <CommanderDoctrinePanel
      variant="panel"
      view={view.commanderDoctrinePanelView}
      onUnlockDoctrine={controller.onUnlockCommanderDoctrine}
    />
    <CombatResultPanel
      isDefaultRoute={view.isDefaultRoute}
      lastRecorded={view.combat.lastRecorded}
      showDeveloperDetails={view.showDeveloperDetails}
      upcoming={view.combat.upcoming}
    />
  </section>
);
