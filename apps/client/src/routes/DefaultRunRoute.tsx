import type { ReactNode } from "react";

import type { EncounterDefinition } from "@packbound/content";
import type {
  CommanderUpgradeId,
  LoadoutAction,
  PostPackLoadoutSuggestionSummary,
  RewardChoice,
  RewardOfferExplanation,
  TraitSummary,
  UpgradeProgressGroup
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

export const DefaultRunRoute = ({
  controller,
  view
}: {
  readonly controller: DefaultRunRouteController;
  readonly view: DefaultRunRouteView;
}) => (
  <section className="debug-grid">
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
    <CommanderUpgradePanel
      variant="panel"
      view={view.commanderUpgradePanelView}
      onApplyUpgrade={controller.onApplyCommanderUpgrade}
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

    {view.isDefaultRoute && view.planningCheck.ok ? (
      <details className="panel advanced-panel" data-testid="planning-check-panel">
        <summary className="advanced-summary">
          <h2>Planning Check</h2>
          <span>Legal</span>
        </summary>
        <div className="advanced-panel-body">
          <div className="status ok">Legal</div>
          <p className="muted">Loadout validation passed.</p>
        </div>
      </details>
    ) : (
      <div className="panel" data-testid="planning-check-panel">
        <h2>Planning Check</h2>
        <div className={view.planningCheck.ok ? "status ok" : "status error"}>
          {view.planningCheck.ok ? "Legal" : "Illegal"}
        </div>
        <ul className="message-list">
          {view.planningCheck.errors.map((error) => (
            <li key={`${error.code}:${error.cardInstanceId ?? "state"}`}>
              {error.message}
            </li>
          ))}
        </ul>
      </div>
    )}

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

    <RewardChoicesPanel
      collapseExplanations={view.isDefaultRoute}
      description={view.rewards.description}
      explanationsByChoiceId={view.rewards.explanationsByChoiceId}
      onOpenReward={controller.onOpenReward}
      playerGold={view.rewards.playerGold}
      rewardChoices={view.rewards.rewardChoices}
    />

    {view.isDefaultRoute && view.postPackSuggestions.latestOpenedCardCount > 0 ? (
      <PostPackSuggestionsPanel
        summary={view.postPackSuggestions}
        onApplySuggestion={controller.onApplyPostPackSuggestion}
      />
    ) : null}

    <LoadoutZonesPanel
      cardName={controller.cardName}
      renderLoadoutActions={controller.renderLoadoutActions}
      view={view.loadoutZonesView}
      onUpgradeGroup={controller.onUpgradeGroup}
    />

    <CombatResultPanel
      isDefaultRoute={view.isDefaultRoute}
      lastRecorded={view.combat.lastRecorded}
      showDeveloperDetails={view.showDeveloperDetails}
      upcoming={view.combat.upcoming}
    />
  </section>
);
