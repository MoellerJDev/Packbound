import type { CommanderLifecycleHistoryEntry } from "@packbound/rules";

export type CommandZonePanelVariant = "panel" | "renderer-lab-panel";

export type CommandZonePanelView = {
  readonly boardChargeAfterDeploy: number;
  readonly boardChargeCapacity: number;
  readonly blockedReasons: readonly string[];
  readonly commanderName: string;
  readonly deployBoardCharge: number;
  readonly deployCount: number;
  readonly effectiveRebindTax: number;
  readonly hasCommander: boolean;
  readonly lifecycleEntries: readonly CommanderLifecycleHistoryEntry[];
  readonly rawRebindTax: number;
  readonly rebindTaxDiscount: number;
  readonly baseBoardCharge: number;
  readonly upgradeLevel: number;
  readonly zone: string;
};

const formatCommanderLifecycleSource = (
  source: CommanderLifecycleHistoryEntry["source"]
): string =>
  source
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const formatCommanderLifecycleMovement = (
  entry: CommanderLifecycleHistoryEntry
): string => {
  if (entry.fromZone && entry.toZone) {
    return `${entry.fromZone} -> ${entry.toZone}`;
  }
  if (entry.toZone) {
    return `to ${entry.toZone}`;
  }
  if (entry.fromZone) {
    return `from ${entry.fromZone}`;
  }
  return "zone unchanged";
};

const formatCommanderLifecycleDelta = (entry: CommanderLifecycleHistoryEntry): string => {
  const deltas = [
    entry.deployCountBefore !== entry.deployCountAfter
      ? `Deploys ${entry.deployCountBefore} -> ${entry.deployCountAfter}`
      : "",
    entry.rebindTaxBefore !== entry.rebindTaxAfter
      ? `Raw Tax +${entry.rebindTaxBefore} -> +${entry.rebindTaxAfter}`
      : "",
    entry.rebindTaxDiscountBefore !== entry.rebindTaxDiscountAfter
      ? `Discount -${entry.rebindTaxDiscountBefore} -> -${entry.rebindTaxDiscountAfter}`
      : "",
    entry.effectiveRebindTaxBefore !== entry.effectiveRebindTaxAfter
      ? `Effective +${entry.effectiveRebindTaxBefore} -> +${entry.effectiveRebindTaxAfter}`
      : "",
    entry.upgradeLevelBefore !== entry.upgradeLevelAfter
      ? `Level ${entry.upgradeLevelBefore} -> ${entry.upgradeLevelAfter}`
      : ""
  ].filter((delta) => delta.length > 0);

  return deltas.length > 0 ? deltas.join(" | ") : "State recorded";
};

const CommanderLifecycleContent = ({
  entries
}: {
  readonly entries: readonly CommanderLifecycleHistoryEntry[];
}) =>
  entries.length > 0 ? (
    <ol className="message-list compact commander-lifecycle-list">
      {entries.map((entry) => (
        <li key={entry.id} data-testid="commander-lifecycle-entry">
          <span className="commander-lifecycle-primary">{entry.label}</span>
          <small className="commander-lifecycle-meta">
            Round {entry.round} | {formatCommanderLifecycleSource(entry.source)} | Phase{" "}
            {entry.phase} | {formatCommanderLifecycleMovement(entry)}
          </small>
          <small className="commander-lifecycle-meta">
            {formatCommanderLifecycleDelta(entry)}
          </small>
        </li>
      ))}
    </ol>
  ) : (
    <p className="muted">No Commander lifecycle events recorded.</p>
  );

export const CommandZonePanel = ({
  isDefaultRoute,
  onDeploy,
  onInspect,
  onReturn,
  returnDisabled,
  deployDisabled,
  variant,
  view
}: {
  readonly isDefaultRoute: boolean;
  readonly onDeploy: () => void;
  readonly onInspect: () => void;
  readonly onReturn: () => void;
  readonly deployDisabled: boolean;
  readonly returnDisabled: boolean;
  readonly variant: CommandZonePanelVariant;
  readonly view: CommandZonePanelView;
}) => {
  const Heading = variant === "panel" ? "h2" : "h3";
  const compactDefaultPanel = variant === "panel" && isDefaultRoute;

  return (
    <div
      className={`${variant} ${compactDefaultPanel ? "compact-command-zone" : ""}`}
      data-testid="command-zone-panel"
    >
      <Heading>Command Zone</Heading>
      <dl className="run-stats">
        <div>
          <dt>Commander</dt>
          <dd data-testid="command-zone-card-name">{view.commanderName}</dd>
        </div>
        <div>
          <dt>Zone</dt>
          <dd data-testid="command-zone-location">{view.zone}</dd>
        </div>
        <div>
          <dt>Deploy Count</dt>
          <dd data-testid="commander-deploy-count">{view.deployCount}</dd>
        </div>
        {!compactDefaultPanel ? (
          <div>
            <dt>Upgrade Level</dt>
            <dd data-testid="commander-upgrade-level">Lv {view.upgradeLevel}</dd>
          </div>
        ) : null}
        {!compactDefaultPanel ? (
          <div>
            <dt>Raw Rebind Tax</dt>
            <dd data-testid="commander-raw-rebind-tax">+{view.rawRebindTax} Charge</dd>
          </div>
        ) : null}
        {!compactDefaultPanel ? (
          <div>
            <dt>Tax Discount</dt>
            <dd data-testid="commander-rebind-discount">
              -{view.rebindTaxDiscount} Charge
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Effective Rebind Tax</dt>
          <dd data-testid="commander-rebind-tax">+{view.effectiveRebindTax} Charge</dd>
        </div>
        <div>
          <dt>Deploy Cost</dt>
          <dd data-testid="commander-deploy-cost">
            {view.baseBoardCharge} base + {view.effectiveRebindTax} tax ={" "}
            {view.deployBoardCharge} Charge
          </dd>
        </div>
        <div>
          <dt>Board Charge After Deploy</dt>
          <dd data-testid="commander-board-charge-after-deploy">
            {view.boardChargeAfterDeploy} / {view.boardChargeCapacity}
          </dd>
        </div>
      </dl>
      <p className="muted">
        Prototype Commander. Effective Rebind Tax is enforced as generic Board Charge
        while deployed.
      </p>
      {compactDefaultPanel ? (
        <details
          className="commander-lifecycle compact-details"
          data-testid="commander-lifecycle-panel"
        >
          <summary>Commander History</summary>
          <CommanderLifecycleContent entries={view.lifecycleEntries} />
        </details>
      ) : (
        <div className="commander-lifecycle" data-testid="commander-lifecycle-panel">
          <h4>Commander Lifecycle</h4>
          <CommanderLifecycleContent entries={view.lifecycleEntries} />
        </div>
      )}
      <div className="mini-actions">
        <button
          type="button"
          className="secondary"
          onClick={onInspect}
          disabled={!view.hasCommander}
        >
          Inspect
        </button>
        <button type="button" onClick={onDeploy} disabled={deployDisabled}>
          Deploy Commander
        </button>
        <button type="button" onClick={onReturn} disabled={returnDisabled}>
          Return to Command
        </button>
      </div>
      {view.blockedReasons.length > 0 ? (
        <ul className="message-list compact">
          {view.blockedReasons.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
