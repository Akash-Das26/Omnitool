import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/**
 * The generator used to read the package's [begin, end) ranges as inclusive,
 * which put the first code point of the next block in two blocks at once and
 * gave it the wrong category, and the category table let grouped codes (S, C)
 * overwrite specific ones (So, Sc). These checks would have failed then.
 */
const root = join(process.cwd(), 'apps/web/public/unicode');

interface Block {
  readonly name: string;
  readonly slug: string;
  readonly start: number;
  readonly end: number;
  readonly count: number;
  readonly parts: readonly string[];
}

const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as {
  version: string;
  blocks: readonly Block[];
};

const searchIndex = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf8')) as {
  version: string;
  count: number;
  gzipBytes: number;
  chunks: readonly { file: string; first: number; last: number; count: number }[];
};

type Entry = readonly [codePoint: number, name: string, category: string];

const chunks = searchIndex.chunks.map(
  (chunk) => JSON.parse(readFileSync(join(root, 'search', chunk.file), 'utf8')) as Entry[],
);

const entries = new Map<number, Entry>();
const duplicates: number[] = [];
for (const chunk of chunks) {
  for (const entry of chunk) {
    if (entries.has(entry[0])) duplicates.push(entry[0]);
    else entries.set(entry[0], entry);
  }
}

describe('generated Unicode data', () => {
  it('lists every character exactly once across the search chunks', () => {
    expect(duplicates).toEqual([]);
    expect(entries.size).toBe(searchIndex.count);
    expect(chunks.reduce((total, chunk) => total + chunk.length, 0)).toBe(searchIndex.count);
  });

  it('keeps the chunks in code point order and inside their published range', () => {
    for (const chunk of searchIndex.chunks) {
      const rows = chunks[searchIndex.chunks.indexOf(chunk)] as Entry[];
      expect(rows[0]?.[0]).toBe(chunk.first);
      expect(rows.at(-1)?.[0]).toBe(chunk.last);
      expect(rows).toHaveLength(chunk.count);
      for (let position = 1; position < rows.length; position += 1) {
        expect(rows[position]?.[0]).toBeGreaterThan(rows[position - 1]?.[0] as number);
      }
    }
  });

  it('publishes blocks that do not overlap and count what is in them', () => {
    const sorted = [...index.blocks].sort((left, right) => left.start - right.start);
    for (let position = 0; position < sorted.length; position += 1) {
      const block = sorted[position] as Block;
      expect(block.start).toBeLessThanOrEqual(block.end);
      if (position > 0) {
        expect(block.start, `${block.slug} overlaps the block before it`).toBeGreaterThan(
          (sorted[position - 1] as Block).end,
        );
      }
      let counted = 0;
      for (let codePoint = block.start; codePoint <= block.end; codePoint += 1) {
        if (entries.has(codePoint)) counted += 1;
      }
      expect(counted, block.slug).toBe(block.count);
    }
  });

  it('puts a character in exactly the block that covers it', () => {
    const blockOf = (codePoint: number) =>
      index.blocks.filter((block) => codePoint >= block.start && codePoint <= block.end);
    expect(blockOf(0x1f600).map((block) => block.slug)).toEqual(['emoticons']);
    expect(blockOf(0x20a0).map((block) => block.slug)).toEqual(['currency-symbols']);
    expect(blockOf(0x41).map((block) => block.slug)).toEqual(['basic-latin']);
  });

  it('gives characters the specific category, not the grouped one', () => {
    expect(entries.get(0x1f600)?.[2]).toBe('So');
    expect(entries.get(0x20a0)?.[2]).toBe('Sc');
    expect(entries.get(0x41)?.[2]).toBe('Lu');
    expect(entries.get(0xe9)?.[2]).toBe('Ll');
  });

  it('keeps every search chunk well under the 200 kB gzip target', () => {
    for (const [position, chunk] of chunks.entries()) {
      const gzip = gzipSync(JSON.stringify(chunk)).length;
      expect(gzip, searchIndex.chunks[position]?.file).toBeLessThan(200 * 1024);
    }
    expect(searchIndex.gzipBytes).toBeLessThan(10 * 1024 * 1024);
  });

  it('has a name for the characters it reports as named', () => {
    expect(entries.get(0x1f600)?.[1]).toBe('GRINNING FACE');
    expect(entries.get(0xe1)?.[1]).toBe('LATIN SMALL LETTER A WITH ACUTE');
    expect(entries.get(0x2192)?.[1]).toBe('RIGHTWARDS ARROW');

    // Every entry the generator keeps has a real name; the UI's "No name data"
    // path is defensive, and this records that the data does not need it today.
    const unnamed = [...entries.values()].filter(([, name]) => /^U\+[0-9A-F]{4,6}$/.test(name));
    expect(unnamed).toEqual([]);
  });
});
