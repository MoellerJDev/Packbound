import type {
  CommanderDoctrineNodeId,
  CommanderDoctrineNodeView,
  CommanderDoctrineUnlockHistoryEntry,
  RunPhase
} from "@packbound/rules";

export type CommanderDoctrinePanelDensity = "compact" | "full";
export type CommanderDoctrinePanelVariant = "embedded" | "panel" | "renderer-lab-panel";

export type CommanderDoctrinePanelView = {
  readonly claimedThisRound: boolean;
  readonly choices: readonly CommanderDoctrineNodeView[];
  readonly history: readonly CommanderDoctrineUnlockHistoryEntry[];
  readonly legacyUpgradeHistoryCount: number;
  readonly nodes: readonly CommanderDoctrineNodeView[];
  readonly phase: RunPhase;
  readonly points: number;
};

const pathOrder = ["ashbound", "field_architect", "spellrail_conductor"] as const;

const statusText = (node: CommanderDoctrineNodeView): string => {
  switch (node.status) {
    case "unlocked":
      return "Unlocked";
    case "available":
      return "Available";
    case "locked":
      return node.lockedReason ?? "Locked";
  }
};

const panelCopy = (view: CommanderDoctrinePanelView): string => {
  if (view.phase === "reward") {
    if (view.choices.length > 0) {
      return "Spend one doctrine point to unlock a Commander doctrine for this reward.";
    }
    if (view.claimedThisRound) {
      return "Commander doctrine reward claimed for this reward.";
    }
    return "Commander doctrine appears after combat.";
  }

  return view.history.length > 0
    ? "Latest Commander doctrines stay visible here."
    : "Commander doctrine appears after combat.";
};

export const CommanderDoctrinePanel = ({
  density = "full",
  onUnlockDoctrine,
  variant,
  view
}: {
  readonly density?: CommanderDoctrinePanelDensity;
  readonly onUnlockDoctrine: (nodeId: CommanderDoctrineNodeId) => void;
  readonly variant: CommanderDoctrinePanelVariant;
  readonly view: CommanderDoctrinePanelView;
}) => {
  const Heading = variant === "panel" ? "h2" : "h3";
  const latestUnlock = view.history.at(-1);
  if (variant === "panel" && view.phase !== "reward" && view.history.length === 0) {
    return null;
  }

  return (
    <div
      className={`${variant === "panel" || variant === "renderer-lab-panel" ? variant : ""} commander-doctrine-panel ${
        density === "compact" ? "compact-commander-doctrine-panel" : ""
      }`}
      data-testid="commander-doctrine-panel"
    >
      <Heading>Commander Doctrine</Heading>
      <dl className="run-stats">
        <div>
          <dt>Doctrine Points</dt>
          <dd data-testid="commander-doctrine-points">{view.points}</dd>
        </div>
        <div>
          <dt>Unlocked</dt>
          <dd data-testid="commander-doctrine-unlocked-count">
            {view.nodes.filter((node) => node.status === "unlocked").length}
          </dd>
        </div>
      </dl>
      <p className="muted">{panelCopy(view)}</p>
      {view.legacyUpgradeHistoryCount > 0 ? (
        <p className="muted">
          Legacy Commander upgrades preserved: {view.legacyUpgradeHistoryCount}.
        </p>
      ) : null}
      <div className="commander-doctrine-paths">
        {pathOrder.map((path) => {
          const nodes = view.nodes.filter((node) => node.path === path);
          const lockedNodeCount = nodes.filter((node) => node.status === "locked").length;
          const visibleNodes =
            density === "compact"
              ? nodes.filter((node) => node.status !== "locked")
              : nodes;
          const pathLabel = nodes[0]?.pathLabel ?? path;
          return (
            <section key={path} className="commander-doctrine-path">
              <h4>{pathLabel}</h4>
              <ol className="card-list compact">
                {visibleNodes.map((node) => (
                  <li
                    key={node.id}
                    className={`commander-doctrine-node ${node.status}`}
                    data-testid="commander-doctrine-node"
                  >
                    <div className="reward-choice-cell">
                      <span data-testid="commander-doctrine-node-name">
                        {node.displayName}
                      </span>
                      {density === "full" ? <small>{node.description}</small> : null}
                      {density === "full" ? (
                        <small>{node.futureEffectLabel}</small>
                      ) : null}
                      <small data-testid="commander-doctrine-node-status">
                        {statusText(node)}
                      </small>
                    </div>
                    {node.status === "available" && view.choices.length > 0 ? (
                      <button type="button" onClick={() => onUnlockDoctrine(node.id)}>
                        Unlock {node.displayName}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
              {density === "compact" && lockedNodeCount > 0 ? (
                <p className="muted compact-doctrine-locked-summary">
                  +{lockedNodeCount} locked descendant
                  {lockedNodeCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
      {latestUnlock ? (
        <p className="muted" data-testid="commander-latest-doctrine">
          Latest: {latestUnlock.label}, round {latestUnlock.round}.
        </p>
      ) : null}
    </div>
  );
};
