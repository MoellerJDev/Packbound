import type { TraitCount, TraitSummary } from "@packbound/rules";

const traitProgressText = (trait: TraitCount): string => {
  const target =
    trait.nextThreshold?.count ?? trait.activeThreshold?.count ?? trait.count;
  return `${trait.count} / ${target}`;
};

const traitCardNames = (trait: TraitCount): string =>
  trait.cards.map((card) => card.cardName).join(", ");

const TraitListView = ({
  traits,
  emptyText
}: {
  readonly traits: readonly TraitCount[];
  readonly emptyText: string;
}) => {
  if (traits.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ol className="trait-list">
      {traits.map((trait) => (
        <li key={trait.traitId}>
          <div className="trait-row-heading">
            <strong>{trait.name}</strong>
            <span>{traitProgressText(trait)}</span>
          </div>
          {trait.activeThreshold ? (
            <p>
              {trait.activeThreshold.label}: {trait.activeThreshold.description}
            </p>
          ) : trait.nextThreshold ? (
            <p>
              Next {trait.nextThreshold.label}: {trait.nextThreshold.description}
            </p>
          ) : null}
          <small>{traitCardNames(trait)}</small>
        </li>
      ))}
    </ol>
  );
};

export const TraitSummaryView = ({ summary }: { readonly summary: TraitSummary }) => (
  <div className="trait-summary">
    <h3>Active</h3>
    <TraitListView traits={summary.activeTraits} emptyText="No active traits yet." />
    <h3>Near</h3>
    <TraitListView
      traits={summary.nearTraits}
      emptyText="No near-active traits from the current loadout."
    />
  </div>
);
