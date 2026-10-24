import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

/**
 * Guards the pre-paint boot script: it is inline, it is the only inline script,
 * its SHA-256 is what the CSP allows, and it runs before React so the theme and
 * the rail are already correct at first paint.
 */
const DIST = resolve('apps/web/dist');

const HTML_PAGES = [
  'index.html',
  'about/index.html',
  'privacy/index.html',
  '404.html',
  ...['uuid-genny', 'json-formatter', 'qr-genny', 'image-converter'].map(
    (id) => `tools/${id}/index.html`,
  ),
];

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

function inlineScripts(html: string) {
  return [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1] ?? '');
}

function cspFromHeaders(html: string) {
  const line = html.split('\n').find((entry) => entry.includes('Content-Security-Policy:'));
  if (!line) throw new Error('dist/_headers has no Content-Security-Policy line');
  return line.trim();
}

function scriptSrc(csp: string) {
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src'));
  if (!directive) throw new Error('the CSP has no script-src directive');
  return directive;
}

/** Same digest shape prerender.mjs writes into the CSP. */
function hashOf(script: string) {
  return `sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}`;
}

test('every page has one inline script, hashed into the CSP', () => {
  const headers = readFileSync(join(DIST, '_headers'), 'utf8');
  const csp = cspFromHeaders(headers);
  const directive = scriptSrc(csp);

  expect(directive).not.toContain("'unsafe-inline'");
  expect(directive).not.toContain("'unsafe-eval'");
  expect(directive).toContain("'self'");

  const hashes = new Set<string>();
  for (const page of HTML_PAGES) {
    const html = readFileSync(join(DIST, page), 'utf8');
    const scripts = inlineScripts(html);
    expect(scripts.length, `${page} inline scripts`).toBe(1);
    expect(html, page).not.toContain('theme.js');
    hashes.add(hashOf(scripts[0] ?? ''));
  }

  expect(hashes.size, 'all pages share one boot script').toBe(1);
  const [hash] = hashes;
  expect(hash).toBeDefined();
  expect(directive).toContain(`'${hash}'`);
});

/** A static server that applies the built `_headers` rules, like the host does. */
async function startServer() {
  const headers = readFileSync(join(DIST, '_headers'), 'utf8');
  const [globalBlock] = headers.split(/\n\s*\n/);
  const rules = (globalBlock ?? '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const split = line.indexOf(':');
      return [line.slice(0, split).trim(), line.slice(split + 1).trim()] as const;
    });

  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname);
    const candidates = [
      join(DIST, pathname),
      join(DIST, pathname, 'index.html'),
      `${join(DIST, pathname)}.html`,
    ];
    for (const candidate of candidates) {
      if (!candidate.startsWith(DIST)) continue;
      try {
        const body = readFileSync(candidate);
        const extension = extname(candidate);
        const type =
          extension === '.html'
            ? 'text/html; charset=utf-8'
            : extension === '.js'
              ? 'text/javascript; charset=utf-8'
              : extension === '.css'
                ? 'text/css; charset=utf-8'
                : extension === '.woff2'
                  ? 'font/woff2'
                  : 'application/octet-stream';
        const status = candidate === join(DIST, '404.html') ? 404 : 200;
        response.writeHead(status, { 'content-type': type, ...Object.fromEntries(rules) });
        response.end(body);
        return;
      } catch {
        // Try the next candidate.
      }
    }
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server has no port');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

/** Dark theme and a collapsed rail saved the way the app saves them. */
const PROFILE = () => {
  window.localStorage.setItem('omnitool-theme', 'dark');
  window.localStorage.setItem(
    'omnitool-ui',
    JSON.stringify({ state: { railCollapsed: true }, version: 0 }),
  );
};

/**
 * Waits for the shell's first React commit. The poll is a timer rather than
 * `requestAnimationFrame`: a page Chromium has throttled because the suite put
 * other windows in front of it stops firing frame callbacks, and a frame-based
 * poll then reports a 30 s test timeout instead of whatever went wrong. A
 * throttled page cannot produce frames either, so the two-frame settle below
 * falls back to a short timer for the same reason.
 */
async function settle(page: Page, label = page.url(), errors: string[] = []) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true', null, {
      polling: 100,
      timeout: 20_000,
    });
  } catch {
    const state = await page
      .evaluate(() => ({
        ready: document.documentElement.dataset.appReady ?? null,
        heading: document.querySelector('h1')?.textContent?.slice(0, 60) ?? null,
        scripts: [...document.scripts].map((script) => script.src.split('/').pop() ?? 'inline'),
      }))
      .catch(() => 'page unavailable');
    throw new Error(
      `no boot at ${label}: ${JSON.stringify(state)}; console errors: ${JSON.stringify(errors)}`,
    );
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 500);
      }),
  );
}

test('no CSP violations across routes, with dark theme and a collapsed rail saved', async ({
  browser,
}) => {
  const { server, base } = await startServer();
  try {
    const context = await browser.newContext();
    await context.addInitScript(PROFILE);
    const page = await context.newPage();
    const violations: unknown[] = [];
    const consoleErrors: string[] = [];
    await page.exposeFunction('__reportViolation', (entry: unknown) => violations.push(entry));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        (window as unknown as { __reportViolation: (e: unknown) => void }).__reportViolation({
          directive: event.effectiveDirective,
          blocked: event.blockedURI,
        });
      });
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    for (const route of [
      '/',
      '/tools/uuid-genny/',
      '/about/',
      '/privacy/',
      '/tools/colour-converter',
      '/tools/does-not-exist',
    ]) {
      await page.goto(`${base}${route}`);
      await settle(page, route, consoleErrors);
      const state = await page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        rail: document.documentElement.dataset.rail,
      }));
      expect(state.dark, `${route} theme`).toBe(true);
      expect(state.rail, `${route} rail`).toBe('collapsed');
      expect(violations, `${route} CSP violations`).toEqual([]);
      expect(consoleErrors, `${route} console errors`).toEqual([]);
    }

    await context.close();
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
  }
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
    return { main: read('main'), heading: read('main h1') };
  });
}

const CLS_OBSERVER = () => {
  const state = window as unknown as { __cls: number };
  state.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (shift.hadRecentInput) continue;
      state.__cls += shift.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(`collapsed rail and dark theme at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('the boot script places the main column and heading before hydration', async ({
      browser,
    }) => {
      const { server, base } = await startServer();
      try {
        const url = `${base}/tools/uuid-genny/`;

        // First paint: the module entry is refused, so nothing hydrates, but the
        // inline boot script still runs and sets the rail and theme.
        const staticContext = await browser.newContext({ viewport });
        await staticContext.addInitScript(PROFILE);
        const staticPage = await staticContext.newPage();
        await staticPage.route('**/assets/*.js', (route) => route.abort());
        await staticPage.goto(url);
        const before = await boxes(staticPage);
        await staticContext.close();

        // Hydrated.
        const liveContext = await browser.newContext({ viewport });
        await liveContext.addInitScript(PROFILE);
        await liveContext.addInitScript(CLS_OBSERVER);
        const livePage = await liveContext.newPage();
        await livePage.goto(url);
        await settle(livePage);
        const after = await boxes(livePage);
        const cls = await livePage.evaluate(() => (window as unknown as { __cls: number }).__cls);
        await liveContext.close();

        expect(before.main).not.toBeNull();
        expect(before.heading).not.toBeNull();

        // The column is compared on x, y and width: its height legitimately grows
        // when the tool renders under it. The heading exists at first paint in
        // full, so all four edges are compared.
        const column = ['x', 'y', 'width'] as const;
        const headline = ['x', 'y', 'width', 'height'] as const;
        const pairs = [
          { box: 'main', edges: column },
          { box: 'heading', edges: headline },
        ] as const;
        for (const { box, edges } of pairs) {
          const first = before[box];
          const second = after[box];
          expect(second, box).not.toBeNull();
          if (!first || !second) continue;
          for (const edge of edges) {
            expect(Math.abs(second[edge] - first[edge]), `${box} ${edge}`).toBeLessThanOrEqual(1);
          }
        }
        expect(before.main?.x, 'rail is collapsed at first paint').toBeLessThan(100);
        expect(cls).toBeLessThanOrEqual(0.01);
      } finally {
        await new Promise<void>((done) => server.close(() => done()));
      }
    });
  });
}
