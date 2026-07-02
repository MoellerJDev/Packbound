import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";

import {
  buildPackUsabilityRows,
  buildStarterEncounterBalanceRows,
  formatBalanceReport,
  type BalanceReportRows
} from "../index";

const seeds = ["report-test-a", "report-test-b", "report-test-c"] as const;

const buildRows = (): BalanceReportRows => ({
  starterEncounterRows: buildStarterEncounterBalanceRows(sampleCatalog),
  packRows: buildPackUsabilityRows(sampleCatalog, { seeds })
});

describe("balance report helpers", () => {
  it("builds deterministic starter and pack rows for the same seeds", () => {
    expect(buildRows()).toEqual(buildRows());
  });

  it("builds JSON-serializable report rows", () => {
    const rows = buildRows();

    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  });

  it("includes all starter kits in starter-vs-encounter rows", () => {
    const rows = buildStarterEncounterBalanceRows(sampleCatalog);
    const starterKitIds = new Set(rows.map((row) => row.starterKitId));

    for (const starterKit of sampleCatalog.starterKits) {
      expect(starterKitIds.has(starterKit.id), starterKit.id).toBe(true);
    }
  });

  it("includes all sample packs in pack usability rows", () => {
    const rows = buildPackUsabilityRows(sampleCatalog, { seeds });
    const packIds = new Set(rows.map((row) => row.packId));

    for (const pack of sampleCatalog.packs) {
      expect(packIds.has(pack.id), pack.id).toBe(true);
    }
  });

  it("formats warning codes when rows contain warnings", () => {
    const rows = buildRows();
    const firstRow = rows.starterEncounterRows[0];
    if (!firstRow) {
      throw new Error("Expected at least one starter encounter row");
    }
    const text = formatBalanceReport({
      ...rows,
      starterEncounterRows: [
        {
          ...firstRow,
          warningCodes: ["TEST_WARNING"]
        }
      ]
    });

    expect(text).toContain("TEST_WARNING");
  });

  it("formatter includes starter ids, encounter ids, pack ids, and winners", () => {
    const rows = buildRows();
    const text = formatBalanceReport(rows);

    for (const row of rows.starterEncounterRows) {
      expect(text).toContain(row.starterKitId);
      expect(text).toContain(row.encounterId);
      expect(text).toContain(row.winner);
    }

    for (const row of rows.packRows) {
      expect(text).toContain(row.packId);
    }
  });
});
