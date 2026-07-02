import type { BoardPosition } from "./board";
import type { CardInstanceId } from "./ids";

export type ActiveTeamup = {
  readonly teamupId: string;
  readonly count: number;
  readonly tier: number;
  readonly sourceInstanceIds: readonly CardInstanceId[];
};

export type ValidationError = {
  readonly code: string;
  readonly message: string;
  readonly cardInstanceId?: CardInstanceId;
  readonly position?: BoardPosition;
};

export type ValidationWarning = {
  readonly code: string;
  readonly message: string;
  readonly cardInstanceId?: CardInstanceId;
  readonly position?: BoardPosition;
};

export type ValidationResult = {
  readonly ok: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
};
