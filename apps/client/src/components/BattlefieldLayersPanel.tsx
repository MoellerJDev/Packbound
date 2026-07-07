import type { BattlefieldLayersView } from "@packbound/rules";

const BattlefieldLayerSection = ({
  entries,
  statusText,
  title
}: BattlefieldLayersView["ashes"]) => (
  <section className="battlefield-layer-section">
    <h4>{title}</h4>
    {entries.length > 0 ? (
      <ol className="message-list compact battlefield-layer-list">
        {entries.slice(0, 4).map((entry) => (
          <li key={entry.id}>
            <span>{entry.label}</span>
            <small>{entry.detail}</small>
          </li>
        ))}
      </ol>
    ) : (
      <p className="muted">{statusText}</p>
    )}
    {entries.length > 4 ? (
      <p className="muted">+{entries.length - 4} more layer entries.</p>
    ) : null}
  </section>
);

export const BattlefieldLayersPanel = ({
  view
}: {
  readonly view: BattlefieldLayersView;
}) => (
  <div className="battlefield-layers-panel" data-testid="battlefield-layers-panel">
    <h3>Battlefield Layers</h3>
    <BattlefieldLayerSection {...view.ashes} />
    <BattlefieldLayerSection {...view.wallsAndEdges} />
  </div>
);
