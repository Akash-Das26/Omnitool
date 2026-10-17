import { expect, test } from '@playwright/test';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test.describe('uuid-genny', () => {
  test('generates and copies UUIDs', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tools/uuid-genny');

    const output = page.getByLabel('Generated values');
    const first = await output.inputValue();
    expect(first.split('\n')).toHaveLength(5);
    for (const value of first.split('\n')) expect(value).toMatch(UUID_V4);

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Copy all' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(await output.inputValue());
  });

  test('downloads a text file', async ({ page }) => {
    await page.goto('/tools/uuid-genny');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .txt' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('v4-values.txt');
  });
});

test.describe('qr-genny', () => {
  test('renders a QR code and downloads PNG and SVG', async ({ page }) => {
    await page.goto('/tools/qr-genny');

    await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();

    const pngPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const pngDownload = await pngPromise;
    expect(pngDownload.suggestedFilename()).toBe('qr-code.png');

    const svgPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download SVG' }).click();
    const svgDownload = await svgPromise;
    expect(svgDownload.suggestedFilename()).toBe('qr-code.svg');
  });
});

test.describe('image-converter', () => {
  test('shows progress, cancels, then converts and downloads', async ({ page }) => {
    await page.goto('/tools/image-converter');

    await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
    await expect(page.getByText('sample.png')).toBeVisible();

    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText(/Downloading sample converter/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(/Conversion cancelled/)).toBeVisible();

    await page.getByRole('button', { name: 'Convert' }).click();
    const downloadButton = page.getByRole('button', { name: 'Download PNG' });
    await expect(downloadButton).toBeVisible({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-converted.png');
  });
});
