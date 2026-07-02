import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/client/e2e",
  fullyParallel: false,
  preserveOutput: "never",
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "off",
    trace: "off",
    video: "off"
  },
  webServer: {
    command:
      "pnpm --filter @packbound/client exec vite --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
