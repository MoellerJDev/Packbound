import { describe, expect, it } from "vitest";

import { asCardDefId, asPackId } from "@packbound/shared";

import { sampleCards, samplePacks } from "../sampleContent";
import { ContentValidationError, loadContentCatalog } from "../catalog";
import { parseCardDefinitions } from "../schemas";

describe("content validation", () => {
  it("loads the starter Packbound content catalog", () => {
    const catalog = loadContentCatalog({ cards: sampleCards, packs: samplePacks });

    expect(catalog.cardsById.get(asCardDefId("ember_scraprunner"))).toMatchObject({
      name: "Ember Scraprunner",
      cardType: "Unit"
    });
    expect(catalog.packsById.get(asPackId("ember_foundry_pack"))?.name).toBe(
      "Ember Foundry Pack"
    );
  });

  it("rejects invalid card definitions clearly", () => {
    const invalidCard = {
      ...sampleCards[0],
      aspects: ["Copper"]
    };

    expect(() => parseCardDefinitions([invalidCard])).toThrow();
  });

  it("rejects duplicate card ids during catalog loading", () => {
    const duplicateCards = [sampleCards[0], sampleCards[0]];

    expect(() =>
      loadContentCatalog({ cards: duplicateCards, packs: samplePacks })
    ).toThrow(ContentValidationError);
  });
});
