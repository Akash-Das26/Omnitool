/**
 * Search across every character in the generated Unicode data.
 *
 * The browser used to filter only the block it had open, because the approved
 * package ships no ready-made global name index. This module is the search half
 * of the name index that `scripts/generate-unicode-index.mjs` now writes: it
 * takes plain records and answers word, character and code-point queries. It
 * runs inside a worker, so the whole 294,885-record scan never blocks the page.
 */

import { categoryName, parseCodePoint } from './index';

export interface GlyphRecord {
  readonly codePoint: number;
  readonly name: string;
  readonly category: string;
  readonly block: string;
}

export interface PreparedGlyphRecord extends GlyphRecord {
  /** Lower-case name, block and category words, split once for the whole scan. */
  readonly words: readonly string[];
}

export type GlyphQuery =
  | { readonly kind: 'empty' }
  | { readonly kind: 'codePoint'; readonly codePoint: number }
  | { readonly kind: 'words'; readonly words: readonly string[] };

export interface GlyphSearchResult {
  readonly results: readonly PreparedGlyphRecord[];
  /** Matches before the cap, so the UI can say how many there are. */
  readonly total: number;
}

/** What the UI shows at first, and what "show more" adds to. */
export const GLYPH_RESULT_LIMIT = 200;

const WORD_BREAK = /[^\p{L}\p{N}]+/u;
const UNNAMED = /^U\+[0-9A-F]{4,6}$/;

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(WORD_BREAK)
    .filter((word) => word !== '');
}

/**
 * A pasted character or a code point wins over a word search, so typing `A`
 * looks up U+0041 rather than searching for the letter in names.
 */
export function parseGlyphQuery(input: string): GlyphQuery {
  const text = input.trim();
  if (text === '') return { kind: 'empty' };
  const codePoint = parseCodePoint(text);
  if (codePoint !== null) return { kind: 'codePoint', codePoint };
  return { kind: 'words', words: wordsOf(text) };
}

/** True when the generator had no name and wrote the `U+XXXX` fallback. */
export function isUnnamed(name: string): boolean {
  return UNNAMED.test(name);
}

/** Splits each record's name, block and category into words once. */
export function prepareGlyphRecords(records: readonly GlyphRecord[]): PreparedGlyphRecord[] {
  return records.map((record) => ({
    ...record,
    words: [
      ...wordsOf(record.name),
      ...wordsOf(record.block),
      ...wordsOf(categoryName(record.category)),
    ],
  }));
}

function matches(record: PreparedGlyphRecord, words: readonly string[]): boolean {
  return words.every((queryWord) => record.words.some((word) => word.startsWith(queryWord)));
}

/**
 * Matches in record order (records arrive in code point order), stopping the
 * result list at `limit` but counting every match so the count is honest.
 */
export function searchGlyphs(
  records: readonly PreparedGlyphRecord[],
  query: GlyphQuery,
  limit: number = GLYPH_RESULT_LIMIT,
): GlyphSearchResult {
  if (query.kind === 'empty') return { results: [], total: 0 };
  const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : GLYPH_RESULT_LIMIT;
  const results: PreparedGlyphRecord[] = [];
  let total = 0;
  for (const record of records) {
    const hit =
      query.kind === 'codePoint'
        ? record.codePoint === query.codePoint
        : matches(record, query.words);
    if (!hit) continue;
    total += 1;
    if (results.length < cap) results.push(record);
  }
  return { results, total };
}

export interface GlyphBlockRange {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

/** The block a code point belongs to; blocks are sorted and do not overlap. */
export function blockForCodePoint(blocks: readonly GlyphBlockRange[], codePoint: number): string {
  let low = 0;
  let high = blocks.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const block = blocks[middle] as GlyphBlockRange;
    if (codePoint < block.start) high = middle - 1;
    else if (codePoint > block.end) low = middle + 1;
    else return block.name;
  }
  return 'No block';
}
