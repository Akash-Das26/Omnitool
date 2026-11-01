/**
 * Generates the CSS behind `tailwind-cheatsheet` with this repo's own pinned
 * Tailwind compiler. Nothing here ships: the output is a committed data file, and
 * `tailwind-cheatsheet.test.ts` runs this script with `--check` so a Tailwind
 * upgrade fails the suite until the data is regenerated and reviewed (DEC-40).
 *
 * Usage:
 *   node scripts/generate-tailwind-cheatsheet.mjs           # write the file
 *   node scripts/generate-tailwind-cheatsheet.mjs --check   # fail if it differs
 *
 * Tailwind CSS is MIT licensed. No class text is copied from tailwindcss.com:
 * only the class names and the compiler's own output are used.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const webPackage = join(root, 'apps/web/package.json');
const entriesPath = join(root, 'packages/tool-core/src/tailwind-cheatsheet/entries.json');
const outputPath = join(root, 'packages/tool-core/src/tailwind-cheatsheet/generated.ts');

// Tailwind lives in apps/web's dependency tree; resolve it from there so this
// script does not need its own copy (and cannot drift from the app's version).
const webRequire = createRequire(webPackage);
const tailwindEntry = webRequire.resolve('tailwindcss/package.json');
const tailwindRoot = dirname(tailwindEntry);
const tailwind = webRequire('tailwindcss');
const { version } = JSON.parse(readFileSync(tailwindEntry, 'utf8'));

if (typeof tailwind.compile !== 'function') {
  throw new Error(`tailwindcss ${version} has no compile(); this script needs Tailwind CSS v4`);
}

const indexCss = readFileSync(join(tailwindRoot, 'index.css'), 'utf8');

const compilerOptions = {
  base: tailwindRoot,
  loadStylesheet: async (id, base) => {
    if (id === 'tailwindcss') {
      return { path: join(tailwindRoot, 'index.css'), base: tailwindRoot, content: indexCss };
    }
    throw new Error(`unexpected stylesheet import “${id}” from ${base}`);
  },
  loadModule: async () => {
    throw new Error('the cheatsheet uses no Tailwind plugins');
  },
};

/** The body of the first `@layer utilities { … }` block, or an empty string. */
function utilitiesLayer(css) {
  const start = css.indexOf('@layer utilities {');
  if (start === -1) return '';
  const bodyStart = css.indexOf('{', start) + 1;
  let depth = 1;
  for (let index = bodyStart; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(bodyStart, index);
    }
  }
  return '';
}

/** The theme variables Tailwind emitted for the classes in this build. */
function themeVariables(css) {
  const start = css.indexOf('@layer theme {');
  if (start === -1) return new Map();
  const end = css.indexOf('@layer base {', start);
  const block = css.slice(start, end === -1 ? css.length : end);
  const variables = new Map();
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*([\s\S]*?);/g)) {
    const [, name, rawValue] = match;
    const value = rawValue.replace(/\s+/g, ' ').trim();
    if (name && value) variables.set(name, value);
  }
  return variables;
}

/**
 * Replaces short theme variables with their value so a rule reads on its own:
 * `calc(var(--spacing) * 4)` becomes `calc(0.25rem * 4)`. Long values (font
 * stacks) and values that reference other variables are left as variables.
 */
function inlineVariables(css, variables) {
  let output = css;
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const [name, value] of variables) {
      if (value.length > 60 || value.includes('var(')) continue;
      const needle = `var(--${name})`;
      if (!output.includes(needle)) continue;
      output = output.split(needle).join(value);
      changed = true;
    }
    if (!changed) break;
  }
  return output;
}

function dedent(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^ {2}/, ''))
    .join('\n')
    .trim();
}

function templateLiteral(text) {
  return `\`${text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')}\``;
}

/** Single-quoted JavaScript string, matching the repo's Biome quote style. */
function quoted(text) {
  return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/**
 * Object keys are bare when they are valid identifiers, quoted otherwise.
 * Reserved words are allowed as property names, so `static` needs no quotes.
 */
function objectKey(text) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text) ? text : quoted(text);
}

const entries = JSON.parse(readFileSync(entriesPath, 'utf8')).entries;
if (!Array.isArray(entries) || entries.length === 0) {
  throw new Error('entries.json has no entries');
}

const seen = new Map();
for (const entry of entries) {
  if (!entry.class || !entry.category || !entry.note) {
    throw new Error(`an entry is incomplete: ${JSON.stringify(entry)}`);
  }
  if (seen.has(entry.class)) throw new Error(`duplicate class: ${entry.class}`);
  seen.set(entry.class, entry);
}

const rules = new Map();
const missing = [];

for (const entry of entries) {
  const compiler = await tailwind.compile('@import "tailwindcss";', compilerOptions);
  const css = compiler.build([entry.class]);
  const body = utilitiesLayer(css);
  if (body.trim() === '') {
    missing.push(entry.class);
    continue;
  }
  rules.set(entry.class, { css: inlineVariables(dedent(body), themeVariables(css)) });
}

if (missing.length > 0) {
  throw new Error(`Tailwind ${version} produced no rule for: ${missing.join(', ')}`);
}

const lines = [
  '/**',
  ' * GENERATED FILE — do not edit by hand.',
  ' *',
  ' * Produced by `scripts/generate-tailwind-cheatsheet.mjs`, which compiles every',
  " * class in `entries.json` with the repo's pinned Tailwind CSS compiler.",
  ` * Tailwind CSS ${version}, MIT licence. Regenerate with \`pnpm cheatsheet:generate\`.`,
  ' */',
  '',
  `export const TAILWIND_VERSION = ${quoted(version)};`,
  '',
  'export const GENERATED_CSS: Readonly<Record<string, string>> = {',
];

for (const entry of entries) {
  const rule = rules.get(entry.class);
  lines.push(`  ${objectKey(entry.class)}: ${templateLiteral(rule.css)},`);
}

lines.push('};', '');
const output = lines.join('\n');

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(outputPath, 'utf8');
  } catch {
    current = '';
  }
  if (current !== output) {
    console.error(
      `cheatsheet: generated.ts does not match Tailwind ${version}. Run \`pnpm cheatsheet:generate\` and review the diff.`,
    );
    process.exit(1);
  }
  console.log(`cheatsheet: generated.ts matches Tailwind ${version} for ${entries.length} classes`);
  process.exit(0);
}

writeFileSync(outputPath, output);
console.log(
  `cheatsheet: wrote ${entries.length} compiled classes from Tailwind ${version} to ${outputPath.replace(`${root}/`, '')}`,
);
