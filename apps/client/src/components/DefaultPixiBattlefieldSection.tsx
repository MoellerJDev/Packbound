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
  readonly placementHint: DefaultPixiPlacementHintView;
  readonly playerGold: number;
  readonly playerHealth: number;
  readonly selectedAllyInspection: CardInspection | undefined;
  readonly selectedEnemyInspection: CardInspection | undefined;
};

export type DefaultPixiPlacementHintView =
  | { readonly mode: "idle" }
  | { readonly mode: "ready"; readonly cardName: string }
  | {
      readonly mode: "blockedCell";
      readonly cardName: string;
      readonly positionText: string;
      readonly reason: string;
    }
  | {
      readonly mode: "blocked";
      readonly cardName: string;
      readonly reason: string;
    };

export type DefaultPixiBattlefieldController = {
  readonly onCellSelect: (position: BoardPosition) => void;
  readonly onBlockedCellSelect?: (position: BoardPosition) => void;
  readonly onTokenSelect: (card: PixiBattlefieldCard) => void;
  readonly renderDebugBoard: () => ReactNode;
};

const DefaultPixiPlacementHint = ({
  hint
}: {
  readonly hint: DefaultPixiPlacementHintView;
}) => {
  if (hint.mode === "ready") {
    return (
      <p
        className="renderer-placement-hint default-pixi-placement-hint"
        data-testid="default-pixi-placement-hint"
      >
        Placing {hint.cardName}. Click a highlighted Pixi cell.
      </p>
    );
  }

  if (hint.mode === "blocked") {
    return (
      <p
        className="default-pixi-placement-note blocked"
        data-testid="default-pixi-placement-hint"
      >
        Cannot place {hint.cardName}: {hint.reason}
      </p>
    );
  }

  if (hint.mode === "blockedCell") {
    return (
      <p
        className="default-pixi-placement-note blocked"
        data-testid="default-pixi-placement-hint"
      >
        Cannot place {hint.cardName} at {hint.positionText}: {hint.reason}
      </p>
    );
  }

  return (
    <p className="default-pixi-placement-note" data-testid="default-pixi-placement-hint">
      Select a board-placeable Pool card below, then click a highlighted Pixi cell.
    </p>
  );
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
          {...(controller.onBlockedCellSelect
            ? { onBlockedCellSelect: controller.onBlockedCellSelect }
            : {})}
        />
        <DefaultPixiPlacementHint hint={view.placementHint} />
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
