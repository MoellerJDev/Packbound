import type {
  CommanderUpgradeChoice,
  CommanderUpgradeHistoryEntry,
  CommanderUpgradeId,
  RunPhase
} from "@packbound/rules";

export type CommanderUpgradePanelVariant = "panel" | "renderer-lab-panel";

export type CommanderUpgradePanelView = {
  readonly choices: readonly CommanderUpgradeChoice[];
  readonly currentLevel: number;
  readonly effectiveRebindTax: number;
  readonly history: readonly CommanderUpgradeHistoryEntry[];
  readonly phase: RunPhase;
  readonly rawRebindTax: number;
  readonly rebindTaxDiscount: number;
};

export const CommanderUpgradePanel = ({
  onApplyUpgrade,
  variant,
  view
}: {
  readonly onApplyUpgrade: (choiceId: CommanderUpgradeId) => void;
  readonly variant: CommanderUpgradePanelVariant;
  readonly view: CommanderUpgradePanelView;
}) => {
  const Heading = variant === "panel" ? "h2" : "h3";
  const latestUpgrade = view.history.at(-1);
  if (variant === "panel" && view.phase !== "reward" && view.history.length === 0) {
    return null;
  }

  return (
    <div className={variant} data-testid="commander-upgrade-panel">
      <Heading>Commander Upgrades</Heading>
      <dl className="run-stats">
        <div>
          <dt>Current Level</dt>
          <dd data-testid="commander-upgrade-panel-level">Lv {view.currentLevel}</dd>
        </div>
        <div>
          <dt>Raw Tax</dt>
          <dd>+{view.rawRebindTax} Charge</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>-{view.rebindTaxDiscount} Charge</dd>
        </div>
        <div>
          <dt>Effective Tax</dt>
          <dd data-testid="commander-upgrade-effective-tax">
            +{view.effectiveRebindTax} Charge
          </dd>
        </div>
        <div>
          <dt>History</dt>
          <dd data-testid="commander-upgrade-history-count">{view.history.length}</dd>
        </div>
      </dl>
      <p className="muted">
        {view.phase === "reward"
          ? view.choices.length > 0
            ? "Choose one Commander upgrade for this reward. It applies only to the Commander."
            : "Commander upgrade claimed for this reward."
          : view.history.length > 0
            ? "Latest Commander upgrades stay visible here."
            : "Commander upgrades appear after combat."}
      </p>
      {view.choices.length > 0 ? (
        <ol className="card-list compact">
          {view.choices.map((choice) => (
            <li key={choice.id}>
              <div className="reward-choice-cell">
                <span>{choice.label}</span>
                <small>{choice.effectText}</small>
              </div>
              <button type="button" onClick={() => onApplyUpgrade(choice.id)}>
                Apply {choice.label}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      {latestUpgrade ? (
        <p className="muted" data-testid="commander-latest-upgrade">
          Latest: {latestUpgrade.label}, round {latestUpgrade.round}.
        </p>
      ) : null}
    </div>
  );
};
