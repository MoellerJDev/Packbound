import type {
  LoadoutAction,
  PostPackLoadoutSuggestion,
  PostPackLoadoutSuggestionSummary
} from "@packbound/rules";
import type { CardInstanceId } from "@packbound/shared";

const priorityLabel = (priority: "high" | "medium" | "low"): string =>
  priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low";

export const PostPackSuggestionsPanel = ({
  summary,
  onApplySuggestion
}: {
  readonly summary: PostPackLoadoutSuggestionSummary;
  readonly onApplySuggestion: (
    cardInstanceId: CardInstanceId,
    action: LoadoutAction
  ) => void;
}) => {
  if (!summary.latestPackName && summary.latestOpenedCardCount === 0) {
    return null;
  }

  const latestPackText = summary.latestPackName
    ? `Latest pack: ${summary.latestPackName} | ${summary.latestOpenedCardCount} new cards`
    : `${summary.latestOpenedCardCount} new cards`;
  const renderActionButton = (suggestion: PostPackLoadoutSuggestion) => {
    const action = suggestion.action;
    if (!action || !summary.editableNow) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => onApplySuggestion(suggestion.cardInstanceId, action)}
        aria-label={`Apply suggested edit: ${suggestion.headline} for ${suggestion.cardName}`}
      >
        {suggestion.headline}
      </button>
    );
  };

  return (
    <div
      className="panel post-pack-suggestions-panel"
      data-testid="post-pack-suggestions-panel"
    >
      <h2>Suggested next edits</h2>
      <p className="muted">{latestPackText}</p>
      {!summary.editableNow ? <p className="flow-note">{summary.emptyText}</p> : null}
      {summary.suggestions.length > 0 ? (
        <ol className="post-pack-suggestion-list">
          {summary.suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="post-pack-suggestion"
              data-testid="post-pack-suggestion"
              data-priority={suggestion.priority}
            >
              <div className="post-pack-suggestion-copy">
                <div className="post-pack-suggestion-header">
                  <span
                    className="post-pack-suggestion-card-name"
                    data-testid="post-pack-suggestion-card-name"
                  >
                    {suggestion.cardName}
                  </span>
                  <span className={`suggestion-priority ${suggestion.priority}`}>
                    {priorityLabel(suggestion.priority)}
                  </span>
                  <small>{suggestion.cardType}</small>
                </div>
                <strong data-testid="post-pack-suggestion-action">
                  {suggestion.headline}
                </strong>
                <p>{suggestion.reason}</p>
                {suggestion.unavailableReason ? (
                  <small>{suggestion.unavailableReason}</small>
                ) : null}
              </div>
              {renderActionButton(suggestion)}
            </li>
          ))}
        </ol>
      ) : summary.editableNow ? (
        <p className="muted">{summary.emptyText}</p>
      ) : null}
    </div>
  );
};
