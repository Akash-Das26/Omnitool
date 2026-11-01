import * as Comlink from 'comlink';
import { create } from 'fontkit';
import {
  type FontAxis,
  type FontInspectInput,
  type FontReport,
  MAX_FONT_BYTES,
  type ScriptCoverage,
} from './types';

/**
 * Enough code points per script to say whether the font covers it at all.
 * This is a coverage estimate, not a shaping or language-support claim, and the
 * UI says so.
 */
const SCRIPT_SAMPLES: readonly { name: string; ranges: readonly (readonly [number, number])[] }[] =
  [
    {
      name: 'Latin',
      ranges: [
        [0x41, 0x5a],
        [0x61, 0x7a],
        [0xc0, 0x17f],
      ],
    },
    {
      name: 'Greek',
      ranges: [
        [0x391, 0x3a9],
        [0x3b1, 0x3c9],
      ],
    },
    { name: 'Cyrillic', ranges: [[0x410, 0x44f]] },
    { name: 'Hebrew', ranges: [[0x5d0, 0x5ea]] },
    { name: 'Arabic', ranges: [[0x621, 0x64a]] },
    { name: 'Devanagari', ranges: [[0x915, 0x939]] },
    { name: 'Thai', ranges: [[0xe01, 0xe30]] },
    { name: 'Hiragana', ranges: [[0x3041, 0x3096]] },
    { name: 'Katakana', ranges: [[0x30a1, 0x30fa]] },
    { name: 'Han', ranges: [[0x4e00, 0x4e40]] },
    { name: 'Hangul', ranges: [[0xac00, 0xac40]] },
  ];

function countScripts(codePoints: Set<number>): ScriptCoverage[] {
  const coverage: ScriptCoverage[] = [];
  for (const script of SCRIPT_SAMPLES) {
    let covered = 0;
    let sampled = 0;
    for (const [start, end] of script.ranges) {
      for (let codePoint = start; codePoint <= end; codePoint += 1) {
        sampled += 1;
        if (codePoints.has(codePoint)) covered += 1;
      }
    }
    if (covered > 0) coverage.push({ name: script.name, covered, sampled });
  }
  return coverage.sort(
    (a, b) => b.covered / b.sampled - a.covered / a.sampled || a.name.localeCompare(b.name),
  );
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const api = {
  async inspect(
    input: FontInspectInput,
    onProgress: (progress: number, label?: string, phase?: string) => void,
  ): Promise<FontReport> {
    if (input.buffer.byteLength > MAX_FONT_BYTES) {
      throw new Error('That file is larger than 50 MB. Choose a smaller font file.');
    }
    onProgress(20, 'Reading the font tables', 'parse');

    let font: ReturnType<typeof create>;
    try {
      font = create(new Uint8Array(input.buffer) as unknown as Parameters<typeof create>[0]);
    } catch {
      throw new Error(
        `${input.filename} could not be read as a font. Try a TTF, OTF, WOFF or WOFF2 file that is not damaged.`,
      );
    }

    if ('fonts' in font) {
      throw new Error('This file is a font collection. Choose a single font file instead.');
    }

    onProgress(60, 'Reading the character map', 'glyphs');
    const characterSet = new Set(font.characterSet);
    const axes: FontAxis[] = Object.entries(font.variationAxes ?? {})
      .filter(
        (entry): entry is [string, { name: string; min: number; max: number; default: number }] =>
          Boolean(entry[1]),
      )
      .map(([tag, axis]) => ({
        tag,
        name: axis.name,
        min: axis.min,
        max: axis.max,
        default: axis.default,
      }));

    onProgress(85, 'Summarising script coverage', 'scripts');
    const report: FontReport = {
      family: text(font.familyName) || 'Unnamed family',
      subfamily: text(font.subfamilyName),
      fullName: text(font.fullName),
      postscriptName: text(font.postscriptName),
      version: text(font.version),
      copyright: text(font.copyright),
      // `designer` is a name-table entry fontkit reads but does not type.
      designer: text((font as unknown as Record<string, unknown>).designer),
      // `license`, when the font carries one, is not in fontkit's types.
      licence: text((font as unknown as Record<string, unknown>).license),
      glyphs: font.numGlyphs,
      codePoints: characterSet.size,
      unitsPerEm: font.unitsPerEm,
      ascent: Math.round(font.ascent),
      descent: Math.round(font.descent),
      axes,
      scripts: countScripts(characterSet),
    };
    onProgress(100, 'Done', 'done');
    return report;
  },
};

export type FontWorkerApi = typeof api;

Comlink.expose(api);
