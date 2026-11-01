import { type BrowserContext, expect, test } from '@playwright/test';
import { canReadClipboard, gotoApp } from './helpers';

/**
 * Chromium needs the clipboard permissions granted by name; Firefox and WebKit
 * reject that permission name and expose the clipboard without a grant
 * (audit F-013 matrix runs).
 */
async function allowClipboard(browserName: string, context: BrowserContext) {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  }
}

test.describe('experiments', () => {
  test('lists the sketches and links the built ones', async ({ page }) => {
    await gotoApp(page, '/experiments');

    await expect(page.getByRole('heading', { level: 1, name: 'Experiments' })).toBeVisible();
    await expect(
      page.getByText('Unfinished sketches. They work, but they are narrower'),
    ).toBeVisible();

    const sketches = page.getByRole('listitem').filter({ hasText: 'Sketch' });
    await expect(sketches).toHaveCount(2);
    await expect(sketches.first()).toContainText('there are no charts yet');

    await page.getByRole('link', { name: 'Stupid Units' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Stupid Units' })).toBeVisible();
  });
});

test.describe('sci-calc', () => {
  test('evaluates with the declared precedence and announces the result', async ({ page }) => {
    await gotoApp(page, '/tools/sci-calc');

    const input = page.getByRole('textbox', { name: 'Expression' });
    await input.fill('sin(30)');
    await input.press('Enter');
    await expect(page.locator('p[role="status"]')).toHaveText('sin(30) = 0.5');

    await input.fill('0.1+0.2');
    await input.press('Enter');
    await expect(page.locator('p[role="status"]')).toHaveText('0.1+0.2 = 0.3');

    await input.fill('2^3^2');
    await input.press('Enter');
    await expect(page.locator('p[role="status"]')).toHaveText('2^3^2 = 512');

    // The history keeps the session's calculations, newest first.
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByRole('listitem').first()).toContainText('2^3^2');
    await expect(history.getByRole('listitem').first()).toContainText('512');
  });

  test('works from the key grid, and ans carries the previous result', async ({ page }) => {
    await gotoApp(page, '/tools/sci-calc');

    await page.getByRole('button', { name: 'Insert 5' }).click();
    await page.getByRole('button', { name: 'Insert !' }).click();
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('p[role="status"]')).toHaveText('5! = 120');
    await expect(page.getByText('ans = 120')).toBeVisible();

    const input = page.getByRole('textbox', { name: 'Expression' });
    await input.fill('ans*2');
    await input.press('Enter');
    await expect(page.locator('p[role="status"]')).toHaveText('ans*2 = 240');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('Nothing calculated yet in this session.')).toBeVisible();
    await expect(page.getByText('ans = 0')).toBeVisible();
  });

  test('shows plain messages for domain errors and for implicit multiplication', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/sci-calc');

    const input = page.getByRole('textbox', { name: 'Expression' });
    await input.fill('1/0');
    await input.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Division by zero has no value.');
    await expect(page.getByText('NaN')).toHaveCount(0);
    await expect(page.getByText('Infinity')).toHaveCount(0);

    await input.fill('sqrt(-1)');
    await input.press('Enter');
    await expect(page.getByRole('alert')).toHaveText(
      'The square root of a negative number is not a real number.',
    );

    await input.fill('2(3+4)');
    await input.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Use * before a bracket.');

    await input.fill('2.5!');
    await input.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Factorial needs a whole number.');
  });
});

test.describe('tailwind-cheatsheet', () => {
  test('searches by class and by CSS property', async ({ page }) => {
    await gotoApp(page, '/tools/tailwind-cheatsheet');

    await expect(page.getByText(/classes compiled by Tailwind 4\.3\.3/)).toBeVisible();

    const search = page.getByLabel('Class, property or words');
    await search.fill('mx-auto');
    await expect(page.locator('code').filter({ hasText: /^mx-auto$/ })).toBeVisible();
    await expect(
      page.getByText('Equal automatic side margins, the usual way to centre a block.'),
    ).toBeVisible();

    // A property name finds every class that sets it.
    await search.fill('margin-block-start');
    await expect(page.locator('code').filter({ hasText: /^space-y-2$/ })).toBeVisible();
    await expect(page.locator('code').filter({ hasText: /^flex$/ })).toHaveCount(0);

    await search.fill('zzzz-not-a-class');
    await expect(page.getByText(/No class matches/)).toBeVisible();
  });

  test('filters by category and copies a class', async ({ page, context, browserName }) => {
    await allowClipboard(browserName, context);
    await gotoApp(page, '/tools/tailwind-cheatsheet');

    await page.getByRole('button', { name: /^Spacing/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: /Spacing/ })).toBeVisible();
    await expect(page.locator('code').filter({ hasText: /^gap-x-2$/ })).toBeVisible();
    await expect(page.locator('code').filter({ hasText: /^flex$/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Copy class gap-x-2' }).click();
    await expect(page.getByRole('button', { name: 'Copied gap-x-2' })).toContainText('Copied');
    if (canReadClipboard(browserName)) {
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toBe('gap-x-2');
    }

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Class, property or words')).toHaveValue('');
    await expect(page.getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('stupid-units', () => {
  test('converts between everyday units and sourced equivalents', async ({ page }) => {
    await gotoApp(page, '/tools/stupid-units');

    await expect(page.getByText('Experiment', { exact: true })).toBeVisible();

    // 20.12 m is exactly one cricket pitch, and its source is on screen.
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('20.12');
    await expect(page.getByText('1 cricket pitch', { exact: true })).toBeVisible();
    await expect(page.getByText(/Source: MCC Laws of Cricket, Law 6/)).toBeVisible();

    // A measurement of a real object is marked as rough.
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('330');
    await expect(page.getByText('roughly 1', { exact: true })).toBeVisible();
    await expect(page.getByText(/Source: toureiffel.paris/)).toBeVisible();

    await page.getByRole('button', { name: 'Time' }).click();
    await page.getByLabel('Unit').click();
    await page.getByRole('option', { name: 'Hours' }).click();
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('1');
    await expect(page.getByRole('button', { name: 'Length' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByText('4 Warhols')).toBeVisible();

    await page.getByRole('spinbutton', { name: 'Amount' }).fill('-2');
    await expect(page.getByRole('alert')).toHaveText('Enter a number of zero or more.');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('spinbutton', { name: 'Amount' })).toHaveValue('1');
    await expect(page.getByRole('button', { name: 'Length' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('recipe-table', () => {
  test('parses the example, scales it and flags what it cannot read', async ({ page }) => {
    await gotoApp(page, '/tools/recipe-table');

    await page.getByRole('button', { name: 'Load an example' }).click();

    const flour = page.getByRole('row', { name: /flour/ });
    await expect(flour).toContainText('roughly 250');
    await expect(flour).toContainText('USDA FoodData Central 168894');

    const eggs = page.getByRole('row', { name: /^eggs/ });
    await expect(eggs).toContainText('3');

    // The unmeasured line is kept as written and counted.
    await expect(page.getByRole('alert')).toHaveText(
      '1 line was not scaled and is shown as written.',
    );
    await expect(page.getByRole('row', { name: /Salt to taste/ })).toContainText(
      'No amount at the start',
    );

    await page.getByRole('spinbutton', { name: 'Scale to (servings)' }).fill('8');
    await expect(page.getByRole('row', { name: /flour/ })).toContainText('roughly 500');

    await page.getByRole('button', { name: 'US', exact: true }).click();
    await expect(page.getByRole('row', { name: /flour/ })).toContainText('1 1/8');
    await expect(page.getByRole('row', { name: /flour/ })).toContainText('lb');
    await expect(page.getByRole('row', { name: /butter/ })).toContainText('8 oz');
  });

  test('copies the table and resets', async ({ page, context, browserName }) => {
    await allowClipboard(browserName, context);
    await gotoApp(page, '/tools/recipe-table');

    await page.getByLabel('Ingredients, one per line').fill('1 cup milk\n2 eggs\npepper');
    await expect(page.getByRole('alert')).toContainText('1 line was not scaled');

    await page.getByRole('button', { name: 'Copy table' }).click();
    await expect(page.getByText('Table copied')).toBeVisible();
    if (canReadClipboard(browserName)) {
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toContain('Recipe for 4 servings (metric)');
      expect(clipboard).toContain('roughly 244 g milk');
    }

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Ingredients, one per line')).toHaveValue('');
    await expect(page.getByText('Paste an ingredient list to see the scaled table.')).toBeVisible();
  });
});
