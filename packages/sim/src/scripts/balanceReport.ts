import { sampleCatalog } from "@packbound/content";

import {
  buildPackUsabilityRows,
  buildStarterEncounterBalanceRows,
  formatBalanceReport
} from "../index";

const rows = {
  starterEncounterRows: buildStarterEncounterBalanceRows(sampleCatalog),
  packRows: buildPackUsabilityRows(sampleCatalog)
};

process.stdout.write(formatBalanceReport(rows));
