import { useState, type ReactNode } from "react";

import type { CardDefId, CardInstance, CardInstanceId } from "@packbound/shared";

import type { LoadoutZonesPanelView } from "./LoadoutZonesPanel";
import { UpgradeBadge } from "./upgradeBadges";

const POOL_CARD_LIMIT = 2;
const ACTIVE_ZONE_CARD_LIMIT = 1;

type LoadoutTrayZoneId = "pool" | "board" | "sources" | "spellrail";

const activeCardUpgradeLevel = (
  activeCards: LoadoutZonesPanelView["activeCards"],
  cardInstanceId: CardInstanceId
): number =>
  activeCards.find((card) => card.instanceId === cardInstanceId)?.upgradeLevel ?? 0;

const formatPosition = (
  placement: LoadoutZonesPanelView["boardPlacements"][number]
): string =>
  `r${placement.position.row} c${placement.position.col} ${placement.position.layer}`;

const moreCardsText = (count: number): string =>
  `+${count} more ${count === 1 ? "card" : "cards"}`;

const DefaultLoadoutTrayCard = ({
  actions,
  meta,
  name,
  upgradeLevel
}: {
  readonly actions: ReactNode;
  readonly meta: string;
  readonly name: string;
  readonly upgradeLevel: number;
}) => (
  <li className="default-loadout-tray-card">
    <div className="default-loadout-tray-card-copy">
      <div className="card-name-cell">
        <span>{name}</span>
        <UpgradeBadge level={upgradeLevel} />
      </div>
      <small>{meta}</small>
    </div>
    {actions}
  </li>
);

const DefaultLoadoutTrayZone = ({
  children,
  emptyText,
  helperText,
  isExpanded,
  itemCount,
  moreCount,
  onToggleExpanded,
  title,
  zoneId,
  testId
}: {
  readonly children: ReactNode;
  readonly emptyText: string;
  readonly helperText: string;
  readonly isExpanded: boolean;
  readonly itemCount: number;
  readonly moreCount: number;
  readonly onToggleExpanded: () => void;
  readonly title: string;
  readonly zoneId: LoadoutTrayZoneId;
  readonly testId: string;
}) => (
  <section
    className={`default-loadout-tray-zone${
      isExpanded ? " default-loadout-tray-zone-expanded" : ""
    }`}
    data-testid={testId}
  >
    <h3>{title}</h3>
    <p className="default-loadout-tray-helper">{helperText}</p>
    <ol className="default-loadout-tray-list" id={`default-loadout-tray-${zoneId}-list`}>
      {itemCount > 0 ? (
        children
      ) : (
        <li className="default-loadout-tray-empty">
          <span>{emptyText}</span>
        </li>
      )}
    </ol>
    {moreCount > 0 ? (
      <button
        type="button"
        className="default-loadout-tray-more"
        data-testid={`default-loadout-tray-${zoneId}-toggle`}
        aria-controls={`default-loadout-tray-${zoneId}-list`}
        aria-expanded={isExpanded}
        onClick={onToggleExpanded}
      >
        {isExpanded ? "Show less" : `Show ${moreCardsText(moreCount)}`}
      </button>
    ) : null}
  </section>
);

export const DefaultLoadoutTray = ({
  cardName,
  renderLoadoutActions,
  view
}: {
  readonly cardName: (defId: CardDefId) => string;
  readonly renderLoadoutActions: (cardInstanceId: CardInstanceId) => ReactNode;
  readonly view: LoadoutZonesPanelView;
}) => {
  const [expandedZones, setExpandedZones] = useState<
    Partial<Record<LoadoutTrayZoneId, boolean>>
  >({});
  const toggleZoneExpanded = (zoneId: LoadoutTrayZoneId) => {
    setExpandedZones((current) => ({
      ...current,
      [zoneId]: !current[zoneId]
    }));
  };

  const poolIsExpanded = expandedZones.pool === true;
  const boardIsExpanded = expandedZones.board === true;
  const sourcesAreExpanded = expandedZones.sources === true;
  const spellrailIsExpanded = expandedZones.spellrail === true;

  const boardCards = boardIsExpanded
    ? view.boardPlacements
    : view.boardPlacements.slice(0, ACTIVE_ZONE_CARD_LIMIT);
  const sourceCards = sourcesAreExpanded
    ? view.sourceCards
    : view.sourceCards.slice(0, ACTIVE_ZONE_CARD_LIMIT);
  const spellrailCards = spellrailIsExpanded
    ? view.spellrailCards
    : view.spellrailCards.slice(0, ACTIVE_ZONE_CARD_LIMIT);
  const poolCards = poolIsExpanded
    ? view.poolCards
    : view.poolCards.slice(0, POOL_CARD_LIMIT);

  const renderCard = (card: CardInstance, meta: string) => (
    <DefaultLoadoutTrayCard
      key={card.instanceId}
      name={cardName(card.defId)}
      meta={meta}
      upgradeLevel={card.upgradeLevel}
      actions={renderLoadoutActions(card.instanceId)}
    />
  );

  return (
    <section
      className="panel default-loadout-tray"
      data-testid="default-loadout-tray"
      aria-labelledby="default-loadout-tray-heading"
    >
      <div className="default-loadout-tray-header">
        <div>
          <h2 id="default-loadout-tray-heading">Loadout Tray</h2>
          <p className="muted">
            Select, place, and move the cards that shape your next fight.
          </p>
          <p
            className="default-loadout-tray-rule-note"
            data-testid="default-loadout-tray-education"
          >
            Board Charge limits deployed board cards. Source slots limit Sources;
            Spellrail slots hold Techniques.
          </p>
        </div>
        <dl className="default-loadout-tray-resources">
          <div>
            <dt>Board Charge</dt>
            <dd>{view.resourceSummary.boardChargeText}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{view.resourceSummary.sourceSlotsText}</dd>
          </div>
          <div>
            <dt>Combat Charge/sec</dt>
            <dd>{view.resourceSummary.combatChargePerSecondText}</dd>
          </div>
        </dl>
        <details
          className="default-loadout-resource-basics"
          data-testid="default-loadout-resource-basics"
        >
          <summary>Resource basics</summary>
          <ul>
            <li>Board Charge limits how many Board cards you can deploy.</li>
            <li>
              Sources are active resource cards in the Source Row; they raise Board
              Charge, grant Aspect access, and add Combat Charge/sec.
            </li>
            <li>
              Combat Charge/sec is combat energy generated by active Sources for future
              actions and triggers.
            </li>
            <li>Spellrail holds active Techniques until their combat triggers fire.</li>
          </ul>
        </details>
      </div>

      <div className="default-loadout-tray-zones">
        <DefaultLoadoutTrayZone
          title="Pool"
          zoneId="pool"
          testId="default-loadout-tray-pool"
          emptyText="No Pool cards are currently available."
          helperText="Cards waiting to be assigned; use the shown action to place or slot them."
          isExpanded={poolIsExpanded}
          itemCount={poolCards.length}
          moreCount={Math.max(0, view.poolCards.length - POOL_CARD_LIMIT)}
          onToggleExpanded={() => toggleZoneExpanded("pool")}
        >
          {poolCards.map((card) => renderCard(card, "Pool"))}
        </DefaultLoadoutTrayZone>

        <DefaultLoadoutTrayZone
          title="Board"
          zoneId="board"
          testId="default-loadout-tray-board"
          emptyText="No board cards are deployed."
          helperText="Units/Echoes use ground. Relics/Fields use support and still spend Board Charge."
          isExpanded={boardIsExpanded}
          itemCount={boardCards.length}
          moreCount={Math.max(0, view.boardPlacements.length - ACTIVE_ZONE_CARD_LIMIT)}
          onToggleExpanded={() => toggleZoneExpanded("board")}
        >
          {boardCards.map((placement) => (
            <DefaultLoadoutTrayCard
              key={placement.cardInstanceId}
              name={cardName(placement.defId)}
              meta={formatPosition(placement)}
              upgradeLevel={activeCardUpgradeLevel(
                view.activeCards,
                placement.cardInstanceId
              )}
              actions={renderLoadoutActions(placement.cardInstanceId)}
            />
          ))}
        </DefaultLoadoutTrayZone>

        <DefaultLoadoutTrayZone
          title="Sources"
          zoneId="sources"
          testId="default-loadout-tray-sources"
          emptyText="No Source Row cards."
          helperText="Sources fill Source slots, raise Board Charge capacity, and add Combat Charge/sec."
          isExpanded={sourcesAreExpanded}
          itemCount={sourceCards.length}
          moreCount={Math.max(0, view.sourceCards.length - ACTIVE_ZONE_CARD_LIMIT)}
          onToggleExpanded={() => toggleZoneExpanded("sources")}
        >
          {sourceCards.map((card) => renderCard(card, "Source Row"))}
        </DefaultLoadoutTrayZone>

        <DefaultLoadoutTrayZone
          title="Spellrail"
          zoneId="spellrail"
          testId="default-loadout-tray-spellrail"
          emptyText="No Spellrail cards."
          helperText="Techniques use Spellrail slots and wait here for combat triggers."
          isExpanded={spellrailIsExpanded}
          itemCount={spellrailCards.length}
          moreCount={Math.max(0, view.spellrailCards.length - ACTIVE_ZONE_CARD_LIMIT)}
          onToggleExpanded={() => toggleZoneExpanded("spellrail")}
        >
          {spellrailCards.map((card) => renderCard(card, "Spellrail"))}
        </DefaultLoadoutTrayZone>
      </div>
    </section>
  );
};
