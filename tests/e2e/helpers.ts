import { expect, type Page } from '@playwright/test';

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
