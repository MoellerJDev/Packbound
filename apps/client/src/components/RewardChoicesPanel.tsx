import type { RewardChoice, RewardOfferExplanation } from "@packbound/rules";

const RewardExplanationView = ({
  collapse,
  explanation
}: {
  readonly collapse: boolean;
  readonly explanation: RewardOfferExplanation;
}) =>
  collapse ? (
    <details className="reward-explanation-details">
      <summary className="reward-headline">{explanation.headline}</summary>
      <ul className="reward-reasons">
        {explanation.reasons.map((reason, index) => (
          <li
            key={`${reason.kind}:${index}:${reason.text}`}
            className={`reward-reason ${reason.severity}`}
          >
            {reason.text}
          </li>
        ))}
      </ul>
    </details>
  ) : (
    <>
      <p className="reward-headline">{explanation.headline}</p>
      <ul className="reward-reasons">
        {explanation.reasons.map((reason, index) => (
          <li
            key={`${reason.kind}:${index}:${reason.text}`}
            className={`reward-reason ${reason.severity}`}
          >
            {reason.text}
          </li>
        ))}
      </ul>
    </>
  );

export const RewardChoicesPanel = ({
  collapseExplanations,
  description,
  explanationsByChoiceId,
  onOpenReward,
  playerGold,
  rewardChoices
}: {
  readonly collapseExplanations: boolean;
  readonly description: string;
  readonly explanationsByChoiceId: ReadonlyMap<string, RewardOfferExplanation>;
  readonly onOpenReward: (choiceId: string) => void;
  readonly playerGold: number;
  readonly rewardChoices: readonly RewardChoice[];
}) => (
  <div className="panel">
    <h2>Pack Market</h2>
    <p className="muted">{description}</p>
    <ol className="card-list">
      {rewardChoices.map((choice) => {
        const explanation = explanationsByChoiceId.get(choice.id);

        return (
          <li key={choice.id}>
            <div className="reward-choice-cell">
              <span>{choice.label}</span>
              <small>Cost {choice.cost} gold</small>
              {!choice.affordable ? (
                <small>
                  Need {choice.cost} gold, have {playerGold}
                </small>
              ) : (
                <small>After purchase: {choice.goldAfterPurchase} gold</small>
              )}
              {explanation ? (
                <RewardExplanationView
                  collapse={collapseExplanations}
                  explanation={explanation}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenReward(choice.id)}
              disabled={!choice.affordable}
            >
              Open Pack Offer
            </button>
          </li>
        );
      })}
    </ol>
  </div>
);
