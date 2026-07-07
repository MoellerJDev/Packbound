import { expect, type Locator, type Page } from "@playwright/test";

export const panel = (page: Page, heading: string): Locator =>
  page.locator(".panel:not(.default-loadout-tray)").filter({
    has: page.getByRole("heading", { name: heading, exact: true }),
    hasNot: page.getByTestId("advanced-debug-panels-summary")
  });

export const captureBrowserErrors = (page: Page) => {
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

export const expectNoHorizontalScroll = async (locator: Locator) => {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 4);
};

export const clickPixiCell = async (
  page: Page,
  rendererHost: Locator,
  row: number,
  col: number,
  offset: { readonly x: number; readonly y: number } = { x: 0, y: 0 }
) => {
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await rendererHost.scrollIntoViewIfNeeded();
  const box = await rendererHost.boundingBox();
  expect(box).not.toBeNull();

  const layout = {
    width: 700,
    height: 650,
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
    (layout.marginX +
      col * layout.hexWidth +
      (row % 2 === 1 ? layout.hexWidth / 2 : 0) +
      offset.x) *
      scale;
  const y = box!.y + rootY + (layout.marginY + row * layout.rowStep + offset.y) * scale;

  await page.mouse.click(x, y);
};

export const expectNoBrowserErrors = (
  errors: ReturnType<typeof captureBrowserErrors>
) => {
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
};

export const gotoDefaultPlaytestRoute = async (
  page: Page,
  {
    debug = false
  }: {
    readonly debug?: boolean;
  } = {}
) => {
  const errors = captureBrowserErrors(page);

  await page.goto(debug ? "/?debug=1" : "/");

  await expect(page.getByRole("heading", { name: "Packbound" })).toBeVisible();
  const playtestRoute = page.getByTestId("default-playtest-route");
  const battlefield = playtestRoute.locator(".battlefield-section");

  return {
    allyInspector: battlefield.getByTestId("default-pixi-ally-card"),
    battlefield,
    decisionPanel: page.getByTestId("default-playtest-decision-panel"),
    enemyInspector: battlefield.getByTestId("default-pixi-enemy-card"),
    errors,
    playtestRoute,
    rendererHost: page.getByTestId("pixi-renderer-host")
  };
};

export const openAdvancedDebugPanels = async (page: Page): Promise<Locator> => {
  const advancedDebug = page.getByTestId("advanced-debug-panels");
  await expect(advancedDebug).toBeVisible();
  const isOpen = await advancedDebug.evaluate(
    (node) => (node as HTMLDetailsElement).open
  );

  if (!isOpen) {
    await page.getByTestId("advanced-debug-panels-summary").click();
  }

  return advancedDebug;
};
