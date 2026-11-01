import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
/**
 * Packages that may only be reached from a tool's lazy chunk. The source walk
 * below follows static imports from main.tsx and stops at `import()`, so a
 * library added to a tool cannot arrive in the shell unnoticed.
 */
const TOOL_ONLY_PACKAGES = new Set(['qrcode', 'markdown-it', 'fontkit', '@unicode/unicode-16.0.0']);
/** The tool-core barrel pulls every tool's data into whatever imports it. */
const FORBIDDEN_IN_SHELL = new Set(['@omnitool/tool-core']);

/** Walks static imports from `apps/web/src/main.tsx` and returns bare specifiers. */
function shellSourceGraph() {
  const dir = join(root, 'apps/web/src');
  const seen = new Set();
  const bare = new Set();
  const queue = [join(dir, 'main.tsx')];
  const resolveImport = (from, specifier) => {
    let base;
    if (specifier.startsWith('@/')) base = join(dir, specifier.slice(2));
    else if (specifier.startsWith('.')) base = join(from, '..', specifier);
    else return null;
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, 'index.ts'),
      join(base, 'index.tsx'),
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    // `import(` and `import.meta` are not static imports; this regex asks for
    // `from "x"` or a bare `import "x"`, which is what the bundler follows.
    const specifiers = [...source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    );
    for (const specifier of specifiers) {
      const resolved = resolveImport(file, specifier);
      if (resolved) queue.push(resolved);
      else if (!specifier.startsWith('.') && !specifier.startsWith('@/')) bare.add(specifier);
    }
  }
  return bare;
}
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

for (const specifier of shellSourceGraph()) {
  const name = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
  if (TOOL_ONLY_PACKAGES.has(name) || FORBIDDEN_IN_SHELL.has(specifier)) {
    failures.push(`${specifier} is imported by the shell source graph; it belongs to a tool chunk`);
  }
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
