import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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

for (const route of routes) {
  test(`axe has no serious or critical issues on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test('omnibox dialog passes axe', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('dark theme passes axe on home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to dark theme/ }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
