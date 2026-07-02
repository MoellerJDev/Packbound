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
    page.getByRole("heading", { name: "Card Inspector", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source Row", exact: true })
  ).toBeVisible();

  const boardPanel = panel(page, "Board");
  const inspectorPanel = panel(page, "Card Inspector");

  await boardPanel.getByRole("button", { name: "Inspect" }).first().click();

  await expect(inspectorPanel.getByText(/Unit \| board \| Ember/)).toBeVisible();
  await expect(inspectorPanel.getByText("Cost")).toBeVisible();
  await expect(inspectorPanel.getByText(/Charge/)).toBeVisible();
  await expect(
    inspectorPanel.getByRole("heading", { name: "Legal Actions" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Ready Combat" }).click();

  const previewPanel = panel(page, "Upcoming Combat Preview");
  await expect(previewPanel).toBeVisible();
  await expect(previewPanel.getByText(/Winner:/)).toBeVisible();

  await page.getByRole("button", { name: "Record Combat" }).click();

  const recordedPanel = panel(page, "Last Recorded Combat");
  await expect(recordedPanel.getByText(/Winner:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Damage:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Events:/)).toBeVisible();
  await expect(recordedPanel.getByText("Damage to you", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Damage to enemy", { exact: true })).toBeVisible();
  await expect(recordedPanel.getByText("Warnings", { exact: true })).toBeVisible();

  const rewardPanel = panel(page, "Reward Choices");
  await expect(rewardPanel.getByRole("button", { name: "Open" }).first()).toBeVisible();
  await rewardPanel.getByRole("button", { name: "Open" }).first().click();

  const poolPanel = panel(page, "Pool Cards");
  await expect(poolPanel.getByText(/Latest pack:/)).toBeVisible();
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

  const upgradePanel = panel(page, "Available Upgrades");
  await expect(upgradePanel).toBeVisible();
  await expect(
    upgradePanel.getByText(/Cinder Scout: 3 \/ 3 copies at level 0 -> upgrade to level 1/)
  ).toBeVisible();

  await upgradePanel.getByRole("button", { name: "Upgrade" }).click();

  await expect(
    upgradePanel.getByText(/No pool card has 3 matching Unit or Echo copies/)
  ).toBeVisible();

  const poolPanel = panel(page, "Pool Cards");
  const cinderRows = poolPanel.getByRole("listitem").filter({ hasText: "Cinder Scout" });
  const upgradedCinderRow = cinderRows.filter({ hasText: "Lv 1" });
  await expect(cinderRows).toHaveCount(1);
  await expect(upgradedCinderRow).toBeVisible();

  await upgradedCinderRow.getByRole("button", { name: "Inspect" }).click();

  const inspectorPanel = panel(page, "Card Inspector");
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

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
