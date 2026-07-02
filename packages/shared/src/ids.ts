export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CardDefId = Brand<string, "CardDefId">;
export type CardInstanceId = Brand<string, "CardInstanceId">;
export type UnitInstanceId = Brand<string, "UnitInstanceId">;
export type PermanentInstanceId = Brand<string, "PermanentInstanceId">;
export type TerrainInstanceId = Brand<string, "TerrainInstanceId">;
export type PlayerId = Brand<string, "PlayerId">;
export type RunId = Brand<string, "RunId">;
export type CombatId = Brand<string, "CombatId">;
export type PackId = Brand<string, "PackId">;

export const asCardDefId = (value: string): CardDefId => value as CardDefId;
export const asCardInstanceId = (value: string): CardInstanceId =>
  value as CardInstanceId;
export const asUnitInstanceId = (value: string): UnitInstanceId =>
  value as UnitInstanceId;
export const asPlayerId = (value: string): PlayerId => value as PlayerId;
export const asRunId = (value: string): RunId => value as RunId;
export const asPackId = (value: string): PackId => value as PackId;
