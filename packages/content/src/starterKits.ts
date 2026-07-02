import type {
  Aspect,
  BoardState,
  CardInstance,
  SourceRowState,
  SpellrailState
} from "@packbound/shared";

export type StarterKitDefinition = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly aspects: readonly Aspect[];
  readonly pool: readonly CardInstance[];
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly ashes?: readonly CardInstance[];
  readonly void?: readonly CardInstance[];
  readonly tags?: readonly string[];
};
