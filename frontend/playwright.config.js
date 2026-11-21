import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  globalSetup: "./tests/ui/setup.js",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.UI_BASE_URL || "http://127.0.0.1:5000",
    storageState: ".playwright/anna.json",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [360, 768, 1280].map((width) => ({
    name: `${width}px`,
    use: { viewport: { width, height: 800 } },
  })),
});
