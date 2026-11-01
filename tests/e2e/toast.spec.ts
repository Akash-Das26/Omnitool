import { expect, type Page, test } from '@playwright/test';
import { expectAppReady, gotoApp } from './helpers';

const THEMES = ['light', 'dark'] as const;

async function openWithToast(page: Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
  }, theme);
  await gotoApp(page, '/');
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);

  // The notice is real PWA state: wait for the worker's precache to finish
  // rather than injecting a fake toast.
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  const toast = page.getByRole('status').filter({ hasText: 'ready to work offline' });
  await expect(toast).toBeVisible({ timeout: 20_000 });
  return toast;
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const theme of THEMES) {
  test(`the toast clears the rail on desktop (${theme})`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const toast = await openWithToast(page, theme);
    const collapse = page.getByRole('button', { name: 'Collapse category rail' });
    await expect(collapse).toBeVisible();

    const toastBox = await toast.boundingBox();
    const collapseBox = await collapse.boundingBox();
    expect(toastBox).not.toBeNull();
    expect(collapseBox).not.toBeNull();
    if (!toastBox || !collapseBox) return;

    expect(overlaps(toastBox, collapseBox)).toBe(false);
    expect(toastBox.x).toBeGreaterThan(240);
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(1440);
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(900);
  });

  test(`the toast clears the mobile action bar (${theme})`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const toast = await openWithToast(page, theme);

    // SPA navigation keeps the toast mounted; image-converter has the sticky bar.
    await expectAppReady(page);
    await page.locator('main section li > a[href]').first().click();
    await expect(page).toHaveURL(/\/tools\/image-converter$/);
    const actions = page.locator('[data-slot="tool-actions"]');
    await expect(actions).toBeVisible();
    await expect(toast).toBeVisible();

    const toastBox = await toast.boundingBox();
    const barBox = await actions.boundingBox();
    expect(toastBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    if (!toastBox || !barBox) return;

    expect(overlaps(toastBox, barBox)).toBe(false);
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(barBox.y + 1);
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(390);
  });
}
