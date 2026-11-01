import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers';

/** Radix selects open a listbox; this clicks the trigger, then the named item. */
async function choose(page: Page, trigger: string, option: string) {
  await page.getByLabel(trigger, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('ipa-transcriber', () => {
  test('states the one-time download, shows progress and can be cancelled', async ({ page }) => {
    // A cold visit with no service worker: the notice and the progress state
    // are observable because the chunks are held open until the test ends.
    const held: (() => void)[] = [];
    await page.route('**/pron/pron-*.json', async (route) => {
      await new Promise<void>((resolve) => held.push(resolve));
      // Cancelling terminates the worker, which cancels the request first.
      await route.abort().catch(() => {});
    });

    await gotoApp(page, '/tools/ipa-transcriber');
    // Empty on purpose (DEC-69): nothing is transcribed until it is asked for.
    await expect(page.getByLabel('English text')).toHaveValue('');
    await expect(page.locator('p.break-words')).toHaveCount(0);
    await expect(
      page.getByText(/One-time download: 0\.9 MB, stored on this device\./),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    // The download only starts when there is something to transcribe, so the
    // progress state appears after the first word is typed.
    await page.getByLabel('English text').fill('hello');
    await expect(
      page.getByRole('progressbar', { name: 'Pronunciation dictionary download' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText(/Download cancelled before the dictionary arrived/)).toBeVisible();

    for (const release of held) release();
    await page.unroute('**/pron/pron-*.json');
  });

  test('says what is missing when the dictionary cannot be fetched', async ({ page }) => {
    await page.route('**/pron/manifest.json', (route) => route.abort());
    await gotoApp(page, '/tools/ipa-transcriber');
    await expect(
      page.getByText(/needs the one-time download of the pronunciation dictionary/),
    ).toBeVisible();
  });

  test('transcribes what is typed once the dictionary has arrived', async ({ page }) => {
    await gotoApp(page, '/tools/ipa-transcriber');
    const transcription = page.locator('p.break-words').first();
    await expect(page.locator('p.break-words')).toHaveCount(0);
    await page.getByLabel('English text').fill('Hello, world.');
    await expect(transcription).toContainText('həˈloʊ', { timeout: 30_000 });
    await expect(page.getByText(/dictionary is stored on this device/)).toBeVisible();
    await expect(page.getByText('Transcribed')).toBeVisible();
    await expect(page.getByText(/CMU Pronouncing Dictionary, commit 7479086/)).toBeVisible();
  });

  test('clearing this site data brings the one-time notice back', async ({ page }) => {
    await gotoApp(page, '/tools/ipa-transcriber');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.getByLabel('English text').fill('hello');
    await expect(page.locator('p.break-words').first()).toContainText('həˈloʊ', {
      timeout: 30_000,
    });
    await expect(page.getByText(/dictionary is stored on this device/)).toBeVisible();

    await page.evaluate(async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'IPA Transcription' })).toBeVisible();
    await expect(
      page.getByText(/One-time download: 0\.9 MB, stored on this device\./),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  });

  test('shows variants, flags unknown words and leaves numbers alone', async ({ page }) => {
    await gotoApp(page, '/tools/ipa-transcriber');
    await page.getByLabel('English text').fill('read zzzz 42');

    // `read` has two dictionary pronunciations, in the dictionary's order.
    await expect(page.getByText('ˈɹɛd / ˈɹid')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/zzzz — these are left as written/)).toBeVisible();
    const transcription = page.locator('p.break-words').first();
    await expect(transcription).toContainText('⟨zzzz⟩');
    await expect(transcription).toContainText('42');
  });

  test('transcribes offline after the dictionary has been fetched once', async ({
    page,
    context,
  }) => {
    await gotoApp(page, '/tools/ipa-transcriber');
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Reload once the worker controls the page, so the dictionary fetches go
    // through the cache instead of straight to the network. The box starts
    // empty, so the first transcription has to be typed both times.
    await page.reload();
    await page.getByLabel('English text').fill('Hello, world.');
    await expect(page.locator('p.break-words').first()).toContainText('həˈloʊ', {
      timeout: 30_000,
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'IPA Transcription' })).toBeVisible();
    await page.getByLabel('English text').fill('hello');
    await expect(page.locator('p.break-words').first()).toHaveText('həˈloʊ', {
      timeout: 30_000,
    });
    await context.setOffline(false);
  });
});

test.describe('code-genny', () => {
  test('renders a validated EAN-13 and explains its check digit', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');

    const preview = page.getByRole('img', { name: 'EAN-13 barcode for 5901234123457' });
    await expect(preview).toBeVisible();
    // Every bar is its own rect: 28 bars plus the background for this symbol.
    expect(await preview.locator('rect').count()).toBeGreaterThan(20);

    const output = page.getByRole('region', { name: 'Output' });
    await expect(output.getByText(/weighted sum 83, remainder 3/)).toBeVisible();
    await expect(output.getByText(/115 modules, 10-module quiet zone/)).toBeVisible();
  });

  test('computes the check digit when the input is one short', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');
    await page.getByLabel('Text or digits').fill('590123412345');
    await expect(page.getByRole('img', { name: 'EAN-13 barcode for 5901234123457' })).toBeVisible();
    const output = page.getByRole('region', { name: 'Output' });
    await expect(
      output.getByText(/sum is 83; the check digit is 10 minus the remainder/),
    ).toBeVisible();
    await expect(output.getByText(/check digit was added/)).toBeVisible();
  });

  test('rejects a wrong check digit instead of drawing it', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');
    await page.getByLabel('Text or digits').fill('5901234123456');
    await expect(page.getByRole('alert')).toHaveText(/check digit is 7, not 6/);
    await expect(page.getByRole('img', { name: /barcode/ })).toHaveCount(0);
  });

  test('switches symbology, uppercases Code 39 and flags the change', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');
    await choose(page, 'Barcode type', 'Code 39');
    await page.getByLabel('Text or digits').fill('ab-1');
    await expect(page.getByRole('img', { name: 'Code 39 barcode for AB-1' })).toBeVisible();
    await expect(page.getByText(/changed to upper case/)).toBeVisible();
  });

  test('pads an odd ITF count and states the leading zero', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');
    await choose(page, 'Barcode type', 'ITF');
    await page.getByLabel('Text or digits').fill('123');
    await expect(page.getByRole('img', { name: 'ITF barcode for 0123' })).toBeVisible();
    await expect(page.getByText(/leading zero was added/)).toBeVisible();
  });

  test('downloads the SVG it shows', async ({ page }) => {
    await gotoApp(page, '/tools/code-genny');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download SVG' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^ean13-5901234123457\.svg$/);
  });
});

test.describe('algebra-calc', () => {
  /** Runs one operation end to end and returns the result region. */
  async function calculate(page: Page, operation: string, expression: string, value?: string) {
    await choose(page, 'Operation', operation);
    await page.getByLabel(/^(Expression|Equations, one per line)$/).fill(expression);
    if (value !== undefined) await page.getByLabel('Value of x').fill(value);
    await page.getByRole('button', { name: 'Work it out' }).click();
    return page.getByRole('region', { name: 'Result' });
  }

  test('factors x^2-5x+6 and lists the roots it found', async ({ page }) => {
    await gotoApp(page, '/tools/algebra-calc');
    const result = page.getByRole('region', { name: 'Result' });
    await choose(page, 'Operation', 'Factor');
    await page.getByLabel('Expression', { exact: true }).fill('x^2-5*x+6');
    await page.getByRole('button', { name: 'Work it out' }).click();
    await expect(result.getByText('(x - 2)(x - 3)')).toBeVisible();
    await expect(result.getByText(/x = 2 is a root/)).toBeVisible();
  });

  test('solves a linear equation', async ({ page }) => {
    await gotoApp(page, '/tools/algebra-calc');
    const result = await calculate(page, 'Solve an equation', '2*x+3=11');
    await expect(result.getByText('x = 4', { exact: true })).toBeVisible();
  });

  test('expands a cube and evaluates exactly', async ({ page }) => {
    await gotoApp(page, '/tools/algebra-calc');
    const expanded = await calculate(page, 'Expand', '(x+1)^3');
    await expect(expanded.getByText('x^3 + 3x^2 + 3x + 1').first()).toBeVisible();

    const value = await calculate(page, 'Evaluate', 'x^2+2*x+1', '3');
    await expect(value.getByText('16', { exact: true })).toBeVisible();
  });

  test('solves a system of two equations', async ({ page }) => {
    await gotoApp(page, '/tools/algebra-calc');
    const result = await calculate(page, 'Solve a system', 'x+y=5\nx-y=1');
    await expect(result.getByText('x = 3, y = 2').first()).toBeVisible();
  });

  test('refuses what it does not support, in words', async ({ page }) => {
    await gotoApp(page, '/tools/algebra-calc');
    await choose(page, 'Operation', 'Simplify');
    await page.getByLabel('Expression', { exact: true }).fill('1/x');
    await page.getByRole('button', { name: 'Work it out' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Dividing by something containing x is not supported.',
    );
  });
});

test.describe('shavian-transliterator', () => {
  test('states the one-time download, shows progress and can be cancelled', async ({ page }) => {
    const held: (() => void)[] = [];
    await page.route('**/pron/pron-*.json', async (route) => {
      await new Promise<void>((resolve) => held.push(resolve));
      await route.abort().catch(() => {});
    });

    await gotoApp(page, '/tools/shavian-transliterator');
    // Empty on purpose (DEC-69): the box starts blank.
    await expect(page.getByLabel('Latin text')).toHaveValue('');
    await expect(page.locator('p.break-words')).toHaveCount(0);
    await expect(
      page.getByText(/One-time download: 0\.9 MB, stored on this device\./),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    // The download starts with the first word, so the bar appears after typing.
    await page.getByLabel('Latin text').fill('hello');
    await expect(
      page.getByRole('progressbar', { name: 'Pronunciation dictionary download' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText(/Download cancelled before the dictionary arrived/)).toBeVisible();

    for (const release of held) release();
    await page.unroute('**/pron/pron-*.json');
  });

  test('says what is missing when the dictionary cannot be fetched', async ({ page }) => {
    await page.route('**/pron/manifest.json', (route) => route.abort());
    await gotoApp(page, '/tools/shavian-transliterator');
    await expect(
      page.getByText(/needs the one-time download of the pronunciation dictionary/),
    ).toBeVisible();
  });

  test('writes a typed line in Shavian and names the dictionary it used', async ({ page }) => {
    await gotoApp(page, '/tools/shavian-transliterator');
    const output = page.locator('p.break-words').first();
    await page.getByLabel('Latin text').fill('The quick brown fox jumps over the lazy dog.');
    // "The quick brown fox jumps over the lazy dog." is nine words, all listed.
    await expect(output).toContainText(/\p{Script=Shavian}{5,}/u, { timeout: 30_000 });
    await expect(page.getByText('Transliterated')).toBeVisible();
    await expect(page.getByText(/CMU Pronouncing Dictionary, commit 7479086/)).toBeVisible();
    // The hint lives in a collapsed <details>: assert its text, then open it.
    await expect(page.locator('details').last()).toContainText('It is one-way');
  });

  test('leaves an unknown word as written and marks a name with the namer dot', async ({
    page,
  }) => {
    await gotoApp(page, '/tools/shavian-transliterator');
    await page.getByLabel('Latin text').fill('hello zzzz');
    const output = page.locator('p.break-words').first();
    await expect(output).toContainText('zzzz', { timeout: 30_000 });
    await expect(page.getByText(/zzzz — no dictionary entry/)).toBeVisible();

    await page.getByLabel('Latin text').fill('I saw London');
    await expect(output).toContainText('\u00B7', { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Names' })).toBeVisible();
    await expect(page.getByText(/London — capitalised words/)).toBeVisible();
  });

  test('transliterates offline after the dictionary has been fetched once', async ({
    page,
    context,
  }) => {
    await gotoApp(page, '/tools/shavian-transliterator');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.getByLabel('Latin text').fill('hello world');
    await page.reload();
    await page.getByLabel('Latin text').fill('hello world');
    await expect(page.locator('p.break-words').first()).toContainText(/\p{Script=Shavian}/u, {
      timeout: 30_000,
    });

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Shavian Transliterator' }),
    ).toBeVisible();
    await page.getByLabel('Latin text').fill('hello');
    // hello is HH AH0 L OW1: ha-ha, ado, loll, oak.
    await expect(page.locator('p.break-words').first()).toHaveText(
      '\u{10463}\u{10469}\u{10464}\u{10474}',
      {
        timeout: 30_000,
      },
    );
    await context.setOffline(false);
  });
});
