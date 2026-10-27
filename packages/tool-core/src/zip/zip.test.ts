import { describe, expect, it } from 'vitest';
import { inspectZip, ZIP_LIMITS, type ZipEntry } from './index';

/**
 * The limits are checked against the central directory, which is metadata: the
 * bytes a document contains are never decompressed by this code, so a file that
 * claims to expand to a gigabyte is refused before a parser sees it.
 *
 * The fixture builds real zip structures byte by byte — local file headers, a
 * central directory, and the end-of-central-directory record — because a zip
 * written by a library would be a second implementation agreeing with itself.
 */

interface FixtureEntry {
  readonly name: string;
  readonly uncompressedSize: number;
  readonly compressedSize: number;
  readonly method?: number;
}

const encoder = new TextEncoder();

function u16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function zip(entries: readonly FixtureEntry[]): Uint8Array {
  const bytes: number[] = [];
  const central: number[] = [];

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const flags = 0;
    const method = entry.method ?? 0;
    const offset = bytes.length;

    bytes.push(...[0x50, 0x4b, 0x03, 0x04], ...u16(20), ...u16(flags), ...u16(method));
    bytes.push(...u16(0), ...u16(0));
    bytes.push(...u32(0), ...u32(entry.compressedSize), ...u32(entry.uncompressedSize));
    bytes.push(...u16(name.length), ...u16(0));
    bytes.push(...name);
    // The checker reads metadata only, so the fixture writes a stub of file
    // data and declares the sizes it claims in the headers. Writing megabytes
    // of filler would slow the suite down to prove nothing.
    const stub = Math.min(entry.compressedSize, 64);
    for (let index = 0; index < stub; index += 1) bytes.push(index % 251);

    central.push(
      0x50,
      0x4b,
      0x01,
      0x02,
      ...u16(20),
      ...u16(20),
      ...u16(flags),
      ...u16(method),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(entry.compressedSize),
      ...u32(entry.uncompressedSize),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name,
    );
  }

  const centralOffset = bytes.length;
  bytes.push(...central);
  const centralSize = central.length;

  bytes.push(
    0x50,
    0x4b,
    0x05,
    0x06,
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralSize),
    ...u32(centralOffset),
    ...u16(0),
  );
  return new Uint8Array(bytes);
}

const SMALL: FixtureEntry = {
  name: 'word/document.xml',
  uncompressedSize: 512,
  compressedSize: 400,
};

describe('inspectZip', () => {
  it('accepts an ordinary Word document', () => {
    const result = inspectZip(
      zip([SMALL, { name: '[Content_Types].xml', uncompressedSize: 120, compressedSize: 90 }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.map((entry: ZipEntry) => entry.name)).toEqual([
      'word/document.xml',
      '[Content_Types].xml',
    ]);
    expect(result.totalUncompressedBytes).toBe(632);
  });

  it('refuses a file that is not a zip at all', () => {
    const result = inspectZip(encoder.encode('a plain text file, not a document'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/not a Word document/i);
  });

  it('refuses a truncated zip with no end record', () => {
    const whole = zip([SMALL]);
    const result = inspectZip(whole.slice(0, whole.length - 10));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/not a Word document/i);
  });

  it('refuses an input over the size limit before reading a single record', () => {
    // A 20 MB file of zeroes: the refusal must come from the length alone,
    // because there is no zip here to read.
    const result = inspectZip(new Uint8Array(ZIP_LIMITS.maxInputBytes + 1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/20 MB/);
  });

  it('refuses more entries than the limit allows', () => {
    const entries: FixtureEntry[] = Array.from(
      { length: ZIP_LIMITS.maxEntries + 1 },
      (_, index) => ({
        name: `word/media/${index}.bin`,
        uncompressedSize: 10,
        compressedSize: 10,
      }),
    );
    const result = inspectZip(zip(entries));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/entries/i);
  });

  it('refuses a single entry larger than the per-entry limit', () => {
    const result = inspectZip(
      zip([
        SMALL,
        {
          name: 'word/media/huge.bin',
          uncompressedSize: ZIP_LIMITS.maxEntryUncompressedBytes + 1,
          compressedSize: 1024,
        },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/one part/i);
  });

  it('refuses an archive whose parts add up past the total limit', () => {
    // Three parts of 40 MB: each one is inside the per-entry limit and all
    // three together are past the total, so the failure is the right one.
    const result = inspectZip(
      zip(
        Array.from({ length: 3 }, (_, index) => ({
          name: `word/media/${index}.bin`,
          uncompressedSize: 40 * 1024 * 1024,
          compressedSize: 10 * 1024 * 1024,
          method: 8,
        })),
      ),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/add up/i);
  });

  it('refuses an entry whose compression ratio is a bomb', () => {
    // 100 kB on the wire for 40 MB on disk: 410:1, inside the per-entry limit
    // and far past the ratio limit, so the ratio rule is the one that catches it.
    const result = inspectZip(
      zip([
        {
          name: 'bomb.bin',
          uncompressedSize: 40 * 1024 * 1024,
          compressedSize: 100 * 1024,
          method: 8,
        },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/ratio/i);
  });

  it('refuses an entry compressed to nothing, where no ratio can be checked', () => {
    const result = inspectZip(
      zip([
        { name: 'nothing.bin', uncompressedSize: 50 * 1024 * 1024, compressedSize: 0, method: 8 },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/ratio/i);
  });

  it('accepts a genuinely well-compressed entry', () => {
    const result = inspectZip(
      zip([
        {
          name: 'word/document.xml',
          // 4 MB of repeated text compressing to 100 kB is well inside 100:1.
          uncompressedSize: 4 * 1024 * 1024,
          compressedSize: 100 * 1024,
          method: 8,
        },
      ]),
    );
    expect(result.ok).toBe(true);
  });

  it('refuses a zip64 marker rather than reading half a directory', () => {
    const bytes = zip([SMALL]);
    // The entry count is 0xffff when the real count is in a zip64 record we do
    // not read; refusing is the only honest answer.
    bytes[bytes.length - 12] = 0xff;
    bytes[bytes.length - 11] = 0xff;
    const result = inspectZip(bytes);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/zip format/i);
  });

  it('refuses a directory that points past the end of the file', () => {
    const bytes = zip([SMALL]);
    // The central directory offset is the last field before the comment length.
    new DataView(bytes.buffer).setUint32(bytes.length - 6, bytes.length, true);
    const result = inspectZip(bytes);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/not a Word document/i);
  });

  it('refuses a record where the directory should be', () => {
    const bytes = zip([SMALL]);
    const offset = bytes.length - 22 - (46 + 'word/document.xml'.length);
    bytes[offset] = 0x00;
    const result = inspectZip(bytes);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/not a Word document/i);
  });

  it('accepts an archive with no entries, which is empty but well formed', () => {
    const result = inspectZip(zip([]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toEqual([]);
    expect(result.totalUncompressedBytes).toBe(0);
  });

  it('names the limits it enforces', () => {
    expect(ZIP_LIMITS).toEqual({
      maxInputBytes: 20 * 1024 * 1024,
      maxEntries: 1000,
      maxTotalUncompressedBytes: 100 * 1024 * 1024,
      maxEntryUncompressedBytes: 50 * 1024 * 1024,
      maxCompressionRatio: 100,
    });
  });
});
