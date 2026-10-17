import { expect, test } from '@playwright/test';

test('no third-party requests during normal use', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      external.push(request.url());
    }
  });

  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('button', { name: /Find a tool/ })
    .click();
  await page.getByPlaceholder('Search tools or a file type').fill('uuid');
  await page.getByRole('option', { name: /UUID Generator/ }).click();
  await page.getByRole('button', { name: 'Generate' }).click();

  await page.goto('/tools/qr-genny');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();

  await page.goto('/tools/image-converter');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
  await page.getByRole('button', { name: 'Convert' }).click();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible({
    timeout: 20_000,
  });

  await page.waitForTimeout(500);
  expect(external).toEqual([]);
});
