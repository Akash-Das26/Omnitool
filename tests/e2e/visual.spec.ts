import { expect, type Page, test } from '@playwright/test';

/**
 * A small tolerance for anti-aliasing between runs. It is far below the size of
 * a layout change, which is what these tests are for.
 */
const SCREENSHOT_OPTIONS = { maxDiffPixelRatio: 0.005 } as const;

/**
 * Dark-mode screenshots so layout regressions are visible, plus assertions on
 * the tokens those screenshots are meant to show. The pixel baselines are
 * Chromium-on-Linux; run `pnpm e2e --update-snapshots` after an intended change.
 */
async function openDark(page: Page, route: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('omnitool-theme', 'dark');
  });
  await page.goto(route);
  await expect(page.locator('html')).toHaveClass(/dark/);
  // Fonts and the theme class settle before the shot.
  await page.evaluate(() => document.fonts.ready);
}

test('dark home matches its layout reference', async ({ page }) => {
  await openDark(page, '/');
  const surface = await page.evaluate(
    () => getComputedStyle(document.querySelector('html') as HTMLElement).backgroundColor,
  );
  expect(surface).toBe('rgb(18, 22, 29)');
  await expect(page).toHaveScreenshot('home-dark.png', {
    fullPage: true,
    ...SCREENSHOT_OPTIONS,
  });
});

test('dark tool page matches its layout reference', async ({ page }) => {
  // A tool with deterministic output, so the baseline is meaningful.
  await openDark(page, '/tools/qr-genny');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await expect(page).toHaveScreenshot('qr-genny-dark.png', {
    fullPage: true,
    ...SCREENSHOT_OPTIONS,
  });
});

test('dark image converter shows the first-use codec state', async ({ page }) => {
  await openDark(page, '/tools/image-converter');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
  await expect(page.getByText('Image codec (sample)')).toBeVisible();
  await expect(page).toHaveScreenshot('image-converter-dark.png', {
    fullPage: true,
    ...SCREENSHOT_OPTIONS,
  });
});

/**
 * The 12 px floor, measured on the rendered page rather than in the source:
 * a class the checker cannot parse would still show up here.
 */
async function textBelowTwelvePx(page: Page) {
  return page.evaluate(() => {
    const offenders: string[] = [];
    for (const element of document.querySelectorAll('body *')) {
      const own = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim() ?? '')
        .join('');
      if (own.length === 0) continue;
      if (element.checkVisibility && !element.checkVisibility()) continue;
      const size = Number.parseFloat(getComputedStyle(element).fontSize);
      if (size < 12) offenders.push(`${element.tagName.toLowerCase()}: ${size}px “${own}”`);
    }
    return offenders;
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const route of ['/', '/tools/uuid-genny', '/tools/image-converter']) {
    test(`no rendered text is under 12 px on ${route} (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => {
        window.localStorage.setItem('omnitool-theme', value);
      }, theme);
      await page.goto(route);
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
      if (route === '/tools/image-converter') {
        await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample.png');
      }

      expect(await textBelowTwelvePx(page)).toEqual([]);
    });
  }

  test(`no rendered text is under 12 px in the omnibox (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem('omnitool-theme', value);
    }, theme);
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog')).toBeVisible();

    expect(await textBelowTwelvePx(page)).toEqual([]);
  });
}

test('dark omnibox shows the Marker selected row and the key hints', async ({ page }) => {
  await openDark(page, '/');
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').fill('uuid');

  const selected = dialog.getByRole('option').first();
  await expect(selected).toHaveAttribute('data-selected', 'true');
  const colours = await selected.evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(colours.background).toBe('rgb(255, 216, 77)');
  expect(colours.color).toBe('rgb(16, 24, 40)');

  // Matching text is underlined, and the match is not coloured.
  const mark = dialog.locator('mark').first();
  await expect(mark).toHaveText(/uuid/i);
  const markStyle = await mark.evaluate((node) => {
    const style = getComputedStyle(node);
    return { decoration: style.textDecorationLine, background: style.backgroundColor };
  });
  expect(markStyle.decoration).toContain('underline');
  expect(markStyle.background).toBe('rgba(0, 0, 0, 0)');

  await expect(page).toHaveScreenshot('omnibox-dark.png', SCREENSHOT_OPTIONS);
});

test('the dropped-file chip shows the name, size and type', async ({ page }) => {
  await openDark(page, '/');

  await page.evaluate(() => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'hero-banner.png', {
      type: 'image/png',
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document
      .querySelector('main button')
      ?.dispatchEvent(
        new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
      );
  });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('hero-banner.png')).toBeVisible();
  await expect(dialog.getByText('8 B')).toBeVisible();
  await expect(dialog.getByText('image/png')).toBeVisible();
  // cmdk renders group headings as plain elements with aria-labelledby.
  await expect(dialog.getByText(/Tools that accept this file/)).toBeVisible();

  await expect(page).toHaveScreenshot('omnibox-file-dark.png', SCREENSHOT_OPTIONS);
});

test('the mobile action bar is fixed to the viewport bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDark(page, '/tools/uuid-genny');

  const actions = page.locator('[data-slot="tool-actions"]');
  await expect(actions).toBeVisible();
  const box = await actions.evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      position: style.position,
      bottom: Math.round(window.innerHeight - rect.bottom),
      height: Math.round(rect.height),
    };
  });
  expect(box.position).toBe('fixed');
  expect(Math.abs(box.bottom)).toBeLessThanOrEqual(1);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
