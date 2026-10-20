import { existsSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers';

const THEMES = ['light', 'dark'] as const;

const BUILT_ROUTES = [
  '/tools/uuid-genny',
  '/tools/qr-genny',
  '/tools/image-converter',
  '/tools/json-formatter',
  '/tools/jwt-decoder',
  '/tools/encoder',
  '/tools/base-converter',
  '/tools/password-genny',
  '/tools/word-counter',
  '/tools/px-to-rem',
  '/tools/text-diff',
  '/tools/morse-code',
  '/tools/nato-phonetic',
  '/tools/braille-converter',
  '/tools/unit-converter',
  '/tools/time-calc',
  '/tools/line-height-calc',
  '/tools/typo-calc',
  '/tools/paper-sizes',
];

async function start(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
  }, theme);
  await gotoApp(page, '/');
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
}

function tokenProbe(page: Page, token: string) {
  return page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, token);
}

test('planned tools are hidden by default and the counts are truthful', async ({ page }) => {
  await gotoApp(page, '/');

  await expect(page.getByText(/tools available, \d+ planned/)).toBeVisible();
  const summary = await page.getByText(/tools available, \d+ planned/).innerText();
  const numbers = summary.match(/(\d+) tools available, (\d+) planned/);
  expect(numbers).not.toBeNull();
  expect(Number(numbers?.[1]) + Number(numbers?.[2])).toBe(97);

  // No planned rows, no planned-only category and no roadmap strings.
  await expect(page.getByText('Planned', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Colour Converter/ })).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toMatch(/not built|phase \d/i);

  // A compact header entry point; the hero stays the only full-width one.
  const headerButton = page.locator('header button[aria-keyshortcuts]');
  await expect(headerButton).toHaveText(/Find tool/);
  expect((await headerButton.boundingBox())?.width ?? 0).toBeLessThan(220);
  await expect(page.locator('main button[aria-keyshortcuts]')).toContainText(
    'Find a tool or drop a file',
  );

  // The rail count says what it counts, and the category counts add up.
  await expect(page.locator('aside nav a').first()).toHaveAccessibleName(
    /Colour 0 available, 11 planned/,
  );
  const railCounts = (
    await page.locator('aside nav a').evaluateAll((links) =>
      links.map((link) => {
        const match = link.textContent?.match(/(\d+) available, (\d+) planned/);
        return { available: Number(match?.[1] ?? -1), planned: Number(match?.[2] ?? -1) };
      }),
    )
  ).filter((row) => row.available >= 0);
  expect(railCounts.reduce((total, row) => total + row.available, 0)).toBe(19);
  expect(railCounts.reduce((total, row) => total + row.planned, 0)).toBe(78);

  const toggle = page.getByRole('button', { name: /Show planned tools \(78\)/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  await expect(page.getByRole('button', { name: /Hide planned tools \(78\)/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();
  await expect(
    page.locator('#category-colour').locator('..').getByText('0 available, 11 planned'),
  ).toBeVisible();
  expect(await page.getByText('Planned', { exact: true }).count()).toBeGreaterThan(0);

  // Planned rows are not links and carry only the Planned label.
  const plannedRow = page.locator('li', { hasText: 'Colour Converter' }).first();
  await expect(plannedRow.locator('a')).toHaveCount(0);
  await expect(plannedRow.getByText('Planned', { exact: true })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/not built|phase \d/i);

  await page.getByRole('button', { name: /Hide planned tools/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Show planned tools \(78\)/ })).toBeVisible();
});

test('a planned-only category explains the empty state', async ({ page }) => {
  await page.goto('/?category=colour');
  await expect(page.getByText(/No tools are available in this category yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Show planned tools \(11\)/ })).toBeVisible();
});

for (const theme of THEMES) {
  test(`tool list surfaces and row anatomy match DESIGN.md (${theme})`, async ({ page }) => {
    await start(page, theme);

    const [background, surface, inset, hover] = await Promise.all([
      tokenProbe(page, '--background'),
      tokenProbe(page, '--surface'),
      tokenProbe(page, '--surface-inset'),
      tokenProbe(page, '--surface-hover'),
    ]);

    const pageBackground = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(pageBackground).toBe(background);

    const panel = page.locator('main section .rounded-panel').first();
    expect(await panel.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(surface);

    const header = page.locator('main section .rounded-panel > div').first();
    expect(await header.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(inset);

    const row = page.locator('main section li > a[href]').first();
    await expect(row).toBeVisible();
    expect(await row.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      'rgba(0, 0, 0, 0)',
    );

    await row.hover();
    expect(await row.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(hover);
    await page.mouse.move(0, 0);

    const anatomy = await row.evaluate((node) => {
      const name = node.querySelector('[data-row-name]');
      const description = node.querySelector('[data-row-description]');
      const nameStyle = name ? getComputedStyle(name) : null;
      return {
        tag: node.tagName,
        href: node.getAttribute('href'),
        height: node.getBoundingClientRect().height,
        nameSize: nameStyle ? Number.parseFloat(nameStyle.fontSize) : 0,
        nameWeight: nameStyle ? Number(nameStyle.fontWeight) : 0,
        hasDescription: Boolean(description?.textContent?.trim()),
      };
    });
    expect(anatomy.tag).toBe('A');
    expect(anatomy.href).toMatch(/^\/tools\//);
    expect(anatomy.height).toBeGreaterThanOrEqual(44);
    expect(anatomy.height).toBeLessThanOrEqual(60);
    expect(anatomy.nameSize).toBeGreaterThanOrEqual(15);
    expect(anatomy.nameSize).toBeLessThanOrEqual(16);
    expect(anatomy.nameWeight).toBeGreaterThanOrEqual(500);
    expect(anatomy.hasDescription).toBe(true);

    // Rows visible in the first 900 px, reported rather than guessed.
    const visibleRows = await page
      .locator('main section li > a[href]')
      .evaluateAll(
        (rows) => rows.filter((row) => row.getBoundingClientRect().top < window.innerHeight).length,
      );
    expect(visibleRows).toBeGreaterThan(0);
  });
}

test('a planned tool has a readable page, noindex and a way home', async ({ page }) => {
  await gotoApp(page, '/tools/colour-converter');

  await expect(page.getByRole('heading', { level: 1, name: 'Colour Converter' })).toBeVisible();
  await expect(page.getByText('Planned', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page).not.toHaveTitle(/not found/i);
  expect(await page.locator('main').innerText()).not.toMatch(/not built|phase \d/i);

  await page.setViewportSize({ width: 390, height: 844 });
  const backLink = page.getByRole('link', { name: 'Back to the tool index' });
  expect((await backLink.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  await backLink.click();
  await expect(page).toHaveURL(/\/$/);
});

test('planned routes are not prerendered', () => {
  expect(existsSync('apps/web/dist/tools/colour-converter/index.html')).toBe(false);
  expect(existsSync('apps/web/dist/tools/uuid-genny/index.html')).toBe(true);
});

const ROADMAP_STRINGS = /not built|phase \d/i;

/**
 * One test per route rather than one test walking every route: the walk was a
 * single 43-navigation test, so a loaded host spent its whole 30 s timeout
 * navigating and the guard reported a timeout instead of a verdict.
 */
test.describe('no roadmap strings on any page or omnibox state', () => {
  for (const route of [
    '/',
    '/about',
    '/privacy',
    '/tools/colour-converter',
    '/tools/does-not-exist',
    ...BUILT_ROUTES,
  ]) {
    test(`${route}`, async ({ page }) => {
      await gotoApp(page, route);
      expect(await page.locator('body').innerText()).not.toMatch(ROADMAP_STRINGS);
    });
  }

  test('omnibox, empty and filtered', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.innerText()).not.toMatch(ROADMAP_STRINGS);

    // The query is only meaningful once cmdk has applied it: with "pdf" no built
    // tool matches, so the built rows disappear and the planned ones stay.
    await page.locator('[data-slot="command-input"]').fill('pdf');
    await expect(dialog.locator('[cmdk-item]')).toHaveCount(0);
    await expect(dialog.locator('[data-planned-tool]').first()).toBeVisible();
    expect(await dialog.innerText()).not.toMatch(ROADMAP_STRINGS);
  });
});
