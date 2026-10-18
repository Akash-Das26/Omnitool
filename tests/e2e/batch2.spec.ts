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
