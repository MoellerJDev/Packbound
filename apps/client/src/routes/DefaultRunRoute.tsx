import type { ReactNode } from "react";

import type { EncounterDefinition } from "@packbound/content";
import {
  describeUpgradeProgressGroup,
  type CommanderUpgradeId,
  type LoadoutAction,
  type PostPackLoadoutSuggestionSummary,
  type RewardChoice,
  type RewardOfferExplanation,
  type TraitSummary,
  type UpgradeProgressGroup
} from "@packbound/rules";
import type { CardDefId, CardInstanceId, ValidationError } from "@packbound/shared";

import {
  CombatResultPanel,
  type LastRecordedCombatPanelView,
  type UpcomingCombatPanelView
} from "../components/CombatResultPanel";
import {
  CommandZonePanel,
  type CommandZonePanelView
} from "../components/CommandZonePanel";
import {
  CommanderUpgradePanel,
  type CommanderUpgradePanelView
} from "../components/CommanderUpgradePanel";
import {
  DefaultPixiBattlefieldSection,
  type DefaultPixiBattlefieldController,
  type DefaultPixiBattlefieldView
} from "../components/DefaultPixiBattlefieldSection";
import {
  LoadoutZonesPanel,
  type LoadoutZonesPanelView
} from "../components/LoadoutZonesPanel";
import { PostPackSuggestionsPanel } from "../components/PostPackSuggestionsPanel";
import { RewardChoicesPanel } from "../components/RewardChoicesPanel";
import {
  RunGuidePanel,
  type RunGuideStat,
  type RunGuideStep
} from "../components/RunGuidePanel";
import { TraitSummaryView } from "../components/TraitSummaryView";

export type DefaultRunRouteView = {
  readonly battlefield: DefaultPixiBattlefieldView;
  readonly combat: {
    readonly lastRecorded: LastRecordedCombatPanelView;
    readonly upcoming: UpcomingCombatPanelView | undefined;
  };
  readonly commandZone: {
    readonly deployDisabled: boolean;
    readonly returnDisabled: boolean;
    readonly view: CommandZonePanelView;
  };
  readonly commanderUpgradePanelView: CommanderUpgradePanelView;
  readonly currentEncounter: EncounterDefinition | undefined;
  readonly isDefaultRoute: boolean;
  readonly loadoutZonesView: LoadoutZonesPanelView;
  readonly planningCheck: {
    readonly errors: readonly ValidationError[];
    readonly ok: boolean;
  };
  readonly postPackSuggestions: PostPackLoadoutSuggestionSummary;
  readonly rewards: {
    readonly description: string;
    readonly explanationsByChoiceId: ReadonlyMap<string, RewardOfferExplanation>;
    readonly playerGold: number;
    readonly rewardChoices: readonly RewardChoice[];
  };
  readonly runGuide: {
    readonly nextActionMessage: string;
    readonly runDetails: readonly RunGuideStat[];
    readonly stats: readonly RunGuideStat[];
    readonly steps: readonly RunGuideStep[];
  };
  readonly showDeveloperDetails: boolean;
  readonly traitSummary: TraitSummary;
};

export type DefaultRunRouteController = {
  readonly battlefield: DefaultPixiBattlefieldController;
  readonly cardName: (defId: CardDefId) => string;
  readonly onApplyCommanderUpgrade: (choiceId: CommanderUpgradeId) => void;
  readonly onApplyPostPackSuggestion: (
    cardInstanceId: CardInstanceId,
    action: LoadoutAction
  ) => void;
  readonly onDeployCommander: () => void;
  readonly onInspectCommander: () => void;
  readonly onInspectEncounterBoard: (cardInstanceId: CardInstanceId) => void;
  readonly onInspectEncounterSource: (cardInstanceId: CardInstanceId) => void;
  readonly onInspectEncounterSpellrail: (cardInstanceId: CardInstanceId) => void;
  readonly onOpenReward: (choiceId: string) => void;
  readonly onReturnCommander: () => void;
  readonly onUpgradeGroup: (group: UpgradeProgressGroup) => void;
  readonly renderLoadoutActions: (cardInstanceId: CardInstanceId) => ReactNode;
};

const CurrentEncounterDetails = ({
  controller,
  encounter
}: {
  readonly controller: DefaultRunRouteController;
  readonly encounter: EncounterDefinition | undefined;
}) => (
  <>
    <dl className="run-stats">
      <div>
        <dt>Name</dt>
        <dd>{encounter?.name ?? "None"}</dd>
      </div>
      <div>
        <dt>Kind</dt>
        <dd>{encounter?.kind ?? "none"}</dd>
      </div>
      <div>
        <dt>Difficulty</dt>
        <dd>{encounter?.difficulty ?? "-"}</dd>
      </div>
      <div>
        <dt>Opponent Board</dt>
        <dd>{encounter ? "Inspect in battlefield" : "-"}</dd>
      </div>
    </dl>
    {encounter ? (
      <div className="encounter-loadout">
        <h3>Opponent Board</h3>
        <ol className="card-list compact">
          {encounter.loadout.board.placements.map((placement) => (
            <li key={placement.cardInstanceId}>
              <span>{controller.cardName(placement.defId)}</span>
              <small>
                r{placement.position.row} c{placement.position.col}{" "}
                {placement.position.layer}
              </small>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  controller.onInspectEncounterBoard(placement.cardInstanceId)
                }
              >
                Inspect
              </button>
            </li>
          ))}
        </ol>
        <h3>Opponent Source Row</h3>
        <ol className="card-list compact">
          {encounter.loadout.sourceRow.cards.map((card) => (
            <li key={card.instanceId}>
              <span>{controller.cardName(card.defId)}</span>
              <small>{card.zone}</small>
              <button
                type="button"
                className="secondary"
                onClick={() => controller.onInspectEncounterSource(card.instanceId)}
              >
                Inspect
              </button>
            </li>
          ))}
        </ol>
        <h3>Opponent Spellrail</h3>
        <ol className="card-list compact">
          {encounter.loadout.spellrail.cards.length > 0 ? (
            encounter.loadout.spellrail.cards.map((card) => (
              <li key={card.instanceId}>
                <span>{controller.cardName(card.defId)}</span>
                <small>{card.zone}</small>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => controller.onInspectEncounterSpellrail(card.instanceId)}
                >
                  Inspect
                </button>
              </li>
            ))
          ) : (
            <li>
              <span>None</span>
            </li>
          )}
        </ol>
      </div>
    ) : null}
  </>
);

const PlanningCheckPanel = ({
  view
}: {
  readonly view: DefaultRunRouteView["planningCheck"];
}) => (
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

const DefaultPlaytestDecisionPanel = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) => {
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

const DefaultRouteDebugPanels = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) => (
  <>
    <RunGuidePanel
      isDefaultRoute={view.isDefaultRoute}
      nextActionMessage={view.runGuide.nextActionMessage}
      runDetails={view.runGuide.runDetails}
      stats={view.runGuide.stats}
      steps={view.runGuide.steps}
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
            controller={controller}
            encounter={view.currentEncounter}
          />
        </div>
      </details>
    ) : (
      <div className="panel">
        <h2>Current Encounter</h2>
        <CurrentEncounterDetails
          controller={controller}
          encounter={view.currentEncounter}
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

const DebugGridRoute = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) => (
  <section className="debug-grid">
    <DefaultRouteDebugPanels controller={controller} view={view} />
    <RewardChoicesPanel
      collapseExplanations={view.isDefaultRoute}
      description={view.rewards.description}
      explanationsByChoiceId={view.rewards.explanationsByChoiceId}
      onOpenReward={controller.onOpenReward}
      playerGold={view.rewards.playerGold}
      rewardChoices={view.rewards.rewardChoices}
    />
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

const DefaultPlaytestRoute = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) => {
  const showRewards =
    view.rewards.rewardChoices.length > 0 ||
    view.commanderUpgradePanelView.phase === "reward";

  return (
    <section className="default-playtest-route" data-testid="default-playtest-route">
      <DefaultPlaytestDecisionPanel controller={controller} view={view} />
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
          <DefaultRouteDebugPanels controller={controller} view={view} />
        </div>
      </details>
    </section>
  );
};

export const DefaultRunRoute = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) =>
  view.isDefaultRoute ? (
    <DefaultPlaytestRoute controller={controller} view={view} />
  ) : (
    <DebugGridRoute controller={controller} view={view} />
  );
