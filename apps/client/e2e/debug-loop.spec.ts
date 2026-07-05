import { expect, test, type Locator, type Page } from "@playwright/test";

const panel = (page: Page, heading: string): Locator =>
  page.locator(".panel").filter({
    has: page.getByRole("heading", { name: heading, exact: true })
  });

const captureBrowserErrors = (page: Page) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
};

const expectNoHorizontalScroll = async (locator: Locator) => {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 4);
};

const clickPixiCell = async (
  page: Page,
  rendererHost: Locator,
  row: number,
  col: number
) => {
  await rendererHost.scrollIntoViewIfNeeded();
  const box = await rendererHost.boundingBox();
  expect(box).not.toBeNull();

  const layout = {
    width: 700,
    height: 420,
    marginX: 80,
    marginY: 74,
    hexWidth: 83.138,
    rowStep: 72
  };
  const scale = Math.min(box!.width / layout.width, box!.height / layout.height);
  const rootX = (box!.width - layout.width * scale) / 2;
  const rootY = (box!.height - layout.height * scale) / 2;
  const x =
    box!.x +
    rootX +
    (layout.marginX + col * layout.hexWidth + (row % 2 === 1 ? layout.hexWidth / 2 : 0)) *
      scale;
  const y = box!.y + rootY + (layout.marginY + row * layout.rowStep) * scale;

  await page.mouse.click(x, y);
};

test("debug loop can inspect, preview, record, reward, and advance", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What now?", exact: true })
  ).toBeVisible();
  const runStatePanel = panel(page, "What now?");
  await expect(runStatePanel.getByText("Prepare your loadout")).toBeVisible();
  await expect(runStatePanel.getByText("Start combat")).toBeVisible();
  await expect(runStatePanel.getByText("Review combat")).toBeVisible();
  await expect(runStatePanel.getByText("Choose rewards")).toBeVisible();
  await expect(runStatePanel.getByText("Advance to next fight")).toBeVisible();
  await expect(runStatePanel.getByText("Run details")).toBeVisible();
  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
  const opponentDetails = panel(page, "Opponent Details");
  await expect(opponentDetails).toBeVisible();
  expect(
    await opponentDetails.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await expect(opponentDetails.locator(".advanced-summary span")).not.toHaveText(
    "No encounter"
  );
  const planningDetails = panel(page, "Planning Check");
  await expect(planningDetails).toBeVisible();
  expect(
    await planningDetails.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await expect(planningDetails.locator(".advanced-summary span")).toHaveText("Legal");
  const traitDetails = panel(page, "Traits / Teamups");
  await expect(traitDetails).toBeVisible();
  expect(await traitDetails.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(traitDetails.getByText("Display-only prototype")).toBeVisible();
  const upgradeProgressDetails = panel(page, "Upgrade Progress");
  await expect(upgradeProgressDetails).toBeVisible();
  expect(
    await upgradeProgressDetails.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await expect(
    upgradeProgressDetails.getByText("No ready duplicate upgrade")
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Battlefield", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ally Inspector", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Enemy Inspector", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source Row", exact: true })
  ).toBeVisible();
  const commandZonePanel = panel(page, "Command Zone");
  await expect(commandZonePanel).toBeVisible();
  await expect(commandZonePanel.getByTestId("command-zone-card-name")).toHaveText(
    "Sparkcatch Apprentice"
  );
  await expect(commandZonePanel.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(commandZonePanel.getByTestId("commander-rebind-tax")).toHaveText(
    "+0 Charge"
  );
  await expect(commandZonePanel.getByTestId("commander-deploy-cost")).toHaveText(
    "1 base + 0 tax = 1 Charge"
  );
  await expect(
    commandZonePanel.getByTestId("commander-board-charge-after-deploy")
  ).toHaveText("3 / 3");
  await expect(
    commandZonePanel.getByRole("button", { name: "Deploy Commander" })
  ).toBeEnabled();
  const commanderHistory = commandZonePanel.getByTestId("commander-lifecycle-panel");
  await expect(commanderHistory).toBeVisible();
  expect(
    await commanderHistory.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await commanderHistory.getByText("Commander History").click();
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander initialized in Command Zone.");
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Round 1 | Starter | Phase planning | to command");

  const boardPanel = panel(page, "Board");
  const poolPanel = panel(page, "Pool Cards");
  const battlefield = page.locator(".battlefield-section");
  const rendererHost = page.getByTestId("pixi-renderer-host");
  const allyInspector = battlefield.locator(".battlefield-inspector.ally");
  const enemyInspector = battlefield.locator(".battlefield-inspector.enemy");

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Play Replay" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Step Replay" })).toHaveCount(0);
  await expect(page.getByText("Renderer Feed")).toHaveCount(0);
  const debugFallback = battlefield.locator("details.renderer-debug-board");
  await expect(debugFallback).toBeVisible();
  await expect(debugFallback.getByText("React/CSS Debug Board")).toBeVisible();
  expect(await debugFallback.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(page.getByTestId("hex-arena")).toBeHidden();
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(enemyInspector.getByText(/\| encounter \|/)).toBeVisible();
  await expect(allyInspector.getByText("2 ATK").first()).toBeVisible();
  await expect(allyInspector.getByText("1 HP").first()).toBeVisible();
  await expect(allyInspector.getByText("1.3 AS").first()).toBeVisible();
  await expect(allyInspector.getByText("1 RNG").first()).toBeVisible();
  await expect(boardPanel.getByRole("button", { name: "Inspect" }).first()).toBeVisible();
  const engagementPreview = battlefield.locator(
    ".default-pixi-stage > [data-testid='engagement-preview']"
  );
  await expect(
    engagementPreview.getByRole("heading", { name: "Engagement Preview" })
  ).toBeVisible();
  await expect(engagementPreview.getByText("Ember Scraprunner").first()).toBeVisible();
  await expect(
    engagementPreview.getByText("Ember Scraprunner can attack Ember Scraprunner now.")
  ).toBeVisible();
  await expect(engagementPreview.getByText("Distance 1, range 1.")).toBeVisible();
  await expect(engagementPreview.getByText("Attack now")).toBeVisible();
  await expectNoHorizontalScroll(rendererHost);
  await clickPixiCell(page, rendererHost, 0, 2);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(allyInspector.getByText(/Unit \| board \| Ember/)).toBeVisible();
  await expect(allyInspector.getByText("Cost")).toBeVisible();
  await expect(allyInspector.getByText(/Charge/)).toBeVisible();
  await expect(allyInspector.getByText("Attack speed: 1.3 AS")).toBeVisible();
  await expect(
    allyInspector.getByText(/used by the simulator attack timer/)
  ).toBeVisible();
  await expect(
    allyInspector.getByRole("heading", { name: "Legal Actions" })
  ).toBeVisible();

  await clickPixiCell(page, rendererHost, 0, 3);
  await expect(enemyInspector.getByText(/\| encounter \|/)).toBeVisible();
  await expect(enemyInspector.getByText(/ATK/).first()).toBeVisible();
  await expect(
    enemyInspector.getByRole("heading", { name: "Legal Actions" })
  ).toHaveCount(0);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(enemyInspector).toBeVisible();
  await clickPixiCell(page, rendererHost, 0, 2);
  await expect(
    engagementPreview.getByText("Ember Scraprunner can attack Ember Scraprunner now.")
  ).toBeVisible();
  await expectNoHorizontalScroll(rendererHost);

  await expect(
    battlefield.getByText(
      "Select a board-placeable Pool card below, then click a highlighted Pixi cell."
    )
  ).toBeVisible();
  const sparkcatchPoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" }).click();
  await expect(battlefield.getByText("Placing Sparkcatch Apprentice.")).toBeVisible();
  await clickPixiCell(page, rendererHost, 0, 0);
  await expect(battlefield.getByText("Placing Sparkcatch Apprentice.")).toHaveCount(0);
  await expect(
    boardPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" }).first()
  ).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  await page.getByRole("button", { name: "Ready Combat" }).click();

  const previewPanel = panel(page, "Upcoming Combat Preview");
  await expect(previewPanel).toBeVisible();
  await expect(previewPanel.getByText(/Winner:/)).toBeVisible();

  await page.getByRole("button", { name: "Record Combat" }).click();

  const recordedPanel = panel(page, "Last Recorded Combat");
  await expect(recordedPanel.getByText(/Winner:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Damage:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Events:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Gold: \+/)).toBeVisible();
  await expect(recordedPanel.locator(".combat-result-strip")).toContainText(
    "No combat return"
  );
  const combatFeed = recordedPanel.locator("details.combat-feed-details");
  await expect(combatFeed).toBeVisible();
  expect(await combatFeed.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await combatFeed.getByText("Combat Event Feed").click();
  await expect(recordedPanel.getByText("Damage to you", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Damage to enemy", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Warnings", { exact: true })).toBeVisible();

  const commanderUpgradePanel = panel(page, "Commander Upgrades");
  await expect(
    commanderUpgradePanel.getByText(
      "Choose one Commander upgrade for this reward. It applies only to the Commander."
    )
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByText("Combat Training", { exact: true })
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByText("Rebind Calibration", { exact: true })
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByTestId("commander-upgrade-panel-level")
  ).toHaveText("Lv 0");
  await commanderUpgradePanel
    .getByRole("button", { name: "Apply Combat Training" })
    .click();
  await expect(
    commanderUpgradePanel.getByTestId("commander-upgrade-panel-level")
  ).toHaveText("Lv 1");
  await expect(
    commanderUpgradePanel.getByText("Commander upgrade claimed for this reward.")
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByTestId("commander-latest-upgrade")
  ).toContainText("Combat Training");
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander upgraded: Combat Training.");
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Level 0 -> 1");

  const rewardPanel = panel(page, "Reward Choices");
  await expect(rewardPanel.getByText(/Cost \d+ gold/).first()).toBeVisible();
  await expect(rewardPanel.getByText(/After purchase: \d+ gold/).first()).toBeVisible();
  const rewardExplanation = rewardPanel.locator(".reward-explanation-details").first();
  await expect(rewardExplanation.locator(".reward-headline")).toBeVisible();
  expect(
    await rewardExplanation.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await rewardExplanation.locator("summary").click();
  await expect(rewardPanel.locator(".reward-reasons li").first()).toBeVisible();
  await expect(
    rewardPanel
      .getByText(/Biased toward|Matches active|Can add Aspect|Can contain/)
      .first()
  ).toBeVisible();
  await expect(rewardPanel.getByRole("button", { name: "Open" }).first()).toBeVisible();
  await rewardPanel.getByRole("button", { name: "Open" }).first().click();

  const postPackSuggestions = page.getByTestId("post-pack-suggestions-panel");
  await expect(postPackSuggestions).toBeVisible();
  await expect(
    postPackSuggestions.getByRole("heading", { name: "Suggested next edits" })
  ).toBeVisible();
  await expect(postPackSuggestions.getByText(/Latest pack:/)).toBeVisible();
  await expect(
    postPackSuggestions.getByText(
      "New cards are in your pool. Advance to the next planning round to edit your loadout."
    )
  ).toBeVisible();

  await expect(poolPanel.getByText(/Latest pack:/)).toBeVisible();
  await expect(poolPanel.getByText(/Paid \d+ gold/)).toBeVisible();
  await expect(poolPanel.getByText("new").first()).toBeVisible();

  await page.getByRole("button", { name: "Advance" }).click();

  await expect(runStatePanel.getByText("2 / 3")).toBeVisible();
  await expect(runStatePanel.getByText(/Next:/)).toBeVisible();
  await expect(
    postPackSuggestions.getByTestId("post-pack-suggestion").first()
  ).toBeVisible();
  const firstSuggestion = postPackSuggestions.getByTestId("post-pack-suggestion").first();
  await firstSuggestion.scrollIntoViewIfNeeded();
  await expect(
    firstSuggestion.getByRole("button", { name: /Apply suggested edit:/ })
  ).toBeVisible();
  const suggestedCardName =
    (await firstSuggestion.getByTestId("post-pack-suggestion-card-name").textContent()) ??
    "";
  const suggestedAction =
    (await firstSuggestion.getByTestId("post-pack-suggestion-action").textContent()) ??
    "";
  expect(suggestedCardName.trim().length).toBeGreaterThan(0);
  await expect(firstSuggestion.getByText(/High|Medium|Low/).first()).toBeVisible();
  await firstSuggestion.getByRole("button", { name: /Apply suggested edit:/ }).click();
  if (suggestedAction.includes("Source Row")) {
    await expect(
      panel(page, "Source Row").getByText(suggestedCardName.trim(), { exact: true })
    ).toBeVisible();
  } else if (suggestedAction.includes("Spellrail")) {
    await expect(
      panel(page, "Spellrail").getByText(suggestedCardName.trim(), { exact: true })
    ).toBeVisible();
  } else if (suggestedAction.includes("Board")) {
    await expect(
      panel(page, "Board").getByText(suggestedCardName.trim(), { exact: true })
    ).toBeVisible();
  }

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

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
  await clickPixiCell(page, rendererHost, 0, 0);
  await expect(rendererLab.getByText(/Placing Sparkcatch Apprentice/)).toHaveCount(0);
  await expect(
    rendererLab
      .locator(".renderer-lab-panel")
      .filter({ hasText: "Active board permanents use Board Charge" })
      .getByRole("listitem")
      .filter({ hasText: "Sparkcatch Apprentice" })
  ).toBeVisible();

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
  await playReplay.scrollIntoViewIfNeeded();
  await expect(playReplay).toBeVisible();
  await expect(pauseReplay).toBeVisible();
  await expect(stepReplay).toBeVisible();
  await expect(resetReplay).toBeVisible();
  await playReplay.click();
  await expect(replayStatus).toHaveText("playing");
  await pauseReplay.click();
  await expect(replayStatus).toHaveText("paused");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await page.waitForTimeout(500);
  const beforeStep = await replayCommandIndex.textContent();
  await stepReplay.click();
  await expect(replayCommandIndex).not.toHaveText(beforeStep ?? "");
  await expect(replayLatest).not.toHaveText("No command visualized yet.");
  await resetReplay.click();
  await expect(replayStatus).toHaveText("idle");
  await expect(replayCommandIndex).toHaveText(/0 \/ \d+/);
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
