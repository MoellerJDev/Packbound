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

test("debug loop can inspect, preview, record, reward, and advance", async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Run State", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current Encounter", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Planning Check", exact: true })
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
  await expect(panel(page, "Upgrade Progress")).toBeVisible();

  const boardPanel = panel(page, "Board");
  const battlefield = page.locator(".battlefield-section");
  const playerGridPanel = battlefield.locator(".battlefield-board-side.ally");
  const enemyGridPanel = battlefield.locator(".battlefield-board-side.enemy");
  const allyInspector = battlefield.locator(".battlefield-inspector.ally");
  const enemyInspector = battlefield.locator(".battlefield-inspector.enemy");

  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(enemyInspector.getByText(/\| encounter \|/)).toBeVisible();
  await expect(allyInspector.getByText("2 ATK").first()).toBeVisible();
  await expect(allyInspector.getByText("1 HP").first()).toBeVisible();
  await expect(allyInspector.getByText("1.3 AS").first()).toBeVisible();
  await expect(allyInspector.getByText("1 RNG").first()).toBeVisible();
  await expect(boardPanel.getByRole("button", { name: "Inspect" }).first()).toBeVisible();
  await expect(playerGridPanel.getByText("Your side")).toBeVisible();
  await expect(enemyGridPanel.getByText("Enemy side")).toBeVisible();
  await expect(playerGridPanel.getByText("r0 c2")).toBeVisible();
  await expect(playerGridPanel.getByText("ground").first()).toBeVisible();
  await expect(playerGridPanel.getByText("2 ATK").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1 HP").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1.3 AS").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1 RNG").first()).toBeVisible();
  await expect(playerGridPanel.getByText("Melee").first()).toBeVisible();
  await playerGridPanel
    .getByRole("button", { name: /Inspect Ember Scraprunner ground r0 c2/ })
    .click();
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

  await enemyGridPanel
    .getByRole("button", { name: /Inspect .+/ })
    .first()
    .click();
  await expect(enemyInspector.getByText(/\| encounter \|/)).toBeVisible();
  await expect(enemyInspector.getByText(/ATK/).first()).toBeVisible();
  await expect(
    enemyInspector.getByRole("heading", { name: "Legal Actions" })
  ).toHaveCount(0);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(enemyInspector).toBeVisible();

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
  await expect(recordedPanel.getByText("Damage to you", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Damage to enemy", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Warnings", { exact: true })).toBeVisible();

  const rewardPanel = panel(page, "Reward Choices");
  await expect(rewardPanel.getByText(/Cost \d+ gold/).first()).toBeVisible();
  await expect(rewardPanel.getByText(/After purchase: \d+ gold/).first()).toBeVisible();
  await expect(rewardPanel.locator(".reward-headline").first()).toBeVisible();
  await expect(rewardPanel.locator(".reward-reasons li").first()).toBeVisible();
  await expect(
    rewardPanel
      .getByText(/Biased toward|Matches active|Can add Aspect|Can contain/)
      .first()
  ).toBeVisible();
  await expect(rewardPanel.getByRole("button", { name: "Open" }).first()).toBeVisible();
  await rewardPanel.getByRole("button", { name: "Open" }).first().click();

  const poolPanel = panel(page, "Pool Cards");
  await expect(poolPanel.getByText(/Latest pack:/)).toBeVisible();
  await expect(poolPanel.getByText(/Paid \d+ gold/)).toBeVisible();
  await expect(poolPanel.getByText("new").first()).toBeVisible();

  await page.getByRole("button", { name: "Advance" }).click();

  const runStatePanel = panel(page, "Run State");
  await expect(runStatePanel.getByText("2 / 3")).toBeVisible();
  await expect(runStatePanel.getByText(/Next:/)).toBeVisible();

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
