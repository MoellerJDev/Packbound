import type { CardInspection } from "@packbound/rules";

import { CardInspectorView } from "./CardInspectorView";
import { CombatModelFactsView } from "./CombatModelFactsView";
import {
  HexArenaView,
  type HexArenaController,
  type HexArenaViewData
} from "./HexArenaView";

export type BattlefieldSectionView = {
  readonly currentRound: number;
  readonly encounterName: string;
  readonly hexArena: HexArenaViewData;
  readonly isDefaultRoute: boolean;
  readonly phase: string;
  readonly playerGold: number;
  readonly playerHealth: number;
  readonly selectedAllyInspection: CardInspection | undefined;
  readonly selectedEnemyInspection: CardInspection | undefined;
};

export type BattlefieldSectionController = {
  readonly hexArena: HexArenaController;
};

export const BattlefieldSection = ({
  controller,
  view
}: {
  readonly controller: BattlefieldSectionController;
  readonly view: BattlefieldSectionView;
}) => (
  <section className="battlefield-section" aria-labelledby="battlefield-heading">
    <div className="battlefield-header">
      <div>
        <h2 id="battlefield-heading">Battlefield</h2>
        <p className="muted">
          Automatic combat setup for round {view.currentRound}. Inspect one ally and one
          enemy at the same time to compare stats, keywords, and targeting clues.
        </p>
      </div>
      <dl className="battlefield-run-strip">
        <div>
          <dt>Phase</dt>
          <dd>{view.phase}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{view.playerHealth}</dd>
        </div>
        <div>
          <dt>Gold</dt>
          <dd>{view.playerGold}</dd>
        </div>
        <div>
          <dt>Encounter</dt>
          <dd>{view.encounterName}</dd>
        </div>
      </dl>
    </div>

    <div className="battlefield-layout">
      <aside className="battlefield-inspector ally">
        <h3>Ally Inspector</h3>
        <CardInspectorView
          inspection={view.selectedAllyInspection}
          emptyText="Select an ally board, pool, Source Row, or Spellrail card."
        />
      </aside>

      <HexArenaView controller={controller.hexArena} view={view.hexArena} />

      <aside className="battlefield-inspector enemy">
        <h3>Enemy Inspector</h3>
        <CardInspectorView
          inspection={view.selectedEnemyInspection}
          emptyText="Select an enemy board, Source Row, or Spellrail card."
          showLegalActions={false}
        />
      </aside>
    </div>

    {view.isDefaultRoute ? (
      <details className="combat-model-details">
        <summary>Combat Model Notes</summary>
        <CombatModelFactsView />
      </details>
    ) : (
      <CombatModelFactsView />
    )}
  </section>
);
