import { expect, test } from '@playwright/test';
import { attachDiagnostics, collectConsoleErrors, gotoApp } from './helpers';

/**
 * The three guards that put a megabyte through a browser.
 *
 * They are in one file, in one project of their own, because they are the only
 * tests that do real work on the page's main thread. Left in the general run
 * they competed with five other workers for it: `batch7`'s first guard timed
 * out once with the paste guard beside it. The `*-heavy` projects depend on
 * every other project and run this file in file order, so exactly one heavy
 * test runs on the machine at a time and nothing else is running with it.
 *
 * The waits are the app-ready marker through `gotoApp`, not sleeps, and the
 * assertions are on state the application reports (a word count, a notice,
 * a non-empty output) rather than on timing. A failure attaches the route, the
 * document state and what the page logged, so a timeout under load can be read
 * afterwards instead of guessed at.
 */

let consoleErrors: string[] = [];

test.beforeEach(({ page }) => {
  consoleErrors = collectConsoleErrors(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachDiagnostics(page, testInfo, consoleErrors);
});

test.describe('a megabyte at a time', () => {
  test('formats input over 1 MB in a worker', async ({ page }) => {
    const input = JSON.stringify({
      items: Array.from({ length: 20_000 }, (_, index) => ({
        index,
        value: 'x'.repeat(40),
      })),
    });
    expect(input.length).toBeGreaterThan(1_000_000);

    await gotoApp(page, '/tools/json-formatter');
    await page.getByLabel('JSON input').fill(input);
    await page.getByRole('button', { name: 'Format' }).click();

    const output = page.getByLabel('Formatted JSON');
    await expect(output).not.toHaveValue('', { timeout: 30_000 });
    expect(await output.inputValue()).toContain('"index": 0,');
  });

  test('stays usable with a 1 MB document', async ({ page }) => {
    await gotoApp(page, '/tools/markdown-writer');
    const input = page.getByLabel('Markdown');
    const chunk = '# Section\n\nSome text with **bold** and a [link](https://example.com).\n\n';
    const large = chunk.repeat(Math.ceil(1_000_000 / chunk.length)).slice(0, 1_000_000);
    // A 1 MB paste arrives as one input event; setting the value through
    // Playwright's fill would have it serialise the field for stability first.
    await page.evaluate((value) => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#markdown-input');
      if (!textarea) throw new Error('no textarea');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, value);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, large);

    const preview = page.getByLabel('Preview', { exact: true });
    await expect(preview.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Typing still works afterwards.
    await input.press('Control+End');
    await input.type('x');
    await expect(input).toHaveValue(/x$/);
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
});
