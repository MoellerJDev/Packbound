import type { ReactNode } from "react";

import {
  describeUpgradeProgressGroup,
  type LoadoutResourceSummary,
  type RunPhase,
  type RunState,
  type UpgradeProgressGroup
} from "@packbound/rules";
import type { CardDefId, CardInstanceId } from "@packbound/shared";

import { UpgradeBadge, UpgradeProgressBadge } from "./upgradeBadges";

export type LoadoutZonesPanelView = {
  readonly activeCards: RunState["activeCards"];
  readonly boardPlacements: RunState["board"]["placements"];
  readonly editable: boolean;
  readonly isDefaultRoute: boolean;
  readonly latestOpenedCardNames: readonly string[];
  readonly latestOpenedPack: RunState["openedPacks"][number] | undefined;
  readonly latestPackName: string | undefined;
  readonly latestRewardCardIds: ReadonlySet<CardInstanceId>;
  readonly latestRewardHistoryEntry: RunState["rewardHistory"][number] | undefined;
  readonly phase: RunPhase;
  readonly poolCards: RunState["pool"];
  readonly readyUpgradeGroups: readonly UpgradeProgressGroup[];
  readonly resourceSummary: LoadoutResourceSummary;
  readonly sourceCards: RunState["sourceRow"]["cards"];
  readonly spellrailCards: RunState["spellrail"]["cards"];
  readonly upgradeProgressByCardId: ReadonlyMap<CardInstanceId, UpgradeProgressGroup>;
  readonly upgradeProgressGroups: readonly UpgradeProgressGroup[];
};

const activeCardUpgradeLevel = (
  activeCards: RunState["activeCards"],
  cardInstanceId: CardInstanceId
): number =>
  activeCards.find((card) => card.instanceId === cardInstanceId)?.upgradeLevel ?? 0;

export const LoadoutZonesPanel = ({
  cardName,
  onUpgradeGroup,
  renderLoadoutActions,
  view
}: {
  readonly cardName: (defId: CardDefId) => string;
  readonly onUpgradeGroup: (group: UpgradeProgressGroup) => void;
  readonly renderLoadoutActions: (cardInstanceId: CardInstanceId) => ReactNode;
  readonly view: LoadoutZonesPanelView;
}) => {
  const visibleUpgradeGroups = view.isDefaultRoute
    ? view.readyUpgradeGroups
    : view.upgradeProgressGroups;

  return (
    <>
      <div className="panel">
        <h2>Board</h2>
        <ol className="card-list">
          {view.boardPlacements.map((placement) => (
            <li key={placement.cardInstanceId}>
              <div className="card-name-cell">
                <span>{cardName(placement.defId)}</span>
                <UpgradeBadge
                  level={activeCardUpgradeLevel(
                    view.activeCards,
                    placement.cardInstanceId
                  )}
                />
                <UpgradeProgressBadge
                  group={view.upgradeProgressByCardId.get(placement.cardInstanceId)}
                  cardInstanceId={placement.cardInstanceId}
                  zone="active"
                />
              </div>
              <small>
                r{placement.position.row} c{placement.position.col}{" "}
                {placement.position.layer}
              </small>
              {renderLoadoutActions(placement.cardInstanceId)}
            </li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h2>Source Row</h2>
        <dl className="source-summary">
          <div>
            <dt>Board Charge</dt>
            <dd>{view.resourceSummary.boardChargeText}</dd>
          </div>
          <div>
            <dt>Aspect Access</dt>
            <dd>{view.resourceSummary.aspectAccessText}</dd>
          </div>
          <div>
            <dt>Combat Charge/sec</dt>
            <dd>{view.resourceSummary.combatChargePerSecondText}</dd>
          </div>
          <div>
            <dt>Slots</dt>
            <dd>{view.resourceSummary.sourceSlotsText}</dd>
          </div>
        </dl>
        <ol className="card-list">
          {view.sourceCards.map((card) => (
            <li key={card.instanceId}>
              <div className="card-name-cell">
                <span>{cardName(card.defId)}</span>
                <UpgradeBadge level={card.upgradeLevel} />
                <UpgradeProgressBadge
                  group={view.upgradeProgressByCardId.get(card.instanceId)}
                  cardInstanceId={card.instanceId}
                  zone="active"
                />
              </div>
              <small>{card.zone}</small>
              {renderLoadoutActions(card.instanceId)}
            </li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h2>Spellrail</h2>
        <ol className="card-list">
          {view.spellrailCards.map((card) => (
            <li key={card.instanceId}>
              <div className="card-name-cell">
                <span>{cardName(card.defId)}</span>
                <UpgradeBadge level={card.upgradeLevel} />
                <UpgradeProgressBadge
                  group={view.upgradeProgressByCardId.get(card.instanceId)}
                  cardInstanceId={card.instanceId}
                  zone="active"
                />
              </div>
              <small>{card.zone}</small>
              {renderLoadoutActions(card.instanceId)}
            </li>
          ))}
        </ol>
      </div>

      {view.isDefaultRoute && view.readyUpgradeGroups.length === 0 ? (
        <details className="panel advanced-panel" data-testid="upgrade-progress-panel">
          <summary className="advanced-summary">
            <h2>Upgrade Progress</h2>
            <span>No ready duplicate upgrade</span>
          </summary>
          <div className="advanced-panel-body">
            {view.upgradeProgressGroups.length > 0 ? (
              <ol className="card-list">
                {view.upgradeProgressGroups.map((group) => (
                  <li key={`${group.defId}:${group.upgradeLevel}`}>
                    <span>{describeUpgradeProgressGroup(group)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                No duplicate upgrade progress yet. Unit and Echo cards need 3 matching
                pool copies at the same level.
              </p>
            )}
          </div>
        </details>
      ) : (
        <div className="panel" data-testid="upgrade-progress-panel">
          <h2>Upgrade Progress</h2>
          {visibleUpgradeGroups.length > 0 ? (
            <ol className="card-list">
              {visibleUpgradeGroups.map((group) => (
                <li key={`${group.defId}:${group.upgradeLevel}`}>
                  <span>{describeUpgradeProgressGroup(group)}</span>
                  {group.canUpgrade ? (
                    <button
                      type="button"
                      onClick={() => onUpgradeGroup(group)}
                      disabled={!view.editable}
                    >
                      Upgrade
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">
              No duplicate upgrade progress yet. Unit and Echo cards need 3 matching pool
              copies at the same level.
            </p>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Pool Cards</h2>
        {view.latestOpenedPack ? (
          <div className="pool-reward-summary">
            <p className="muted">
              Latest pack: {view.latestPackName} |{" "}
              {view.phase === "planning"
                ? "New cards are marked below and can be moved now."
                : "New cards are marked below; move them after you Advance to planning."}
            </p>
            {view.latestRewardHistoryEntry ? (
              <p className="muted">
                Paid {view.latestRewardHistoryEntry.cost} gold | Gold{" "}
                {view.latestRewardHistoryEntry.goldBefore}
                {" -> "}
                {view.latestRewardHistoryEntry.goldAfter}
              </p>
            ) : null}
            <p>{view.latestOpenedCardNames.join(", ")}</p>
            <small>{view.latestOpenedPack.seed}</small>
          </div>
        ) : (
          <p className="muted">Open rewards to grow the pool.</p>
        )}
        <ol className="card-list">
          {view.poolCards.map((card) => {
            const isLatestReward = view.latestRewardCardIds.has(card.instanceId);
            return (
              <li
                key={card.instanceId}
                className={isLatestReward ? "latest-reward-card" : undefined}
              >
                <div className="card-name-cell">
                  <span>{cardName(card.defId)}</span>
                  <UpgradeBadge level={card.upgradeLevel} />
                  <UpgradeProgressBadge
                    group={view.upgradeProgressByCardId.get(card.instanceId)}
                    cardInstanceId={card.instanceId}
                    zone="pool"
                  />
                  {isLatestReward ? <span className="new-badge">new</span> : null}
                </div>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
};
