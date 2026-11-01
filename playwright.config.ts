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
 * The megabyte guards run in a project of their own, after that browser's other
 * tests have finished, and in file order within it, so the page's main thread is
 * not shared with five other workers while a megabyte goes through it.
 *
 * They were in the general run until Session 025: one recorded failure (Session
 * 024) timed out beside them and was never reproduced, so the competition was
 * removed rather than assumed to be the cause. Each heavy project depends only
 * on its own browser's project — depending on every project would make
 * `--project=firefox-heavy` launch WebKit as well, which cannot run on this
 * host. The CI matrix runs one browser per job, and the local gate is Chromium,
 * so in both the guards still run alone; running every browser at once locally
 * (PLAYWRIGHT_BROWSERS=all) can overlap the three browsers' heavy projects.
 */
const heavyProjects = baseProjects.map((project) => ({
  name: `${project.name}-heavy`,
  testMatch: [HEAVY_FILE],
  fullyParallel: false,
  use: project.use,
  dependencies: [project.name],
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
