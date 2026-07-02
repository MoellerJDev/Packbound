import type { ContentCatalog } from "@packbound/content";
import {
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  createRunFromStarterKit,
  openPack
} from "@packbound/rules";
import {
  asPlayerId,
  type CardDefId,
  type CardDesignRole,
  type CombatWinner,
  type PackId,
  type PlayerSide
} from "@packbound/shared";

import { resolveCombat } from "./combat";
import { summarizeCombatOutcome, type CombatOutcomeSummary } from "./outcomeSummary";

export type StarterEncounterBalanceFixture = {
  readonly id: string;
  readonly starterKitId: string;
  readonly encounterId: string;
  readonly seed: string;
  readonly maxDurationMs: number;
};

export type StarterEncounterBalanceRow = {
  readonly starterKitId: string;
  readonly encounterId: string;
  readonly seed: string;
  readonly winner: CombatWinner;
  readonly damageToPlayer: number;
  readonly damageToOpponent: number;
  readonly durationMs: number;
  readonly warningCodes: readonly string[];
  readonly finalUnitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly usedTechniqueDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
  readonly destroyedUnitDefIdsBySide: Readonly<Record<PlayerSide, readonly CardDefId[]>>;
};

export type PackUsabilityRow = {
  readonly packId: PackId;
  readonly seeds: readonly string[];
  readonly openedCount: number;
  readonly sourceCount: number;
  readonly archetypesSeen: readonly string[];
  readonly rolesSeen: readonly CardDesignRole[];
  readonly cardsSeen: readonly CardDefId[];
};

export type BalanceReportRows = {
  readonly starterEncounterRows: readonly StarterEncounterBalanceRow[];
  readonly packRows: readonly PackUsabilityRow[];
};

export type BuildStarterEncounterBalanceRowsOptions = {
  readonly fixtures?: readonly StarterEncounterBalanceFixture[];
};

export type BuildPackUsabilityRowsOptions = {
  readonly seeds?: readonly string[];
};

export const DEFAULT_PACK_REPORT_SEEDS = [
  "report-a",
  "report-b",
  "report-c",
  "report-d",
  "report-e",
  "report-f"
] as const;

const uniqueSorted = <T extends string>(values: Iterable<T>): readonly T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

export const buildDefaultStarterEncounterFixtures = (
  catalog: ContentCatalog
): readonly StarterEncounterBalanceFixture[] => {
  const earlyEncounter = [...catalog.encounters]
    .filter((encounter) => encounter.kind === "normal" && encounter.tier === "early")
    .sort(
      (left, right) =>
        left.difficulty - right.difficulty || left.id.localeCompare(right.id)
    )[0];
  const bossEncounter = [...catalog.encounters]
    .filter((encounter) => encounter.kind === "boss")
    .sort((left, right) => left.id.localeCompare(right.id))[0];

  if (!earlyEncounter || !bossEncounter) {
    throw new Error(
      "Balance report requires at least one early normal and one boss encounter."
    );
  }

  return catalog.starterKits.flatMap((starterKit) => [
    {
      id: `${starterKit.id}-${earlyEncounter.id}`,
      starterKitId: starterKit.id,
      encounterId: earlyEncounter.id,
      seed: `balance-report:${starterKit.id}:${earlyEncounter.id}`,
      maxDurationMs: 30_000
    },
    {
      id: `${starterKit.id}-${bossEncounter.id}`,
      starterKitId: starterKit.id,
      encounterId: bossEncounter.id,
      seed: `balance-report:${starterKit.id}:${bossEncounter.id}`,
      maxDurationMs: 45_000
    }
  ]);
};

const toStarterEncounterRow = (
  fixture: StarterEncounterBalanceFixture,
  summary: CombatOutcomeSummary
): StarterEncounterBalanceRow => ({
  starterKitId: fixture.starterKitId,
  encounterId: fixture.encounterId,
  seed: fixture.seed,
  winner: summary.winner,
  damageToPlayer: summary.damageToPlayerA,
  damageToOpponent: summary.damageToPlayerB,
  durationMs: summary.durationMs,
  warningCodes: summary.warningCodes,
  finalUnitDefIdsBySide: summary.finalUnitDefIdsBySide,
  usedTechniqueDefIdsBySide: summary.usedTechniqueDefIdsBySide,
  destroyedUnitDefIdsBySide: summary.destroyedUnitDefIdsBySide
});

export const buildStarterEncounterBalanceRows = (
  catalog: ContentCatalog,
  options: BuildStarterEncounterBalanceRowsOptions = {}
): readonly StarterEncounterBalanceRow[] => {
  const fixtures = options.fixtures ?? buildDefaultStarterEncounterFixtures(catalog);

  return fixtures.map((fixture) => {
    const starterKit = catalog.starterKitsById.get(fixture.starterKitId);
    const encounter = catalog.encountersById.get(fixture.encounterId);
    if (!starterKit || !encounter) {
      throw new Error(`Unknown balance fixture matchup: ${fixture.id}`);
    }

    const run = createRunFromStarterKit({
      seed: fixture.seed,
      catalog,
      starterKitId: starterKit.id,
      playerId: asPlayerId(`balance-report:${starterKit.id}`)
    });
    const result = resolveCombat({
      catalog,
      seed: fixture.seed,
      playerA: buildCombatantSetupForRun(run),
      playerB: buildCombatantSetupForEncounter(encounter),
      maxDurationMs: fixture.maxDurationMs
    });

    return toStarterEncounterRow(fixture, summarizeCombatOutcome(result));
  });
};

export const buildPackUsabilityRows = (
  catalog: ContentCatalog,
  options: BuildPackUsabilityRowsOptions = {}
): readonly PackUsabilityRow[] => {
  const seeds = options.seeds ?? DEFAULT_PACK_REPORT_SEEDS;
  const ownerId = asPlayerId("balance-report:pack-owner");

  return catalog.packs.map((pack) => {
    const openedCards = seeds.flatMap(
      (seed) =>
        openPack({
          catalog,
          packId: pack.id,
          seed,
          ownerId
        }).cards
    );
    const openedDefs = openedCards.map((card) => {
      const def = catalog.cardsById.get(card.defId);
      if (!def) {
        throw new Error(`Opened unknown card definition ${card.defId}`);
      }
      return def;
    });

    return {
      packId: pack.id,
      seeds,
      openedCount: openedDefs.length,
      sourceCount: openedDefs.filter((def) => def.cardType === "Source").length,
      archetypesSeen: uniqueSorted(
        openedDefs.flatMap((def) => def.design?.archetypes ?? [])
      ),
      rolesSeen: uniqueSorted(
        openedDefs.flatMap((def) => (def.design ? [def.design.role] : []))
      ) as readonly CardDesignRole[],
      cardsSeen: uniqueSorted(openedDefs.map((def) => def.id))
    };
  });
};

const list = (values: readonly string[]): string =>
  values.length > 0 ? `[${values.join(", ")}]` : "[]";

const sideList = (values: Readonly<Record<PlayerSide, readonly CardDefId[]>>): string =>
  `A ${list(values.playerA)} / B ${list(values.playerB)}`;

export const formatBalanceReport = (rows: BalanceReportRows): string => {
  const lines: string[] = ["Starter vs Encounter Smoke"];

  for (const row of rows.starterEncounterRows) {
    lines.push(
      `- ${row.starterKitId} vs ${row.encounterId}: ${row.winner}, damage ${row.damageToPlayer}/${row.damageToOpponent}, duration ${row.durationMs}ms, warnings ${list(row.warningCodes)}`
    );
    lines.push(`  final units: ${sideList(row.finalUnitDefIdsBySide)}`);
    lines.push(`  used techniques: ${sideList(row.usedTechniqueDefIdsBySide)}`);
    lines.push(`  destroyed: ${sideList(row.destroyedUnitDefIdsBySide)}`);
  }

  lines.push("", "Pack Usability");
  for (const row of rows.packRows) {
    lines.push(
      `- ${row.packId}: opened ${row.openedCount}, sources ${row.sourceCount}, archetypes ${list(row.archetypesSeen)}, roles ${list(row.rolesSeen)}, cards ${list(row.cardsSeen)}`
    );
  }

  return `${lines.join("\n")}\n`;
};
