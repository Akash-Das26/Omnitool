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
  test('shows a block, copies the facts and finds a character by name', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');

    await expect(page.getByText(/matching characters/)).toBeVisible();
    await page.getByRole('button', { name: /LATIN CAPITAL LETTER A, U\+0041/ }).click();

    const panel = page.getByRole('region', { name: 'Character' });
    await expect(panel.getByText('U+0041', { exact: true }).first()).toBeVisible();
    await expect(panel.getByText('LATIN CAPITAL LETTER A')).toBeVisible();
    await expect(panel.getByText('41', { exact: true })).toBeVisible();
    await expect(panel.getByText('&#x41;')).toBeVisible();

    // A block switch loads new data; the search then filters within it.
    await page.getByLabel('Block').click();
    await page.getByRole('option', { name: /^Emoticons/ }).click();
    await page.getByLabel('Name or code point').fill('GRINNING');
    await expect(page.getByRole('button', { name: /GRINNING FACE, U\+1F600/ })).toBeVisible();
  });

  test('finds a character by its code point', async ({ page }) => {
    await gotoApp(page, '/tools/glyph-browser');
    await page.getByLabel('Name or code point').fill('U+0042');
    await expect(
      page.getByRole('button', { name: 'LATIN CAPITAL LETTER B, U+0042' }),
    ).toBeVisible();
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
