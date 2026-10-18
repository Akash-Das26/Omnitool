import { expect, test } from '@playwright/test';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test.describe('uuid-genny', () => {
  test('generates and copies UUIDs', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tools/uuid-genny');

    const outputValues = () =>
      page
        .locator('[data-output-value]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-output-value') ?? ''));

    const first = await outputValues();
    expect(first).toHaveLength(5);
    for (const value of first) expect(value).toMatch(UUID_V4);

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('button', { name: 'Copied all' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Copy all' }).click();
    await expect(page.getByRole('button', { name: 'Copied all' })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe((await outputValues()).join('\n'));
  });

  test('copies a single value from its row', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tools/uuid-genny');

    await page.getByRole('button', { name: 'Copy value 2' }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const values = await page
      .locator('[data-output-value]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-output-value') ?? ''));
    expect(clipboard).toBe(values[1]);
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
  test('shows the first-use download, cancels, then converts and downloads', async ({ page }) => {
    await page.goto('/tools/image-converter');

    await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
    await expect(page.getByText('sample.png')).toBeVisible();

    // First use: the codec is not cached yet.
    await expect(page.getByText('Image codec (sample)')).toBeVisible();
    await expect(page.getByText(/cached for this session/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText(/Fetching Image codec \(sample\)/)).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(/Conversion cancelled/)).toBeVisible();
    await expect(page.getByText(/cached for this session/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Convert' }).click();
    const downloadButton = page.getByRole('button', { name: 'Download PNG' });
    await expect(downloadButton).toBeEnabled({ timeout: 20_000 });

    // Real before/after sizes, computed from the file and the produced blob.
    await expect(page.getByText('Size before')).toBeVisible();
    await expect(page.getByText('Size after')).toBeVisible();
    await expect(page.getByText(/cached for this session/i)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-converted.png');
  });
});
