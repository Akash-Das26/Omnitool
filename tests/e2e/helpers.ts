import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * The client shell sets `html[data-app-ready]` after its first React commit (see
 * `apps/web/src/main.tsx`). Guards wait on that instead of a fixed sleep, so a
 * slow host delays the assertion rather than changing its outcome.
 */
export async function expectAppReady(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
}

/** Navigate and wait for the shell to be interactive. */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path);
  await expectAppReady(page);
}

/**
 * Collects what the page logged, for the failure report. A guard that fails
 * under load is read afterwards, so the console error that explains it must be
 * in the report rather than in a terminal that has already scrolled away.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(`${error.name}: ${error.message}`);
  });
  return errors;
}

/**
 * Attaches the route, the document state and the collected console errors to a
 * failed guard. Deliberately not called on a pass: an attachment per test would
 * bury the one you need. `page.evaluate` is guarded because the page may have
 * crashed, which is itself the answer.
 */
export async function attachDiagnostics(
  page: Page,
  testInfo: TestInfo,
  consoleErrors: readonly string[] = [],
) {
  if (testInfo.status === testInfo.expectedStatus) return;
  const state = await page
    .evaluate(() => ({
      url: location.href,
      readyState: document.readyState,
      appReady: document.documentElement.getAttribute('data-app-ready'),
    }))
    .catch((error: unknown) => ({
      url: page.url(),
      evaluateFailed: error instanceof Error ? error.message : String(error),
    }));
  await testInfo.attach('page-state', {
    body: JSON.stringify({ ...state, consoleErrors }, null, 2),
    contentType: 'application/json',
  });
}
