import { expect, test } from '@playwright/test';

test('the shell and sample tools work offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  // Visit each tool once so its chunk is confirmed installed, then go offline.
  await page.goto('/tools/uuid-genny');
  await expect(page.getByRole('heading', { level: 1, name: 'UUID Generator' })).toBeVisible();
  await page.goto('/tools/qr-genny');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await page.goto('/tools/image-converter');
  await expect(page.getByRole('heading', { level: 1, name: 'Image Converter' })).toBeVisible();

  await context.setOffline(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();

  await page.goto('/tools/uuid-genny');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('[data-output-value]').first()).not.toBeEmpty();

  await page.goto('/tools/image-converter');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
  await page.getByRole('button', { name: 'Convert' }).click();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled({
    timeout: 20_000,
  });

  await page.goto('/tools/json-formatter');
  await page.getByLabel('JSON input').fill('{"offline":true}');
  await page.getByRole('button', { name: 'Format' }).click();
  await expect(page.getByLabel('Formatted JSON')).toHaveValue('{\n  "offline": true\n}\n');

  await page.goto('/tools/word-counter');
  await page.getByLabel('Text to count').fill('Offline words still count.');
  await expect(page.locator('dd').first()).toHaveText('4');

  await context.setOffline(false);
});
