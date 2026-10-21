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
