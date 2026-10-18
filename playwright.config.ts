import { defineConfig, devices } from '@playwright/test';

/**
 * Chromium is the default gate. Set `PLAYWRIGHT_BROWSERS=all` to add Firefox and
 * WebKit for the browser-matrix checks (audit finding F-013). On Linux those two
 * need extra system libraries: `pnpm exec playwright install --with-deps firefox webkit`.
 */
const everyBrowser = process.env.PLAYWRIGHT_BROWSERS === 'all';

/** Pixel baselines only exist for Chromium; the others assert styles instead. */
const extraProjects = everyBrowser
  ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ]
  : [];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'pnpm --filter @omnitool/web preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...extraProjects,
  ],
});
