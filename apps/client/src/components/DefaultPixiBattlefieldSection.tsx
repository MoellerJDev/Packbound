import type { ReactNode } from "react";

import type { CardInspection, EngagementPreview } from "@packbound/rules";
import type { BoardPosition } from "@packbound/shared";

import { CardInspectorView } from "./CardInspectorView";
import { CombatModelFactsView } from "./CombatModelFactsView";
import { EngagementPreviewPanel } from "./EngagementPreviewPanel";
import { PixiBattlefieldRenderer } from "./pixi/PixiBattlefieldRenderer";
import type {
  PixiBattlefieldCard,
  PixiBattlefieldModel
} from "./pixi/pixiBattlefieldModel";

export type DefaultPixiBattlefieldView = {
  readonly currentRound: number;
  readonly encounterName: string;
  readonly engagementPreview: EngagementPreview;
  readonly phase: string;
  readonly pixiBattlefieldModel: PixiBattlefieldModel;
  readonly placementCardName: string | undefined;
  readonly playerGold: number;
  readonly playerHealth: number;
  readonly selectedAllyInspection: CardInspection | undefined;
  readonly selectedEnemyInspection: CardInspection | undefined;
};

export type DefaultPixiBattlefieldController = {
  readonly onCellSelect: (position: BoardPosition) => void;
  readonly onTokenSelect: (card: PixiBattlefieldCard) => void;
  readonly renderDebugBoard: () => ReactNode;
};

export const DefaultPixiBattlefieldSection = ({
  controller,
  view
}: {
  readonly controller: DefaultPixiBattlefieldController;
  readonly view: DefaultPixiBattlefieldView;
}) => (
  <section
    className="battlefield-section default-pixi-battlefield-section"
    aria-labelledby="battlefield-heading"
  >
    <div className="battlefield-header">
      <div>
        <h2 id="battlefield-heading">Battlefield</h2>
        <p className="muted">
          Pixi is the primary battlefield for this encounter. Click a token to inspect it,
          then use the panels below to tune the run.
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
          emptyText="Select an ally token, pool, Source Row, or Spellrail card."
        />
      </aside>

      <div className="default-pixi-stage">
        <PixiBattlefieldRenderer
          model={view.pixiBattlefieldModel}
          replayCommands={[]}
          replayStatus="idle"
          replayCommandIndex={0}
          replayResetKey={0}
          replayStepRequestKey={0}
          onTokenSelect={controller.onTokenSelect}
          onCellSelect={controller.onCellSelect}
        />
        {view.placementCardName ? (
          <p className="renderer-placement-hint default-pixi-placement-hint">
            Placing {view.placementCardName}. Click a highlighted Pixi cell.
          </p>
        ) : (
          <p className="default-pixi-placement-note">
            Select a board-placeable Pool card below, then click a highlighted Pixi cell.
          </p>
        )}
        <EngagementPreviewPanel preview={view.engagementPreview} />
        <details className="renderer-debug-board default-pixi-debug-board">
          <summary>React/CSS Debug Board</summary>
          <div className="renderer-debug-board-inner">
            {controller.renderDebugBoard()}
          </div>
        </details>
      </div>

      <aside className="battlefield-inspector enemy">
        <h3>Enemy Inspector</h3>
        <CardInspectorView
          inspection={view.selectedEnemyInspection}
          emptyText="Select an enemy token, Source Row, or Spellrail card."
          showLegalActions={false}
        />
      </aside>
    </div>

    <details className="combat-model-details">
      <summary>Combat Model Notes</summary>
      <CombatModelFactsView />
    </details>
  </section>
);
