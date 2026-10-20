import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers';

/**
 * The static first paint in `scripts/prerender.mjs` is only worth having if it
 * survives hydration without moving. These guards check the three things that can
 * break it: the markup going missing, the no-JS path going missing, and React's
 * first commit shifting the text.
 */
const DIST = 'apps/web/dist';
const TOOL = 'uuid-genny';
const NOTICE = 'Omnitool needs JavaScript to run its tools. Nothing is sent anywhere.';

const registry = JSON.parse(
  readFileSync('packages/tools-registry/data/registry.seed.json', 'utf8'),
) as { tools: { id: string; name: string; description: string }[] };

const tool = registry.tools.find((entry) => entry.id === TOOL);

function builtHtml(route: string) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
  return readFileSync(join(DIST, file), 'utf8');
}

/** The markup inside `#root`, which is the part prerender.mjs writes. */
function rootHtml(html: string) {
  const start = html.indexOf('<div id="root">');
  const end = html.lastIndexOf('</body>');
  expect(start, 'the built page has a #root container').toBeGreaterThan(-1);
  return html.slice(start, end);
}

/**
 * Text runs in document order, with the noscript block removed: browsers hide
 * `<noscript>` when scripting is on, so its copy must not be compared with the
 * hydrated DOM.
 */
function textRuns(html: string) {
  return html
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

test('the built tool page carries the name and description from the registry', () => {
  expect(tool, `${TOOL} is in the registry seed`).toBeDefined();
  const runs = textRuns(rootHtml(builtHtml(`/tools/${TOOL}`)));
  expect(runs).toContain(tool?.name);
  expect(runs).toContain(tool?.description);
  // Same structure as the hydrated header, so the text lands in the same box.
  const html = rootHtml(builtHtml(`/tools/${TOOL}`));
  expect(html).toContain(`<h1 class="text-2xl md:text-3xl">${tool?.name}</h1>`);
  expect(html).toContain(`<p class="prose-measure mt-2 text-muted-foreground">`);
});

test('the built pages carry the no-JS notice', () => {
  for (const route of ['/', '/about', '/privacy', `/tools/${TOOL}`]) {
    const html = builtHtml(route);
    expect(html, route).toContain('<noscript>');
    expect(html, route).toContain(NOTICE);
  }
});

test('a planned URL keeps its empty neutral shell (DEC-19)', () => {
  const html = readFileSync(join(DIST, '404.html'), 'utf8');
  expect(rootHtml(html).trim()).toBe('<div id="root"></div>');
  expect(html).not.toMatch(/>\s*Page not found\s*</i);
  expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/\b404\b/i);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the heading, the description and the notice are visible', async ({ page }) => {
    await page.goto(`/tools/${TOOL}/`);

    await expect(page.getByRole('heading', { level: 1, name: tool?.name ?? '' })).toBeVisible();
    await expect(page.getByText(tool?.description ?? '')).toBeVisible();
    // Playwright's text engine ignores <noscript> contents on purpose, so the
    // notice is asserted as a rendered element instead of by text.
    const notice = page.locator('noscript p');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveText(NOTICE);
  });
});

async function boxes(page: Page) {
  return page.evaluate(() => {
    const read = (selector: string) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    };
    return { h1: read('main h1'), paragraph: read('main p.prose-measure') };
  });
}

const CLS_OBSERVER = () => {
  const state = window as unknown as { __cls: number; __shifts: number[] };
  state.__cls = 0;
  state.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (shift.hadRecentInput) continue;
      state.__cls += shift.value;
      state.__shifts.push(shift.value);
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(`hydration at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('does not move the heading or the description', async ({ page }) => {
      // Static first paint: every script request is refused, so nothing hydrates.
      await page.route('**/*.js', (route) => route.abort());
      await page.goto(`/tools/${TOOL}/`);
      const before = await boxes(page);
      await page.unroute('**/*.js');

      // Hydrated: the boot marker replaces any timeout.
      await page.addInitScript(CLS_OBSERVER);
      await gotoApp(page, `/tools/${TOOL}/`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const after = await boxes(page);

      expect(before.h1).not.toBeNull();
      expect(before.paragraph).not.toBeNull();
      for (const key of ['h1', 'paragraph'] as const) {
        const first = before[key];
        const second = after[key];
        expect(second, key).not.toBeNull();
        if (!first || !second) continue;
        expect(Math.abs(second.x - first.x), `${key} x`).toBeLessThanOrEqual(1);
        expect(Math.abs(second.y - first.y), `${key} y`).toBeLessThanOrEqual(1);
        expect(Math.abs(second.width - first.width), `${key} width`).toBeLessThanOrEqual(1);
        expect(Math.abs(second.height - first.height), `${key} height`).toBeLessThanOrEqual(1);
      }

      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls).toBeLessThanOrEqual(0.01);
    });
  });
}

test.describe('static text survives hydration', () => {
  for (const route of ['/', '/about', '/privacy', `/tools/${TOOL}`]) {
    test(route, async ({ page }) => {
      const runs = textRuns(rootHtml(builtHtml(route)));
      expect(runs.length).toBeGreaterThan(0);

      await gotoApp(page, route);
      const hydrated = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      for (const run of runs) {
        expect(hydrated, `${route}: “${run}”`).toContain(run);
      }
    });
  }
});
