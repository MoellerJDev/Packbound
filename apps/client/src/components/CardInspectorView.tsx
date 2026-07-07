import type { CardInspection } from "@packbound/rules";

import { optionalList } from "./formatting";

const CardInspectorDetails = ({
  inspection,
  showLegalActions
}: {
  readonly inspection: CardInspection;
  readonly showLegalActions: boolean;
}) => (
  <>
    <dl className="inspector-stats">
      <div>
        <dt>Cost</dt>
        <dd>{inspection.costText}</dd>
      </div>
      {inspection.statsText ? (
        <div>
          <dt>Stats</dt>
          <dd>{inspection.statsText}</dd>
        </div>
      ) : null}
      {inspection.upgradeText ? (
        <div>
          <dt>Upgrade</dt>
          <dd>{inspection.upgradeText}</dd>
        </div>
      ) : null}
      {inspection.upgradeBonusText ? (
        <div>
          <dt>Upgrade Bonus</dt>
          <dd>{inspection.upgradeBonusText}</dd>
        </div>
      ) : null}
      {inspection.sourceText ? (
        <div>
          <dt>Source</dt>
          <dd>{inspection.sourceText}</dd>
        </div>
      ) : null}
      {inspection.techniqueText ? (
        <div>
          <dt>Technique</dt>
          <dd>{inspection.techniqueText}</dd>
        </div>
      ) : null}
      <div>
        <dt>Keywords</dt>
        <dd>{optionalList(inspection.keywords)}</dd>
      </div>
      <div>
        <dt>Tags</dt>
        <dd>{optionalList(inspection.tags)}</dd>
      </div>
      <div>
        <dt>Traits</dt>
        <dd>{optionalList(inspection.traitNames)}</dd>
      </div>
    </dl>

    {inspection.combatStats ? (
      <div className="inspector-block">
        <h4>Combat Stats</h4>
        <div
          className="stat-chip-row"
          aria-label={`${inspection.name} combat stat chips`}
        >
          {inspection.combatStats.chips.map((chip) => (
            <span key={chip} className="stat-chip">
              {chip}
            </span>
          ))}
        </div>
        <dl className="combat-stat-details">
          {inspection.combatStats.details.map((detail) => (
            <div key={detail.label}>
              <dt>
                {detail.label}: {detail.value}
              </dt>
              <dd>{detail.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    ) : null}

    {inspection.upgradeProgressText ? (
      <div className="inspector-block">
        <h4>Upgrade Progress</h4>
        <p>{inspection.upgradeProgressText}</p>
        {inspection.upgradeProgressDetails ? (
          <ul className="message-list compact">
            {inspection.upgradeProgressDetails.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : null}

    {inspection.rulesText ? (
      <div className="inspector-block">
        <h4>Rules Text</h4>
        <p>{inspection.rulesText}</p>
      </div>
    ) : null}

    {inspection.abilityText.length > 0 ? (
      <div className="inspector-block">
        <h4>Abilities</h4>
        <ul className="message-list compact">
          {inspection.abilityText.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {inspection.design ? (
      <div className="inspector-block">
        <h4>Design</h4>
        <dl className="inspector-stats">
          <div>
            <dt>Role</dt>
            <dd>{inspection.design.role}</dd>
          </div>
          <div>
            <dt>Archetypes</dt>
            <dd>{optionalList(inspection.design.archetypes)}</dd>
          </div>
          <div>
            <dt>Complexity</dt>
            <dd>{inspection.design.complexity}</dd>
          </div>
          <div>
            <dt>Mechanics</dt>
            <dd>{optionalList(inspection.design.mechanicTags)}</dd>
          </div>
        </dl>
      </div>
    ) : null}

    {showLegalActions ? (
      <div className="inspector-block">
        <h4>Legal Actions</h4>
        {inspection.legalActions.length > 0 ? (
          <ul className="message-list compact">
            {inspection.legalActions.map((action) => (
              <li key={action.type}>
                <strong>{action.label}</strong>
                {action.reason ? <span className="muted"> - {action.reason}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No legal action from the current state.</p>
        )}
      </div>
    ) : null}

    {showLegalActions && inspection.blockedReasons.length > 0 ? (
      <div className="inspector-block">
        <h4>Blocked Reasons</h4>
        <ul className="message-list compact">
          {inspection.blockedReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </>
);

const CompactInspectorRuleSummary = ({
  inspection
}: {
  readonly inspection: CardInspection;
}) => {
  const primaryText =
    inspection.rulesText ??
    inspection.abilityText[0] ??
    inspection.techniqueText ??
    inspection.sourceText;
  const secondaryText =
    inspection.rulesText && inspection.abilityText.length > 0
      ? inspection.abilityText[0]
      : undefined;

  if (!primaryText) {
    return null;
  }

  return (
    <div className="compact-inspector-rules" data-testid="compact-inspector-rules">
      <h4>What it does</h4>
      <p>{primaryText}</p>
      {secondaryText ? <p className="muted">{secondaryText}</p> : null}
    </div>
  );
};

export const CardInspectorView = ({
  contextLabel,
  inspection,
  emptyText,
  showLegalActions = true,
  variant = "full"
}: {
  readonly contextLabel?: string;
  readonly inspection: CardInspection | undefined;
  readonly emptyText: string;
  readonly showLegalActions?: boolean;
  readonly variant?: "compact" | "full" | "mini";
}) => {
  if (!inspection) {
    return <p className="muted">{emptyText}</p>;
  }

  if (variant === "mini") {
    return (
      <div className="card-inspector mini-card-inspector">
        <div>
          {contextLabel ? (
            <span className="compact-inspector-context">{contextLabel}</span>
          ) : null}
          <h3>{inspection.name}</h3>
          <p className="muted">
            {inspection.cardType} | {inspection.zone ?? "definition"} |{" "}
            {inspection.aspectText}
          </p>
        </div>
        {inspection.combatStats ? (
          <div
            className="stat-chip-row compact-inspector-chips"
            aria-label={`${inspection.name} combat stat chips`}
          >
            {inspection.combatStats.chips.map((chip) => (
              <span key={chip} className="stat-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <CompactInspectorRuleSummary inspection={inspection} />
        <details className="compact-details card-inspector-details-toggle">
          <summary>Full card details</summary>
          <CardInspectorDetails
            inspection={inspection}
            showLegalActions={showLegalActions}
          />
        </details>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="card-inspector compact-card-inspector">
        <div className="compact-card-inspector-header">
          <div>
            {contextLabel ? (
              <span className="compact-inspector-context">{contextLabel}</span>
            ) : null}
            <h3>{inspection.name}</h3>
            <p className="muted">
              {inspection.cardType} | {inspection.zone ?? "definition"} |{" "}
              {inspection.aspectText}
            </p>
          </div>
        </div>
        {inspection.combatStats ? (
          <div
            className="stat-chip-row compact-inspector-chips"
            aria-label={`${inspection.name} combat stat chips`}
          >
            {inspection.combatStats.chips.map((chip) => (
              <span key={chip} className="stat-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <CompactInspectorRuleSummary inspection={inspection} />
        <dl className="compact-inspector-summary">
          <div>
            <dt>Cost</dt>
            <dd>{inspection.costText}</dd>
          </div>
          {inspection.statsText ? (
            <div>
              <dt>Stats</dt>
              <dd>{inspection.statsText}</dd>
            </div>
          ) : null}
        </dl>
        <details className="compact-details card-inspector-details-toggle">
          <summary>Full card details</summary>
          <CardInspectorDetails
            inspection={inspection}
            showLegalActions={showLegalActions}
          />
        </details>
      </div>
    );
  }

  return (
    <div className="card-inspector">
      <div>
        <h3>{inspection.name}</h3>
        <p className="muted">
          {inspection.cardType} | {inspection.zone ?? "definition"} |{" "}
          {inspection.aspectText}
        </p>
      </div>
      <CardInspectorDetails inspection={inspection} showLegalActions={showLegalActions} />
    </div>
  );
};
