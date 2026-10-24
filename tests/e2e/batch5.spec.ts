import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers';

/** The label text of a row is "Function 3"; the remove button says "Remove function 3". */
function expressionField(page: Page, number = 1) {
  return page.getByRole('textbox', { name: `Function ${number}`, exact: true });
}

test.describe('graph-calc', () => {
  test('plots a typed function, lists its values and traces it', async ({ page }) => {
    await gotoApp(page, '/tools/graph-calc');

    const expression = expressionField(page);
    await expression.fill('sin(x)');
    await expect(page.getByText('f1: plotted')).toBeVisible();

    // The table is the text alternative to the canvas.
    await expression.fill('x^2');
    const values = page.getByRole('table', { name: /Values of each function/ });
    // The default view spans -10 to 10, so the tick rows are -10, -5, 0, 5, 10.
    await expect(values.getByRole('rowheader', { name: '0', exact: true })).toBeVisible();
    // x^2 at -5 and at 5 is 25, so the table has two such cells.
    await expect(values.getByRole('cell', { name: '25' })).toHaveCount(2);

    // Tracing reports the value under the cursor.
    await page.getByRole('button', { name: 'Trace' }).click();
    await expect(page.getByText(/Tracing at x = 0/)).toBeVisible();

    // A discontinuity must not be reported as a value at zero.
    await expression.fill('1/x');
    await expect(page.getByText('f1: plotted')).toBeVisible();
    await expect(page.getByText(/not defined at x = 0/).first()).toBeVisible();
  });

  test('accepts keyboard panning and zooming on the canvas', async ({ page }) => {
    await gotoApp(page, '/tools/graph-calc');
    await expressionField(page).fill('x^2');

    const canvas = page.locator('canvas');
    await canvas.focus();
    await expect(canvas).toBeFocused();

    // Pan and zoom through the keyboard change the ticks in the values table.
    const table = page.getByRole('table', { name: /Values of each function/ });
    const before = await table.getByRole('rowheader').allInnerTexts();
    await page.keyboard.press('ArrowRight');
    await canvas.press('+');
    const after = await table.getByRole('rowheader').allInnerTexts();
    expect(after).not.toEqual(before);
  });

  test('reports a syntax error instead of drawing', async ({ page }) => {
    await gotoApp(page, '/tools/graph-calc');
    await expressionField(page).fill('sin(');
    await expect(page.getByText('f1: The expression is incomplete.')).toBeVisible();
  });
});

test.describe('glyph-browser', () => {
  /** True when the cell at this index sits inside the grid's scroll port. */
  async function cellIsInTheGridWindow(page: Page, index: number) {
    return page.evaluate((wanted) => {
      const port = document.querySelector('[role="listbox"]');
      const cell = document.querySelector(`[data-index="${wanted}"]`);
      if (!port || !cell) return false;
      const outer = port.getBoundingClientRect();
      const inner = cell.getBoundingClientRect();
      return inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    }, index);
  }

  /** A search result row, found by the code point it prints. */
  function resultRow(page: Page, codePoint: string) {
    return page.getByRole('button').filter({ hasText: codePoint });
  }

  test('browses a block, copies the facts and filters within it', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');

    await expect(page.getByText(/matching characters/)).toBeVisible();
    await page.getByRole('option', { name: /LATIN CAPITAL LETTER A, U\+0041/ }).click();

    const panel = page.getByRole('region', { name: 'Character', exact: true });
    await expect(panel.getByText('U+0041', { exact: true }).first()).toBeVisible();
    await expect(panel.getByText('LATIN CAPITAL LETTER A')).toBeVisible();
    await expect(panel.getByText('41', { exact: true })).toBeVisible();
    await expect(panel.getByText('&#x41;')).toBeVisible();

    // A block switch loads new data; the filter then narrows the block.
    await page.getByLabel('Block', { exact: true }).selectOption('emoticons');
    await page.getByLabel('Name or code point in this block').fill('GRINNING');
    await expect(page.getByRole('option', { name: /GRINNING FACE, U\+1F600/ })).toBeVisible();
  });

  test('finds a character by its code point inside a block', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');
    await page.getByLabel('Name or code point in this block').fill('U+0042');
    await expect(
      page.getByRole('option', { name: /LATIN CAPITAL LETTER B, U\+0042/ }),
    ).toBeVisible();
  });

  test('renders only the rows in view of a 20,993 character block', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');
    await page.getByLabel('Block', { exact: true }).selectOption('cjk-unified-ideographs');
    await expect(page.getByText('20,992 matching characters.')).toBeVisible();

    const options = page
      .getByRole('listbox', { name: /Characters in CJK Unified Ideographs/ })
      .getByRole('option');
    await expect(options.first()).toBeVisible();
    // Windowing: the list is 20,993 long but the DOM holds a few hundred at most.
    expect(await options.count()).toBeGreaterThan(0);
    expect(await options.count()).toBeLessThan(250);
    // The announced size and position are the real ones, not the rendered slice.
    await expect(options.first()).toHaveAttribute('aria-posinset', '1');
    await expect(options.first()).toHaveAttribute('aria-setsize', '20992');
  });

  test('moves through the grid with the keyboard and scrolls the active cell into view', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/glyph-browser');
    await page.getByLabel('Block', { exact: true }).selectOption('cjk-unified-ideographs');
    await expect(page.getByText('20,992 matching characters.')).toBeVisible();

    const grid = page.getByRole('listbox', { name: /Characters in CJK Unified Ideographs/ });
    const focusedPosition = async () =>
      Number(await page.evaluate(() => document.activeElement?.getAttribute('aria-posinset')));

    await grid.getByRole('option', { name: /U\+4E00$/ }).focus();
    expect(await focusedPosition()).toBe(1);

    // Right is one cell, down is one row: the row is however many cells fit.
    await page.keyboard.press('ArrowRight');
    expect(await focusedPosition()).toBe(2);
    await page.keyboard.press('ArrowDown');
    const afterDown = await focusedPosition();
    expect(afterDown).toBeGreaterThan(2);
    await expect(page.locator(':focus')).toHaveAttribute('role', 'option');

    // The last character is thousands of rows away; End must reach and show it.
    await page.keyboard.press('End');
    expect(await focusedPosition()).toBe(20_992);
    await expect(cellIsInTheGridWindow(page, 20_991)).resolves.toBe(true);

    await page.keyboard.press('Home');
    expect(await focusedPosition()).toBe(1);
    await expect(cellIsInTheGridWindow(page, 0)).resolves.toBe(true);

    // PageDown and PageUp move by a screenful.
    await page.keyboard.press('PageDown');
    const afterPageDown = await focusedPosition();
    expect(afterPageDown).toBeGreaterThan(2);
    await page.keyboard.press('PageUp');
    expect(await focusedPosition()).toBe(1);
  });

  test('searches every block by words, by character and by code point', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');
    const search = page.getByLabel('Words, a character or a code point');
    const status = page.locator('#glyph-search-status');

    await search.fill('grinning face');
    await expect(status).toHaveText(/characters match\./, { timeout: 30_000 });
    const grinning = resultRow(page, 'U+1F600');
    await expect(grinning).toBeVisible();
    await expect(grinning).toContainText('Emoticons');
    await expect(grinning).toContainText('Other symbol');

    // A pasted character is looked up as itself, not searched for as a word.
    await search.fill('A');
    await expect(status).toHaveText(/^\d+ characters? match/, { timeout: 20_000 });
    await expect(resultRow(page, 'U+0041')).toContainText('LATIN CAPITAL LETTER A');

    // Any of the accepted code point forms.
    await search.fill('U+20AC');
    await expect(status).toHaveText(/^1 character matches\.$/);
    await expect(resultRow(page, 'U+20AC')).toBeVisible();

    // Nothing found is said plainly, in the live region.
    await search.fill('zzzz');
    await expect(status).toHaveText(/^No characters match/);

    // Picking a result feeds the same Character panel and its copy actions.
    await search.fill('U+1F600');
    await expect(status).toHaveText(/^1 character matches\.$/);
    await resultRow(page, 'U+1F600').click();
    const panel = page.getByRole('region', { name: 'Character', exact: true });
    await expect(panel.getByText('&#x1F600;')).toBeVisible();
    await expect(panel.getByText('Emoticons')).toBeVisible();
  });

  test('the last query wins and typing stays on the page thread', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');
    await page.evaluate(() => {
      (window as unknown as { __glyphLong: number[] }).__glyphLong = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as unknown as { __glyphLong: number[] }).__glyphLong.push(entry.duration);
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    const search = page.getByLabel('Words, a character or a code point');
    const status = page.locator('#glyph-search-status');
    // Two queries in quick succession: the first is superseded, not merged.
    await search.fill('grinning');
    await search.fill('euro sign');
    await expect(status).toHaveText(/^3 characters match\.$/, { timeout: 30_000 });
    await expect(resultRow(page, 'U+1F4B6')).toBeVisible();
    await expect(resultRow(page, 'U+1F600')).toHaveCount(0);

    const longest = await page.evaluate(() =>
      Math.max(0, ...((window as unknown as { __glyphLong: number[] }).__glyphLong ?? [])),
    );
    expect(longest, `longest main-thread task was ${longest} ms`).toBeLessThan(200);
  });

  test('searches offline after the name table has been fetched once', async ({ page, context }) => {
    await gotoApp(page, '/tools/glyph-browser');
    // The service worker has to be in control before the first search, or the
    // name chunks are cached by the browser only and an offline reload misses them.
    await page.evaluate(() => navigator.serviceWorker.ready);
    const search = page.getByLabel('Words, a character or a code point');
    await search.fill('grinning face');
    await expect(page.locator('#glyph-search-status')).toHaveText(/characters match\./, {
      timeout: 30_000,
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Glyph Browser' })).toBeVisible();

    await page.getByLabel('Words, a character or a code point').fill('euro sign');
    await expect(page.locator('#glyph-search-status')).toHaveText(/^3 characters match\.$/, {
      timeout: 30_000,
    });
    await expect(resultRow(page, 'U+20AC')).toBeVisible();

    await context.setOffline(false);
  });
});

test.describe('font-explorer', () => {
  test('reads a real font file in the worker and previews it', async ({ page }) => {
    await gotoApp(page, '/tools/font-explorer');
    await page
      .locator('input[type="file"]')
      .setInputFiles('tests/fixtures/schibsted-grotesk-latin-wght-normal.woff2');

    await expect(page.getByText(/Nothing was uploaded or saved/)).toBeVisible({ timeout: 20_000 });
    const names = page.getByRole('region', { name: 'Name table' });
    await expect(names.getByText('Schibsted Grotesk', { exact: true })).toBeVisible();
    await expect(names.getByText('Glyphs')).toBeVisible();

    // The variable axis is real: it comes from the font's fvar table.
    await expect(page.getByLabel(/wght/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Specimen' })).toBeVisible();
    await expect(page.getByLabel('Text')).toHaveValue(/Handgloves/);
  });

  test('explains a file that is not a font', async ({ page }) => {
    await gotoApp(page, '/tools/font-explorer');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'broken.ttf',
      mimeType: 'font/ttf',
      buffer: Buffer.from('this is not a font at all'),
    });
    await expect(page.getByRole('alert')).toContainText(/could not be read as a font/i, {
      timeout: 20_000,
    });
  });
});
