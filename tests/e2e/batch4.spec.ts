import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

test.describe('sci-calc', () => {
  test('evaluates with the declared precedence and announces the result', async ({ page }) => {
    await gotoApp(page, '/tools/sci-calc');

    const input = page.getByLabel('Expression');
    await input.fill('sin(30)');
    await input.press('Enter');
    await expect(page.getByRole('status')).toHaveText('sin(30) = 0.5');

    await input.fill('0.1+0.2');
    await input.press('Enter');
    await expect(page.getByRole('status')).toHaveText('0.1+0.2 = 0.3');

    await input.fill('2^3^2');
    await input.press('Enter');
    await expect(page.getByRole('status')).toHaveText('2^3^2 = 512');

    // The history keeps the session's calculations, newest first.
    await expect(page.getByRole('listitem').first()).toContainText('2^3^2');
    await expect(page.getByRole('listitem').first()).toContainText('512');
  });

  test('works from the key grid, and ans carries the previous result', async ({ page }) => {
    await gotoApp(page, '/tools/sci-calc');

    await page.getByRole('button', { name: 'Insert 5' }).click();
    await page.getByRole('button', { name: 'Insert !' }).click();
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.getByRole('status')).toHaveText('5! = 120');
    await expect(page.getByText('ans = 120')).toBeVisible();

    const input = page.getByLabel('Expression');
    await input.fill('ans*2');
    await input.press('Enter');
    await expect(page.getByRole('status')).toHaveText('ans*2 = 240');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('Nothing calculated yet in this session.')).toBeVisible();
    await expect(page.getByText('ans = 0')).toBeVisible();
  });

  test('shows plain messages for domain errors and for implicit multiplication', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/sci-calc');

    const input = page.getByLabel('Expression');
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

  test('filters by category and copies a class', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoApp(page, '/tools/tailwind-cheatsheet');

    await page.getByRole('button', { name: /^Spacing/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: /Spacing/ })).toBeVisible();
    await expect(page.locator('code').filter({ hasText: /^gap-x-2$/ })).toBeVisible();
    await expect(page.locator('code').filter({ hasText: /^flex$/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Copy gap-x-2' }).click();
    await expect(page.getByRole('button', { name: 'Copy gap-x-2' })).toHaveText('Copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe('gap-x-2');

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

    await expect(page.getByText('Experiment')).toBeVisible();

    // 20.12 m is exactly one cricket pitch, and its source is on screen.
    await page.getByLabel('Amount').fill('20.12');
    await expect(page.getByText('1 cricket pitch', { exact: true })).toBeVisible();
    await expect(page.getByText(/Source: MCC Laws of Cricket, Law 6/)).toBeVisible();

    // A measurement of a real object is marked as rough.
    await page.getByLabel('Amount').fill('330');
    await expect(page.getByText('roughly 1', { exact: true })).toBeVisible();
    await expect(page.getByText(/Source: toureiffel.paris/)).toBeVisible();

    await page.getByRole('button', { name: 'Time' }).click();
    await page.getByLabel('Unit').click();
    await page.getByRole('option', { name: 'Hours' }).click();
    await page.getByLabel('Amount').fill('1');
    await expect(page.getByRole('button', { name: 'Length' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByText('4 Warhols')).toBeVisible();

    await page.getByLabel('Amount').fill('-2');
    await expect(page.getByRole('alert')).toHaveText('Enter a number of zero or more.');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Amount')).toHaveValue('1');
    await expect(page.getByRole('button', { name: 'Length' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
