import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

test.describe('http-status', () => {
  test('finds codes by word, by class and shows the detail', async ({ page }) => {
    await gotoApp(page, '/tools/http-status');

    await expect(page.getByText('404 Not Found').first()).toBeVisible();

    await page.getByLabel('Code, name or words').fill('gateway');
    await expect(page.getByRole('button', { name: /502/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /504/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /404/ })).toHaveCount(0);

    await page.getByRole('button', { name: /504/ }).click();
    await expect(page.getByRole('heading', { name: '504 Gateway Timeout' })).toBeVisible();
    await expect(page.getByText(/A gateway or proxy did not get an answer/)).toBeVisible();

    await page.getByLabel('Code, name or words').fill('');
    await page.getByLabel('Class').click();
    await page.getByRole('option', { name: '5xx' }).click();
    await expect(page.getByRole('button', { name: /511/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /404/ })).toHaveCount(0);
  });
});

test.describe('cron-builder', () => {
  test('reads a schedule, updates the fields and reports field errors', async ({ page }) => {
    await gotoApp(page, '/tools/cron-builder');

    await expect(page.getByText('Every 15 minutes.')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(11); // header plus ten runs

    await page.getByLabel('Expression').fill('0 9 * * mon-fri');
    await expect(page.getByLabel('Minute')).toHaveValue('0');
    await expect(page.getByLabel('Day of week')).toHaveValue('mon-fri');
    await expect(
      page.getByText(/on Monday, Tuesday, Wednesday, Thursday and Friday/),
    ).toBeVisible();

    await page.getByLabel('Expression').fill('61 * * * *');
    await expect(page.getByRole('alert')).toContainText('Minute (field 1 of 5)');

    await page.getByLabel('Time zone').fill('UTC');
    await page.getByLabel('Expression').fill('0 9 * * *');
    await expect(page.getByRole('cell', { name: '09:00' }).first()).toBeVisible();
  });
});

test.describe('meta-tag-genny', () => {
  test('escapes attributes, warns instead of emitting a bad URL', async ({ page }) => {
    await gotoApp(page, '/tools/meta-tag-genny');

    const output = page.getByLabel('HTML for the document head');
    await expect(output).toHaveValue(/<meta property="og:title"/);
    await expect(output).toHaveValue(/<link rel="canonical"/);

    await page.getByRole('textbox', { name: /^Title/ }).fill('Tom & Jerry "live"');
    await expect(output).toHaveValue(/<title>Tom &amp; Jerry &quot;live&quot;<\/title>/);

    await page.getByLabel('Canonical URL').fill('http://example.com');
    await expect(page.getByText(/Use https:\/\/ rather than http:\/\//)).toBeVisible();
    await expect(output).not.toHaveValue(/rel="canonical"/);

    await page.getByLabel('Canonical URL').fill('https://example.com/tools/');
    await expect(output).toHaveValue(/rel="canonical" href="https:\/\/example.com\/tools\/"/);
  });
});

test.describe('decoder', () => {
  test('decodes Caesar, Atbash, Vigenère and rail fence', async ({ page }) => {
    await gotoApp(page, '/tools/decoder');

    await page.getByLabel('Text', { exact: true }).fill('KHOOR');
    await expect(page.getByLabel('Plain text')).toHaveValue('HELLO');
    await expect(page.locator('li > button')).toHaveCount(25);
    await expect(page.getByRole('button', { name: /likeliest/ })).toContainText('HELLO');

    await page.getByLabel('Method').click();
    await page.getByRole('option', { name: 'Atbash' }).click();
    await page.getByLabel('Text', { exact: true }).fill('ZGGZXP ZG WZDM');
    await expect(page.getByLabel('Plain text')).toHaveValue('ATTACK AT DAWN');

    await page.getByLabel('Method').click();
    await page.getByRole('option', { name: 'Vigenère' }).click();
    await page.getByLabel('Key').fill('LEMON');
    await page.getByLabel('Text', { exact: true }).fill('LXFOPVEFRNHR');
    await expect(page.getByLabel('Plain text')).toHaveValue('ATTACKATDAWN');

    await page.getByLabel('Method').click();
    await page.getByRole('option', { name: 'Rail fence' }).click();
    await page.getByLabel('Text', { exact: true }).fill('WECRLTEERDSOEEFEAOCAIVDEN');
    await expect(page.getByLabel('Plain text')).toHaveValue('WEAREDISCOVEREDFLEEATONCE');
  });
});

test.describe('large-type', () => {
  test('shows the text at the chosen size and fits it to the preview', async ({ page }) => {
    await gotoApp(page, '/tools/large-type');

    const line = page.getByText('Hold the room without a slide deck.', { exact: true });
    await expect(line).toBeVisible();
    await expect(line).toHaveCSS('font-size', '96px');

    await page.getByLabel('Size in px').fill('160');
    await expect(line).toHaveCSS('font-size', '160px');

    await page.getByRole('button', { name: 'Fit to the preview' }).click();
    await expect(page.getByLabel('Size in px')).not.toHaveValue('160');
  });
});

test.describe('regex-tester', () => {
  test('lists every match with its position', async ({ page }) => {
    await gotoApp(page, '/tools/regex-tester');

    await page.getByRole('button', { name: 'Test' }).click();
    await expect(page.getByText('hello@example.com', { exact: true })).toBeVisible();
    await expect(page.getByText('support@example.org', { exact: true })).toBeVisible();
    await expect(page.getByText(/at 9, 17 characters/)).toBeVisible();

    await page.getByLabel('Regular expression').fill('([a-z');
    await page.getByRole('button', { name: 'Test' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
