import type { EncounterDefinition } from "@packbound/content";

import type { DefaultRunRouteController } from "../defaultRunRouteTypes";

type CurrentEncounterDetailsProps = {
  readonly encounter: EncounterDefinition | undefined;
  readonly controller: DefaultRunRouteController;
};

export const CurrentEncounterDetails = ({
  encounter,
  controller
}: CurrentEncounterDetailsProps) => (
  <>
    <dl className="run-stats">
      <div>
        <dt>Name</dt>
        <dd>{encounter?.name ?? "None"}</dd>
      </div>
      <div>
        <dt>Kind</dt>
        <dd>{encounter?.kind ?? "none"}</dd>
      </div>
      <div>
        <dt>Difficulty</dt>
        <dd>{encounter?.difficulty ?? "-"}</dd>
      </div>
      <div>
        <dt>Opponent Board</dt>
        <dd>{encounter ? "Inspect in battlefield" : "-"}</dd>
      </div>
    </dl>
    {encounter ? (
      <div className="encounter-loadout">
        <h3>Opponent Board</h3>
        <ol className="card-list compact">
          {encounter.loadout.board.placements.map((placement) => (
            <li key={placement.cardInstanceId}>
              <span>{controller.cardName(placement.defId)}</span>
              <small>
                r{placement.position.row} c{placement.position.col}{" "}
                {placement.position.layer}
              </small>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  controller.onInspectEncounterBoard(placement.cardInstanceId)
                }
              >
                Inspect
              </button>
            </li>
          ))}
        </ol>
        <h3>Opponent Source Row</h3>
        <ol className="card-list compact">
          {encounter.loadout.sourceRow.cards.map((card) => (
            <li key={card.instanceId}>
              <span>{controller.cardName(card.defId)}</span>
              <small>{card.zone}</small>
              <button
                type="button"
                className="secondary"
                onClick={() => controller.onInspectEncounterSource(card.instanceId)}
              >
                Inspect
              </button>
            </li>
          ))}
        </ol>
        <h3>Opponent Spellrail</h3>
        <ol className="card-list compact">
          {encounter.loadout.spellrail.cards.length > 0 ? (
            encounter.loadout.spellrail.cards.map((card) => (
              <li key={card.instanceId}>
                <span>{controller.cardName(card.defId)}</span>
                <small>{card.zone}</small>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => controller.onInspectEncounterSpellrail(card.instanceId)}
                >
                  Inspect
                </button>
              </li>
            ))
          ) : (
            <li>
              <span>None</span>
            </li>
          )}
        </ol>
      </div>
    ) : null}
  </>
);
