import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  ...(ci ? { workers: 2 } : {}),
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /pwa-smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4200",
      },
    },
    {
      name: "mobile",
      testMatch: /core-workflow\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        baseURL: "http://localhost:4200",
      },
    },
    {
      name: "pwa",
      testMatch: /pwa-smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4300",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @idkdo/server run start",
      cwd: "..",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !ci,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @idkdo/web run dev",
      cwd: "..",
      url: "http://localhost:4200",
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @idkdo/web run build && node e2e/scripts/serve-web-prod.mjs",
      cwd: "..",
      url: "http://localhost:4300",
      reuseExistingServer: !ci,
      timeout: 240_000,
    },
  ],
});
