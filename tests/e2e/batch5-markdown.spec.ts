import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

const PAYLOADS = [
  '<script>window.__xss = 1</script>',
  '<img src=x onerror="window.__xss = 1">',
  '[click](javascript:window.__xss=1)',
  '<svg onload="window.__xss = 1"></svg>',
  '<iframe src="https://example.com/"></iframe>',
  '![tracker](https://example.com/pixel.png)',
  '![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=)',
  '<a href="javascript:window.__xss=1">x</a>',
].join('\n\n');

test.describe('markdown-writer', () => {
  test('renders Markdown and never executes or fetches the payloads', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return;
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')
        external.push(request.url());
    });
    page.on('dialog', (dialog) => {
      throw new Error(`A dialog opened: ${dialog.message()}`);
    });

    await gotoApp(page, '/tools/markdown-writer');

    const input = page.getByLabel('Markdown');
    await input.fill(
      '# Notes\n\n**bold** and *italic* with `code`\n\n| a | b |\n|---|---|\n| 1 | 2 |',
    );
    const preview = page.getByLabel('Preview', { exact: true });
    await expect(preview.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    await expect(preview.getByRole('table')).toBeVisible();

    await input.fill(PAYLOADS);
    // The words survive as text, and nothing becomes an element or a request.
    await expect(preview.getByText('<script>window.__xss = 1</script>')).toBeVisible();
    await expect(preview.locator('script')).toHaveCount(0);
    await expect(preview.locator('img')).toHaveCount(0);
    await expect(preview.locator('iframe')).toHaveCount(0);
    await expect(preview.locator('a[href^="javascript"]')).toHaveCount(0);
    const assigned = await page.evaluate(() => (window as { __xss?: number }).__xss ?? null);
    expect(assigned).toBeNull();
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });

  test('keeps a local data image and reports the remote one', async ({ page }) => {
    await gotoApp(page, '/tools/markdown-writer');
    await page
      .getByLabel('Markdown')
      .fill(
        '![pixel](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)',
      );
    const preview = page.getByLabel('Preview', { exact: true });
    await expect(preview.locator('img')).toHaveCount(1);

    await page.getByLabel('Markdown').fill('![tracker](https://example.com/pixel.png)');
    await expect(preview.locator('img')).toHaveCount(0);
    await expect(page.getByText(/image was blocked/)).toBeVisible();
  });

  test('formats through the toolbar and keeps the word count', async ({ page }) => {
    await gotoApp(page, '/tools/markdown-writer');
    const input = page.getByLabel('Markdown');
    await input.fill('hello');
    await input.selectText();
    await page.getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(input).toHaveValue('**hello**');
    await expect(page.getByText(/1 word/)).toBeVisible();
  });
});
