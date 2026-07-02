import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asPackId, asPlayerId } from "@packbound/shared";

import { openPack } from "../packOpening";

const ownerId = asPlayerId("player");

describe("pack opening", () => {
  it("opens the same pack for the same seed", () => {
    const first = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "run-1-pack-1",
      ownerId
    });
    const second = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "run-1-pack-1",
      ownerId
    });

    expect(second).toEqual(first);
  });

  it("respects slot counts and source/support slots", () => {
    const opened = openPack({
      catalog: sampleCatalog,
      packId: asPackId("source_pack"),
      seed: "source-check",
      ownerId
    });

    expect(opened.cards).toHaveLength(5);
    expect(
      opened.slots.filter((slot) => slot.slotType === "sourceOrSupport")
    ).toHaveLength(4);
  });
});
