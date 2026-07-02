import type { TraitDefinition } from "@packbound/shared";

const thresholds = (
  first: readonly [number, string, string],
  second?: readonly [number, string, string],
  third?: readonly [number, string, string]
): TraitDefinition["thresholds"] =>
  [first, second, third]
    .filter((entry): entry is readonly [number, string, string] => entry !== undefined)
    .map(([count, label, description]) => ({ count, label, description }));

export const sampleTraitDefinitions: readonly TraitDefinition[] = [
  {
    id: "ember",
    name: "Ember",
    category: "aspect",
    description: "Fast pressure, sparks, Relics, and risky combat Charge.",
    thresholds: thresholds(
      [2, "Spark", "Ember cards are forming a pressure core."],
      [4, "Blaze", "Ember is a primary plan for this loadout."],
      [6, "Inferno", "Ember fully defines the board."]
    ),
    partnerTraitIds: ["scrapper", "ashes", "relic_engine", "source_greed"],
    tags: ["aspect", "pressure"]
  },
  {
    id: "shade",
    name: "Shade",
    category: "aspect",
    description: "Ashes, Recall, Offering, disposable Units, and grind.",
    thresholds: thresholds(
      [2, "Debt", "Shade cards are enabling recursion or sacrifice."],
      [4, "Ledger", "Shade is a central attrition plan."],
      [6, "Oathbound", "Shade dominates the loadout."]
    ),
    partnerTraitIds: ["ashes", "offering", "recall", "bloom", "ember"],
    tags: ["aspect", "attrition"]
  },
  {
    id: "bloom",
    name: "Bloom",
    category: "aspect",
    description: "Large bodies, Guard, healing, and board stabilization.",
    thresholds: thresholds(
      [2, "Sprout", "Bloom cards are supporting a durable board."],
      [4, "Thicket", "Bloom is anchoring the frontline."],
      [6, "Canopy", "Bloom fully shapes the loadout."]
    ),
    partnerTraitIds: ["beast", "guardian", "ashes", "source_greed"],
    tags: ["aspect", "frontline"]
  },
  {
    id: "tide",
    name: "Tide",
    category: "aspect",
    description: "Phase, timing, Airborne pressure, and responsive Techniques.",
    thresholds: thresholds(
      [2, "Ripple", "Tide cards are supporting timing plays."],
      [4, "Current", "Tide is a main control plan."],
      [6, "Surge", "Tide fully defines the loadout."]
    ),
    partnerTraitIds: ["phase", "barrier", "wisp", "source_greed"],
    tags: ["aspect", "timing"]
  },
  {
    id: "gleam",
    name: "Gleam",
    category: "aspect",
    description: "Barrier, formation, protection, and clean defensive tools.",
    thresholds: thresholds(
      [2, "Glint", "Gleam cards are protecting key Units."],
      [4, "Lantern", "Gleam is a main defensive plan."],
      [6, "Radiance", "Gleam fully shapes the board."]
    ),
    partnerTraitIds: ["barrier", "guardian", "warden", "tide"],
    tags: ["aspect", "defense"]
  },
  {
    id: "scrapper",
    name: "Scrapper",
    category: "lineage",
    description: "Cheap Ember Units and Relics that turn losses into pressure.",
    thresholds: thresholds(
      [2, "Crew", "Scrappers are a visible tempo package."],
      [3, "Workshop", "Scrappers are becoming a core build."],
      [5, "Foundry", "Scrappers dominate the active loadout."]
    ),
    partnerTraitIds: ["ember", "echo_fodder", "relic_engine", "ashes"],
    tags: ["lineage", "ember_foundry"]
  },
  {
    id: "wisp",
    name: "Wisp",
    category: "lineage",
    description: "Small Echo or Airborne bodies that bridge sacrifice and Phase.",
    thresholds: thresholds(
      [2, "Glimmer", "Wisps are available as light bodies or fodder."],
      [3, "Chorus", "Wisps can support a real swarm plan."]
    ),
    partnerTraitIds: ["echo_fodder", "phase", "tide"],
    tags: ["lineage", "echo"]
  },
  {
    id: "husk",
    name: "Husk",
    category: "lineage",
    description: "Shade bodies that block, die, and return through Ashes engines.",
    thresholds: thresholds(
      [2, "Remnant", "Husks can support an Ashes package."],
      [3, "Contract", "Husks are a meaningful frontline plan."]
    ),
    partnerTraitIds: ["shade", "ashes", "recall", "offering"],
    tags: ["lineage", "shade"]
  },
  {
    id: "beast",
    name: "Beast",
    category: "lineage",
    description: "Large Bloom bodies that stabilize while engines scale.",
    thresholds: thresholds(
      [2, "Pack", "Beasts are forming a durable frontline."],
      [3, "Stampede", "Beasts are a primary body plan."]
    ),
    partnerTraitIds: ["bloom", "ashes", "source_greed"],
    tags: ["lineage", "body"]
  },
  {
    id: "guardian",
    name: "Guardian",
    category: "role",
    description: "Protective Units that hold key tiles and buy time.",
    thresholds: thresholds(
      [2, "Brace", "Guardians are stabilizing the board."],
      [3, "Bulwark", "Guardians are a major defensive plan."]
    ),
    partnerTraitIds: ["bloom", "gleam", "barrier"],
    tags: ["role", "defense"]
  },
  {
    id: "warden",
    name: "Warden",
    category: "role",
    description: "Cloudspire protectors that pair Phase, Barrier, and answers.",
    thresholds: thresholds(
      [2, "Watch", "Wardens are creating a protective shell."],
      [3, "Patrol", "Wardens anchor the Cloudspire plan."]
    ),
    partnerTraitIds: ["tide", "gleam", "barrier", "phase"],
    tags: ["role", "cloudspire"]
  },
  {
    id: "ashes",
    name: "Ashes",
    category: "engine",
    description: "Cards that care about destroyed or spent Units.",
    thresholds: thresholds(
      [2, "Kindle", "Ashes cards are ready to convert losses into value."],
      [4, "Pyre", "Ashes is a central engine."]
    ),
    partnerTraitIds: ["shade", "recall", "offering", "scrapper", "bloom"],
    tags: ["engine", "recursion"]
  },
  {
    id: "offering",
    name: "Offering",
    category: "engine",
    description: "Cards that intentionally destroy allies for value.",
    thresholds: thresholds(
      [2, "Due", "Offering cards can turn expendable bodies into value."],
      [3, "Contract", "Offering is a serious engine."]
    ),
    partnerTraitIds: ["shade", "ashes", "echo_fodder", "scrapper"],
    tags: ["engine", "sacrifice"]
  },
  {
    id: "recall",
    name: "Recall",
    category: "engine",
    description: "Cards that return Units from Ashes.",
    thresholds: thresholds(
      [2, "Memory", "Recall cards can reuse destroyed Units."],
      [3, "Return", "Recall is a major recursion plan."]
    ),
    partnerTraitIds: ["shade", "ashes", "husk", "bloom"],
    tags: ["engine", "recursion"]
  },
  {
    id: "phase",
    name: "Phase",
    category: "engine",
    description: "Cards that temporarily remove and return Units.",
    thresholds: thresholds(
      [2, "Slip", "Phase cards can protect or reuse a key Unit."],
      [3, "Gate", "Phase is a central timing plan."]
    ),
    partnerTraitIds: ["tide", "gleam", "barrier", "wisp"],
    tags: ["engine", "timing"]
  },
  {
    id: "barrier",
    name: "Barrier",
    category: "engine",
    description: "Cards that prevent damage or protect a formation.",
    thresholds: thresholds(
      [2, "Shield", "Barrier cards can protect important Units."],
      [3, "Aegis", "Barrier is a major defensive plan."]
    ),
    partnerTraitIds: ["gleam", "phase", "guardian", "warden"],
    tags: ["engine", "defense"]
  },
  {
    id: "relic_engine",
    name: "Relic Engine",
    category: "infrastructure",
    description: "Support-layer Relics that turn the board into a machine.",
    thresholds: thresholds(
      [2, "Assembly", "Relics are forming an engine."],
      [3, "Machine", "Relics are a core build-around."]
    ),
    partnerTraitIds: ["ember", "scrapper", "source_greed", "barrier"],
    tags: ["infrastructure", "relic"]
  },
  {
    id: "echo_fodder",
    name: "Echo Fodder",
    category: "engine",
    description: "Temporary bodies that feed death, Offering, and swarm plans.",
    thresholds: thresholds(
      [2, "Fodder", "Echoes and expendable bodies can fuel triggers."],
      [3, "Swarm", "Temporary bodies are a major engine."]
    ),
    partnerTraitIds: ["scrapper", "ashes", "offering", "wisp"],
    tags: ["engine", "echo"]
  },
  {
    id: "source_greed",
    name: "Source Greed",
    category: "economy",
    description: "Flexible Sources and payoffs that enable splashes and bigger boards.",
    thresholds: thresholds(
      [2, "Splash", "Sources can support off-aspect pivots."],
      [3, "Greed", "Fixing is becoming a main run plan."],
      [5, "Prism", "Sources define the active loadout."]
    ),
    partnerTraitIds: ["ember", "shade", "bloom", "tide", "gleam", "relic_engine"],
    tags: ["economy", "source"]
  }
];
