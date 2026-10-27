/**
 * The ZIP central directory, read before anything parses the archive.
 *
 * A `.docx` file is a zip. The document converter refuses an archive that is
 * too large, too full or built to expand, and it refuses it itself rather than
 * hoping the parser underneath notices: every byte of the file belongs to
 * whoever supplied it, and a parser's refusal is not a message we can show a
 * reader.
 *
 * Only metadata is read — the end-of-central-directory record and the central
 * directory entries that point at each part. Nothing is decompressed, so a file
 * claiming to expand to a gigabyte is refused on the strength of a number it
 * wrote itself, before a single inflated byte exists.
 *
 * The limits are the ones the owner set (DEC-86): 20 MB in, at most 1,000
 * entries, 100 MB uncompressed in total, 50 MB in any one entry, and a
 * compression ratio of at most 100:1.
 */

export const ZIP_LIMITS = Object.freeze({
  maxInputBytes: 20 * 1024 * 1024,
  maxEntries: 1000,
  maxTotalUncompressedBytes: 100 * 1024 * 1024,
  maxEntryUncompressedBytes: 50 * 1024 * 1024,
  maxCompressionRatio: 100,
});

export interface ZipEntry {
  readonly name: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
}

export type ZipInspection =
  | {
      readonly ok: true;
      readonly entries: readonly ZipEntry[];
      readonly totalUncompressedBytes: number;
    }
  | { readonly ok: false; readonly reason: string };

const EOCD_SIGNATURE = [0x50, 0x4b, 0x05, 0x06];
const CENTRAL_SIGNATURE = [0x50, 0x4b, 0x01, 0x02];

function hasSignature(bytes: Uint8Array, at: number, signature: readonly number[]): boolean {
  if (at + signature.length > bytes.length) return false;
  return signature.every((byte, index) => bytes[at + index] === byte);
}

function u16(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) +
      ((bytes[at + 1] ?? 0) << 8) +
      ((bytes[at + 2] ?? 0) << 16) +
      ((bytes[at + 3] ?? 0) << 24)) >>>
    0
  );
}

function megabytes(bytes: number): string {
  const value = bytes / (1024 * 1024);
  return Number.isInteger(value) ? `${value} MB` : `${value.toFixed(1)} MB`;
}

/** Where the end-of-central-directory record starts, or -1. */
function findEndRecord(bytes: Uint8Array): number {
  const minimum = 22;
  if (bytes.length < minimum) return -1;
  const from = Math.max(0, bytes.length - (minimum + 0xffff));
  for (let start = bytes.length - minimum; start >= from; start -= 1) {
    if (hasSignature(bytes, start, EOCD_SIGNATURE)) return start;
  }
  return -1;
}

/**
 * Reads the central directory and applies the limits. Returns the entries on
 * success, or one plain sentence explaining which limit was refused — the
 * message is shown to whoever supplied the file, so it names the limit rather
 * than the offset it was found at.
 */
export function inspectZip(bytes: Uint8Array): ZipInspection {
  if (bytes.length > ZIP_LIMITS.maxInputBytes) {
    return {
      ok: false,
      reason: `That file is ${(bytes.length / (1024 * 1024)).toFixed(1)} MB. Word documents are read up to ${megabytes(ZIP_LIMITS.maxInputBytes)}.`,
    };
  }

  const end = findEndRecord(bytes);
  if (end === -1) {
    return { ok: false, reason: 'That file is not a Word document we can read.' };
  }

  const entryCount = u16(bytes, end + 10);
  const centralSize = u32(bytes, end + 12);
  const centralOffset = u32(bytes, end + 16);

  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    return { ok: false, reason: 'That file is written in a zip format we cannot read.' };
  }
  if (centralOffset + centralSize > bytes.length) {
    return { ok: false, reason: 'That file is not a Word document we can read.' };
  }
  if (entryCount > ZIP_LIMITS.maxEntries) {
    return {
      ok: false,
      reason: `That document has ${entryCount.toLocaleString('en-GB')} entries. The limit is ${ZIP_LIMITS.maxEntries.toLocaleString('en-GB')}.`,
    };
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const entries: ZipEntry[] = [];
  let total = 0;
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (!hasSignature(bytes, cursor, CENTRAL_SIGNATURE)) {
      return { ok: false, reason: 'That file is not a Word document we can read.' };
    }
    const compressedSize = u32(bytes, cursor + 20);
    const uncompressedSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      return { ok: false, reason: 'That file is written in a zip format we cannot read.' };
    }

    if (uncompressedSize > ZIP_LIMITS.maxEntryUncompressedBytes) {
      return {
        ok: false,
        reason: `One part of that document claims ${megabytes(uncompressedSize)} when unpacked. The most we read in one part is ${megabytes(ZIP_LIMITS.maxEntryUncompressedBytes)}.`,
      };
    }

    // An entry compressed to nothing cannot have a ratio checked, so it is
    // refused by the same rule rather than read as an exception.
    if (compressedSize * ZIP_LIMITS.maxCompressionRatio < uncompressedSize) {
      return {
        ok: false,
        reason: `One part of that document has a compression ratio above ${ZIP_LIMITS.maxCompressionRatio}:1, which is how a small file claims a large one. Nothing was unpacked.`,
      };
    }

    total += uncompressedSize;
    if (total > ZIP_LIMITS.maxTotalUncompressedBytes) {
      return {
        ok: false,
        reason: `The parts of that document add up to more than ${megabytes(ZIP_LIMITS.maxTotalUncompressedBytes)} when unpacked. Nothing was unpacked.`,
      };
    }

    entries.push({ name, compressedSize, uncompressedSize });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return { ok: true, entries, totalUncompressedBytes: total };
}
