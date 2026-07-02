import { describe, expect, it } from "vitest";

import { asCardDefId, asPackId } from "@packbound/shared";

import { sampleCards, sampleEncounters, samplePacks } from "../sampleContent";
import { ContentValidationError, loadContentCatalog } from "../catalog";
import { parseCardDefinitions } from "../schemas";

describe("content validation", () => {
  it("loads the starter Packbound content catalog", () => {
    const catalog = loadContentCatalog({
      cards: sampleCards,
      packs: samplePacks,
      encounters: sampleEncounters
    });

    expect(catalog.cardsById.get(asCardDefId("ember_scraprunner"))).toMatchObject({
      name: "Ember Scraprunner",
      cardType: "Unit"
    });
    expect(catalog.packsById.get(asPackId("ember_foundry_pack"))?.name).toBe(
      "Ember Foundry Pack"
    );
    expect(catalog.encountersById.get("early_ember_pressure")).toMatchObject({
      name: "Ember Pressure Crew",
      kind: "normal"
    });
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

  it("rejects effect references to missing card definitions", () => {
    const brokenCards = sampleCards.map((card) =>
      card.id === asCardDefId("signal_nest")
        ? {
            ...card,
            abilities: [
              {
                ...card.abilities[0],
                effect: {
                  type: "SummonEcho",
                  cardDefId: asCardDefId("missing_echo"),
                  placement: "Backline"
                }
              }
            ]
          }
        : card
    );

    expect(() => loadContentCatalog({ cards: brokenCards, packs: samplePacks })).toThrow(
      ContentValidationError
    );
  });

  it("rejects summon effects that reference non-unit content", () => {
    const brokenCards = sampleCards.map((card) =>
      card.id === asCardDefId("signal_nest")
        ? {
            ...card,
            abilities: [
              {
                ...card.abilities[0],
                effect: {
                  type: "SummonEcho",
                  cardDefId: asCardDefId("ember_source"),
                  placement: "Backline"
                }
              }
            ]
          }
        : card
    );

    expect(() => loadContentCatalog({ cards: brokenCards, packs: samplePacks })).toThrow(
      ContentValidationError
    );
  });

  it("rejects duplicate encounter ids during catalog loading", () => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [sampleEncounters[0], sampleEncounters[0]]
      })
    ).toThrow(ContentValidationError);
  });

  it("rejects encounter references to missing card definitions", () => {
    const encounter = sampleEncounters[0];
    if (!encounter) {
      throw new Error("Expected a sample encounter");
    }
    const placement = encounter.loadout.board.placements[0];
    if (!placement) {
      throw new Error("Expected a sample encounter placement");
    }

    const brokenEncounter = {
      ...encounter,
      loadout: {
        ...encounter.loadout,
        board: {
          placements: [
            {
              ...placement,
              defId: asCardDefId("missing_encounter_card")
            }
          ]
        }
      }
    };

    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [brokenEncounter]
      })
    ).toThrow(ContentValidationError);
  });

  it.each([
    {
      name: "board",
      update: () => {
        const encounter = sampleEncounters[0];
        const placement = encounter?.loadout.board.placements[0];
        if (!encounter || !placement) {
          throw new Error("Expected a sample encounter placement");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            board: {
              placements: [
                {
                  ...placement,
                  defId: asCardDefId("ember_source")
                }
              ]
            }
          }
        };
      }
    },
    {
      name: "source row",
      update: () => {
        const encounter = sampleEncounters[0];
        const source = encounter?.loadout.sourceRow.cards[0];
        if (!encounter || !source) {
          throw new Error("Expected a sample encounter source");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            sourceRow: {
              ...encounter.loadout.sourceRow,
              cards: [{ ...source, defId: asCardDefId("ember_scraprunner") }]
            }
          }
        };
      }
    },
    {
      name: "spellrail",
      update: () => {
        const encounter = sampleEncounters[0];
        const technique = encounter?.loadout.spellrail.cards[0];
        if (!encounter || !technique) {
          throw new Error("Expected a sample encounter technique");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            spellrail: {
              ...encounter.loadout.spellrail,
              cards: [{ ...technique, defId: asCardDefId("ember_scraprunner") }]
            }
          }
        };
      }
    }
  ])("rejects invalid encounter $name cards", ({ update }) => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [update()]
      })
    ).toThrow(ContentValidationError);
  });
});
