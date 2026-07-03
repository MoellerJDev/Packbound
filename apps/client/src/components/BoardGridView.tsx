import type { ReactNode } from "react";

import type {
  BoardGridCardSummary,
  BoardGridSummary,
  EngagementPreview,
  EngagementPreviewSide
} from "@packbound/rules";
import type { BoardPosition, CardInstanceId } from "@packbound/shared";

const cardTypeClass = (card: BoardGridCardSummary): string =>
  `card-${card.cardType.toLowerCase()}`;

const compactCardName = (name: string): string => {
  if (name.length <= 16) {
    return name;
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0]} ${words
      .slice(1)
      .map((word) => word[0])
      .join("")}.`;
  }

  return `${name.slice(0, 13)}.`;
};

const boardStatChips = (card: BoardGridCardSummary): readonly string[] =>
  card.combatStats?.chips.slice(0, 4) ?? [];

const sameCoordinate = (
  left: Pick<BoardPosition, "row" | "col">,
  right: Pick<BoardPosition, "row" | "col">
): boolean => left.row === right.row && left.col === right.col;

export const BoardGridView = ({
  boardSide,
  engagementPreview,
  summary,
  emptyText,
  onInspect,
  renderCardMeta,
  selectedCardInstanceId
}: {
  readonly boardSide: EngagementPreviewSide;
  readonly engagementPreview: EngagementPreview;
  readonly summary: BoardGridSummary;
  readonly emptyText: string;
  readonly onInspect: (card: BoardGridCardSummary) => void;
  readonly renderCardMeta?: (card: BoardGridCardSummary) => ReactNode;
  readonly selectedCardInstanceId?: CardInstanceId | undefined;
}) => {
  const occupiedCount = summary.cells.reduce(
    (count, cell) => count + cell.cards.length,
    0
  );
  const hasEngagementPreview = engagementPreview.selected !== undefined;
  const rows = Array.from({ length: summary.rows }, (_, row) =>
    summary.cells.filter((cell) => cell.row === row)
  );

  return (
    <div className="board-grid-wrap">
      <div
        className={`board-grid hex-board-grid offset-${summary.layout.offsetMode} ${
          hasEngagementPreview ? "has-preview" : ""
        }`}
        aria-label={`${summary.layout.offsetMode} offset hex board`}
      >
        {rows.map((rowCells, row) => (
          <div
            key={`row:${row}`}
            className={`board-grid-row ${rowCells[0]?.isOffsetRow ? "offset" : ""}`}
          >
            {rowCells.map((cell) => {
              const coordinate = { row: cell.row, col: cell.col };
              const isRangeCell =
                engagementPreview.selected?.side === boardSide &&
                engagementPreview.rangeCells.some((position) =>
                  sameCoordinate(position, coordinate)
                );
              const isSelectedCell =
                engagementPreview.selected?.side === boardSide &&
                sameCoordinate(engagementPreview.selected.position, coordinate);
              const isLikelyTargetCell =
                engagementPreview.likelyTarget?.side === boardSide &&
                sameCoordinate(engagementPreview.likelyTarget.position, coordinate);
              const isNextMoveCell =
                engagementPreview.selected?.side === boardSide &&
                engagementPreview.nextMove !== undefined &&
                sameCoordinate(engagementPreview.nextMove.to, coordinate);
              const isBlockedSelectedCell =
                isSelectedCell && engagementPreview.blockedMovementReason !== undefined;
              const isTargetInRangeCell =
                isLikelyTargetCell && engagementPreview.likelyTarget?.inRange === true;
              const isTargetOutOfRangeCell =
                isLikelyTargetCell && engagementPreview.likelyTarget?.inRange === false;
              const isPreviewFocusCell =
                isRangeCell || isSelectedCell || isLikelyTargetCell || isNextMoveCell;
              const isPreviewQuietCell = hasEngagementPreview && !isPreviewFocusCell;

              return (
                <div
                  key={`${cell.row}:${cell.col}`}
                  data-testid="board-cell"
                  className={`board-grid-cell ${
                    cell.cards.length === 0 ? "empty" : "occupied"
                  } ${cell.isOffsetRow ? "offset-row" : ""} ${
                    isRangeCell ? "preview-range" : ""
                  } ${isSelectedCell ? "preview-selected" : ""} ${
                    isLikelyTargetCell ? "preview-target" : ""
                  } ${
                    isTargetInRangeCell ? "preview-target-in-range" : ""
                  } ${isTargetOutOfRangeCell ? "preview-target-out-of-range" : ""} ${
                    isNextMoveCell ? "preview-next-move" : ""
                  } ${isBlockedSelectedCell ? "preview-blocked" : ""} ${
                    hasEngagementPreview
                      ? isPreviewQuietCell
                        ? "preview-quiet"
                        : "preview-active"
                      : ""
                  }`}
                  data-occupied={cell.cards.length > 0 ? "true" : "false"}
                  data-range-preview={isRangeCell ? "true" : "false"}
                  data-selected-preview={isSelectedCell ? "true" : "false"}
                  data-likely-target={isLikelyTargetCell ? "true" : "false"}
                  data-target-in-range={isTargetInRangeCell ? "true" : "false"}
                  data-target-out-of-range={isTargetOutOfRangeCell ? "true" : "false"}
                  data-next-move={isNextMoveCell ? "true" : "false"}
                  data-movement-blocked={isBlockedSelectedCell ? "true" : "false"}
                  data-preview-quiet={isPreviewQuietCell ? "true" : "false"}
                >
                  <div className="board-grid-coordinate">
                    r{cell.row} c{cell.col}
                  </div>
                  {isSelectedCell ? (
                    <span className="board-preview-marker selected">Selected</span>
                  ) : null}
                  {isRangeCell &&
                  !isSelectedCell &&
                  !isLikelyTargetCell &&
                  !isNextMoveCell ? (
                    <span className="board-preview-marker range">Range</span>
                  ) : null}
                  {isLikelyTargetCell ? (
                    <>
                      <span
                        className={`board-preview-marker target-label ${
                          isTargetInRangeCell ? "in-range" : "out-of-range"
                        }`}
                      >
                        Target
                      </span>
                      <span
                        className={`board-preview-marker target-status ${
                          isTargetInRangeCell ? "in-range" : "out-of-range"
                        }`}
                      >
                        {isTargetInRangeCell ? "Attack" : "Out of range"}
                      </span>
                    </>
                  ) : null}
                  {isNextMoveCell ? (
                    <span className="board-preview-marker move">Next move</span>
                  ) : null}
                  {isBlockedSelectedCell ? (
                    <span className="board-preview-marker blocked">Blocked</span>
                  ) : null}
                  {cell.cards.length > 0 ? (
                    cell.cards.map((card) => (
                      <button
                        key={card.cardInstanceId}
                        type="button"
                        data-testid="board-card"
                        className={`board-grid-layer ${card.layer} ${cardTypeClass(
                          card
                        )} ${
                          selectedCardInstanceId === card.cardInstanceId ? "selected" : ""
                        }`}
                        aria-label={`Inspect ${card.name} ${card.layer} r${cell.row} c${cell.col}`}
                        title={`${card.name} | ${card.cardType} | ${card.layer} | r${cell.row} c${cell.col}`}
                        onClick={() => onInspect(card)}
                      >
                        <span className="board-grid-layer-label">
                          {card.layer} {card.cardType}
                        </span>
                        <span className="board-grid-card-name">
                          {compactCardName(card.name)}
                        </span>
                        {boardStatChips(card).length > 0 ? (
                          <div
                            className="board-stat-chips"
                            aria-label={`${card.name} combat stats`}
                          >
                            {boardStatChips(card).map((chip) => (
                              <span key={chip} className="stat-chip compact">
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {renderCardMeta ? (
                          <span className="board-grid-meta">{renderCardMeta(card)}</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <span className="board-grid-empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {occupiedCount === 0 ? <p className="muted board-grid-note">{emptyText}</p> : null}
    </div>
  );
};
