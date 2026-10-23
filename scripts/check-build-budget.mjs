import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'apps/web/dist');
const manifestPath = join(dist, '.vite/manifest.json');

const SHELL_JS_GZIP_BUDGET = 200 * 1024;
/** Warn when a batch adds more than this to the shell; the 200 kB limit still applies. */
const SHELL_GROWTH_WARNING = 10 * 1024;
/**
 * Libraries that belong to one tool's lazy chunk and must never appear in the
 * shell. The build has no sourcemaps, so each entry is a string that only that
 * library emits; add one whenever a tool gains a library.
 */
const TOOL_LIBRARIES = [{ name: 'qrcode', marker: 'getSymbolSize' }];
const PRECACHE_TOTAL_BUDGET = 8 * 1024 * 1024;
const PRECACHE_FILE_LIMIT = 2 * 1024 * 1024;
const CLOUDFLARE_FILE_LIMIT = 20 * 1024 * 1024;
const MAX_FILES = 20_000;
const PRECACHE_EXTENSIONS = new Set(['.js', '.css', '.html', '.svg', '.woff2', '.webmanifest']);

const failures = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const entryKey = 'index.html';
const entry = manifest[entryKey];
if (!entry) {
  console.error('budget: index.html is missing from the Vite manifest');
  process.exit(1);
}

function shellFiles(key, seen = new Set()) {
  if (seen.has(key)) return [];
  seen.add(key);
  const chunk = manifest[key];
  if (!chunk) return [];
  const files = chunk.file?.endsWith('.js') ? [join(dist, chunk.file)] : [];
  for (const imported of chunk.imports ?? []) files.push(...shellFiles(imported, seen));
  return files;
}

const shellJs = [...new Set(shellFiles(entryKey))];
const shellJsGzip = shellJs.reduce((total, path) => total + gzipSize(path), 0);

if (shellJsGzip > SHELL_JS_GZIP_BUDGET) {
  failures.push(
    `shell JS ${formatBytes(shellJsGzip)} exceeds the ${formatBytes(SHELL_JS_GZIP_BUDGET)} budget`,
  );
}

const shellText = shellJs.map((path) => readFileSync(path, 'utf8')).join('\n');
for (const library of TOOL_LIBRARIES) {
  if (shellText.includes(library.marker)) {
    failures.push(
      `${library.name} is in the shell chunk; tool libraries must stay in their tool's lazy chunk`,
    );
  }
}

/** The last shell size recorded in IMPLEMENTATION.md section 9, or null. */
function recordedShellSize() {
  const notes = join(root, 'docs/implementation/IMPLEMENTATION.md');
  const text = readFileSync(notes, 'utf8');
  const matches = [...text.matchAll(/Shell JS: \*\*([\d.]+) kB gzip\*\*/g)];
  return matches.length > 0 ? Number(matches.at(-1)[1]) : null;
}

const allFiles = walk(dist);
let precacheTotal = 0;
let precacheCount = 0;

for (const path of allFiles) {
  const size = statSync(path).size;
  const name = relative(dist, path);
  const extension = name.slice(name.lastIndexOf('.'));

  if (size > CLOUDFLARE_FILE_LIMIT) {
    failures.push(`${name} is ${formatBytes(size)}; over the 20 MiB per-file limit`);
  }

  if (PRECACHE_EXTENSIONS.has(extension) && !name.startsWith('.vite/')) {
    precacheCount += 1;
    precacheTotal += size;
    if (size > PRECACHE_FILE_LIMIT) {
      failures.push(`${name} is ${formatBytes(size)}; over the 2 MiB precache limit`);
    }
  }
}

if (precacheTotal > PRECACHE_TOTAL_BUDGET) {
  failures.push(
    `precache total ${formatBytes(precacheTotal)} exceeds ${formatBytes(PRECACHE_TOTAL_BUDGET)}`,
  );
}

if (allFiles.length > MAX_FILES) {
  failures.push(`${allFiles.length} files exceeds the ${MAX_FILES} file limit`);
}

console.log(
  `Shell JS: ${formatBytes(shellJsGzip)} gzip (budget ${formatBytes(SHELL_JS_GZIP_BUDGET)})`,
);
console.log(`Shell chunks: ${shellJs.map((path) => relative(dist, path)).join(', ')}`);
console.log(
  `Precache candidates: ${precacheCount} files, ${formatBytes(precacheTotal)} (budget ${formatBytes(PRECACHE_TOTAL_BUDGET)})`,
);
console.log(`Build files: ${allFiles.length} (limit ${MAX_FILES})`);

const recorded = recordedShellSize();
if (recorded !== null) {
  const growth = shellJsGzip / 1024 - recorded;
  const sign = growth >= 0 ? '+' : '';
  console.log(
    `Shell growth: ${sign}${growth.toFixed(1)} kB since the recorded ${recorded.toFixed(1)} kB (warn above +10 kB per batch)`,
  );
  if (growth > SHELL_GROWTH_WARNING / 1024) {
    console.warn(
      `WARN: the shell grew ${sign}${growth.toFixed(1)} kB. Attribute it with \`node scripts/shell-attribution.mjs <dist built with --sourcemap>\` before recording the batch.`,
    );
  }
} else {
  console.warn('WARN: no recorded shell size found in docs/implementation/IMPLEMENTATION.md');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('budget: all checks passed');
