/**
 * Lighthouse budget check for the built site.
 *
 * Serves `apps/web/dist` from a throwaway static server (SPA fallback, same as
 * Cloudflare Pages), then runs Lighthouse in mobile emulation over the routes
 * that carry prerendered HTML. `404.html` is excluded on purpose: it sends
 * `noindex`, so its SEO score is expected to be low.
 *
 * Exits non-zero if an error-level assertion fails. HTML and JSON reports are
 * written to `reports/lighthouse/` for CI.
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, gzip } from 'node:zlib';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const DIST = resolve('apps/web/dist');
const REPORT_DIR = resolve('reports/lighthouse');

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/about/', name: 'about' },
  { path: '/privacy/', name: 'privacy' },
  { path: '/tools/uuid-genny/', name: 'uuid-genny' },
  { path: '/tools/qr-genny/', name: 'qr-genny' },
  { path: '/tools/image-converter/', name: 'image-converter' },
];

const ASSERTIONS = {
  performance: { minScore: 0.9, level: 'error' },
  accessibility: { minScore: 0.9, level: 'error' },
  'best-practices': { minScore: 0.9, level: 'warn' },
  seo: { minScore: 0.9, level: 'warn' },
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Map a request path to a file inside `dist`, or null when it escapes it. */
async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0] ?? '/');
  const candidate = resolve(DIST, `.${decoded}`);
  if (candidate !== DIST && !candidate.startsWith(DIST + sep)) return null;
  if (await isFile(candidate)) return candidate;

  const withoutSlash = candidate.replace(/\/+$/, '');
  const candidates =
    decoded.endsWith('/') || decoded === '/'
      ? [`${withoutSlash}/index.html`]
      : [`${withoutSlash}/index.html`, `${withoutSlash}.html`];

  for (const option of candidates) {
    if (await isFile(option)) return option;
  }

  // Unknown app routes fall back to the shell, as `_redirects` does in production.
  const shell = resolve(DIST, 'index.html');
  return (await isFile(shell)) ? shell : null;
}

const compress = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json|wasm)|image\/svg)/;

/** Match Cloudflare's Brotli/gzip delivery so scores reflect production. */
async function encode(body, contentType, acceptEncoding = '') {
  if (!COMPRESSIBLE.test(contentType) || body.length < 1024) return { body };
  if (/\bbr\b/.test(acceptEncoding)) {
    return { body: await compress(body), encoding: 'br' };
  }
  if (/\bgzip\b/.test(acceptEncoding)) {
    return { body: await gzipAsync(body), encoding: 'gzip' };
  }
  return { body };
}

function startServer() {
  const server = createServer(async (request, response) => {
    const file = await resolveFile(request.url ?? '/');
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const contentType = MIME_TYPES[extname(file)] ?? 'application/octet-stream';
    const encoded = await encode(
      await readFile(file),
      contentType,
      request.headers['accept-encoding'],
    );
    const headers = {
      'content-type': contentType,
      'cache-control': 'no-store',
      vary: 'accept-encoding',
    };
    if (encoded.encoding) headers['content-encoding'] = encoded.encoding;
    response.writeHead(200, headers);
    response.end(encoded.body);
  });

  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => resolveListen(server));
  });
}

function metric(lhr, id) {
  const value = lhr.audits[id]?.numericValue;
  if (typeof value !== 'number') return 'n/a';
  if (id === 'cumulative-layout-shift') return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function score(value) {
  return typeof value === 'number' ? Math.round(value * 100) : 0;
}

async function main() {
  if (!(await isFile(resolve(DIST, 'index.html')))) {
    throw new Error('apps/web/dist is missing; run `pnpm build` first.');
  }
  await mkdir(REPORT_DIR, { recursive: true });

  const server = await startServer();
  const { port } = server.address();
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const failures = [];
  const rows = [];

  try {
    for (const route of ROUTES) {
      const result = await lighthouse(`http://127.0.0.1:${port}${route.path}`, {
        port: chrome.port,
        output: ['json', 'html'],
        logLevel: 'error',
        onlyCategories: Object.keys(ASSERTIONS),
      });
      if (!result) throw new Error(`Lighthouse returned no result for ${route.path}`);

      const { lhr, report } = result;
      const [json, html] = report;

      await writeFile(resolve(REPORT_DIR, `${route.name}.report.json`), json);
      await writeFile(resolve(REPORT_DIR, `${route.name}.report.html`), html);

      const scores = Object.fromEntries(
        Object.entries(ASSERTIONS).map(([category, rule]) => {
          const value = lhr.categories[category]?.score ?? 0;
          if (value < rule.minScore) {
            failures.push({
              route: route.path,
              category,
              level: rule.level,
              score: score(value),
              min: Math.round(rule.minScore * 100),
            });
          }
          return [category, score(value)];
        }),
      );

      rows.push({
        route: route.path,
        scores,
        lcp: metric(lhr, 'largest-contentful-paint'),
        tbt: metric(lhr, 'total-blocking-time'),
        cls: metric(lhr, 'cumulative-layout-shift'),
      });
    }
  } finally {
    chrome.kill();
    server.close();
  }

  console.log('route                        perf  a11y  best  seo    LCP        TBT        CLS');
  for (const row of rows) {
    const { scores } = row;
    console.log(
      [
        row.route.padEnd(28),
        String(scores.performance).padStart(4),
        String(scores.accessibility).padStart(5),
        String(scores['best-practices']).padStart(5),
        String(scores.seo).padStart(5),
        row.lcp.padStart(10),
        row.tbt.padStart(10),
        row.cls.padStart(6),
      ].join(' '),
    );
  }

  const errors = failures.filter((failure) => failure.level === 'error');
  for (const failure of failures) {
    const label = failure.level === 'error' ? 'FAIL' : 'warn';
    console.log(`${label}: ${failure.route} ${failure.category} ${failure.score} < ${failure.min}`);
  }
  console.log(`reports: ${REPORT_DIR}`);

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
