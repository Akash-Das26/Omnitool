import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

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

  test('stays usable with a 1 MB paste and warns for one past the limit', async ({ page }) => {
    await gotoApp(page, '/tools/text-editor');
    const editor = page.locator('[data-testid="editor"] .ProseMirror');
    await editor.click();

    const paste = async (html: string) => {
      await page.evaluate((payload) => {
        const target = document.querySelector('.ProseMirror');
        if (!target) throw new Error('no editor');
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', {
          value: {
            getData: (type: string) => (type === 'text/html' ? payload : 'plain'),
          },
        });
        target.dispatchEvent(event);
      }, html);
    };

    const block = '<p>Some <strong>bold</strong> words for the document.</p>';
    await paste(block.repeat(Math.ceil(1_000_000 / block.length)).slice(0, 1_000_000));
    await expect(editor.locator('p').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d[\d,]* words/)).toBeVisible({ timeout: 20_000 });

    // Typing still works after a megabyte has been read into the document.
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' end');
    await expect(editor).toHaveText(/end$/);

    // Past the converter's limit the words go in, the markup is not parsed,
    // and the reader is told rather than left guessing.
    await paste(`<p>${'a'.repeat(2_100_000)}</p>`);
    await expect(page.getByText(/longer than [\d,]+ characters/)).toBeVisible({ timeout: 20_000 });
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
