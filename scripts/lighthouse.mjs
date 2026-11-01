/**
 * Lighthouse budget check for the built site.
 *
 * Serves `apps/web/dist` from a throwaway static server, then runs Lighthouse
 * in mobile emulation over the routes that carry prerendered HTML. Each route
 * is measured three times; the budget uses the median and the minimum is
 * reported. `404.html` is excluded on purpose: it sends `noindex`, so its SEO
 * score is expected to be low.
 *
 * The sweep is resumable. Each route is written to its own JSON result as soon
 * as it finishes, and a route that trips the load guard is measured again from
 * run 1 after the host has been quiet for 30 seconds. `--resume` then reuses
 * those results for the same commit and build, so a sweep interrupted at route
 * 12 does not cost routes 1-11 again. A route is never assembled from runs
 * measured under different conditions.
 *
 * Usage:
 *   node scripts/lighthouse.mjs                     full sweep
 *   node scripts/lighthouse.mjs --resume            skip routes already valid
 *   node scripts/lighthouse.mjs --routes /tools/x/,/tools/y/
 *   node scripts/lighthouse.mjs --only /tools/      path filter, writes subset/
 *   node scripts/lighthouse.mjs --throttle applied  throttle through CDP, writes applied/
 *
 * Exit codes: 0 every route met its budget, 1 an error-level budget failed,
 * 3 at least one route was not measured validly (busy host, or a route the host
 * never settled for), so the sweep is NOT TESTED rather than passed or failed.
 *
 * A detached sweep loses its exit code, so run it through
 * `bash scripts/lighthouse-sweep.sh`: that wrapper tees the log and writes the
 * status to `reports/lighthouse/exit-code.txt`.
 *
 * Every summary states the form factor, the throttling method, the network and
 * CPU profile, the Lighthouse version and the Chrome version, because a score
 * without them is not evidence of anything in particular.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { availableParallelism, loadavg } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, gzip } from 'node:zlib';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import {
  createLoadGuard,
  DEFAULT_MAX_RETRIES,
  DEFAULT_POLL_MS,
  DEFAULT_QUIET_MS,
  measureRoute,
  resultIsReusable,
} from './lib/lighthouse-guard.mjs';

const DIST = resolve('apps/web/dist');

const ARGS = process.argv.slice(2);
function argValue(flag) {
  const index = ARGS.indexOf(flag);
  return index === -1 ? null : (ARGS[index + 1] ?? '');
}

/** Path substring filter, kept for the targeted subsets earlier sessions used. */
const ONLY = argValue('--only');
/** Comma-separated path substrings: measure just these routes. */
const ROUTES = argValue('--routes');
/** Reuse routes whose stored result is valid for this commit and build. */
const RESUME = ARGS.includes('--resume');
/**
 * How the network and CPU limits are applied. `simulated` (the default) is
 * Lighthouse's mobile profile: the page loads as fast as the machine allows and
 * the report estimates what a mid-range phone on 4G would have seen. `applied`
 * sets the same profile through the DevTools protocol, so every response really
 * waits 150 ms and the CPU really runs four times slower.
 *
 * The two answer different questions and are never mixed: `applied` writes to
 * its own directory so a simulated figure cannot end up beside an applied one.
 */
const THROTTLE = (argValue('--throttle') ?? 'simulated').toLowerCase();
if (THROTTLE !== 'simulated' && THROTTLE !== 'applied') {
  throw new Error(`--throttle takes "simulated" or "applied", got “${THROTTLE}”`);
}
const THROTTLING_METHOD = THROTTLE === 'applied' ? 'devtools' : 'simulate';

const FILTERED = Boolean(ONLY || ROUTES);
const REPORT_DIR = (() => {
  const base =
    THROTTLE === 'applied' ? resolve('reports/lighthouse/applied') : resolve('reports/lighthouse');
  return FILTERED ? resolve(base, 'subset') : base;
})();
const RESULTS_DIR = resolve(REPORT_DIR, 'results');

/**
 * Read from the installed package rather than typed here, so upgrading
 * Lighthouse cannot leave the summary and the docs claiming the old version.
 */
const LIGHTHOUSE_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(resolve('node_modules/lighthouse/package.json'), 'utf8'))
      .version;
  } catch {
    return 'unknown';
  }
})();

/**
 * A loaded host produces meaningless scores: the same tree scored 90-100 on a
 * quiet machine and 54-72 with roughly one second of blocking time while the
 * load average sat at 5-7 on 16 cores. Rather than report either number, the
 * sweep checks the 1-minute load average before and after every single run. A
 * busy sample invalidates that route's runs; the sweep waits for the host to be
 * quiet for 30 seconds and measures the route again from run 1.
 *
 * `os.loadavg()` is always zero on Windows, where the guard cannot fire; the
 * sweep then behaves as before. Run it on Linux or macOS to get the guard.
 *
 * The share of the cores the 1-minute load average may reach. Local runs keep
 * 0.25: a quiet machine is the gate. CI sets `LIGHTHOUSE_LOAD_SHARE=0.75`
 * because a GitHub runner is shared and the job is non-blocking there anyway.
 */
function loadShare() {
  const raw = process.env.LIGHTHOUSE_LOAD_SHARE;
  if (raw === undefined || raw === '') return 0.25;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 4) {
    throw new Error(`LIGHTHOUSE_LOAD_SHARE must be a number above 0 and at most 4, got “${raw}”`);
  }
  return value;
}

/**
 * NFR-013 (DEC-23): median LCP of 2.5 s or better on tool pages, in this mobile
 * profile. The sweep reports it instead of asserting it: the budget assertions
 * below are unchanged, so a miss is visible in the summary and in CI's job
 * summary without silently turning into a build failure.
 */
const LCP_TARGET_MS = 2500;
const CORES = availableParallelism();
const LOAD_SHARE_OF_CORES = loadShare();
const LOAD_LIMIT = CORES * LOAD_SHARE_OF_CORES;
const EXIT_HOST_BUSY = 3;
const RUNS = 3;

const guard = createLoadGuard({
  readLoad: () => {
    const [one, five] = loadavg();
    return { one, five };
  },
  limit: LOAD_LIMIT,
  pollMs: DEFAULT_POLL_MS,
  quietMs: DEFAULT_QUIET_MS,
});

// Every prerendered directory is a built route: one per page and one per tool.
// The list is derived rather than named so a new page cannot ship unmeasured
// (`/experiments` was missing from a hand-written list once); planned tools have
// no directory and are intentionally absent. Read after the dist check so a
// missing build still gets the clear "run pnpm build" message.
function routesForDist() {
  const builtPageRoutes = readdirSync(DIST, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name !== 'tools' && name !== 'assets' && existsSync(resolve(DIST, name, 'index.html')),
    )
    .sort();

  const builtToolRoutes = readdirSync(resolve(DIST, 'tools'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return [
    { path: '/', name: 'home' },
    ...builtPageRoutes.map((name) => ({ path: `/${name}/`, name })),
    ...builtToolRoutes.map((id) => ({ path: `/tools/${id}/`, name: `tool-${id}` })),
  ];
}

function selectedRoutes(all) {
  let routes = all;
  if (ONLY) routes = routes.filter((route) => route.path.includes(ONLY));
  if (ROUTES) {
    const wanted = ROUTES.split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '');
    if (wanted.length === 0) throw new Error('--routes needs at least one path');
    // `/` selects the home route alone. As a plain substring it selected every
    // route, which quietly measured the whole site instead of one page.
    const matches = (route, part) =>
      part === '/' ? route.path === '/' : route.path === part || route.path.includes(part);
    routes = routes.filter((route) => wanted.some((part) => matches(route, part)));
  }
  return routes;
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

/**
 * What the numbers were measured under, read out of the report rather than
 * assumed: a score means nothing without the profile that produced it.
 */
function measuredMethod(lhr) {
  const settings = lhr.configSettings ?? {};
  const throttling = settings.throttling ?? {};
  const screen = settings.screenEmulation ?? null;
  const chrome = /Chrome\/([\d.]+)/.exec(lhr.environment?.hostUserAgent ?? '')?.[1] ?? 'unknown';
  return {
    formFactor: settings.formFactor ?? 'unknown',
    screenEmulation: screen
      ? {
          width: screen.width ?? null,
          height: screen.height ?? null,
          deviceScaleFactor: screen.deviceScaleFactor ?? null,
        }
      : null,
    throttlingMethod: settings.throttlingMethod ?? 'unknown',
    throttling: {
      rttMs: throttling.rttMs ?? null,
      throughputKbps: throttling.throughputKbps ?? null,
      cpuSlowdownMultiplier: throttling.cpuSlowdownMultiplier ?? null,
      requestLatencyMs: throttling.requestLatencyMs ?? null,
      downloadThroughputKbps: throttling.downloadThroughputKbps ?? null,
      uploadThroughputKbps: throttling.uploadThroughputKbps ?? null,
    },
    lighthouseVersion: lhr.lighthouseVersion ?? 'unknown',
    chromeVersion: chrome,
    benchmarkIndex: lhr.environment?.benchmarkIndex ?? null,
  };
}

function describeMethod(method) {
  if (!method) return 'Measurement: not recorded — no run produced a report.';
  const throttle = method.throttling;
  const applied = method.throttlingMethod === 'devtools';
  const screen = method.screenEmulation;
  return [
    `Measurement: ${method.formFactor} form factor` +
      (screen ? ` (${screen.width}×${screen.height} at DPR ${screen.deviceScaleFactor})` : ''),
    applied
      ? 'throttling applied through CDP (devtools)'
      : method.throttlingMethod === 'simulate'
        ? 'throttling simulated from a cold load (simulate)'
        : `throttling ${method.throttlingMethod}`,
    `network ${throttle.rttMs} ms RTT / ${throttle.throughputKbps} kbps down` +
      (throttle.uploadThroughputKbps === null ? '' : ` / ${throttle.uploadThroughputKbps} kbps up`),
    `CPU slowdown ×${throttle.cpuSlowdownMultiplier}`,
    `Lighthouse ${method.lighthouseVersion}`,
    `Chrome ${method.chromeVersion}`,
    `benchmark index ${method.benchmarkIndex}`,
  ].join(' · ');
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

/** The commit being measured, or a marker when this is not a git checkout. */
function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const head = (result.stdout ?? '').trim();
  return head === '' ? 'unknown' : head;
}

/**
 * A fingerprint of the build, so `--resume` cannot reuse numbers from a
 * different bundle. Sizes are enough: a rebuild that changes any asset changes
 * the list, and the entry HTML is rewritten by every build.
 */
function buildFingerprint() {
  const files = [];
  const walk = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = resolve(directory, entry.name);
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(full, relative);
      else files.push(`${relative}:${statSync(full).size}`);
    }
  };
  walk(DIST, '');
  return createHash('sha256').update(files.sort().join('\n')).digest('hex').slice(0, 16);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Turns three accepted runs into the row the summary and the result file share. */
function summarize(route, runs, meta) {
  const scores = Object.fromEntries(
    Object.entries(ASSERTIONS).map(([category]) => [
      category,
      runs.map(({ value }) => value.scores[category] ?? 0),
    ]),
  );
  const medians = Object.fromEntries(
    Object.entries(scores).map(([category, values]) => [category, median(values)]),
  );
  const minimums = Object.fromEntries(
    Object.entries(scores).map(([category, values]) => [category, Math.min(...values)]),
  );

  const lowestRun = runs.reduce((worst, run) =>
    run.value.scores.performance < worst.value.scores.performance ? run : worst,
  );
  const lcpByRun = [...runs].sort((a, b) => a.value.lcp - b.value.lcp);
  const lcpMedianRun = lcpByRun[Math.floor(lcpByRun.length / 2)] ?? lowestRun;

  const oneMinuteLoads = runs.flatMap(({ before, after }) => [before.one, after.one]);
  const row = {
    route: route.path,
    name: route.name,
    status: 'valid',
    commit: meta.commit,
    buildHash: meta.buildHash,
    measuredAt: new Date().toISOString(),
    runs: runs.map(({ run, value, before, after }) => ({
      run,
      load: { before, after },
      scores: value.scores,
      lcp: value.lcp,
      tbt: value.tbt,
      cls: value.cls,
      lcpElement: value.lcpElement,
    })),
    attempts: meta.attempts,
    medians,
    minimums,
    lcpMs: Math.round(lcpMedianRun.value.lcp),
    lcp: metric(
      runs.map(({ value }) => value.lhr),
      'largest-contentful-paint',
    ),
    tbt: metric(
      runs.map(({ value }) => value.lhr),
      'total-blocking-time',
    ),
    cls: metric(
      runs.map(({ value }) => value.lhr),
      'cumulative-layout-shift',
    ),
    lcpElement: lcpMedianRun.value.lcpElement,
    lcpOverTarget: Math.round(lcpMedianRun.value.lcp) > LCP_TARGET_MS,
    load: {
      min: Math.min(...oneMinuteLoads),
      max: Math.max(...oneMinuteLoads),
    },
    lowest: {
      score: score(lowestRun.value.lhr.categories.performance?.score),
      lcp: Math.round(lowestRun.value.lcp),
      lcpElement: lowestRun.value.lcpElement,
      tbt: Math.round(lowestRun.value.tbt),
      longTasks: longTasks(lowestRun.value.lhr).slice(0, 3),
      mainThread: mainThreadWork(lowestRun.value.lhr).slice(0, 3),
    },
  };

  return row;
}

async function main() {
  if (!(await isFile(resolve(DIST, 'index.html')))) {
    throw new Error('apps/web/dist is missing; run `pnpm build` first.');
  }

  const allRoutes = routesForDist();
  const routes = selectedRoutes(allRoutes);
  if (routes.length === 0) throw new Error('No route matches the filters given');

  await mkdir(RESULTS_DIR, { recursive: true });
  const commit = currentCommit();
  const buildHash = buildFingerprint();

  console.log(
    `host: ${CORES} cores, load limit ${LOAD_LIMIT.toFixed(2)} (${LOAD_SHARE_OF_CORES * 100}%) · ` +
      `${routes.length} routes × ${RUNS} runs${RESUME ? ' · resuming' : ''}`,
  );
  console.log(`commit ${commit.slice(0, 12)} · build ${buildHash}`);
  console.log(
    `measurement: mobile form factor · throttling ` +
      `${THROTTLING_METHOD === 'devtools' ? 'applied through CDP (devtools)' : 'simulated (simulate)'} · ` +
      `Lighthouse ${LIGHTHOUSE_VERSION} · the Chrome version and the exact profile are printed with the summary`,
  );

  // Wait for a quiet host rather than refusing outright: a sweep that starts
  // moments after a test run should wait, not throw away the session.
  const opening = await guard.waitForQuiet();
  if (!opening.quiet) {
    console.error(
      `INVALID: host busy — start of sweep: 1-minute load stayed above ${LOAD_LIMIT.toFixed(2)} ` +
        `for ${Math.round(opening.waitedMs / 1000)} s`,
    );
    console.error('NOT TESTED: no score can be trusted on this host. Re-run when it is quiet.');
    await writeSummary({
      rows: routes.map((route) => ({ ...route, status: 'not reached' })),
      routes,
      commit,
      buildHash,
      opening,
      failures: [],
      method: null,
    });
    process.exitCode = EXIT_HOST_BUSY;
    return;
  }

  const server = await startServer();
  const { port } = server.address();
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const rows = [];
  const failures = [];
  let hostGaveUp = null;
  let observedMethod = null;
  let failPrinted = false;

  try {
    for (let index = 0; index < routes.length; index += 1) {
      const route = routes[index];
      const resultFile = resolve(RESULTS_DIR, `${route.name}.json`);

      if (RESUME) {
        const stored = await readJson(resultFile);
        if (resultIsReusable(stored, { commit, buildHash, runs: RUNS })) {
          console.log(`  ${route.path}: reused a valid result from ${stored.measuredAt}`);
          rows.push(stored);
          continue;
        }
        if (stored) {
          // A result from another commit or build is not evidence about this one.
          console.log(
            `  ${route.path}: stored result is stale (commit or build changed), measuring`,
          );
          await rm(resultFile, { force: true });
        }
      }

      const outcome = await measureRoute({
        route,
        runs: RUNS,
        guard,
        maxRetries: DEFAULT_MAX_RETRIES,
        onAttempt: (attempt) => {
          console.log(
            `  ${route.path}: ${attempt.reason} — discarded ${attempt.discardedRuns} run(s), waiting`,
          );
        },
        onWait: (wait) => {
          console.log(
            wait.quiet
              ? `  ${route.path}: host quiet after ${(wait.waitedMs / 1000).toFixed(0)} s, retrying from run 1`
              : `  ${route.path}: host did not settle in ${(wait.waitedMs / 1000).toFixed(0)} s`,
          );
        },
        measure: async (measuredRoute, run) => {
          const lighthouseResult = await lighthouse(
            `http://127.0.0.1:${port}${measuredRoute.path}`,
            {
              port: chrome.port,
              output: ['json', 'html'],
              logLevel: 'error',
              onlyCategories: Object.keys(ASSERTIONS),
              throttlingMethod: THROTTLING_METHOD,
            },
          );
          if (!lighthouseResult) {
            throw new Error(`Lighthouse returned no result for ${measuredRoute.path}`);
          }
          const { lhr, report } = lighthouseResult;
          if (observedMethod === null) observedMethod = measuredMethod(lhr);
          const [json, html] = report;
          await writeFile(resolve(REPORT_DIR, `${route.name}-run${run}.report.json`), json);
          await writeFile(resolve(REPORT_DIR, `${route.name}-run${run}.report.html`), html);

          console.log(
            `  ${route.path} run ${run}/${RUNS}: perf ${score(lhr.categories.performance?.score)}`,
          );

          return {
            lhr,
            scores: Object.fromEntries(
              Object.entries(ASSERTIONS).map(([category]) => [
                category,
                score(lhr.categories[category]?.score),
              ]),
            ),
            lcp: metricValue(lhr, 'largest-contentful-paint') ?? 0,
            tbt: metricValue(lhr, 'total-blocking-time') ?? 0,
            cls: metricValue(lhr, 'cumulative-layout-shift') ?? 0,
            lcpElement: lcpElement(lhr),
          };
        },
      });

      if (outcome.status === 'valid') {
        const row = summarize(route, outcome.runs, {
          commit,
          buildHash,
          attempts: outcome.attempts,
        });
        const lowest = outcome.runs.reduce((worst, run) =>
          run.value.scores.performance < worst.value.scores.performance ? run : worst,
        );
        await writeFile(
          resolve(REPORT_DIR, `${route.name}.report.json`),
          JSON.stringify(lowest.value.lhr),
        );
        await writeFile(
          resolve(REPORT_DIR, `${route.name}.report.html`),
          await readFile(resolve(REPORT_DIR, `${route.name}-run${lowest.run}.report.html`), 'utf8'),
        );

        for (const [category, rule] of Object.entries(ASSERTIONS)) {
          if ((row.medians[category] ?? 0) < Math.round(rule.minScore * 100)) {
            failures.push({
              route: route.path,
              category,
              level: rule.level,
              score: row.medians[category],
              minimum: row.minimums[category],
              min: Math.round(rule.minScore * 100),
            });
          }
        }

        await writeFile(resultFile, `${JSON.stringify(row, null, 2)}\n`);
        rows.push(row);
        continue;
      }

      const invalid = {
        route: route.path,
        name: route.name,
        status: 'invalid',
        reason: outcome.reason,
        attempts: outcome.attempts,
        commit,
        buildHash,
        measuredAt: new Date().toISOString(),
      };
      await writeFile(resultFile, `${JSON.stringify(invalid, null, 2)}\n`);
      rows.push(invalid);
      console.log(`  ${route.path}: INVALID — ${outcome.reason}`);

      // If the host will not settle, the remaining routes cannot be measured
      // either: stop rather than wait ten minutes per route.
      if (outcome.attempts.length > 0 && outcome.reason.includes('did not stay quiet')) {
        hostGaveUp = outcome.reason;
        for (const leftover of routes.slice(index + 1)) {
          rows.push({ ...leftover, status: 'not reached' });
        }
        break;
      }
    }
  } finally {
    chrome.kill();
    server.close();
  }

  await writeSummary({
    rows,
    routes,
    commit,
    buildHash,
    opening,
    failures,
    hostGaveUp,
    method: observedMethod,
  });

  const errors = failures.filter((failure) => failure.level === 'error');
  for (const failure of failures) {
    const label = failure.level === 'error' ? 'FAIL' : 'warn';
    if (failure.level === 'error') failPrinted = true;
    console.log(
      `${label}: ${failure.route} ${failure.category} median ${failure.score} < ${failure.min} (min ${failure.minimum})`,
    );
  }

  const invalid = rows.filter((row) => row.status !== 'valid');
  console.log(`reports: ${REPORT_DIR}`);

  if (invalid.length > 0) {
    console.error(
      `NOT TESTED for ${invalid.length} route(s): ${invalid.map((row) => row.route).join(', ')}`,
    );
    process.exitCode = EXIT_HOST_BUSY;
    return;
  }
  if (errors.length > 0) process.exitCode = 1;
  // Whatever else changes above, a printed FAIL line must produce a non-zero
  // status: it is what a script or a person reads, not the table.
  if (failPrinted && process.exitCode === undefined) process.exitCode = 1;
}

function statusLabel(row) {
  if (row.status === 'valid') return 'valid';
  if (row.status === 'invalid') return 'INVALID';
  return 'not reached';
}

async function writeSummary({
  rows,
  routes,
  commit,
  buildHash,
  opening,
  failures,
  hostGaveUp,
  method,
}) {
  const valid = rows.filter((row) => row.status === 'valid');
  const overTarget = valid.filter((row) => row.lcpOverTarget);
  const missing = rows.filter((row) => row.status !== 'valid');

  const header = [
    `Host: ${CORES} cores · load limit ${LOAD_LIMIT.toFixed(2)} (${LOAD_SHARE_OF_CORES * 100}%)` +
      (opening ? ` · host quiet after ${(opening.waitedMs / 1000).toFixed(0)} s` : ''),
    '',
    describeMethod(method),
    '',
    `Commit ${commit.slice(0, 12)} · build ${buildHash} · ${routes.length} routes × ${RUNS} runs` +
      `${RESUME ? ' · resumed' : ''}${FILTERED ? ' · filtered subset' : ''}. Budgets use the median; the minimum is reported next to it.`,
    '',
    `Routes valid: ${valid.length} of ${rows.length}.` +
      (missing.length === 0 ? '' : ` Not valid: ${missing.map((row) => row.route).join(', ')}.`) +
      (hostGaveUp ? ` Sweep stopped: ${hostGaveUp}.` : ''),
    '',
    `NFR-013 (median LCP ≤ ${LCP_TARGET_MS} ms): ` +
      (valid.length === 0
        ? 'NOT TESTED — no route was measured validly.'
        : overTarget.length === 0
          ? 'every valid route is within the target.'
          : `${overTarget.length} valid route(s) over target — ` +
            overTarget
              .map(
                (row) =>
                  `\`${row.route}\` ${row.lcpMs} ms (\`${row.lcpElement?.selector ?? 'element not reported'}\`)`,
              )
              .join(', ')),
  ];

  console.log(`\n${header.join('\n')}`);

  const table = [
    '| Route | Status | Perf med/min | A11y med/min | Best med/min | SEO med/min | LCP med | NFR-013 | LCP element | TBT med | CLS med | Load 1m range |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => {
      if (row.status !== 'valid') {
        const why = row.status === 'invalid' ? (row.reason ?? 'invalid') : 'not reached';
        return `| \`${row.route}\` | ${statusLabel(row)} | — | — | — | — | — | — | — | — | — | ${why.replaceAll('|', '/')} |`;
      }
      const pair = (category) => `${row.medians[category]}/${row.minimums[category]}`;
      return `| \`${row.route}\` | valid | ${pair('performance')} | ${pair('accessibility')} | ${pair(
        'best-practices',
      )} | ${pair('seo')} | ${row.lcp} | ${row.lcpOverTarget ? '**over**' : 'ok'} | \`${
        row.lcpElement?.selector ?? 'not reported'
      }\` | ${row.tbt} | ${row.cls} | ${row.load.min.toFixed(2)}–${row.load.max.toFixed(2)} |`;
    }),
  ].join('\n');

  console.log(table);

  await writeFile(
    resolve(REPORT_DIR, 'summary.md'),
    ['# Lighthouse', '', ...header, '', table, ''].join('\n'),
  );

  await writeFile(
    resolve(REPORT_DIR, 'summary.json'),
    `${JSON.stringify(
      {
        host: { cores: CORES, loadLimit: LOAD_LIMIT },
        method: method ?? null,
        commit,
        buildHash,
        runsPerRoute: RUNS,
        resumed: RESUME,
        throttling: THROTTLE,
        valid: valid.length,
        notValid: missing.map((row) => ({
          route: row.route,
          status: row.status,
          reason: row.reason ?? 'not reached',
        })),
        failures,
        routes: rows,
      },
      null,
      2,
    )}\n`,
  );

  // Kept because it is the route whose block the performance work started from.
  const uuid = valid.find((row) => row.name === 'tool-uuid-genny');
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
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
