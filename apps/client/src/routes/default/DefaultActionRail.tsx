import { describeUpgradeProgressGroup } from "@packbound/rules";

import { CommanderDoctrinePanel } from "../../components/CommanderDoctrinePanel";
import { CombatSummaryView } from "../../components/CombatSummaryView";
import { PackOfferPanel } from "../../components/PackOfferPanel";
import {
  buildDefaultActionRailView,
  type DefaultActionRailRewardStep
} from "../../viewModels/defaultActionRailView";
import { buildCombatForecastView } from "../../viewModels/combatForecastView";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "../defaultRunRouteTypes";

type DefaultActionRailProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

const rewardStepClass = (step: DefaultActionRailRewardStep): string =>
  `default-action-rail-step ${step.state}`;

const RewardStepper = ({
  steps
}: {
  readonly steps: readonly DefaultActionRailRewardStep[];
}) =>
  steps.length > 0 ? (
    <ol className="default-action-rail-steps" data-testid="default-action-rail-steps">
      {steps.map((step, index) => (
        <li key={`${index}:${step.label}`} className={rewardStepClass(step)}>
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  ) : null;

const BuildDecision = ({ view, controller }: DefaultActionRailProps) => {
  const readyUpgrade = view.loadoutZonesView.readyUpgradeGroups[0];

  return (
    <section className="default-action-card" data-testid="default-action-rail-build">
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
          No duplicate upgrade is ready. Use Pixi controls, rewards, or Pool cards to tune
          the loadout.
        </p>
      )}
    </section>
  );
};

const CompactCombatPreview = ({ view }: { readonly view: DefaultRunRouteView }) => {
  const upcoming = view.combat.upcoming;
  if (!upcoming) {
    return (
      <section
        className="default-action-card"
        data-testid="default-combat-preview-status"
      >
        <h3>Combat Preview</h3>
        <p className="muted">
          Ready Combat when the board looks good. The forecast appears here before you
          record.
        </p>
      </section>
    );
  }

  const forecast = buildCombatForecastView(upcoming.combat);

  return (
    <section className="default-action-card" data-testid="default-action-combat-preview">
      <h3>Upcoming Combat Preview</h3>
      <p className="muted">
        Forecast: {forecast.label}. Exact combat is revealed after Record Combat.
      </p>
      <dl
        className={`combat-result-strip combat-forecast-strip ${forecast.tone}`}
        data-testid="default-combat-forecast"
      >
        <div>
          <dt>Forecast</dt>
          <dd>{forecast.label}</dd>
        </div>
        <div>
          <dt>Pressure</dt>
          <dd>{forecast.pressureText}</dd>
        </div>
        <div>
          <dt>Shape</dt>
          <dd>{forecast.shapeText}</dd>
        </div>
        <div>
          <dt>Warnings</dt>
          <dd>{forecast.warningsText}</dd>
        </div>
      </dl>
      <details className="combat-feed-details">
        <summary>Preview Key Moments</summary>
        <CombatSummaryView mode="keyMoments" summary={upcoming.displaySummary} />
      </details>
    </section>
  );
};

const CompactPackMarket = ({ view, controller }: DefaultActionRailProps) => (
  <section className="default-action-card" data-testid="default-action-pack-market">
    <h3>Pack Market</h3>
    <p className="muted">{view.rewards.description}</p>
    <ol className="default-action-choice-list compact-pack-market-list">
      {view.rewards.rewardChoices.map((choice) => {
        const explanation = view.rewards.explanationsByChoiceId.get(choice.id);
        return (
          <li key={choice.id}>
            <div>
              <strong>{choice.label}</strong>
              <small>
                Cost {choice.cost} gold
                {choice.affordable
                  ? ` | After purchase: ${choice.goldAfterPurchase} gold`
                  : ` | Need ${choice.cost}, have ${view.rewards.playerGold}`}
              </small>
              {explanation ? (
                <small className="default-action-choice-reason">
                  {explanation.headline}
                </small>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => controller.onOpenReward(choice.id)}
              disabled={!choice.affordable}
            >
              Open Pack Offer
            </button>
          </li>
        );
      })}
    </ol>
  </section>
);

const CompactCombatRecap = ({ view }: { readonly view: DefaultRunRouteView }) => {
  const summary = view.combat.lastRecorded.summary;
  const displaySummary = view.combat.lastRecorded.displaySummary;
  if (!summary) {
    return null;
  }

  return (
    <section className="default-action-rail-recap" data-testid="default-action-recap">
      <h3>Last Recorded Combat</h3>
      <p className="muted">
        Winner: {summary.winner} | Damage: {summary.damageToPlayer}/
        {summary.damageToOpponent} | Events: {summary.eventCount} | Gold: +
        {summary.goldEarned}
      </p>
      {displaySummary ? (
        <details className="combat-feed-details">
          <summary>Key Moments</summary>
          <CombatSummaryView mode="keyMoments" summary={displaySummary} />
        </details>
      ) : null}
    </section>
  );
};

const RewardsComplete = () => (
  <section className="default-action-card" data-testid="default-action-rewards-complete">
    <h3>Rewards Complete</h3>
    <p>Pack and Commander doctrine rewards are complete.</p>
    <p className="muted">Use Advance in the top bar to start the next planning round.</p>
  </section>
);

const PrimaryAction = ({
  controller,
  primary,
  view
}: DefaultActionRailProps & {
  readonly primary: ReturnType<typeof buildDefaultActionRailView>["primary"];
}) => {
  switch (primary) {
    case "combatPreview":
      return <CompactCombatPreview view={view} />;
    case "packMarket":
      return <CompactPackMarket view={view} controller={controller} />;
    case "packOffer":
      return view.rewards.pendingPackOffer ? (
        <PackOfferPanel
          cardViews={view.rewards.pendingPackOfferCardViews}
          density="compact"
          offer={view.rewards.pendingPackOffer}
          onCommit={controller.onCommitPackOfferPicks}
          variant="embedded"
        />
      ) : null;
    case "commanderDoctrine":
      return (
        <CommanderDoctrinePanel
          density="compact"
          variant="embedded"
          view={view.commanderDoctrinePanelView}
          onUnlockDoctrine={controller.onUnlockCommanderDoctrine}
        />
      );
    case "rewardsComplete":
      return <RewardsComplete />;
    case "combatResolved":
      return (
        <section className="default-action-card">
          <h3>Advance</h3>
          <p>Use Advance in the top bar to enter the next planning round.</p>
        </section>
      );
    case "complete":
      return (
        <section className="default-action-card">
          <h3>Run Complete</h3>
          <p>Reset to start again.</p>
        </section>
      );
    case "planning":
    default:
      return <BuildDecision view={view} controller={controller} />;
  }
};

export const DefaultActionRail = ({ view, controller }: DefaultActionRailProps) => {
  const actionRail = buildDefaultActionRailView({
    commanderDoctrineChoiceCount: view.commanderDoctrinePanelView.choices.length,
    commanderDoctrineClaimed: view.commanderDoctrinePanelView.claimedThisRound,
    nextActionMessage: view.runGuide.nextActionMessage,
    packOfferPickLimit: view.rewards.pendingPackOffer?.pickLimit,
    packRewardChoiceCount: view.rewards.rewardChoices.length,
    packRewardClaimed: view.rewards.packClaimedThisRound,
    phase: view.commanderDoctrinePanelView.phase
  });
  const showPrimaryAction = !(
    actionRail.primary === "planning" &&
    view.postPackSuggestions.latestOpenedCardCount > 0 &&
    view.loadoutZonesView.readyUpgradeGroups.length === 0
  );
  const showCombatRecap =
    actionRail.primary !== "packOffer" &&
    actionRail.primary !== "commanderDoctrine" &&
    !(
      actionRail.primary === "planning" &&
      view.postPackSuggestions.latestOpenedCardCount > 0
    );

  return (
    <section
      className="panel default-action-rail"
      data-testid="default-action-rail"
      aria-labelledby="default-action-rail-heading"
    >
      <div className="default-action-rail-header">
        <div>
          <span className="eyebrow">Next Action</span>
          <h2 id="default-action-rail-heading">Action Rail</h2>
        </div>
        <span
          className="default-action-rail-progress"
          data-testid="default-action-rail-progress"
        >
          {actionRail.progressText}
        </span>
      </div>
      <p className="next-action" data-testid="default-action-rail-message">
        {actionRail.message}
      </p>
      <RewardStepper steps={actionRail.rewardSteps} />
      {showPrimaryAction ? (
        <div
          className="default-action-rail-primary"
          data-testid="default-action-rail-primary"
        >
          <PrimaryAction
            primary={actionRail.primary}
            view={view}
            controller={controller}
          />
        </div>
      ) : null}
      {showCombatRecap ? <CompactCombatRecap view={view} /> : null}
    </section>
  );
};
