import { describe, expect, it } from 'vitest';
import {
  blockForCodePoint,
  GLYPH_RESULT_LIMIT,
  type GlyphRecord,
  isUnnamed,
  parseGlyphQuery,
  prepareGlyphRecords,
  searchGlyphs,
} from './search';

const RECORDS: readonly GlyphRecord[] = [
  { codePoint: 0x41, name: 'LATIN CAPITAL LETTER A', category: 'Lu', block: 'Basic Latin' },
  { codePoint: 0x61, name: 'LATIN SMALL LETTER A', category: 'Ll', block: 'Basic Latin' },
  { codePoint: 0x26, name: 'AMPERSAND', category: 'Po', block: 'Basic Latin' },
  {
    codePoint: 0xe1,
    name: 'LATIN SMALL LETTER A WITH ACUTE',
    category: 'Ll',
    block: 'Latin-1 Supplement',
  },
  {
    codePoint: 0x3a9,
    name: 'GREEK CAPITAL LETTER OMEGA',
    category: 'Lu',
    block: 'Greek and Coptic',
  },
  { codePoint: 0x20ac, name: 'EURO SIGN', category: 'Sc', block: 'Currency Symbols' },
  { codePoint: 0x2192, name: 'RIGHTWARDS ARROW', category: 'Sm', block: 'Arrows' },
  { codePoint: 0x1f600, name: 'GRINNING FACE', category: 'So', block: 'Emoticons' },
  { codePoint: 0xd800, name: 'U+D800', category: 'Cs', block: 'High Surrogates' },
];

const prepared = prepareGlyphRecords(RECORDS);

function names(query: string, limit = GLYPH_RESULT_LIMIT): string[] {
  return searchGlyphs(prepared, parseGlyphQuery(query), limit).results.map((record) => record.name);
}

describe('parseGlyphQuery', () => {
  it('treats blank input as an empty query', () => {
    expect(parseGlyphQuery('')).toEqual({ kind: 'empty' });
    expect(parseGlyphQuery('   ')).toEqual({ kind: 'empty' });
  });

  it('reads a pasted character as that character', () => {
    expect(parseGlyphQuery('A')).toEqual({ kind: 'codePoint', codePoint: 0x41 });
    expect(parseGlyphQuery('😀')).toEqual({ kind: 'codePoint', codePoint: 0x1f600 });
    expect(parseGlyphQuery('  ✓ ')).toEqual({ kind: 'codePoint', codePoint: 0x2713 });
  });

  it('reads every code point notation the tool uses', () => {
    for (const input of ['U+1F600', 'u+1f600', '0x1F600', '1F600']) {
      expect(parseGlyphQuery(input), input).toEqual({ kind: 'codePoint', codePoint: 0x1f600 });
    }
  });

  it('reads words, ignoring case and extra space', () => {
    expect(parseGlyphQuery('  Grinning   FACE ')).toEqual({
      kind: 'words',
      words: ['grinning', 'face'],
    });
  });

  it('keeps a malformed code point as words, so it finds nothing rather than guessing', () => {
    expect(parseGlyphQuery('U+ZZZZ')).toEqual({ kind: 'words', words: ['u', 'zzzz'] });
    expect(searchGlyphs(prepared, parseGlyphQuery('U+ZZZZ'), 200).total).toBe(0);
  });
});

describe('prepareGlyphRecords', () => {
  it('splits names, blocks and category labels into lower-case words', () => {
    const [record] = prepareGlyphRecords([
      { codePoint: 0x2192, name: 'RIGHTWARDS ARROW', category: 'Sm', block: 'Arrows' },
    ]);
    expect(record?.words).toEqual(['rightwards', 'arrow', 'arrows', 'math', 'symbol']);
  });
});

describe('searchGlyphs', () => {
  it('finds a name that starts with the query words', () => {
    expect(names('grinning face')).toEqual(['GRINNING FACE']);
  });

  it('matches word prefixes', () => {
    expect(names('grin fac')).toEqual(['GRINNING FACE']);
    expect(names('omeg')).toEqual(['GREEK CAPITAL LETTER OMEGA']);
    expect(names('greek cap omeg')).toEqual(['GREEK CAPITAL LETTER OMEGA']);
  });

  it('requires every word to match', () => {
    expect(names('grinning cat')).toEqual([]);
    expect(names('latin letter a')).toEqual([
      'LATIN CAPITAL LETTER A',
      'LATIN SMALL LETTER A',
      'LATIN SMALL LETTER A WITH ACUTE',
    ]);
  });

  it('looks a character up by pasting it', () => {
    const result = searchGlyphs(prepared, parseGlyphQuery('A'), 200);
    expect(result.total).toBe(1);
    expect(result.results[0]?.codePoint).toBe(0x41);
  });

  it('looks a character up by any code point form', () => {
    for (const input of ['U+00E1', '0xE1', '00E1']) {
      const result = searchGlyphs(prepared, parseGlyphQuery(input), 200);
      expect(
        result.results.map((record) => record.codePoint),
        input,
      ).toEqual([0xe1]);
    }
  });

  it('finds a block by name', () => {
    expect(names('arrows')).toEqual(['RIGHTWARDS ARROW']);
    expect(names('supplement')).toEqual(['LATIN SMALL LETTER A WITH ACUTE']);
  });

  it('finds a category by name', () => {
    expect(names('currency symbol')).toEqual(['EURO SIGN']);
    expect(names('surrogate')).toEqual(['U+D800']);
  });

  it('caps the results and still reports the true total', () => {
    const all = searchGlyphs(prepared, parseGlyphQuery('letter'), 2);
    expect(all.results).toHaveLength(2);
    expect(all.total).toBe(4);
    const more = searchGlyphs(prepared, parseGlyphQuery('letter'), 10);
    expect(more.results).toHaveLength(4);
  });

  it('returns nothing for an empty query or no match', () => {
    expect(searchGlyphs(prepared, parseGlyphQuery(''), 200)).toEqual({ results: [], total: 0 });
    expect(searchGlyphs(prepared, parseGlyphQuery('zzzz')).total).toBe(0);
  });

  it('returns nothing for a code point that is not in the data', () => {
    expect(searchGlyphs(prepared, parseGlyphQuery('U+0042'), 200).total).toBe(0);
  });

  it('keeps the input order, so results are in code point order', () => {
    const result = searchGlyphs(prepared, parseGlyphQuery('latin'), 200);
    // AMPERSAND is in Basic Latin, so the block name matches it too.
    expect(result.results.map((record) => record.codePoint)).toEqual([0x41, 0x61, 0x26, 0xe1]);
  });

  it('does not return more than a cap of zero', () => {
    const result = searchGlyphs(prepared, parseGlyphQuery('letter'), 0);
    expect(result.results).toEqual([]);
    expect(result.total).toBe(4);
  });
});

describe('blockForCodePoint', () => {
  const blocks = [
    { name: 'Basic Latin', start: 0x00, end: 0x7f },
    { name: 'Latin-1 Supplement', start: 0x80, end: 0xff },
  ];

  it('finds the block that contains a code point, including both edges', () => {
    expect(blockForCodePoint(blocks, 0x41)).toBe('Basic Latin');
    expect(blockForCodePoint(blocks, 0x00)).toBe('Basic Latin');
    expect(blockForCodePoint(blocks, 0x7f)).toBe('Basic Latin');
    expect(blockForCodePoint(blocks, 0x80)).toBe('Latin-1 Supplement');
    expect(blockForCodePoint(blocks, 0xff)).toBe('Latin-1 Supplement');
  });

  it('says No block for a gap or an unknown code point', () => {
    expect(blockForCodePoint(blocks, 0x100)).toBe('No block');
    expect(blockForCodePoint([], 0x41)).toBe('No block');
  });
});

describe('isUnnamed', () => {
  it('recognises the fallback the generator writes when Unicode has no name', () => {
    expect(isUnnamed('U+D800')).toBe(true);
    expect(isUnnamed('U+1F600')).toBe(true);
    expect(isUnnamed('GRINNING FACE')).toBe(false);
    expect(isUnnamed('U+')).toBe(false);
  });
});
