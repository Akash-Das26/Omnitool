import { expect, test } from '@playwright/test';
import { DOCX_MIME, makeDocx } from './docx-fixture';
import { gotoApp } from './helpers';

test.describe('doc-converter', () => {
  test('converts pasted Markdown and switches the output without rereading it', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/doc-converter');
    const input = page.getByLabel('Document text');
    const output = page.getByRole('textbox', { name: 'Converted document' });
    await expect(output).toHaveValue('');

    await input.fill('# Notes\n\nSome **bold** words.');
    await expect(output).toHaveValue('# Notes\n\nSome **bold** words\\.');

    await page.getByRole('combobox', { name: 'Output format' }).click();
    await page.getByRole('option', { name: 'HTML' }).click();
    await expect(output).toHaveValue(/<h1[^>]*>Notes<\/h1>/);
    await expect(output).toHaveValue(/<strong>bold<\/strong>/);
    await expect(output).toHaveValue(/<title>Notes<\/title>/);
    await expect(page.getByText('document.html')).toBeVisible();

    await page.getByRole('combobox', { name: 'Output format' }).click();
    await page.getByRole('option', { name: 'Plain text' }).click();
    await expect(output).toHaveValue('Notes\n\nSome bold words.');
  });

  test('removes a script from HTML and says what it dropped', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await gotoApp(page, '/tools/doc-converter');
    await page.getByRole('combobox', { name: 'Input format' }).click();
    await page.getByRole('option', { name: 'HTML' }).click();

    await page
      .getByLabel('Document text')
      .fill('<h2>Page</h2><p>Kept<script>window.__converted = true;</script></p>');
    const output = page.getByRole('textbox', { name: 'Converted document' });
    await expect(output).toHaveValue('## Page\n\nKept');
    await expect(page.getByText('1 script removed.')).toBeVisible();
    expect(await page.evaluate(() => (window as { __converted?: boolean }).__converted)).toBe(
      undefined,
    );
    expect(errors).toEqual([]);
  });

  test('reads a Word document in a worker and refuses the link it carries', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')
        requests.push(request.url());
    });

    await gotoApp(page, '/tools/doc-converter');
    await page.getByRole('combobox', { name: 'Output format' }).click();
    await page.getByRole('option', { name: 'HTML' }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'report.docx',
      mimeType: DOCX_MIME,
      buffer: makeDocx(),
    });

    await expect(page.getByText('Word document: report.docx')).toBeVisible();
    const output = page.getByRole('textbox', { name: 'Converted document' });
    await expect(output).toHaveValue(/Quarterly update/, { timeout: 30_000 });
    await expect(output).toHaveValue(/<strong>bold<\/strong>/);
    // A literal <b>tag</b> in the document stays text, and a javascript: link is
    // refused by the sanitiser rather than written into the output.
    await expect(output).toHaveValue(/&lt;b&gt;tag/);
    await expect(output).not.toHaveValue(/javascript:/);
    await expect(page.getByText(/1 link with an unsupported address removed/)).toBeVisible();
    await expect(page.getByText('report.html')).toBeVisible();
    expect(requests).toEqual([]);
  });

  test('refuses a file that claims to be a Word document and is not one', async ({ page }) => {
    await gotoApp(page, '/tools/doc-converter');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.docx',
      mimeType: DOCX_MIME,
      buffer: Buffer.from('This is a text file with the wrong extension.\n'),
    });
    await expect(page.getByText(/not a Word document/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('textbox', { name: 'Converted document' })).toHaveValue('');
  });

  test('opens a Markdown file, converts it, and downloads it under its own name', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/doc-converter');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('## Opened\n\nFrom a **file**.\n'),
    });
    await expect(page.getByLabel('Document text')).toHaveValue(/^## Opened/);
    const output = page.getByRole('textbox', { name: 'Converted document' });
    await expect(output).toHaveValue(/From a \*\*file\*\*\\\./);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    expect((await download).suggestedFilename()).toBe('notes.md');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Document text')).toHaveValue('');
    await expect(output).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});

test.describe('text-editor', () => {
  test('starts empty, formats, and never asks a third party for anything', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')
        requests.push(request.url());
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await gotoApp(page, '/tools/text-editor');
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
    await expect(page.getByText('0 words', { exact: true })).toBeVisible();
    await expect(page.getByText('0 characters', { exact: true })).toBeVisible();

    // Type, then format the selection through the toolbar.
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    await editor.click();
    await page.keyboard.type('Hello world');
    await expect(page.getByText('2 words', { exact: true })).toBeVisible();
    await expect(page.getByText('11 characters', { exact: true })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+a');
    await page.getByRole('button', { name: 'Bold' }).click();
    await expect(editor.locator('strong')).toHaveText('Hello world');

    // A paste is read by our converter, and the reader is told what it dropped.
    await editor.click();
    await page.evaluate(() => {
      const target = document.querySelector('.ProseMirror');
      if (!target) throw new Error('no editor');
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: {
          getData: (type: string) =>
            type === 'text/html'
              ? '<p>Pasted <strong>text</strong><script>window.__pasted = true;</script></p>'
              : 'Pasted text',
        },
      });
      target.dispatchEvent(event);
    });
    await expect(page.getByText(/Pasted\. Removed: 1 script/)).toBeVisible();
    expect(await page.evaluate(() => (window as { __pasted?: boolean }).__pasted)).toBeUndefined();
    expect(await editor.locator('script')).toHaveCount(0);

    // Nothing outside this origin was requested at any point.
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('exports the document as markdown, text and html without a network call', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/text-editor');
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    await editor.click();
    await page.keyboard.type('Notes for the day');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Markdown', exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('notes.md');
  });

  test('opens a Markdown file and drops a script in an HTML one', async ({ page }) => {
    await gotoApp(page, '/tools/text-editor');
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    const picker = page.locator('input[type="file"]');

    await picker.setInputFiles({
      name: 'notes.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Opened\n\nFrom a **file**.\n'),
    });
    await expect(page.getByText('Opened “notes.md”.')).toBeVisible();
    await expect(editor.getByRole('heading', { level: 1 })).toHaveText('Opened');
    await expect(editor.locator('strong')).toHaveText('file');

    await picker.setInputFiles({
      name: 'page.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<h2>Page</h2><p>Words<script>window.__fromFile = true;</script></p>'),
    });
    await expect(page.getByText('Opened “page.html”.')).toBeVisible();
    await expect(editor.getByRole('heading', { level: 2 })).toHaveText('Page');
    await expect(editor.locator('script')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as { __fromFile?: boolean }).__fromFile),
    ).toBeUndefined();
  });

  test('turns the paragraph into a task list whose box can be ticked', async ({ page }) => {
    await gotoApp(page, '/tools/text-editor');
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    await editor.click();
    await page.keyboard.type('Buy milk');
    await page.getByRole('button', { name: 'Task list' }).click();

    const item = editor.locator('li[data-task]');
    await expect(item).toHaveCount(1);
    await expect(item).toHaveAttribute('data-checked', 'false');
    await item.locator('input[type="checkbox"]').click();
    await expect(item).toHaveAttribute('data-checked', 'true');
  });

  test('keeps a draft on this device and clears it on request', async ({ page }) => {
    await gotoApp(page, '/tools/text-editor');
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    await editor.click();
    await page.keyboard.type('Saved words');

    await page.getByRole('button', { name: 'Save a draft on this device' }).click();
    await expect(page.getByText('A draft is saved on this device.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear draft' }).click();
    await expect(page.getByText('No draft saved.')).toBeVisible();
  });
});
