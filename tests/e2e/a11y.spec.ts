import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const routes = [
  '/',
  '/privacy',
  '/about',
  '/tools/uuid-genny',
  '/tools/qr-genny',
  '/tools/image-converter',
  '/tools/json-formatter',
  '/tools/jwt-decoder',
  '/tools/encoder',
  '/tools/base-converter',
  '/tools/password-genny',
  '/tools/word-counter',
  '/tools/px-to-rem',
  '/tools/text-diff',
];

const themes = ['light', 'dark'] as const;

async function openInTheme(page: Page, route: string, theme: 'light' | 'dark') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
  }, theme);
  await page.goto(route);
  await page.waitForTimeout(300);
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
}

for (const theme of themes) {
  for (const route of routes) {
    test(`axe has no serious or critical issues on ${route} (${theme})`, async ({ page }) => {
      await openInTheme(page, route, theme);
      const serious = await seriousViolations(page);
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
}

for (const theme of themes) {
  test(`the omnibox passes axe (${theme})`, async ({ page }) => {
    await openInTheme(page, '/', theme);
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog')).toBeVisible();

    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`the omnibox with a dropped file passes axe (${theme})`, async ({ page }) => {
    await openInTheme(page, '/', theme);

    await page.evaluate(() => {
      const file = new File([new Uint8Array([137, 80, 78, 71])], 'sample.png', {
        type: 'image/png',
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const target = document.querySelector('main button');
      target?.dispatchEvent(
        new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
      );
    });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('sample.png')).toBeVisible();
    await expect(page.getByText(/Tools that accept this file/)).toBeVisible();

    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
