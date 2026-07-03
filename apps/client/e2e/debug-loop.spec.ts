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
  const hexArena = page.getByTestId("hex-arena");
  const hexArenaViewport = page.getByTestId("hex-arena-viewport");
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
  await expect(hexArena.getByRole("heading", { name: "Hex Arena" })).toBeVisible();
  await expect(hexArena.getByText("Engagement Line")).toBeVisible();
  const engagementPreview = hexArena.getByTestId("engagement-preview");
  await expect(
    engagementPreview.getByRole("heading", { name: "Engagement Preview" })
  ).toBeVisible();
  await expect(engagementPreview.getByText("Ember Scraprunner").first()).toBeVisible();
  await expect(
    engagementPreview.getByText("Ember Scraprunner can attack Ember Scraprunner now.")
  ).toBeVisible();
  await expect(engagementPreview.getByText("Distance 1, range 1.")).toBeVisible();
  await expect(engagementPreview.getByText("Attack now")).toBeVisible();
  await expect(hexArena.getByText("Odd-r hex").first()).toBeVisible();
  await expect(hexArena.getByText("Pointy-top")).toBeVisible();
  await expect(hexArena.getByTestId("board-card").first()).toBeVisible();
  await expect(hexArena.locator('[data-range-preview="true"]').first()).toBeVisible();
  await expect(hexArena.locator('[data-selected-preview="true"]').first()).toBeVisible();
  await expect(hexArena.locator('[data-likely-target="true"]').first()).toBeVisible();
  await expect(hexArena.locator(".board-preview-marker.selected").first()).toBeVisible();
  await expect(
    hexArena.locator(".board-preview-marker.target.in-range").first()
  ).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);
  const occupiedCardsInViewport = await hexArena.getByTestId("board-card").evaluateAll(
    (cards) =>
      cards.filter((card) => {
        const rect = card.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight
        );
      }).length
  );
  expect(occupiedCardsInViewport).toBeGreaterThan(0);
  await expect(
    playerGridPanel.getByRole("heading", { name: "Ally Hex Board" })
  ).toBeVisible();
  await expect(
    enemyGridPanel.getByRole("heading", { name: "Enemy Hex Board" })
  ).toBeVisible();
  await expect(playerGridPanel.getByText("Your side")).toBeVisible();
  await expect(enemyGridPanel.getByText("Enemy side")).toBeVisible();
  await expect(playerGridPanel.getByText("Odd-r hex")).toBeVisible();
  await expect(playerGridPanel.getByText("Odd rows offset")).toBeVisible();
  await expect(enemyGridPanel.getByText("Odd-r hex")).toBeVisible();
  await expect(enemyGridPanel.getByText("Odd rows offset")).toBeVisible();
  await expect(playerGridPanel.getByText("r0 c2")).toBeVisible();
  await expect(playerGridPanel.getByText("ground").first()).toBeVisible();
  await expect(playerGridPanel.getByText("2 ATK").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1 HP").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1.3 AS").first()).toBeVisible();
  await expect(playerGridPanel.getByText("1 RNG").first()).toBeVisible();
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
  await expect(playerGridPanel.locator('[data-selected-preview="true"]')).toBeVisible();
  await expect(enemyGridPanel.locator('[data-likely-target="true"]')).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);

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
  await expect(enemyGridPanel.locator('[data-selected-preview="true"]')).toBeVisible();
  await expect(playerGridPanel.locator('[data-likely-target="true"]')).toBeVisible();
  await expect(
    engagementPreview.getByText("Ember Scraprunner can attack Ember Scraprunner now.")
  ).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);

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
  await expect(engagementPreview.getByText("Next move: r1 c0 to r1 c1.")).toBeVisible();
  await expect(engagementPreview.getByText("Closing")).toBeVisible();
  await expect(
    engagementPreview.getByText("Likely target: nearest valid enemy.")
  ).toBeVisible();

  await expect(
    allyInspector.getByRole("heading", { name: "Cinder Scout" })
  ).toBeVisible();
  await expect(
    playerGridPanel.getByRole("button", { name: /Inspect Cinder Scout ground r1 c0/ })
  ).toBeVisible();
  await expect(
    playerGridPanel.getByRole("button", {
      name: /Inspect Sparkcatch Apprentice ground r1 c2/
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
    hexArena.locator(".board-preview-marker.target.out-of-range").first()
  ).toBeVisible();
  await expect(hexArena.locator(".board-preview-marker.move").first()).toBeVisible();
  await expectNoHorizontalScroll(hexArenaViewport);

  await page.getByRole("button", { name: "Ready Combat" }).click();
  await page.getByRole("button", { name: "Record Combat" }).click();
  await expect(panel(page, "Last Recorded Combat").getByText(/Winner:/)).toBeVisible();

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
