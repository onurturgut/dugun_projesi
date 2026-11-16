import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/playwright",
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      timeout: 30_000,
    },
  },
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:3100",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "yarn dev --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
