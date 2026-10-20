import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

test('no third-party requests during normal use', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      external.push(request.url());
    }
  });

  await gotoApp(page, '/');
  await page
    .getByRole('main')
    .getByRole('button', { name: /Find a tool/ })
    .click();
  await page.getByPlaceholder('Search tools or a file type').fill('uuid');
  await page.getByRole('option', { name: /UUID Generator/ }).click();
  await page.getByRole('button', { name: 'Generate' }).click();

  await gotoApp(page, '/tools/qr-genny');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();

  await gotoApp(page, '/tools/image-converter');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
  await page.getByRole('button', { name: 'Convert' }).click();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible({
    timeout: 20_000,
  });

  // No fixed grace period: wait until nothing is in flight, so a late request
  // would still be caught, then assert the list.
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
