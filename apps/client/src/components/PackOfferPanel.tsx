import { useEffect, useMemo, useState } from "react";

import type { PendingPackOffer } from "@packbound/rules";
import type { CardInstanceId } from "@packbound/shared";

import {
  emptyPackOfferCardView,
  type PackOfferCardView
} from "../viewModels/packOfferCardView";

export const PackOfferPanel = ({
  cardViews,
  offer,
  onCommit
}: {
  readonly cardViews: readonly PackOfferCardView[];
  readonly offer: PendingPackOffer;
  readonly onCommit: (cardInstanceIds: readonly CardInstanceId[]) => void;
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<readonly CardInstanceId[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const cardViewsById = useMemo(
    () => new Map(cardViews.map((cardView) => [cardView.cardInstanceId, cardView])),
    [cardViews]
  );
  const selectedCount = selectedCardIds.length;

  useEffect(() => {
    setSelectedCardIds([]);
  }, [offer.id]);

  const toggleCard = (cardInstanceId: CardInstanceId) => {
    setSelectedCardIds((current) => {
      if (current.includes(cardInstanceId)) {
        return current.filter((id) => id !== cardInstanceId);
      }
      if (current.length >= offer.pickLimit) {
        return current;
      }
      return [...current, cardInstanceId];
    });
  };

  return (
    <div className="panel pack-offer-panel" data-testid="pack-offer-panel">
      <h2>Pack Offer</h2>
      <p className="muted">
        {offer.packName}: pick {offer.pickLimit} of {offer.cards.length}. Paid{" "}
        {offer.cost} gold ({offer.goldBefore} {"->"} {offer.goldAfter}).
      </p>
      <ol className="card-list pack-offer-card-list">
        {offer.cards.map((card, index) => {
          const cardView =
            cardViewsById.get(card.instanceId) ?? emptyPackOfferCardView(card.instanceId);
          const name = cardView.name;
          const checked = selectedIdSet.has(card.instanceId);
          const disabled = !checked && selectedCount >= offer.pickLimit;

          return (
            <li
              key={card.instanceId}
              className="pack-offer-card"
              data-testid="pack-offer-card"
            >
              <div className="pack-offer-card-copy">
                <label className="pack-offer-card-choice">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleCard(card.instanceId)}
                    aria-label={`Pick ${name}`}
                  />
                  <span data-testid="pack-offer-card-name">{name}</span>
                </label>
                <small>
                  Offer card {index + 1} | {card.zone}
                </small>
                <div
                  className="pack-offer-card-facts"
                  data-testid="pack-offer-card-facts"
                >
                  <small>{cardView.metaText}</small>
                  <small>Cost: {cardView.costText}</small>
                  {cardView.statsText ? <small>Stats: {cardView.statsText}</small> : null}
                  {cardView.effectText ? (
                    <small>Effect: {cardView.effectText}</small>
                  ) : null}
                </div>
                <p
                  className={`pack-offer-fit ${cardView.fitTone}`}
                  data-testid="pack-offer-fit"
                >
                  {cardView.fitText}
                </p>
                <details className="compact-details pack-offer-details">
                  <summary>Full card details</summary>
                  <ul className="message-list compact">
                    {cardView.detailLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="button-row">
        <button
          type="button"
          onClick={() => onCommit(selectedCardIds)}
          disabled={selectedCount !== offer.pickLimit}
        >
          Commit Pack Picks
        </button>
        <small data-testid="pack-offer-pick-count">
          Selected {selectedCount} / {offer.pickLimit}
        </small>
      </div>
      <p className="muted">
        Chosen cards enter Pool. Unchosen offer cards are released and do not join this
        run.
      </p>
    </div>
  );
};
