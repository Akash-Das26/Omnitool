import { expect, test } from '@playwright/test';

test.describe('json-formatter', () => {
  test('reports a syntax location and formats valid JSON', async ({ page }) => {
    await page.goto('/tools/json-formatter');

    const input = page.getByLabel('JSON input');
    await input.fill('{"a": }');
    await page.getByRole('button', { name: 'Validate' }).click();
    await expect(page.getByRole('alert')).toContainText('Line 1');

    await input.fill('{"b":2,"a":1}');
    await page.getByRole('button', { name: 'Format' }).click();
    await expect(page.getByLabel('Formatted JSON')).toHaveValue('{\n  "b": 2,\n  "a": 1\n}\n');

    await page.getByRole('button', { name: 'Minify' }).click();
    await expect(page.getByLabel('Formatted JSON')).toHaveValue('{"b":2,"a":1}');
  });

  test('formats input over 1 MB in a worker', async ({ page }) => {
    const input = JSON.stringify({
      items: Array.from({ length: 20_000 }, (_, index) => ({
        index,
        value: 'x'.repeat(40),
      })),
    });
    expect(input.length).toBeGreaterThan(1_000_000);

    await page.goto('/tools/json-formatter');
    await page.getByLabel('JSON input').fill(input);
    await page.getByRole('button', { name: 'Format' }).click();

    const output = page.getByLabel('Formatted JSON');
    await expect(output).not.toHaveValue('', { timeout: 30_000 });
    expect(await output.inputValue()).toContain('"index": 0,');
  });
});

test.describe('jwt-decoder', () => {
  test('decodes header and claims without verifying', async ({ page }) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'abc123', exp: 4102444800 })).toString(
      'base64url',
    );

    await page.goto('/tools/jwt-decoder');
    await page.getByLabel('JSON Web Token').fill(`${header}.${payload}.c2ln`);
    await page.getByRole('button', { name: 'Decode' }).click();

    await expect(page.getByText('Algorithm', { exact: false })).toHaveCount(0);
    await expect(page.locator('#jwt-header')).toContainText('"alg": "HS256"');
    await expect(page.getByRole('rowheader', { name: /Subject/ })).toBeVisible();
    await expect(page.getByText(/Not verified/)).toBeVisible();
  });
});

test.describe('encoder', () => {
  test('encodes UTF-8 text to Base64', async ({ page }) => {
    await page.goto('/tools/encoder');
    await page.getByLabel('Text').fill('hello');
    await page.getByRole('button', { name: 'Encode' }).click();
    await expect(page.getByLabel('Base64 output')).toHaveValue('aGVsbG8=');
  });
});

test.describe('base-converter', () => {
  test('converts and explains an invalid digit', async ({ page }) => {
    await page.goto('/tools/base-converter');
    await page.getByLabel('Value').fill('1010');
    await page.getByLabel('From base').fill('2');
    await expect(page.getByLabel(/Result in base/)).toHaveValue('A');

    await page.getByLabel('Value').fill('2');
    await expect(page.getByRole('alert')).toContainText('not a valid digit in base 2');
  });
});

test.describe('password-genny', () => {
  test('generates a password and keeps nothing', async ({ page }) => {
    await page.goto('/tools/password-genny');
    await page.getByRole('button', { name: 'Generate' }).click();

    const output = page.getByLabel('Generated password');
    await expect(output).not.toHaveValue('');
    expect(await output.inputValue()).toHaveLength(20);

    const storedKeys = await page.evaluate(() => [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ]);
    expect(storedKeys.filter((key) => key.toLowerCase().includes('password'))).toEqual([]);
  });
});

test.describe('word-counter', () => {
  test('counts words, sentences and characters live', async ({ page }) => {
    await page.goto('/tools/word-counter');
    await page.getByLabel('Text to count').fill('Hello world. This is a test!');
    await expect(page.locator('dd')).toHaveText(['6', '2', '28', '23', '1', '1', '1 min', '1 min']);
  });
});

test.describe('px-to-rem', () => {
  test('converts against the default and a custom root size', async ({ page }) => {
    await page.goto('/tools/px-to-rem');
    await expect(page.getByLabel('Pixels converted to rem')).toHaveValue('1rem');

    await page.getByLabel('Pixels', { exact: true }).fill('24');
    await expect(page.getByLabel('Pixels converted to rem')).toHaveValue('1.5rem');

    await page.getByLabel('Root font size in pixels').fill('10');
    await expect(page.getByLabel('Pixels converted to rem')).toHaveValue('2.4rem');
  });
});

test.describe('text-diff', () => {
  test('shows inline and side-by-side changes', async ({ page }) => {
    await page.goto('/tools/text-diff');
    await page.getByLabel('Before').fill('one\ntwo\n');
    await page.getByLabel('After').fill('one\n2\n');
    await page.getByRole('button', { name: 'Compare' }).click();

    await expect(page.getByRole('status')).toContainText('1 added, 1 removed');
    await expect(page.locator('del')).toHaveText('two\n');
    await expect(page.locator('ins')).toHaveText('2\n');

    await page.getByLabel('View').click();
    await page.getByRole('option', { name: 'Side by side' }).click();
    await expect(page.getByRole('columnheader', { name: 'Before' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'After' })).toBeVisible();
  });
});
