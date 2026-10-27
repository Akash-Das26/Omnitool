import { availableParallelism } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

/**
 * Half the cores locally: the suite is CPU-bound (React hydration, canvas, axe)
 * and oversubscribing it makes every assertion race the scheduler. CI runners are
 * smaller and shared, so they get a fixed two.
 */
const localWorkers = Math.max(1, Math.floor(availableParallelism() / 2));

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

const baseProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ...extraProjects,
];

/** The one file whose tests put a megabyte through the page's main thread. */
const HEAVY_FILE = /heavy\.spec\.ts$/;

/**
 * The megabyte guards run in their own project, after every other project has
 * finished, and in file order within it, so exactly one of them is ever running
 * on the machine. They were previously in the general run and shared the page's
 * main thread with other workers; one recorded failure (Session 024) timed out
 * beside them, and the cause was never reproduced, so the competition is
 * removed rather than assumed to be the cause.
 *
 * The chain runs backwards: the last heavy project depends only on the normal
 * projects, and each one before it waits for the one after, so no two heavy
 * projects overlap and no cycle is possible.
 */
const heavyProjects = baseProjects.map((project, index) => ({
  name: `${project.name}-heavy`,
  testMatch: [HEAVY_FILE],
  fullyParallel: false,
  use: project.use,
  dependencies: [
    ...baseProjects.map((entry) => entry.name),
    ...baseProjects.slice(index + 1).map((entry) => `${entry.name}-heavy`),
  ],
}));

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // No retries anywhere: a flaky guard is a defect to fix, not to retry past.
  retries: 0,
  workers: process.env.CI ? 2 : localWorkers,
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
    ...baseProjects.map((project) => ({ ...project, testIgnore: [HEAVY_FILE] })),
    ...heavyProjects,
  ],
});
