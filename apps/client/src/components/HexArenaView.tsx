import type { ReactNode } from "react";

import type {
  BoardGridCardSummary,
  BoardGridSummary,
  EngagementPreview
} from "@packbound/rules";
import type { CardInstanceId } from "@packbound/shared";

import { BoardGridView } from "./BoardGridView";
import { EngagementPreviewPanel } from "./EngagementPreviewPanel";
import { UpgradeBadge } from "./upgradeBadges";

export type HexArenaViewData = {
  readonly engagementPreview: EngagementPreview;
  readonly encounterBoardGrid: BoardGridSummary | undefined;
  readonly encounterKindText: string;
  readonly playerBoardGrid: BoardGridSummary;
  readonly resourceBoardChargeText: string;
  readonly selectedAllyBoardCardInstanceId: CardInstanceId | undefined;
  readonly selectedEnemyBoardCardInstanceId: CardInstanceId | undefined;
};

export type HexArenaController = {
  readonly onInspectAllyBoardCard: (cardInstanceId: CardInstanceId) => void;
  readonly onInspectEnemyBoardCard: (cardInstanceId: CardInstanceId) => void;
};

const renderPlayerGridCardMeta = (card: BoardGridCardSummary): ReactNode => (
  <>
    <UpgradeBadge level={card.upgradeLevel ?? 0} />
    {card.definitionMissing ? (
      <span className="missing-def-badge">missing def</span>
    ) : null}
  </>
);

const renderEncounterGridCardMeta = (card: BoardGridCardSummary): ReactNode =>
  card.definitionMissing ? <span className="missing-def-badge">missing def</span> : null;

export const HexArenaView = ({
  controller,
  view
}: {
  readonly controller: HexArenaController;
  readonly view: HexArenaViewData;
}) => (
  <div className="battlefield-board" data-testid="hex-arena">
    <div className="hex-arena-heading">
      <h3>Hex Arena</h3>
      <EngagementPreviewPanel preview={view.engagementPreview} />
      <div className="hex-arena-badges" aria-label="Hex arena topology">
        <span>Odd-r hex</span>
        <span>Pointy-top</span>
      </div>
    </div>

    <div className="hex-arena-viewport" data-testid="hex-arena-viewport">
      <div className="battlefield-board-side enemy">
        <div className="board-side-heading">
          <h3>Enemy Hex Board</h3>
          <span>{view.encounterKindText}</span>
        </div>
        <div className="board-orientation" aria-label="Enemy board orientation">
          <span>Enemy side</span>
          <span>Odd-r hex</span>
          <span>Odd rows offset</span>
          <span>Backline r0</span>
          <span>Frontline r3</span>
        </div>
        {view.encounterBoardGrid ? (
          <BoardGridView
            boardSide="playerB"
            engagementPreview={view.engagementPreview}
            summary={view.encounterBoardGrid}
            emptyText="No enemy board cards are placed."
            onInspect={(card) => controller.onInspectEnemyBoardCard(card.cardInstanceId)}
            renderCardMeta={renderEncounterGridCardMeta}
            selectedCardInstanceId={view.selectedEnemyBoardCardInstanceId}
          />
        ) : (
          <p className="muted">No current encounter board to show.</p>
        )}
      </div>

      <div className="battlefield-vs">Engagement Line</div>

      <div className="battlefield-board-side ally">
        <div className="board-side-heading">
          <h3>Ally Hex Board</h3>
          <span>{view.resourceBoardChargeText} Charge</span>
        </div>
        <div className="board-orientation" aria-label="Ally board orientation">
          <span>Your side</span>
          <span>Odd-r hex</span>
          <span>Odd rows offset</span>
          <span>Frontline r0</span>
          <span>Backline r3</span>
        </div>
        <BoardGridView
          boardSide="playerA"
          engagementPreview={view.engagementPreview}
          summary={view.playerBoardGrid}
          emptyText="No player board cards are placed."
          onInspect={(card) => controller.onInspectAllyBoardCard(card.cardInstanceId)}
          renderCardMeta={renderPlayerGridCardMeta}
          selectedCardInstanceId={view.selectedAllyBoardCardInstanceId}
        />
      </div>
    </div>
  </div>
);
