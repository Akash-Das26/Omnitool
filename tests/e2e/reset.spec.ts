import { expect, test } from '@playwright/test';

/**
 * Every built tool shows Reset in its frame header (DESIGN.md, tool frame).
 * Two tools are checked behaviourally; the rest only have to expose the control.
 */
const TOOL_ROUTES = [
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

for (const route of TOOL_ROUTES) {
  test(`${route} offers Reset`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });
}

test('Reset clears the word counter', async ({ page }) => {
  await page.goto('/tools/word-counter');
  const input = page.getByLabel('Text to count');
  await input.fill('Some text that should be cleared.');
  await expect(page.locator('dd').first()).toHaveText('6');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('dd').first()).toHaveText('0');
});

test('Reset clears the JSON formatter input and output', async ({ page }) => {
  await page.goto('/tools/json-formatter');
  await page.getByLabel('JSON input').fill('{"a":1}');
  await page.getByRole('button', { name: 'Format' }).click();
  await expect(page.getByLabel('Formatted JSON')).toHaveValue('{\n  "a": 1\n}\n');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('JSON input')).toHaveValue('');
  await expect(page.getByLabel('Formatted JSON')).toHaveValue('');
});
