import {
  asCardInstanceId,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type PlayerId,
  type Zone
} from "@packbound/shared";

export type CreateCardInstanceInput = {
  readonly defId: CardDefId;
  readonly ownerId: PlayerId;
  readonly zone: Zone;
  readonly instanceId?: CardInstanceId;
  readonly upgradeLevel?: number;
  readonly createdBy?: CardInstanceId;
  readonly isEcho?: boolean;
};

export const createCardInstance = (input: CreateCardInstanceInput): CardInstance => {
  const instanceId =
    input.instanceId ??
    asCardInstanceId(`${input.ownerId}:${input.defId}:${input.zone}:0`);

  const base = {
    instanceId,
    defId: input.defId,
    ownerId: input.ownerId,
    zone: input.zone,
    modifiers: [],
    upgradeLevel: input.upgradeLevel ?? 0
  } satisfies Omit<CardInstance, "createdBy" | "isEcho">;

  return {
    ...base,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.isEcho ? { isEcho: true } : {})
  };
};
