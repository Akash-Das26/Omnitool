import { expect, test } from '@playwright/test';

test.describe('morse-code', () => {
  test('encodes text and decodes it back', async ({ page }) => {
    await page.goto('/tools/morse-code');

    await page.getByLabel('Text to encode').fill('SOS');
    await expect(page.getByLabel('Morse code')).toHaveValue('... --- ...');

    // Words are separated by a slash.
    await page.getByLabel('Text to encode').fill('SOS HELP');
    await expect(page.getByLabel('Morse code')).toHaveValue('... --- ... / .... . .-.. .--.');

    // An unknown character is reported and skipped.
    await page.getByLabel('Text to encode').fill('A~C');
    await expect(page.getByRole('alert')).toContainText('No Morse sign for: ~');
    await expect(page.getByLabel('Morse code')).toHaveValue('.- -.-.');

    // Decode direction turns the code back into letters.
    await page.getByLabel('Direction').click();
    await page.getByRole('option', { name: 'Morse to text' }).click();
    await expect(page.getByLabel('Morse to decode')).toHaveValue('');
    await page.getByLabel('Morse to decode').fill('... --- ...');
    await expect(page.getByLabel('Decoded text')).toHaveValue('SOS');
  });

  test('offers playback with a visible Stop and a speed limit', async ({ page }) => {
    await page.goto('/tools/morse-code');
    await page.getByLabel('Text to encode').fill('SOS');

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    await page.getByLabel('Words per minute').fill('999');
    await expect(page.getByRole('alert')).toContainText('between 1 and 60');
    await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled();
  });
});

test.describe('nato-phonetic', () => {
  test('spells letters and digits, and flags the rest', async ({ page }) => {
    await page.goto('/tools/nato-phonetic');

    await page.getByLabel('Text to spell out').fill('SOS 1895');
    await expect(page.getByLabel('Spelled-out text')).toHaveValue(
      'Sierra Oscar Sierra / Wun Ait Niner Fife',
    );

    // Punctuation has no ICAO word: passed through and flagged.
    await page.getByLabel('Text to spell out').fill('A-B!');
    await expect(page.getByRole('alert')).toContainText('No ICAO word for: -, !');
    await expect(page.getByLabel('Spelled-out text')).toHaveValue('Alfa - Bravo !');
  });
});

test.describe('braille-converter', () => {
  test('encodes text and decodes it back', async ({ page }) => {
    await page.goto('/tools/braille-converter');

    await page.getByLabel('Text to convert').fill('Hello');
    await expect(page.getByLabel('Braille cells')).toHaveValue('⠠⠓⠑⠇⠇⠕');

    // A character outside English grade 1 is reported and skipped.
    await page.getByLabel('Text to convert').fill('a~b');
    await expect(page.getByRole('alert')).toContainText('No braille sign for: ~');
    await expect(page.getByLabel('Braille cells')).toHaveValue('⠁⠃');

    // Decode direction turns cells back into letters.
    await page.getByLabel('Direction').click();
    await page.getByRole('option', { name: 'Braille to text' }).click();
    await page.getByLabel('Braille cells to convert').fill('⠠⠓⠑⠇⠇⠕');
    await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue('Hello');
  });
});

test.describe('unit-converter', () => {
  test('converts length and temperature with a full table', async ({ page }) => {
    await page.goto('/tools/unit-converter');

    await expect(page.getByLabel('Converted value')).toHaveValue('3.28084');

    await page.getByLabel('Value', { exact: true }).fill('100');
    await expect(page.getByLabel('Converted value')).toHaveValue('328.08399');

    // Temperatures go through an offset as well as a factor.
    await page.getByRole('combobox', { name: 'Category' }).click();
    await page.getByRole('option', { name: 'Temperature' }).click();
    await page.getByLabel('Value', { exact: true }).fill('100');
    await expect(page.getByLabel('Converted value')).toHaveValue('212');

    // Swap turns the conversion around.
    await page.getByRole('button', { name: 'Swap units' }).click();
    await expect(page.getByLabel('Value', { exact: true })).toHaveValue('100');
    await expect(page.getByLabel('Converted value')).toHaveValue('37.777778');
  });

  test('hides the table when the value is empty', async ({ page }) => {
    await page.goto('/tools/unit-converter');
    await page.getByLabel('Value', { exact: true }).fill('');
    await expect(page.getByText(/Enter a number to see the full table/)).toBeVisible();
    await expect(page.getByLabel('Converted value')).toHaveValue('');
  });
});

test.describe('time-calc', () => {
  test('adds and subtracts durations', async ({ page }) => {
    await page.goto('/tools/time-calc');

    await expect(page.getByText('2 h 15 min', { exact: true })).toBeVisible();

    await page.getByLabel('First duration').fill('2h');
    await page.getByLabel('Second duration').fill('30m');
    await page.getByLabel('Operation').click();
    await page.getByRole('option', { name: 'Subtract' }).click();
    await expect(page.getByText('1 h 30 min', { exact: true })).toBeVisible();
  });

  test('measures a day across a daylight-saving change', async ({ page }) => {
    await page.goto('/tools/time-calc');

    await page.getByLabel('Start').fill('2026-03-29T00:00');
    await page.getByLabel('End').fill('2026-03-30T00:00');
    await expect(page.getByText('23 h', { exact: true })).toBeVisible();
    await expect(page.getByText(/Start 2026-03-29 00:00/)).toBeVisible();

    await page.getByLabel('Start').fill('2026-10-25T00:00');
    await page.getByLabel('End').fill('2026-10-26T00:00');
    await expect(page.getByText('1 d 1 h', { exact: true })).toBeVisible();
    await expect(page.getByText('25:00:00')).toBeVisible();
  });

  test('breaks seconds into days, hours, minutes and seconds', async ({ page }) => {
    await page.goto('/tools/time-calc');

    await expect(page.getByText('25:01:01')).toBeVisible();
    await page.getByLabel('Seconds', { exact: true }).fill('3600');
    await expect(page.getByText('01:00:00')).toBeVisible();
  });
});

test.describe('line-height-calc', () => {
  test('turns a ratio into unitless, px and rem values', async ({ page }) => {
    await page.goto('/tools/line-height-calc');

    await expect(page.getByText('24px', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('1.5rem', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/line-height: 1.5;/)).toBeVisible();
    await expect(page.getByText(/\/\* 24px = 1.5rem \*\//)).toBeVisible();

    // Below 1.5 the WCAG text-spacing note appears.
    await page.getByLabel('Line-height ratio').fill('1.4');
    await expect(page.getByText(/minimum WCAG 1.4.12 text spacing/)).toBeVisible();
  });

  test('snaps a baseline grid to whole rows', async ({ page }) => {
    await page.goto('/tools/line-height-calc');

    await page.getByLabel('Method').click();
    await page.getByRole('option', { name: 'Baseline grid' }).click();
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('24px', { exact: true }).first()).toBeVisible();

    await page.getByLabel('Font size in pixels', { exact: true }).fill('18');
    await expect(page.getByText('32px', { exact: true }).first()).toBeVisible();
  });
});

test.describe('typo-calc', () => {
  test('builds a modular scale and the matching CSS', async ({ page }) => {
    await page.goto('/tools/typo-calc');

    await expect(page.getByText('--text-0: 1rem; /* 16px */')).toBeVisible();
    await expect(page.getByText('--text-1: 1.25rem; /* 20px */')).toBeVisible();

    await page.getByLabel('Base size in pixels').fill('20');
    await expect(page.getByText('--text-0: 1.25rem; /* 20px */')).toBeVisible();

    // A custom ratio below one is rejected with a message.
    await page.getByLabel('Ratio').fill('1');
    await expect(page.getByRole('alert')).toContainText('greater than one');
  });

  test('takes a named preset', async ({ page }) => {
    await page.goto('/tools/typo-calc');

    await page.getByLabel('Scale preset').click();
    await page.getByRole('option', { name: /Golden ratio/ }).click();
    await expect(page.getByLabel('Ratio')).toHaveValue('1.618');
  });
});

test.describe('paper-sizes', () => {
  test('lists the A series with every unit', async ({ page }) => {
    await page.goto('/tools/paper-sizes');

    const a4 = page.getByRole('row', { name: /A4/ });
    await expect(a4).toContainText('210 × 297 mm');
    await expect(a4).toContainText('595.276 × 841.89 pt');
    await expect(a4).toContainText('2480.315 × 3507.874 px');

    await page.getByLabel('Paper series').click();
    await page.getByRole('option', { name: 'US' }).click();
    const letter = page.getByRole('row', { name: /^Letter/ });
    await expect(letter).toContainText('612 × 792 pt');
    await expect(letter).toContainText('816 × 1056 px');
  });
});
