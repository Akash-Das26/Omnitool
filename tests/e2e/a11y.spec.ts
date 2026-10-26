import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers';

const fixedRoutes = ['/', '/privacy', '/about', '/experiments'];

const SEED_TOOL_IDS: readonly string[] = (
  JSON.parse(readFileSync('packages/tools-registry/data/registry.seed.json', 'utf8')) as {
    tools: { id: string }[];
  }
).tools.map((tool) => tool.id);

/**
 * The loader map decides what is built, and it is the only list that does.
 * Importing it here would drag the application, its `@/` aliases and its CSS
 * into the E2E project's typecheck, so its keys are read from its source
 * instead: one list, and a tool that gains a loader entry without an axe run
 * cannot be missed. The hand-kept list this replaces had missed four tools.
 */
function builtToolIds(): string[] {
  const source = readFileSync('apps/web/src/lib/tool-modules.ts', 'utf8');
  const start = source.indexOf('TOOL_LOADERS');
  const end = source.indexOf('};', start);
  if (start === -1 || end === -1) throw new Error('the loader map is not where it was');
  return [
    ...source.slice(start, end).matchAll(/'?([a-z][a-z0-9-]*)'?:\s*\(\)\s*=>\s*import\(/g),
  ].map((match) => match[1] as string);
}

const BUILT_TOOL_IDS = builtToolIds();

const routes = [...fixedRoutes, ...BUILT_TOOL_IDS.map((id) => `/tools/${id}`)];

const themes = ['light', 'dark'] as const;

async function openInTheme(page: Page, route: string, theme: 'light' | 'dark') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('omnitool-theme', value);
  }, theme);
  await gotoApp(page, route);
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
}

test('the axe list covers every built tool and nothing else', () => {
  const toolRoutes = routes.filter((route) => route.startsWith('/tools/'));
  expect(toolRoutes).toEqual(BUILT_TOOL_IDS.map((id) => `/tools/${id}`));
  expect(BUILT_TOOL_IDS.length).toBeGreaterThan(30);
  // A built tool must also be a registry row; the reverse is not required,
  // because planned tools are catalogued but deliberately not built.
  for (const id of BUILT_TOOL_IDS) {
    expect(SEED_TOOL_IDS, `${id} is in the registry seed`).toContain(id);
  }
  expect(new Set(routes).size).toBe(routes.length);
  expect(routes.length).toBe(fixedRoutes.length + BUILT_TOOL_IDS.length);
});

for (const theme of themes) {
  for (const route of routes) {
    test(`axe has no serious or critical issues on ${route} (${theme})`, async ({ page }) => {
      await openInTheme(page, route, theme);
      const serious = await seriousViolations(page);
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
}

for (const theme of themes) {
  test(`the omnibox passes axe (${theme})`, async ({ page }) => {
    await openInTheme(page, '/', theme);
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog')).toBeVisible();

    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`the omnibox with a dropped file passes axe (${theme})`, async ({ page }) => {
    await openInTheme(page, '/', theme);

    await page.evaluate(() => {
      const file = new File([new Uint8Array([137, 80, 78, 71])], 'sample.png', {
        type: 'image/png',
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const target = document.querySelector('main button');
      target?.dispatchEvent(
        new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
      );
    });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('sample.png')).toBeVisible();
    await expect(page.getByText(/Tools that accept this file/)).toBeVisible();

    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
