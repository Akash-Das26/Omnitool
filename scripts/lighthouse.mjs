/**
 * Lighthouse budget check for the built site.
 *
 * Serves `apps/web/dist` from a throwaway static server, then runs Lighthouse
 * in mobile emulation over the routes that carry prerendered HTML. Each route
 * is measured three times; the budget uses the median and the minimum is
 * reported. `404.html` is excluded on purpose: it sends `noindex`, so its SEO
 * score is expected to be low.
 *
 * Exits non-zero if a median error-level assertion fails. HTML and JSON reports
 * for every run are written to `reports/lighthouse/` for CI.
 */

import { readdirSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, gzip } from 'node:zlib';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const DIST = resolve('apps/web/dist');
const REPORT_DIR = resolve('reports/lighthouse');

// Every prerendered tool directory is a built route; planned tools have no
// directory and are intentionally absent. Read after the dist check so a
// missing build still gets the clear "run pnpm build" message.
function routesForDist() {
  const builtToolRoutes = readdirSync(resolve(DIST, 'tools'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return [
    { path: '/', name: 'home' },
    { path: '/about/', name: 'about' },
    { path: '/privacy/', name: 'privacy' },
    ...builtToolRoutes.map((id) => ({ path: `/tools/${id}/`, name: `tool-${id}` })),
  ];
}

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

  // Cloudflare Pages serves 404.html for unknown paths; only known routes are
  // measured here, so this fallback should never be reached.
  const shell = resolve(DIST, '404.html');
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

const RUNS = 3;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function metricValue(lhr, id) {
  const value = lhr.audits[id]?.numericValue;
  return typeof value === 'number' ? value : null;
}

function metric(values, id) {
  const value = median(values.map((lhr) => metricValue(lhr, id)).filter((v) => v !== null));
  if (!Number.isFinite(value)) return 'n/a';
  if (id === 'cumulative-layout-shift') return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function score(value) {
  return typeof value === 'number' ? Math.round(value * 100) : 0;
}

function lcpElement(lhr) {
  const items = lhr.audits['lcp-breakdown-insight']?.details?.items ?? [];
  const node = items.find((item) => item?.type === 'node');
  return node
    ? {
        selector: node.selector ?? 'unknown',
        label: node.nodeLabel ?? '',
        snippet: node.snippet ?? '',
      }
    : null;
}

function longTasks(lhr) {
  return [...(lhr.audits['long-tasks']?.details?.items ?? [])]
    .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
    .map((item) => ({
      url: item.url ?? 'unknown',
      duration: Math.round(item.duration ?? 0),
      start: Math.round(item.startTime ?? 0),
    }));
}

function mainThreadWork(lhr) {
  return [...(lhr.audits['mainthread-work-breakdown']?.details?.items ?? [])]
    .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
    .map((item) => ({
      label: item.groupLabel ?? item.group ?? 'unknown',
      duration: Math.round(item.duration ?? 0),
    }));
}

async function main() {
  if (!(await isFile(resolve(DIST, 'index.html')))) {
    throw new Error('apps/web/dist is missing; run `pnpm build` first.');
  }
  const routes = routesForDist();
  await mkdir(REPORT_DIR, { recursive: true });

  const server = await startServer();
  const { port } = server.address();
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const failures = [];
  const rows = [];

  try {
    for (const route of routes) {
      const runs = [];
      for (let run = 1; run <= RUNS; run += 1) {
        const result = await lighthouse(`http://127.0.0.1:${port}${route.path}`, {
          port: chrome.port,
          output: ['json', 'html'],
          logLevel: 'error',
          onlyCategories: Object.keys(ASSERTIONS),
        });
        if (!result) throw new Error(`Lighthouse returned no result for ${route.path}`);

        const { lhr, report } = result;
        const [json, html] = report;
        await writeFile(resolve(REPORT_DIR, `${route.name}-run${run}.report.json`), json);
        await writeFile(resolve(REPORT_DIR, `${route.name}-run${run}.report.html`), html);
        runs.push({ lhr, json, html });
      }

      const scores = Object.fromEntries(
        Object.entries(ASSERTIONS).map(([category]) => [
          category,
          runs.map(({ lhr }) => score(lhr.categories[category]?.score)),
        ]),
      );
      const medians = Object.fromEntries(
        Object.entries(scores).map(([category, values]) => [category, median(values)]),
      );
      const minimums = Object.fromEntries(
        Object.entries(scores).map(([category, values]) => [category, Math.min(...values)]),
      );

      for (const [category, rule] of Object.entries(ASSERTIONS)) {
        if ((medians[category] ?? 0) < Math.round(rule.minScore * 100)) {
          failures.push({
            route: route.path,
            category,
            level: rule.level,
            score: medians[category],
            minimum: minimums[category],
            min: Math.round(rule.minScore * 100),
          });
        }
      }

      const lowest = runs.reduce((worst, run) =>
        score(run.lhr.categories.performance?.score) <
        score(worst.lhr.categories.performance?.score)
          ? run
          : worst,
      );
      await writeFile(resolve(REPORT_DIR, `${route.name}.report.json`), lowest.json);
      await writeFile(resolve(REPORT_DIR, `${route.name}.report.html`), lowest.html);

      rows.push({
        route: route.path,
        name: route.name,
        medians,
        minimums,
        lcp: metric(
          runs.map(({ lhr }) => lhr),
          'largest-contentful-paint',
        ),
        tbt: metric(
          runs.map(({ lhr }) => lhr),
          'total-blocking-time',
        ),
        cls: metric(
          runs.map(({ lhr }) => lhr),
          'cumulative-layout-shift',
        ),
        lowest: {
          score: score(lowest.lhr.categories.performance?.score),
          lcp: Math.round(metricValue(lowest.lhr, 'largest-contentful-paint') ?? 0),
          lcpElement: lcpElement(lowest.lhr),
          tbt: Math.round(metricValue(lowest.lhr, 'total-blocking-time') ?? 0),
          longTasks: longTasks(lowest.lhr).slice(0, 3),
          mainThread: mainThreadWork(lowest.lhr).slice(0, 3),
        },
      });
    }
  } finally {
    chrome.kill();
    server.close();
  }

  console.log(
    'route                        perf med/min  a11y med/min  best med/min  seo med/min  LCP med    TBT med    CLS med',
  );
  for (const row of rows) {
    const pair = (category) =>
      `${String(row.medians[category]).padStart(3)}/${String(row.minimums[category]).padStart(3)}`;
    console.log(
      [
        row.route.padEnd(28),
        pair('performance').padStart(8),
        pair('accessibility').padStart(11),
        pair('best-practices').padStart(11),
        pair('seo').padStart(10),
        row.lcp.padStart(9),
        row.tbt.padStart(10),
        row.cls.padStart(8),
      ].join(' '),
    );
  }

  const uuid = rows.find((row) => row.name === 'tool-uuid-genny');
  if (uuid) {
    console.log('\nuuid-genny lowest performance run:');
    console.log(
      `  performance ${uuid.lowest.score}, LCP ${uuid.lowest.lcp} ms, TBT ${uuid.lowest.tbt} ms`,
    );
    console.log(
      `  LCP element: ${uuid.lowest.lcpElement?.selector ?? 'not reported'} (${uuid.lowest.lcpElement?.label ?? ''})`,
    );
    console.log('  long tasks:');
    for (const task of uuid.lowest.longTasks) {
      console.log(`    ${task.duration} ms at ${task.start} ms — ${task.url}`);
    }
    console.log('  main-thread work:');
    for (const item of uuid.lowest.mainThread) {
      console.log(`    ${item.duration} ms — ${item.label}`);
    }
  }

  const errors = failures.filter((failure) => failure.level === 'error');
  for (const failure of failures) {
    const label = failure.level === 'error' ? 'FAIL' : 'warn';
    console.log(
      `${label}: ${failure.route} ${failure.category} median ${failure.score} < ${failure.min} (min ${failure.minimum})`,
    );
  }
  console.log(`reports: ${REPORT_DIR}`);

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
