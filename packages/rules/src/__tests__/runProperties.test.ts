import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type CardInstanceId
} from "@packbound/shared";

import {
  applyRunAction,
  applyRunActions,
  buildCombatantSetupForRun,
  createRunFromStarterKit,
  getLegalLoadoutActions,
  validateRunLoadout,
  type LoadoutAction,
  type RunAction,
  type RunState
} from "../index";

type LoadoutStep = "movePool" | "returnBoard" | "returnSource" | "returnSpellrail";

const seedArbitrary = fc.string({ minLength: 1, maxLength: 20 });
const starterKitArbitrary = fc.constantFrom(
  "ember_scrappers",
  "rotbloom_recall",
  "cloudspire_phase"
);
const loadoutStepArbitrary = fc.array(
  fc.constantFrom<LoadoutStep>(
    "movePool",
    "returnBoard",
    "returnSource",
    "returnSpellrail"
  ),
  { maxLength: 10 }
);

const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createStarterRun = (seed: string, starterKitId = "ember_scrappers"): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId("property-player")
  });

const modifiedCard = (run: RunState, defId: string, suffix: string): CardInstance => ({
  instanceId: asCardInstanceId(`${run.runId}:property:${suffix}`),
  defId: asCardDefId(defId),
  ownerId: run.playerId,
  zone: "pool",
  modifiers: [
    {
      id: `property-modifier:${suffix}`,
      type: "StatModifier",
      sourceId: "property-test",
      stackingRule: "stack",
      metadata: { suffix }
    }
  ],
  upgradeLevel: 2,
  createdBy: asCardInstanceId(`${run.runId}:property-created-by:${suffix}`),
  isEcho: true
});

const withPoolCard = (run: RunState, card: CardInstance): RunState => ({
  ...run,
  pool: [...run.pool, card]
});

const zoneCardIds = (run: RunState): readonly CardInstanceId[] => [
  ...run.pool.map((card) => card.instanceId),
  ...run.activeCards.map((card) => card.instanceId),
  ...run.sourceRow.cards.map((card) => card.instanceId),
  ...run.spellrail.cards.map((card) => card.instanceId),
  ...run.ashes.map((card) => card.instanceId),
  ...run.void.map((card) => card.instanceId)
];

const expectUniqueRunZoneMembership = (run: RunState): void => {
  const ids = zoneCardIds(run);
  expect(new Set(ids).size).toBe(ids.length);
  expect(run.activeCards.every((card) => card.zone === "board")).toBe(true);
};

const toRunAction = (
  cardInstanceId: CardInstanceId,
  action: LoadoutAction
): RunAction => {
  switch (action.type) {
    case "placeOnBoard":
      return {
        type: "placeCardOnBoard",
        cardInstanceId,
        position: action.position
      };
    case "addToSourceRow":
      return { type: "addCardToSourceRow", cardInstanceId };
    case "addToSpellrail":
      return { type: "addCardToSpellrail", cardInstanceId };
    case "returnToPool":
      return { type: "returnCardToPool", cardInstanceId };
  }
};

const firstLegalPoolRunAction = (run: RunState): RunAction | undefined => {
  for (const card of run.pool) {
    const action = getLegalLoadoutActions(run, sampleCatalog, card.instanceId)[0];
    if (action) {
      return toRunAction(card.instanceId, action);
    }
  }
  return undefined;
};

const actionForStep = (run: RunState, step: LoadoutStep): RunAction | undefined => {
  if (run.status !== "active" || run.phase !== "planning") {
    return undefined;
  }

  switch (step) {
    case "movePool":
      return firstLegalPoolRunAction(run);
    case "returnBoard": {
      const cardInstanceId = run.board.placements[0]?.cardInstanceId;
      return cardInstanceId ? { type: "returnCardToPool", cardInstanceId } : undefined;
    }
    case "returnSource": {
      const cardInstanceId = run.sourceRow.cards[0]?.instanceId;
      return cardInstanceId
        ? { type: "removeCardFromSourceRow", cardInstanceId }
        : undefined;
    }
    case "returnSpellrail": {
      const cardInstanceId = run.spellrail.cards[0]?.instanceId;
      return cardInstanceId
        ? { type: "removeCardFromSpellrail", cardInstanceId }
        : undefined;
    }
  }
};

const buildLegalActions = (
  initialRun: RunState,
  steps: readonly LoadoutStep[]
): readonly RunAction[] => {
  const actions: RunAction[] = [];
  let run = initialRun;

  for (const step of steps) {
    const action = actionForStep(run, step);
    if (!action) {
      continue;
    }
    actions.push(action);
    run = applyRunAction(run, sampleCatalog, action);
  }

  return actions;
};

describe("run property invariants", () => {
  it("creates serializable runs for generated seeds and starter kits", () => {
    fc.assert(
      fc.property(seedArbitrary, starterKitArbitrary, (seed, starterKitId) => {
        const run = createStarterRun(seed, starterKitId);

        expect(jsonClone(run)).toEqual(run);
        expectUniqueRunZoneMembership(run);
      }),
      { numRuns: 40 }
    );
  });

  it("applies legal loadout action sequences without mutating previous states", () => {
    fc.assert(
      fc.property(
        seedArbitrary,
        starterKitArbitrary,
        loadoutStepArbitrary,
        (seed, starterKitId, steps) => {
          let run = createStarterRun(seed, starterKitId);
          expectUniqueRunZoneMembership(run);

          for (const step of steps) {
            const action = actionForStep(run, step);
            if (!action) {
              continue;
            }

            const previousRun = run;
            const previousSnapshot = jsonClone(previousRun);
            run = applyRunAction(run, sampleCatalog, action);

            expect(previousRun).toEqual(previousSnapshot);
            expectUniqueRunZoneMembership(run);
            expect(jsonClone(run)).toEqual(run);
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  it("preserves upgraded and modified instances through active zone round trips", () => {
    fc.assert(
      fc.property(
        seedArbitrary,
        fc.constantFrom("board", "sourceRow", "spellrail"),
        (seed, targetZone) => {
          const baseRun = createStarterRun(seed);
          const defId =
            targetZone === "board"
              ? "ember_scraprunner"
              : targetZone === "sourceRow"
                ? "bloom_source"
                : "phase_step";
          const original = modifiedCard(baseRun, defId, targetZone);
          const run = withPoolCard(baseRun, original);

          const moved =
            targetZone === "board"
              ? applyRunAction(run, sampleCatalog, {
                  type: "placeCardOnBoard",
                  cardInstanceId: original.instanceId,
                  position: { row: 1, col: 1, layer: "ground" }
                })
              : targetZone === "sourceRow"
                ? applyRunAction(run, sampleCatalog, {
                    type: "addCardToSourceRow",
                    cardInstanceId: original.instanceId
                  })
                : applyRunAction(run, sampleCatalog, {
                    type: "addCardToSpellrail",
                    cardInstanceId: original.instanceId
                  });
          const returned =
            targetZone === "sourceRow"
              ? applyRunAction(moved, sampleCatalog, {
                  type: "removeCardFromSourceRow",
                  cardInstanceId: original.instanceId
                })
              : targetZone === "spellrail"
                ? applyRunAction(moved, sampleCatalog, {
                    type: "removeCardFromSpellrail",
                    cardInstanceId: original.instanceId
                  })
                : applyRunAction(moved, sampleCatalog, {
                    type: "returnCardToPool",
                    cardInstanceId: original.instanceId
                  });

          expect(
            returned.pool.find((card) => card.instanceId === original.instanceId)
          ).toEqual(original);
          expectUniqueRunZoneMembership(returned);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("replays generated legal action lists deterministically", () => {
    fc.assert(
      fc.property(
        seedArbitrary,
        starterKitArbitrary,
        loadoutStepArbitrary,
        (seed, starterKitId, steps) => {
          const initialRun = createStarterRun(seed, starterKitId);
          const actions = buildLegalActions(initialRun, steps);
          const first = applyRunActions(initialRun, sampleCatalog, actions);
          const second = applyRunActions(initialRun, sampleCatalog, actions);

          expect(second).toEqual(first);
          expect(jsonClone(first)).toEqual(first);
          expectUniqueRunZoneMembership(first);
        }
      ),
      { numRuns: 40 }
    );
  });

  it("does not mutate runs when building combat setup or validating loadouts", () => {
    fc.assert(
      fc.property(seedArbitrary, starterKitArbitrary, (seed, starterKitId) => {
        const run = createStarterRun(seed, starterKitId);
        const snapshot = jsonClone(run);

        buildCombatantSetupForRun(run);
        validateRunLoadout(run, sampleCatalog);

        expect(run).toEqual(snapshot);
        expectUniqueRunZoneMembership(run);
      }),
      { numRuns: 40 }
    );
  });
});
