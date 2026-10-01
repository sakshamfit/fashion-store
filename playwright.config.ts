import { defineConfig } from "@playwright/test";

const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalServer || "http://localhost:3000",
    browserName: "chromium",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath
      ? {
          executablePath,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-zygote"],
        }
      : {},
  },
  projects: [
    { name: "server", testMatch: "**/request-origin.spec.ts" },
    {
      name: "phone-320",
      testMatch: "**/storefront.spec.ts",
      use: {
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "phone-390",
      testMatch: "**/storefront.spec.ts",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "phone-430",
      testMatch: "**/storefront.spec.ts",
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "phone-landscape",
      testMatch: "**/storefront.spec.ts",
      use: {
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "tablet-768",
      testMatch: "**/storefront.spec.ts",
      use: { viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: "desktop-1440",
      testMatch: "**/storefront.spec.ts",
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: externalServer
    ? undefined
    : {
        command: "corepack pnpm dev --hostname 0.0.0.0 --port 3000",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
