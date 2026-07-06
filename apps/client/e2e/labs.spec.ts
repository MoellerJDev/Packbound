import { expect, test } from "@playwright/test";

import {
  captureBrowserErrors,
  clickPixiCell,
  expectNoHorizontalScroll,
  panel
} from "./helpers/browserSmokeHelpers";
test("engagement lab shows out-of-range target and next-move preview", async ({
  page
}) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=engagement-lab");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();

  const battlefield = page.locator(".battlefield-section");
  const hexArena = page.getByTestId("hex-arena");
  const hexArenaViewport = page.getByTestId("hex-arena-viewport");
  const engagementPreview = hexArena.getByTestId("engagement-preview");
  const playerGridPanel = battlefield.locator(".battlefield-board-side.ally");
  const enemyGridPanel = battlefield.locator(".battlefield-board-side.enemy");
  const allyInspector = battlefield.locator(".battlefield-inspector.ally");

  await expect(hexArena.getByRole("heading", { name: "Hex Arena" })).toBeVisible();
  await expect(
    engagementPreview.getByRole("heading", { name: "Engagement Preview" })
  ).toBeVisible();
  await expect(
    engagementPreview.getByText("Cinder Scout cannot attack yet.")
  ).toBeVisible();
  await expect(
    engagementPreview.getByText("Target is 3 hexes away, range 1.")
  ).toBeVisible();
  await expect(engagementPreview.getByText("Next move: r2 c1 to r2 c2.")).toBeVisible();
  await expect(engagementPreview.getByText("Out of range")).toBeVisible();
  await expect(
    engagementPreview.getByText("Likely target: nearest valid enemy.")
  ).toBeVisible();

  await expect(
    allyInspector.getByRole("heading", { name: "Cinder Scout" })
  ).toBeVisible();
  await expect(
    playerGridPanel.getByRole("button", { name: /Inspect Cinder Scout ground r2 c1/ })
  ).toBeVisible();
  await expect(
    playerGridPanel.getByRole("button", {
      name: /Inspect Sparkcatch Apprentice ground r2 c3/
    })
  ).toBeVisible();
  await expect(
    enemyGridPanel.getByRole("button", { name: /Inspect Ember Scraprunner ground r0 c3/ })
  ).toBeVisible();
  await expect(hexArena.locator('[data-range-preview="true"]').first()).toBeVisible();
  await expect(hexArena.locator('[data-selected-preview="true"]').first()).toBeVisible();
  await expect(hexArena.locator('[data-likely-target="true"]').first()).toBeVisible();
  await expect(
    hexArena.locator('[data-target-out-of-range="true"]').first()
  ).toBeVisible();
  await expect(hexArena.locator('[data-next-move="true"]').first()).toBeVisible();
  await expect(hexArena.locator(".board-preview-marker.selected").first()).toBeVisible();
  await expect(
    hexArena.locator(".board-preview-marker.target-label.out-of-range").first()
  ).toBeVisible();
  await expect(
    hexArena.locator(".board-preview-marker.target-status.out-of-range").first()
  ).toBeVisible();
  await expect(hexArena.locator(".board-preview-marker.move").first()).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);

  await playerGridPanel
    .getByRole("button", {
      name: /Inspect Sparkcatch Apprentice ground r2 c3/
    })
    .click();
  await expect(
    engagementPreview.getByText("Sparkcatch Apprentice can attack from 2 hexes away.")
  ).toBeVisible();
  await expect(engagementPreview.getByText("Distance 2, range 2.")).toBeVisible();
  await expect(engagementPreview.getByText("Attack now")).toBeVisible();
  await expect(
    hexArena.locator(".board-preview-marker.target-status.in-range").first()
  ).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);

  await page.getByRole("button", { name: "Ready Combat" }).click();
  await page.getByRole("button", { name: "Record Combat" }).click();
  await expect(panel(page, "Last Recorded Combat").getByText(/Winner:/)).toBeVisible();

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("priority lab alternates priority, resolves the stack, and records combat", async ({
  page
}) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=priority-lab");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();
  await expect(page.getByTestId("hex-arena")).toBeVisible();

  const priorityPanel = panel(page, "Priority Lab");
  await expect(priorityPanel).toBeVisible();
  await expect(priorityPanel.getByText("Encounter / Match")).toBeVisible();
  await expect(priorityPanel.getByText("First main", { exact: true })).toBeVisible();
  await expect(priorityPanel.getByText("Active actor")).toBeVisible();
  await expect(priorityPanel.getByText("Priority holder")).toBeVisible();
  await expect(
    priorityPanel.getByText("Player stability", { exact: true })
  ).toBeVisible();
  await expect(priorityPanel.getByText("Enemy stability", { exact: true })).toBeVisible();
  await expect(
    priorityPanel.getByText("Current Player Combat Charge", { exact: true })
  ).toBeVisible();
  await expect(priorityPanel.getByTestId("priority-player-combat-charge")).toHaveText(
    "3"
  );
  await expect(
    priorityPanel.getByText("Source-derived starting Combat Charge", { exact: true })
  ).toBeVisible();
  await expect(
    priorityPanel.getByTestId("priority-source-derived-combat-charge")
  ).toHaveText("1");
  await expect(
    priorityPanel.getByTestId("priority-source-combat-charge-rate")
  ).toHaveText("0.35");
  await expect(
    priorityPanel.getByTestId("priority-debug-combat-charge-top-up")
  ).toHaveText("+2");
  await expect(priorityPanel.getByTestId("priority-combat-charge-profile")).toHaveText(
    "1 Source contributes 0.35 Combat Charge/sec, rounded up to 1 starting Combat Charge."
  );
  await expect(
    priorityPanel.getByText(
      "Priority Lab debug top-up adds +2 Combat Charge for this scenario."
    )
  ).toBeVisible();
  await expect(priorityPanel.getByTestId("priority-enemy-combat-charge")).toHaveText("0");
  await expect(priorityPanel.getByText("Action Stack")).toBeVisible();
  await expect(priorityPanel.getByText("Action Log")).toBeVisible();
  await expect(
    priorityPanel.getByText("Source: Sparkfall (spellrail)", { exact: true })
  ).toBeVisible();
  await expect(priorityPanel.getByTestId("prototype-action-contract")).toContainText(
    "Cost: Pay 1 Combat Charge. Uses Sparkfall on resolve."
  );
  await expect(priorityPanel.getByTestId("prototype-action-contract")).toContainText(
    "Target: Enemy Stability"
  );
  await expect(priorityPanel.getByTestId("prototype-action-contract")).toContainText(
    "Effect: Enemy Stability -1."
  );
  const targetProbeSection = priorityPanel.getByTestId("target-probe-action-section");
  await expect(targetProbeSection).toBeVisible();
  await expect(
    targetProbeSection.getByText("Target Probe", { exact: true })
  ).toBeVisible();
  await expect(
    targetProbeSection.getByText("Target Probe Target", { exact: true })
  ).toBeVisible();
  await expect(
    targetProbeSection.getByText("Available targets", { exact: true })
  ).toBeVisible();
  const targetProbeOption = targetProbeSection.getByRole("radio", {
    name: "Target: Ember Scraprunner (enemy ground r0 c3)"
  });
  await expect(targetProbeOption).toBeVisible();
  await expect(targetProbeOption).toBeChecked();
  await targetProbeOption.click();
  await expect(targetProbeSection.getByTestId("target-probe-selected-target")).toHaveText(
    "Selected target: Ember Scraprunner (enemy ground r0 c3)"
  );
  await expect(targetProbeSection.getByTestId("target-probe-status")).toHaveText(
    "Target Probe can queue the selected enemy board card."
  );
  await expect(
    targetProbeSection.getByTestId("target-probe-action-contract")
  ).toContainText("Cost: Pay 1 Combat Charge.");
  await expect(
    targetProbeSection.getByTestId("target-probe-action-contract")
  ).toContainText("Target: Enemy board card");
  await expect(
    targetProbeSection.getByTestId("target-probe-action-contract")
  ).toContainText("Effect: Mark target as probed.");
  const queueTargetProbe = targetProbeSection.getByRole("button", {
    name: "Queue Target Probe"
  });
  await expect(queueTargetProbe).toBeEnabled();
  await queueTargetProbe.click();
  await expect(priorityPanel.getByTestId("priority-player-combat-charge")).toHaveText(
    "2"
  );
  await expect(
    priorityPanel.getByText(
      "Player queued Target Probe targeting Ember Scraprunner (enemy ground r0 c3)."
    )
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Target Probe: paid 1 Combat Charge")
  ).toBeVisible();
  await expect(priorityPanel.getByText("Player | 3 -> 2")).toBeVisible();
  await expect(
    priorityPanel
      .locator(".card-list.compact li")
      .filter({ hasText: "Target Probe" })
      .first()
  ).toContainText("Target: Ember Scraprunner (enemy ground r0 c3)");
  await priorityPanel.getByRole("button", { name: "Enemy Pass" }).click();
  await priorityPanel.getByRole("button", { name: "Pass Priority" }).click();
  await expect(
    priorityPanel.getByText(
      "Resolved Target Probe from Player targeting Ember Scraprunner (enemy ground r0 c3): Marked target as probed."
    )
  ).toBeVisible();
  await expect(priorityPanel.getByText("Target Effects")).toBeVisible();
  await expect(priorityPanel.getByTestId("target-effects-list")).toContainText(
    "Target Probe: probed Ember Scraprunner (enemy ground r0 c3)"
  );
  await expect(priorityPanel.getByTestId("target-effects-list")).toContainText(
    "Turn 1 | First main | Player | markBoardCardTarget"
  );
  const commanderActionSection = priorityPanel.getByTestId("commander-action-section");
  await expect(commanderActionSection).toBeVisible();
  await expect(commanderActionSection.getByText("Commander Action")).toBeVisible();
  await expect(commanderActionSection.getByText("Sparkcatch Apprentice")).toBeVisible();
  await expect(
    commanderActionSection.getByTestId("priority-commander-action-zone")
  ).toHaveText("command");
  await expect(commanderActionSection.getByTestId("commander-action-status")).toHaveText(
    "Commander must be deployed to use Commander Rally."
  );
  await expect(
    commanderActionSection.getByTestId("commander-action-contract")
  ).toContainText("Cost: Pay 1 Combat Charge. Uses Commander on resolve.");
  await expect(
    commanderActionSection.getByTestId("commander-action-contract")
  ).toContainText("Target: Enemy Stability");
  await expect(
    commanderActionSection.getByTestId("commander-action-contract")
  ).toContainText("Effect: Enemy Stability -1.");
  await expect(
    commanderActionSection.getByRole("button", { name: "Queue Commander Rally" })
  ).toBeDisabled();
  const actionLog = priorityPanel.locator(".action-log-list");
  await expect(actionLog.locator(".action-log-meta").first()).toHaveText(
    "Turn 1 | First main | Stack 0"
  );

  const priorityCommandZone = panel(page, "Command Zone");
  await priorityCommandZone.getByRole("button", { name: "Deploy Commander" }).click();
  await expect(priorityCommandZone.getByTestId("command-zone-location")).toHaveText(
    "board"
  );
  await expect(
    commanderActionSection.getByTestId("priority-commander-action-zone")
  ).toHaveText("board");
  await expect(commanderActionSection.getByTestId("commander-action-status")).toHaveText(
    "Source: Sparkcatch Apprentice (board)"
  );
  await expect(
    commanderActionSection.getByRole("button", { name: "Queue Commander Rally" })
  ).toBeEnabled();

  await commanderActionSection
    .getByRole("button", { name: "Queue Commander Rally" })
    .click();
  await expect(priorityPanel.getByTestId("priority-player-combat-charge")).toHaveText(
    "1"
  );
  await expect(
    priorityPanel.getByText("Player queued Commander Rally from Sparkcatch Apprentice.")
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Commander Rally: paid 1 Combat Charge")
  ).toBeVisible();
  await expect(priorityPanel.getByText("Player | 2 -> 1")).toBeVisible();
  await expect(
    priorityPanel
      .locator(".card-list.compact li")
      .filter({ hasText: "Commander Rally" })
      .first()
  ).toContainText("Source: Sparkcatch Apprentice (board)");
  await expect(
    priorityPanel
      .locator(".card-list.compact li")
      .filter({ hasText: "Commander Rally" })
      .first()
  ).toContainText("Target: Enemy Stability");
  await expect(commanderActionSection.getByTestId("commander-action-status")).toHaveText(
    "Commander Rally requires player priority."
  );

  await priorityPanel.getByRole("button", { name: "Enemy Pass" }).click();
  await expect(commanderActionSection.getByTestId("commander-action-status")).toHaveText(
    "Commander Rally is already queued for this Commander."
  );
  await priorityPanel.getByRole("button", { name: "Pass Priority" }).click();
  await expect(
    priorityPanel.getByText("Resolved Commander Rally from Player: Enemy stability -1.")
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Sparkcatch Apprentice used by Commander Rally")
  ).toBeVisible();
  await expect(commanderActionSection.getByTestId("commander-action-status")).toHaveText(
    "Commander Rally was already used this encounter."
  );
  await expect(
    commanderActionSection.getByRole("button", { name: "Queue Commander Rally" })
  ).toBeDisabled();

  await priorityPanel.getByRole("button", { name: "Queue Prototype Technique" }).click();
  await expect(priorityPanel.getByTestId("priority-player-combat-charge")).toHaveText(
    "0"
  );
  await expect(
    priorityPanel.getByText("Prototype Pressure Technique", { exact: true })
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Player queued Prototype Pressure Technique from Sparkfall.")
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Prototype Pressure Technique: paid 1 Combat Charge")
  ).toBeVisible();
  await expect(priorityPanel.getByText("Player | 1 -> 0")).toBeVisible();
  await expect(
    priorityPanel
      .locator(".card-list.compact li")
      .filter({ hasText: "Prototype Pressure Technique" })
      .first()
  ).toContainText("Source: Sparkfall (spellrail)");
  await expect(
    priorityPanel
      .locator(".card-list.compact li")
      .filter({ hasText: "Prototype Pressure Technique" })
      .first()
  ).toContainText("Target: Enemy Stability");
  await expect(priorityPanel.getByRole("button", { name: "Enemy Pass" })).toBeEnabled();
  await expect(
    priorityPanel.getByRole("button", { name: "Pass Priority" })
  ).toBeDisabled();

  await priorityPanel.getByRole("button", { name: "Enemy Pass" }).click();
  await expect(
    priorityPanel.getByRole("button", { name: "Pass Priority" })
  ).toBeEnabled();
  await priorityPanel.getByRole("button", { name: "Pass Priority" }).click();
  await expect(
    priorityPanel.getByText(
      "Resolved Prototype Pressure Technique from Player: Enemy stability -1."
    )
  ).toBeVisible();
  await expect(priorityPanel.getByText("Used Sources")).toBeVisible();
  await expect(
    priorityPanel.getByText("Sparkfall used by Prototype Pressure Technique")
  ).toBeVisible();
  await expect(
    priorityPanel.getByText("Sparkfall is already queued or used this encounter.")
  ).toBeVisible();
  await expect(
    priorityPanel.getByRole("button", { name: "Queue Prototype Technique" })
  ).toBeDisabled();
  const resolvedLogEntry = actionLog.locator(".action-log-entry").filter({
    hasText: "Resolved Prototype Pressure Technique from Player: Enemy stability -1."
  });
  await expect(resolvedLogEntry.locator(".action-log-text")).toHaveText(
    "Resolved Prototype Pressure Technique from Player: Enemy stability -1."
  );
  await expect(resolvedLogEntry.locator(".action-log-meta")).toHaveText(
    "Turn 1 | First main | Stack 0"
  );
  await expect(priorityPanel.getByText("Action Stack")).toBeVisible();
  await expect(priorityPanel.getByText("Empty").first()).toBeVisible();

  await priorityPanel.getByRole("button", { name: "Pass Priority" }).click();
  await priorityPanel.getByRole("button", { name: "Enemy Pass" }).click();
  await expect(priorityPanel.getByText("Combat skirmish", { exact: true })).toBeVisible();
  await expect(
    priorityPanel.getByRole("button", { name: "Run Combat Skirmish" })
  ).toBeEnabled();

  await priorityPanel.getByRole("button", { name: "Run Combat Skirmish" }).click();
  await expect(priorityPanel.getByText("Second main", { exact: true })).toBeVisible();
  await expect(priorityPanel.getByText(/Skirmish 1:/)).toBeVisible();
  await expect(priorityPanel.getByText(/Recorded skirmish 1:/)).toBeVisible();

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("renderer lab loads Pixi battlefield canvas and replay controls", async ({
  page
}) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=renderer-lab");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Battlefield", exact: true })
  ).toHaveCount(0);

  const rendererLab = page.locator(".renderer-lab-section");
  await expect(
    rendererLab.getByRole("heading", { name: "Pixi Renderer Lab" })
  ).toBeVisible();
  await expect(
    rendererLab.getByText("Pixi is the primary battlefield on this route.")
  ).toBeVisible();
  const debugFallback = rendererLab.locator("details.renderer-debug-board");
  await expect(debugFallback).toBeVisible();
  await expect(debugFallback.getByText("React/CSS Debug Board")).toBeVisible();
  expect(await debugFallback.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(page.getByTestId("hex-arena")).toBeHidden();
  await expect(rendererLab.getByText("Shared field units")).toBeVisible();
  await expect(rendererLab.getByText("Replay events")).toBeVisible();
  await expect(
    rendererLab.getByText("appear/recall, move, attack, damage, destroyed")
  ).toBeVisible();
  await expect(rendererLab.getByText("Selected halo")).toBeVisible();
  await expect(
    rendererLab.getByText(/larger nameplates plus ATK \/ HP \/ RNG/)
  ).toBeVisible();
  const loadoutResources = rendererLab
    .locator(".renderer-lab-panel")
    .filter({ has: page.getByRole("heading", { name: "Loadout Resources" }) });
  await expect(loadoutResources).toBeVisible();
  await expect(loadoutResources.getByText("Board Charge", { exact: true })).toBeVisible();
  await expect(loadoutResources.getByText("Source Row", { exact: true })).toBeVisible();
  await expect(loadoutResources.getByText("Spellrail", { exact: true })).toBeVisible();
  await expect(rendererLab.getByRole("heading", { name: "Pool / Bench" })).toBeVisible();

  const rendererHost = page.getByTestId("pixi-renderer-host");
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  const inspector = rendererLab.locator(".renderer-inspector-panel");
  await expect(inspector.getByRole("heading", { name: "Pixi Inspector" })).toBeVisible();
  await expect(inspector.getByText(/Unit \| board \| Ember/)).toBeVisible();
  const rendererCommandZone = rendererLab.getByTestId("command-zone-panel");
  await expect(rendererCommandZone).toBeVisible();
  await expect(rendererCommandZone.getByTestId("command-zone-card-name")).toHaveText(
    "Sparkcatch Apprentice"
  );
  await expect(rendererCommandZone.getByTestId("command-zone-location")).toHaveText(
    "command"
  );

  const replayStatus = page.getByTestId("renderer-replay-status");
  const replayCommandIndex = page.getByTestId("renderer-replay-command-index");
  const replayLatest = page.getByTestId("renderer-replay-latest");
  await expect(replayStatus).toHaveText("idle");
  await expect(replayCommandIndex).toHaveText(/0 \/ \d+/);
  await expect(replayLatest).toHaveText("No command visualized yet.");
  const playReplay = rendererLab.getByRole("button", { name: "Play Replay" });
  const pauseReplay = rendererLab.getByRole("button", { name: "Pause Replay" });
  const stepReplay = rendererLab.getByRole("button", { name: "Step Replay" });
  const resetReplay = rendererLab.getByRole("button", { name: "Reset Replay" });
  await expect(playReplay).toBeVisible();
  await expect(pauseReplay).toBeVisible();
  await expect(stepReplay).toBeVisible();
  await expect(resetReplay).toBeVisible();

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("renderer lab supports Commander diagnostics", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=renderer-lab");

  const rendererLab = page.locator(".renderer-lab-section");
  const rendererHost = page.getByTestId("pixi-renderer-host");
  const inspector = rendererLab.locator(".renderer-inspector-panel");
  const rendererCommandZone = rendererLab.getByTestId("command-zone-panel");

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(rendererCommandZone.getByTestId("command-zone-card-name")).toHaveText(
    "Sparkcatch Apprentice"
  );
  await expect(rendererCommandZone.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(rendererCommandZone.getByTestId("commander-deploy-count")).toHaveText("0");
  await expect(rendererCommandZone.getByTestId("commander-upgrade-level")).toHaveText(
    "Lv 0"
  );
  await expect(rendererCommandZone.getByTestId("commander-raw-rebind-tax")).toHaveText(
    "+0 Charge"
  );
  await expect(rendererCommandZone.getByTestId("commander-rebind-tax")).toHaveText(
    "+0 Charge"
  );
  await expect(rendererCommandZone.getByTestId("commander-deploy-cost")).toHaveText(
    "1 base + 0 tax = 1 Charge"
  );
  await expect(
    rendererCommandZone.getByTestId("commander-board-charge-after-deploy")
  ).toHaveText("3 / 3");
  await expect(
    rendererCommandZone.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander initialized in Command Zone.");
  await rendererCommandZone.getByRole("button", { name: "Inspect" }).click();
  await expect(inspector.getByText(/Unit \| command \| Ember/)).toBeVisible();
  await rendererCommandZone.getByRole("button", { name: "Deploy Commander" }).click();
  await expect(rendererCommandZone.getByTestId("command-zone-location")).toHaveText(
    "board"
  );
  await expect(rendererCommandZone.getByTestId("commander-deploy-count")).toHaveText("1");
  await expect(
    rendererCommandZone.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander deployed from Command Zone.");
  await expect(
    rendererCommandZone.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("command -> board");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(
    rendererLab
      .locator(".renderer-lab-panel")
      .filter({ hasText: "Active board permanents use Board Charge" })
      .getByRole("listitem")
      .filter({ hasText: "Sparkcatch Apprentice" })
  ).toBeVisible();
  await rendererCommandZone.getByRole("button", { name: "Return to Command" }).click();
  await expect(rendererCommandZone.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(rendererCommandZone.getByTestId("commander-rebind-tax")).toHaveText(
    "+1 Charge"
  );
  await expect(rendererCommandZone.getByTestId("commander-raw-rebind-tax")).toHaveText(
    "+1 Charge"
  );
  await expect(
    rendererCommandZone.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander returned to Command Zone.");
  await expect(
    rendererCommandZone.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Raw Tax +0 -> +1");
  await expect(rendererCommandZone.getByTestId("commander-deploy-cost")).toHaveText(
    "1 base + 1 tax = 2 Charge"
  );
  await expect(
    rendererCommandZone.getByTestId("commander-board-charge-after-deploy")
  ).toHaveText("4 / 3");
  await expect(
    rendererCommandZone.getByRole("button", { name: "Deploy Commander" })
  ).toBeDisabled();
  await expect(
    rendererCommandZone.getByText(
      "Deploy Commander: Commander Rebind Tax requires 4 total Board Charge, but the Source Row provides 3."
    )
  ).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("renderer lab supports token selection and placement diagnostics", async ({
  page
}) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=renderer-lab");

  const rendererLab = page.locator(".renderer-lab-section");
  const rendererHost = page.getByTestId("pixi-renderer-host");
  const inspector = rendererLab.locator(".renderer-inspector-panel");

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await clickPixiCell(page, rendererHost, 0, 3);
  await expect(inspector.getByText(/Unit \| encounter \| Ember/)).toBeVisible();

  const poolBench = rendererLab
    .locator(".renderer-lab-panel")
    .filter({ hasText: "Select a board-placeable card" });
  const sparkcatchRow = poolBench
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await sparkcatchRow.getByRole("button", { name: "Select Board Cell" }).click();
  await expect(rendererLab.getByText(/Placing Sparkcatch Apprentice/)).toBeVisible();
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(rendererLab.getByText(/Placing Sparkcatch Apprentice/)).toHaveCount(0);
  await expect(
    rendererLab
      .locator(".renderer-lab-panel")
      .filter({ hasText: "Active board permanents use Board Charge" })
      .getByRole("listitem")
      .filter({ hasText: "Sparkcatch Apprentice" })
  ).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("renderer lab replay controls step reset play and pause", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=renderer-lab");

  const rendererLab = page.locator(".renderer-lab-section");
  const rendererHost = page.getByTestId("pixi-renderer-host");
  const replayStatus = page.getByTestId("renderer-replay-status");
  const replayCommandIndex = page.getByTestId("renderer-replay-command-index");
  const replayLatest = page.getByTestId("renderer-replay-latest");
  const playReplay = rendererLab.getByRole("button", { name: "Play Replay" });
  const pauseReplay = rendererLab.getByRole("button", { name: "Pause Replay" });
  const stepReplay = rendererLab.getByRole("button", { name: "Step Replay" });
  const resetReplay = rendererLab.getByRole("button", { name: "Reset Replay" });

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(replayStatus).toHaveText("idle");
  await expect(replayCommandIndex).toHaveText(/0 \/ \d+/);
  await expect(replayLatest).toHaveText("No command visualized yet.");
  await expect(playReplay).toBeVisible();
  await expect(pauseReplay).toBeVisible();
  await expect(stepReplay).toBeVisible();
  await expect(resetReplay).toBeVisible();
  const beforeStep = await replayCommandIndex.textContent();
  await stepReplay.click();
  await expect(replayCommandIndex).not.toHaveText(beforeStep ?? "");
  await expect(replayLatest).not.toHaveText("No command visualized yet.");
  await resetReplay.click();
  await expect(replayStatus).toHaveText("idle");
  await expect(replayCommandIndex).toHaveText(/0 \/ \d+/);
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await playReplay.click();
  await expect(replayStatus).toHaveText("playing");
  await pauseReplay.click();
  await expect(replayStatus).toHaveText("paused");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("upgrade lab can perform and inspect a duplicate upgrade", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/?scenario=upgrade-lab");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();

  const upgradePanel = panel(page, "Upgrade Progress");
  await expect(upgradePanel).toBeVisible();
  await expect(
    upgradePanel.getByText(/Cinder Scout: 3 \/ 3 pool copies at Lv 0 -> Upgrade to Lv 1/)
  ).toBeVisible();

  await upgradePanel.getByRole("button", { name: "Upgrade" }).click();

  await expect(upgradePanel.getByText(/No duplicate upgrade progress yet/)).toBeVisible();

  const poolPanel = panel(page, "Pool Cards");
  const cinderRows = poolPanel.getByRole("listitem").filter({ hasText: "Cinder Scout" });
  const upgradedCinderRow = cinderRows.filter({ hasText: "Lv 1" });
  await expect(cinderRows).toHaveCount(1);
  await expect(upgradedCinderRow).toBeVisible();

  await upgradedCinderRow.getByRole("button", { name: "Inspect" }).click();

  const inspectorPanel = page.locator(".battlefield-inspector.ally");
  await expect(
    inspectorPanel.getByRole("heading", { name: "Cinder Scout" })
  ).toBeVisible();
  await expect(inspectorPanel.getByText(/Unit \| pool \| Ember/)).toBeVisible();
  await expect(
    inspectorPanel.getByText("2 ATK / 3 HP / 1.1 speed / 1 range")
  ).toBeVisible();
  await expect(
    inspectorPanel.getByText(
      "Level 1. Combine 3 matching pool copies at this level to upgrade."
    )
  ).toBeVisible();
  await expect(inspectorPanel.getByText("Current bonus: +1 ATK / +1 HP.")).toBeVisible();
  await expect(
    inspectorPanel.getByRole("heading", { name: "Upgrade Progress" })
  ).toBeVisible();
  await expect(inspectorPanel.getByText("Level 1: 1 / 3 pool copies.")).toBeVisible();
  await expect(
    inspectorPanel.getByText("Blocked: Need 3 matching pool copies; found 1.")
  ).toBeVisible();

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
