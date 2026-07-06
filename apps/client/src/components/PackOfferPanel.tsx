import { useEffect, useMemo, useState } from "react";

import type { PendingPackOffer } from "@packbound/rules";
import type { CardDefId, CardInstanceId } from "@packbound/shared";

export const PackOfferPanel = ({
  cardName,
  offer,
  onCommit
}: {
  readonly cardName: (defId: CardDefId) => string;
  readonly offer: PendingPackOffer;
  readonly onCommit: (cardInstanceIds: readonly CardInstanceId[]) => void;
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<readonly CardInstanceId[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
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
          const name = cardName(card.defId);
          const checked = selectedIdSet.has(card.instanceId);
          const disabled = !checked && selectedCount >= offer.pickLimit;

          return (
            <li key={card.instanceId} data-testid="pack-offer-card">
              <label className="pack-offer-card-choice">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleCard(card.instanceId)}
                  aria-label={`Pick ${name}`}
                />
                <span>{name}</span>
              </label>
              <small>
                Offer card {index + 1} | {card.zone}
              </small>
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
