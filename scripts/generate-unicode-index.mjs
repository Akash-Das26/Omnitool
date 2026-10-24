#!/usr/bin/env node
/**
 * Build the Glyph Browser's data from @unicode/unicode-16.0.0.
 *
 * The package stores its tables as run-length encoded ranges inside `.mjs`
 * files, and the names map is gzipped, so this runs at build time in Node and
 * writes plain JSON under `apps/web/public/unicode/`. The tool fetches one block
 * at a time and the service worker caches what it fetched, so the app stays
 * local-only and works offline after a block has been opened.
 *
 * Every block is split into parts of at most PART_SIZE entries; the parts are
 * sized and reported so no single file approaches the 200 kB gzip target.
 *
 * Usage:
 *   node scripts/generate-unicode-index.mjs          write the data
 *   node scripts/generate-unicode-index.mjs --check  fail if the data is stale
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const pkg = join(root, 'apps/web/node_modules/@unicode/unicode-16.0.0');
const outDir = join(root, 'apps/web/public/unicode');
const blocksDir = join(outDir, 'blocks');
const searchDir = join(outDir, 'search');
const PART_SIZE = 2500;
const check = process.argv.includes('--check');

if (!existsSync(pkg)) {
  console.error(`unicode: ${pkg} is missing; run pnpm install`);
  process.exit(1);
}

const VERSION = '16.0.0';

/** The RLE names table, decoded exactly as the package's own decoder does. */
function readNames() {
  const source = readFileSync(join(pkg, 'Names/index.mjs'), 'utf8');
  const base64 = /([A-Za-z0-9+/=]{100,})/.exec(source)?.[1];
  if (!base64) throw new Error('unicode: the names table is not where it was expected');
  const runs = JSON.parse(gunzipSync(Buffer.from(base64, 'base64')).toString());
  const names = new Map();
  for (let cp = 0, i = 0; i < runs.length - 2; ) {
    cp += runs[i++];
    const end = cp + runs[i++];
    const value = runs[i++];
    while (cp < end) names.set(cp++, value);
  }
  return names;
}

/** Reads a directory of range files into [start, end, name] tuples. */
async function readProperties(directory) {
  const names = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const ranges = [];
  for (const name of names) {
    const module = await import(new URL(`file://${join(directory, name, 'ranges.mjs')}`));
    for (const range of module.default) {
      ranges.push([range.begin, range.end, name]);
    }
  }
  return ranges;
}

const nameTable = readNames();
const blockRanges = await readProperties(join(pkg, 'Block'));
const categoryRanges = await readProperties(join(pkg, 'General_Category'));

const CATEGORY_CODES = {
  Cased_Letter: 'LC',
  Close_Punctuation: 'Pe',
  Connector_Punctuation: 'Pc',
  Control: 'Cc',
  Currency_Symbol: 'Sc',
  Dash_Punctuation: 'Pd',
  Decimal_Number: 'Nd',
  Enclosing_Mark: 'Me',
  Final_Punctuation: 'Pf',
  Format: 'Cf',
  Initial_Punctuation: 'Pi',
  Letter: 'L',
  Letter_Number: 'Nl',
  Line_Separator: 'Zl',
  Lowercase_Letter: 'Ll',
  Mark: 'M',
  Math_Symbol: 'Sm',
  Modifier_Letter: 'Lm',
  Modifier_Symbol: 'Sk',
  Nonspacing_Mark: 'Mn',
  Number: 'N',
  Open_Punctuation: 'Ps',
  Other: 'C',
  Other_Letter: 'Lo',
  Other_Number: 'No',
  Other_Punctuation: 'Po',
  Other_Symbol: 'So',
  Paragraph_Separator: 'Zp',
  Private_Use: 'Co',
  Punctuation: 'P',
  Separator: 'Z',
  Space_Separator: 'Zs',
  Spacing_Mark: 'Mc',
  Surrogate: 'Cs',
  Symbol: 'S',
  Titlecase_Letter: 'Lt',
  Unassigned: 'Cn',
  Uppercase_Letter: 'Lu',
};

/**
 * The package stores ranges as [begin, end): `end` is exclusive. Reading it as
 * inclusive duplicated the first code point of the next block and gave it that
 * block's category as well (U+1F600 was in both Emoticons and Miscellaneous
 * Symbols and Pictographs, U+20A0 was Unassigned as well as a currency symbol).
 */
const categoryOf = new Map();
/** L, LC, M, N, P, S, Z and C group the two-letter categories. */
function isGrouped(code) {
  return code.length === 1 || code === 'LC';
}
for (const [start, end, name] of categoryRanges) {
  const code = CATEGORY_CODES[name] ?? name;
  for (let cp = start; cp < end; cp += 1) {
    // A specific category (Lu, Ps, ...) wins over the grouped ones (L, P, ...).
    const existing = categoryOf.get(cp);
    if (!existing || (isGrouped(existing) && !isGrouped(code))) categoryOf.set(cp, code);
  }
}

/** Official names for the ranges that UnicodeData gives algorithmically. */
const HANGUL_L = [
  'G',
  'GG',
  'N',
  'D',
  'DD',
  'R',
  'M',
  'B',
  'BB',
  'S',
  'SS',
  '',
  'J',
  'JJ',
  'C',
  'K',
  'T',
  'P',
  'H',
];
const HANGUL_V = [
  'A',
  'AE',
  'YA',
  'YAE',
  'EO',
  'E',
  'YEO',
  'YE',
  'O',
  'WA',
  'WAE',
  'OE',
  'YO',
  'U',
  'WEO',
  'WE',
  'WI',
  'YU',
  'EU',
  'YI',
  'I',
];
const HANGUL_T = [
  '',
  'G',
  'GG',
  'GS',
  'N',
  'NJ',
  'NH',
  'D',
  'L',
  'LG',
  'LM',
  'LB',
  'LS',
  'LT',
  'LP',
  'LH',
  'M',
  'B',
  'BS',
  'S',
  'SS',
  'NG',
  'J',
  'C',
  'K',
  'T',
  'P',
  'H',
];

function displayName(cp) {
  const raw = nameTable.get(cp);
  if (raw === undefined) return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  if (raw === 'Hangul Syllable') {
    const index = cp - 0xac00;
    const l = Math.floor(index / (21 * 28));
    const v = Math.floor((index % (21 * 28)) / 28);
    const t = index % 28;
    return `HANGUL SYLLABLE ${HANGUL_L[l]}${HANGUL_V[v]}${HANGUL_T[t]}`;
  }
  if (/^(CJK Ideograph|Tangut Ideograph)/.test(raw) || raw === 'CJK Ideograph Extension A') {
    return `CJK UNIFIED IDEOGRAPH-${cp.toString(16).toUpperCase()}`;
  }
  if (raw.startsWith('<') && raw.endsWith('>')) {
    // <control>, <noncharacter-FFFF>, <private-use-E000> and friends: Unicode
    // does not give these a name, so keep the angle-bracket form it uses.
    return raw.slice(1, -1);
  }
  return raw;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const blocks = [];
const files = new Map();
/** Every character once, for the global name search. */
const allEntries = [];

for (const [start, end, name] of blockRanges) {
  const entries = [];
  for (let cp = start; cp < end; cp += 1) {
    const category = categoryOf.get(cp) ?? 'Cn';
    if (category === 'Cn' && !nameTable.has(cp)) continue;
    entries.push([cp, displayName(cp), category]);
  }
  if (entries.length === 0) continue;

  for (const entry of entries) allEntries.push(entry);

  const slug = slugify(name);
  const parts = [];
  for (let index = 0; index < entries.length; index += PART_SIZE) {
    const partName = `${slug}-${parts.length + 1}.json`;
    files.set(partName, entries.slice(index, index + PART_SIZE));
    parts.push(partName);
  }
  // `end` is exclusive in the package; the index publishes an inclusive end so
  // a code point lookup can compare against it directly.
  blocks.push({
    name: name.replaceAll('_', ' '),
    slug,
    start,
    end: end - 1,
    count: entries.length,
    parts,
  });
}

allEntries.sort((a, b) => a[0] - b[0]);

/**
 * The search index: the same entries, in code-point order, cut into chunks that
 * stay well under the 200 kB gzip target so the search worker can fetch them in
 * parallel and the service worker caches each one on first use.
 */
const SEARCH_CHUNK_TARGET_GZIP = 100 * 1024;
const SEARCH_CHUNK_MAX_GZIP = 200 * 1024;
const SEARCH_CHUNK_MIN_ENTRIES = 2_000;
const searchFiles = new Map();
let searchChunk = [];
let sinceMeasure = 0;
for (const entry of allEntries) {
  searchChunk.push(entry);
  sinceMeasure += 1;
  // Gzip only every so often: measuring on every entry would compress the whole
  // growing chunk 295,000 times and take minutes.
  if (sinceMeasure >= SEARCH_CHUNK_MIN_ENTRIES) {
    sinceMeasure = 0;
    if (gzipSync(JSON.stringify(searchChunk)).length >= SEARCH_CHUNK_TARGET_GZIP) {
      const name = `search-${String(searchFiles.size + 1).padStart(2, '0')}.json`;
      searchFiles.set(name, searchChunk);
      searchChunk = [];
    }
  }
}
if (searchChunk.length > 0) {
  searchFiles.set(`search-${String(searchFiles.size + 1).padStart(2, '0')}.json`, searchChunk);
}

if (check) {
  let stale = 0;
  const expected = [...files].map(([name, entries]) => [join(blocksDir, name), entries]);
  expected.push(...[...searchFiles].map(([name, entries]) => [join(searchDir, name), entries]));
  for (const [path, entries] of expected) {
    const body = JSON.stringify(entries);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== body) {
      console.error(`unicode: ${path.slice(root.length)} is missing or stale`);
      stale += 1;
    }
  }
  if (stale > 0) {
    console.error(`unicode: ${stale} file(s) differ; run node scripts/generate-unicode-index.mjs`);
    process.exit(1);
  }
  console.log('unicode: the generated data is up to date');
  process.exit(0);
}

rmSync(blocksDir, { recursive: true, force: true });
mkdirSync(blocksDir, { recursive: true });
rmSync(searchDir, { recursive: true, force: true });
mkdirSync(searchDir, { recursive: true });

let totalRaw = 0;
let totalGzip = 0;
let largest = { name: '', gzip: 0 };
for (const [name, entries] of files) {
  const body = JSON.stringify(entries);
  writeFileSync(join(blocksDir, name), body);
  const gzip = gzipSync(body).length;
  totalRaw += Buffer.byteLength(body);
  totalGzip += gzip;
  if (gzip > largest.gzip) largest = { name, gzip };
}

const searchChunks = [];
let searchRaw = 0;
let searchGzip = 0;
let largestSearch = { name: '', gzip: 0 };
for (const [name, entries] of searchFiles) {
  const body = JSON.stringify(entries);
  writeFileSync(join(searchDir, name), body);
  const gzip = gzipSync(body).length;
  if (gzip > SEARCH_CHUNK_MAX_GZIP) {
    console.error(
      `unicode: ${name} is ${(gzip / 1024).toFixed(1)} kB gzip, over the ${SEARCH_CHUNK_MAX_GZIP / 1024} kB limit`,
    );
    process.exit(1);
  }
  searchRaw += Buffer.byteLength(body);
  searchGzip += gzip;
  if (gzip > largestSearch.gzip) largestSearch = { name, gzip };
  const first = entries[0][0];
  const last = entries[entries.length - 1][0];
  searchChunks.push({ file: name, first, last, count: entries.length, gzip });
}

const index = {
  version: VERSION,
  source: '@unicode/unicode-16.0.0 2.0.8 (MIT); generated from the Unicode 16.0 Character Database',
  generated: new Date().toISOString().slice(0, 10),
  partSize: PART_SIZE,
  blocks,
};
writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(index)}\n`);

const searchIndex = {
  version: VERSION,
  source: index.source,
  generated: index.generated,
  count: allEntries.length,
  chunks: searchChunks,
  rawBytes: searchRaw,
  gzipBytes: searchGzip,
};
writeFileSync(join(outDir, 'search-index.json'), `${JSON.stringify(searchIndex)}\n`);

const digest = createHash('sha256')
  .update(JSON.stringify(index))
  .update([...files.keys()].sort().join('\n'))
  .digest('hex')
  .slice(0, 16);

console.log(
  `unicode: ${blocks.length} blocks, ${[...files.values()].reduce((n, e) => n + e.length, 0).toLocaleString('en-GB')} characters, ${files.size} files`,
);
console.log(
  `unicode: ${(totalRaw / 1024).toFixed(1)} kB raw, ${(totalGzip / 1024).toFixed(1)} kB gzip; largest ${largest.name} ${(largest.gzip / 1024).toFixed(1)} kB gzip; digest ${digest}`,
);
console.log(
  `unicode search: ${allEntries.length.toLocaleString('en-GB')} names in ${searchChunks.length} chunks, ${(searchRaw / 1024).toFixed(1)} kB raw, ${(searchGzip / 1024).toFixed(1)} kB gzip; largest ${largestSearch.name} ${(largestSearch.gzip / 1024).toFixed(1)} kB gzip`,
);
