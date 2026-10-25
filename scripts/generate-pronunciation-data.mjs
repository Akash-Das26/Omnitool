#!/usr/bin/env node
/**
 * Build the IPA transcription data from the committed CMU Pronouncing Dictionary.
 *
 * Source: cmusphinx/cmudict at commit 74790861f652b15e4ac49015a90074ad62a27690
 * (2025-10-24), stored verbatim at `data/pronunciation/cmudict.dict` with its
 * BSD-2-Clause licence beside it, so the generated data can be reproduced
 * without a network request (DEC-62).
 *
 * Each chunk holds `[word, [pronunciation, ...]]` pairs and stays under the
 * 200 kB gzip target, so the dictionary is a handful of same-origin files that
 * the service worker caches on first use rather than part of the precache.
 *
 * Usage:
 *   node scripts/generate-pronunciation-data.mjs          write the chunks
 *   node scripts/generate-pronunciation-data.mjs --check  fail if they are stale
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const source = join(root, 'data/pronunciation/cmudict.dict');
const outDir = join(root, 'apps/web/public/pron');
const check = process.argv.includes('--check');

const SOURCE = {
  name: 'CMU Pronouncing Dictionary',
  repository: 'https://github.com/cmusphinx/cmudict',
  commit: '74790861f652b15e4ac49015a90074ad62a27690',
  committed: '2025-10-24',
  licence: 'BSD-2-Clause',
  notice: 'Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.',
};

if (!existsSync(source)) {
  console.error(`pron: ${source} is missing`);
  process.exit(1);
}

/** One map of word to every pronunciation, variants included and in order. */
const entries = new Map();
let variants = 0;
for (const line of readFileSync(source, 'utf8').split('\n')) {
  const text = line.trim();
  if (text === '' || text.startsWith(';;;')) continue;
  // A handful of entries carry a `# place, danish` note after the phonemes.
  const [entry] = text.split(' # ');
  const [rawWord, ...phonemes] = (entry ?? '').trim().split(/\s+/);
  if (rawWord === undefined || phonemes.length === 0) continue;
  // `word(2)` is the second pronunciation of the same word.
  const word = rawWord.replace(/\(\d+\)$/, '').toLowerCase();
  const pronunciation = phonemes.join(' ');
  const list = entries.get(word);
  if (list === undefined) entries.set(word, [pronunciation]);
  else {
    list.push(pronunciation);
    variants += 1;
  }
}

const words = [...entries.keys()].sort();

const CHUNK_TARGET_GZIP = 150 * 1024;
const CHUNK_MAX_GZIP = 200 * 1024;
const MIN_ENTRIES = 500;
const chunks = [];
let current = [];
let sinceMeasure = 0;
for (const word of words) {
  current.push([word, entries.get(word)]);
  sinceMeasure += 1;
  if (sinceMeasure >= MIN_ENTRIES) {
    sinceMeasure = 0;
    if (gzipSync(JSON.stringify(current)).length >= CHUNK_TARGET_GZIP) {
      chunks.push(current);
      current = [];
    }
  }
}
if (current.length > 0) chunks.push(current);

const files = chunks.map((chunk, index) => ({
  file: `pron-${String(index + 1).padStart(2, '0')}.json`,
  chunk,
}));

if (check) {
  let stale = 0;
  for (const { file, chunk } of files) {
    const path = join(outDir, file);
    const body = JSON.stringify(chunk);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== body) {
      console.error(`pron: ${file} is missing or stale`);
      stale += 1;
    }
  }
  const expected = files.map(({ file }) => file).sort();
  const present = existsSync(outDir)
    ? readdirSync(outDir)
        .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
        .sort()
    : [];
  if (expected.join(',') !== present.join(',')) {
    console.error('pron: the set of chunk files does not match the source');
    stale += 1;
  }
  if (stale > 0) {
    console.error(
      `pron: ${stale} file(s) differ; run node scripts/generate-pronunciation-data.mjs`,
    );
    process.exit(1);
  }
  console.log('pron: the generated data is up to date');
  process.exit(0);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let totalRaw = 0;
let totalGzip = 0;
let largest = { file: '', gzip: 0 };
const described = [];
for (const { file, chunk } of files) {
  const body = JSON.stringify(chunk);
  const gzip = gzipSync(body).length;
  if (gzip > CHUNK_MAX_GZIP) {
    console.error(
      `pron: ${file} is ${(gzip / 1024).toFixed(1)} kB gzip, over the ${CHUNK_MAX_GZIP / 1024} kB limit`,
    );
    process.exit(1);
  }
  writeFileSync(join(outDir, file), body);
  totalRaw += Buffer.byteLength(body);
  totalGzip += gzip;
  if (gzip > largest.gzip) largest = { file, gzip };
  described.push({
    file,
    first: chunk[0][0],
    last: chunk[chunk.length - 1][0],
    count: chunk.length,
    gzip,
  });
}

writeFileSync(
  join(outDir, 'manifest.json'),
  `${JSON.stringify(
    {
      ...SOURCE,
      words: words.length,
      variants,
      gzipBytes: totalGzip,
      chunks: described,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `pron: ${words.length.toLocaleString('en-GB')} words, ${variants.toLocaleString('en-GB')} extra variants, ${described.length} chunks`,
);
console.log(
  `pron: ${(totalRaw / 1024).toFixed(1)} kB raw, ${(totalGzip / 1024).toFixed(1)} kB gzip; largest ${largest.file} ${(largest.gzip / 1024).toFixed(1)} kB gzip`,
);
