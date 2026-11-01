import { expect, type Page, test } from '@playwright/test';
import { expectAppReady, gotoApp } from './helpers';

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

async function start(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
  }, theme);
  await gotoApp(page, '/');
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
}

/**
 * The shortcut only exists once the shell's keydown listener is attached, and
 * the first result is only selected once cmdk has grouped the registry. Wait for
 * both, rather than for a fixed number of milliseconds.
 */
async function openOmnibox(page: Page) {
  await expectAppReady(page);
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[cmdk-item][aria-selected="true"]')).toHaveCount(1);
}

/** Accept a dropped file and wait for the chip that proves it was handled. */
async function dropPng(page: Page) {
  await expectAppReady(page);
  await page.evaluate(() => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'sample.png', {
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
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('sample.png')).toBeVisible();
  await expect(dialog.locator('[data-planned-tool]').first()).toBeVisible();
}

/** Fill the omnibox and wait for cmdk to apply the query to the result list. */
async function filterTo(page: Page, query: string) {
  const dialog = page.getByRole('dialog');
  await dialog.locator('[data-slot="command-input"]').fill(query);
  await expect(dialog.getByRole('combobox')).toHaveValue(query);
  await expect(dialog.locator('[cmdk-item]')).toHaveCount(0);
  await expect(dialog.locator('[data-planned-tool]').first()).toBeVisible();
}

/**
 * Read the Marker and hover colours from the live tokens, so the assertion
 * follows the theme rather than a duplicated hex value.
 */
async function tokenColours(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const read = (name: string) => {
      probe.style.backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return getComputedStyle(probe).backgroundColor;
    };
    const colours = { marker: read('--highlight'), hover: read('--surface-hover') };
    probe.remove();
    return colours;
  });
}

async function markerState(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) throw new Error('Omnibox is not open');
    const options = [...dialog.querySelectorAll<HTMLElement>('[cmdk-item]')];
    const selected = options.filter((option) => option.getAttribute('aria-selected') === 'true');
    return {
      options: options.length,
      selected: selected.length,
      selectedIds: selected.map((option) => option.getAttribute('data-tool-id')),
      marked: options.filter(
        (option) => getComputedStyle(option).backgroundColor === 'rgb(255, 216, 77)',
      ).length,
      planned: dialog.querySelectorAll('[data-planned-tool]').length,
      plannedSelected: [...dialog.querySelectorAll('[data-planned-tool]')].filter(
        (row) => row.getAttribute('aria-selected') !== null,
      ).length,
    };
  });
}

/** WCAG contrast for every visible text node in the dialog, in its painted context. */
async function lowContrastText(page: Page) {
  return page.evaluate(() => {
    function parse(value: string) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = (match[1] ?? '').split(/[,/]/).map((part) => Number.parseFloat(part.trim()));
      const [r = 0, g = 0, b = 0, a = 1] = parts;
      return { r, g, b, a };
    }
    function over(top: { r: number; g: number; b: number; a: number }, bottom: typeof top) {
      const alpha = top.a + bottom.a * (1 - top.a);
      if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
      const mix = (channel: 'r' | 'g' | 'b') =>
        (top[channel] * top.a + bottom[channel] * bottom.a * (1 - top.a)) / alpha;
      return { r: mix('r'), g: mix('g'), b: mix('b'), a: alpha };
    }
    function luminance({ r, g, b }: { r: number; g: number; b: number }) {
      const channel = (value: number) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    function ratio(a: { r: number; g: number; b: number }, b: typeof a) {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }
    function backgroundOf(element: Element) {
      const layers = [];
      let node: Element | null = element;
      while (node) {
        const style = getComputedStyle(node);
        const colour = parse(style.backgroundColor);
        if (colour && colour.a > 0) layers.push(colour);
        node = node.parentElement;
      }
      let result = { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 1; index >= 0; index -= 1) {
        const layer = layers[index];
        if (layer) result = over(layer, result);
      }
      return result;
    }

    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) throw new Error('Omnibox is not open');
    const failures: { text: string; ratio: number }[] = [];
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue?.trim()) continue;
      const element = node.parentElement;
      if (!element?.getClientRects().length) continue;
      if (element.closest('.sr-only')) continue;
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      if (!foreground) continue;
      const background = backgroundOf(element);
      const painted = over(foreground, background);
      const value = ratio(painted, background);
      if (value < 4.5) failures.push({ text: node.nodeValue.trim().slice(0, 60), ratio: value });
    }
    return failures;
  });
}

for (const theme of THEMES) {
  test(`exactly one Marker row, driven by aria-selected (${theme})`, async ({ page }) => {
    await start(page, theme);
    const { marker } = await tokenColours(page);

    // Empty query: the first built result is selected.
    await openOmnibox(page);
    const empty = await markerState(page);
    expect(empty.options).toBeGreaterThan(0);
    expect(empty.selected).toBe(1);
    expect(empty.marked).toBe(empty.selected);
    expect(empty.marked).toBeLessThanOrEqual(1);
    expect(empty.planned).toBeGreaterThan(0);
    expect(empty.plannedSelected).toBe(0);

    // A query that only matches planned tools has no interactive options.
    await filterTo(page, 'pdf');
    const pdf = await markerState(page);
    expect(pdf.options).toBe(0);
    expect(pdf.selected).toBe(0);
    expect(pdf.marked).toBe(0);
    expect(pdf.planned).toBeGreaterThan(0);

    // After a file drop the built accepting tools come first and one is selected.
    await page.keyboard.press('Escape');
    await dropPng(page);
    const withFile = await markerState(page);
    expect(withFile.selected).toBe(1);
    expect(withFile.marked).toBe(withFile.selected);
    expect(withFile.plannedSelected).toBe(0);

    // The Marker assertion is not vacuous: the token is still Marker.
    expect(marker).toBe('rgb(255, 216, 77)');
  });

  test(`hover never selects and uses the hover surface (${theme})`, async ({ page }) => {
    await start(page, theme);
    const { hover } = await tokenColours(page);
    await openOmnibox(page);

    const before = await page
      .locator('[cmdk-item][aria-selected="true"]')
      .getAttribute('data-tool-id');
    const second = page.locator('[cmdk-item]').nth(1);
    await second.hover();

    await expect(page.locator('[cmdk-item][aria-selected="true"]')).toHaveCount(1);
    await expect(page.locator('[cmdk-item][aria-selected="true"]')).toHaveAttribute(
      'data-tool-id',
      before ?? '',
    );
    const hovered = await second.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(hovered).toBe(hover);
  });

  test(`Tab and arrows move the selection and Enter opens it (${theme})`, async ({ page }) => {
    await start(page, theme);
    await openOmnibox(page);

    const first = await page
      .locator('[cmdk-item][aria-selected="true"]')
      .getAttribute('data-tool-id');
    expect(first).not.toBeNull();

    await page.keyboard.press('Tab');
    const afterTab = await page
      .locator('[cmdk-item][aria-selected="true"]')
      .getAttribute('data-tool-id');
    expect(afterTab).not.toBe(first);

    await page.keyboard.press('ArrowDown');
    const afterArrow = await page
      .locator('[cmdk-item][aria-selected="true"]')
      .getAttribute('data-tool-id');
    expect(afterArrow).not.toBe(afterTab);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/tools/${afterArrow}$`));
  });

  test(`all omnibox text passes AA in every state (${theme})`, async ({ page }) => {
    await start(page, theme);

    await openOmnibox(page);
    expect(await lowContrastText(page)).toEqual([]);

    await filterTo(page, 'pdf');
    expect(await lowContrastText(page)).toEqual([]);

    await page.keyboard.press('Escape');
    await dropPng(page);
    expect(await lowContrastText(page)).toEqual([]);
  });
}
